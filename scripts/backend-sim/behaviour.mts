/**
 * What simulated members want and do. Nothing else in the harness invents
 * behaviour, and nothing here touches the database.
 *
 * Every number in SCENARIOS is an assumption, not a measurement: no real London
 * cohort has used the app yet. So a conclusion only counts if it holds in all
 * three scenarios. Replace them with measured values once real members exist.
 */

export type Gender = 'male' | 'female';

export interface Scenario {
  /** Baseline log-odds of showing interest in an average person, by viewer gender. */
  interest: Record<Gender, number>;
  /** Share of members in each habit: chance per day of opening the app. */
  habits: { share: number; openRate: number }[];
  /** Share who look once on their first day and never return. */
  oneAndDone: number;
  /** Chance per day that a remaining member silently stops using the app. */
  dailyDropout: number;
  /** Chance of doing the waiting step, each time they see it. */
  completeStep: number;
  /** Chance a push about a match brings them back that day. */
  pushResponse: number;
  /** Chance of writing, once a conversation is open. */
  sendMessage: number;
}

export const SCENARIOS: Record<string, Scenario> = {
  pessimistic: {
    interest: { male: -0.9, female: -2.0 },
    habits: [{ share: 0.35, openRate: 0.2 }, { share: 0.45, openRate: 0.5 }, { share: 0.2, openRate: 0.8 }],
    oneAndDone: 0.25,
    dailyDropout: 0.03,
    completeStep: 0.55,
    pushResponse: 0.35,
    sendMessage: 0.5,
  },
  base: {
    interest: { male: -0.5, female: -1.5 },
    habits: [{ share: 0.25, openRate: 0.25 }, { share: 0.45, openRate: 0.6 }, { share: 0.3, openRate: 0.9 }],
    oneAndDone: 0.15,
    dailyDropout: 0.015,
    completeStep: 0.7,
    pushResponse: 0.55,
    sendMessage: 0.7,
  },
  optimistic: {
    interest: { male: 0, female: -0.9 },
    habits: [{ share: 0.15, openRate: 0.35 }, { share: 0.45, openRate: 0.7 }, { share: 0.4, openRate: 0.95 }],
    oneAndDone: 0.08,
    dailyDropout: 0.007,
    completeStep: 0.85,
    pushResponse: 0.75,
    sendMessage: 0.85,
  },
};

/** Small deterministic PRNG, so a run can be reproduced. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gaussian = (random: () => number) =>
  Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) * Math.cos(2 * Math.PI * random());

export const pickFrom = <T,>(random: () => number, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)]!;

export function weighted<T>(random: () => number, items: readonly (readonly [T, number])[]): T {
  let roll = random() * items.reduce((sum, item) => sum + item[1], 0);
  for (const [value, weight] of items) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return items[items.length - 1]![0];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Everything about a member the database also holds, plus what only they know. */
export interface Member {
  index: number;
  id: string;
  gender: Gender;
  tier: 'free' | 'premium';
  age: number;
  lat: number;
  lng: number;
  country: string;
  relocation: string;
  /** The countries they are looking in. */
  places: string[];
  practice: string;
  timeline: string;
  sect: string;
  familyGoals: string;
  minAge: number;
  maxAge: number;
  maxKm: number;
  preferredPractice: string[];
  mustHave: Record<string, boolean>;
  /** Hidden. What most people respond to: photos, presence. */
  appeal: number;
  /** Hidden. Some people say yes rarely, some readily. */
  selectivity: number;
  /** Hidden. Chance of opening the app on a normal day. */
  openRate: number;
  /** Hidden. Day after which they never come back. */
  lastDay: number;
}

const kmBetween = (a: Member, b: Member) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 69);

/** How well the subject fits what the viewer said they want, 0 to 1. */
function statedFit(viewer: Member, subject: Member): number {
  const inAge = subject.age >= viewer.minAge && subject.age <= viewer.maxAge ? 1 : 0;
  const practice = viewer.preferredPractice.includes(subject.practice) ? 1 : 0;
  const near = kmBetween(viewer, subject) <= viewer.maxKm ? 1 : 0;
  const sect = viewer.sect === subject.sect ? 1 : 0;
  const timeline = viewer.timeline === subject.timeline ? 1 : 0;
  const family = viewer.familyGoals === subject.familyGoals ? 1 : 0;
  return 0.3 * inAge + 0.25 * practice + 0.2 * sect + 0.1 * near + 0.1 * timeline + 0.05 * family;
}

/** Private chemistry, the part no matcher can know: stable per ordered pair. */
function chemistry(seed: number, viewer: number, subject: number): number {
  let h = (seed ^ Math.imul(viewer + 1, 0x9e3779b1) ^ Math.imul(subject + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  const u = (((h ^ (h >>> 16)) >>> 0) + 0.5) / 4294967296;
  return Math.log(u / (1 - u)) / 1.8; // logistic, roughly unit variance
}

export class Behaviour {
  scenario: Scenario;
  seed: number;

  constructor(scenario: Scenario, seed: number) {
    this.scenario = scenario;
    this.seed = seed;
  }

  /** Chance `viewer` shows interest in `subject`, on seeing their profile. */
  interest(viewer: Member, subject: Member): number {
    return sigmoid(
      this.scenario.interest[viewer.gender]
        - viewer.selectivity
        + 0.9 * subject.appeal
        + 1.6 * (statedFit(viewer, subject) - 0.5)
        + 0.8 * chemistry(this.seed, viewer.index, subject.index)
    );
  }

  /** Who this member chooses from their set, best first, up to the tier's limit. */
  choose(viewer: Member, set: Member[], limit: number, random: () => number): Member[] {
    return set
      .map((subject) => ({ subject, p: this.interest(viewer, subject) }))
      .filter(({ p }) => random() < p)
      .sort((a, b) => b.p - a.p)
      .slice(0, limit)
      .map(({ subject }) => subject);
  }

  /** Chance of opening the app today: a habit, worn down by a long dry spell. */
  openChance(member: Member, day: number, daysWithoutMatch: number): number {
    if (day > member.lastDay) return 0;
    const weekly = [1, 1, 1, 0.9, 1.05, 1.1, 1][day % 7]!;
    return Math.min(0.98, member.openRate * weekly * Math.max(0.5, Math.pow(0.97, daysWithoutMatch)));
  }

  /** Hours after Fajr of a member's first open: the push, the lunch break, the evening. */
  firstOpenHour(random: () => number): number {
    const kind = random();
    if (kind < 0.12) return random() * 0.5; // awake and answers the push
    if (kind < 0.45) return 1 + random() * 6; // morning, commute
    if (kind < 0.65) return 6.5 + random() * 2.5; // lunch
    return 12 + Math.min(10, Math.abs(gaussian(random)) * 3.5); // evening
  }
}
