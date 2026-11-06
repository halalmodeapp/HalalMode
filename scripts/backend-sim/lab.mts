/**
 * The matching lab: compares ways of deciding who meets whom, in memory, in seconds.
 *
 * No database. Each method gets its own run over the same people, with its own
 * history, for many days. Members choose from their whole set, up to their pick
 * limit, by a hidden taste the matcher cannot see. Taste is invented, so a result
 * only counts if it holds across every taste model here.
 *
 * A method is written retrieval+allocator@option@option, for example
 *   league500x5+slot@gap7@elastic
 *
 *   node scripts/backend-sim/lab.mts --method league500x5+slot --taste appeal --members 4000 --days 30
 *
 * Attendance and picks are drawn from keys, not a shared stream, so two methods face the same
 * people behaving the same way and the difference between them is the method.
 */

import { gaussian, prng, weighted } from './behaviour.mts';

const flag = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1]! : fallback;
};

export interface Person {
  i: number;
  male: boolean;
  premium: boolean;
  age: number;
  lat: number;
  lng: number;
  country: number;
  minAge: number;
  maxAge: number;
  mustAge: boolean;
  maxKm: number;
  mustKm: boolean;
  sect: number;
  mustSect: boolean;
  practice: number;
  wantsPractice: number;
  mustPractice: boolean;
  timeline: number;
  family: number;
  narrow: boolean;
  /** Few people can ever meet them: a small sect, and it is a must-have for them. */
  rare: boolean;
  /** The countries they chose. */
  places: number[];
  appeal: number;
  selectivity: number;
  openRate: number;
  joinDay: number;
  lastDay: number;
}

const COUNTRIES: [number, [number, number, number][]][] = [
  [35, [[51.5, -0.1, 60], [52.5, -1.9, 20], [53.5, -2.2, 20]]],
  [15, [[40.7, -74, 50], [41.9, -87.6, 25], [29.8, -95.4, 25]]],
  [10, [[25.2, 55.3, 100]]],
  [8, [[43.7, -79.4, 100]]],
  [6, [[52.5, 13.4, 100]]],
  [6, [[48.9, 2.3, 100]]],
  [6, [[24.9, 67, 60], [31.5, 74.3, 40]]],
  [4, [[3.1, 101.7, 100]]],
  [3, [[59.9, 10.8, 100]]],
  [3, [[53.3, -6.3, 100]]],
  [2, [[-36.8, 174.8, 100]]],
  [2, [[-33.9, 18.4, 100]]],
];

export function population(count: number, cohort: string, menShare: number, seed: number, days: number): Person[] {
  const random = prng(seed);
  const people: Person[] = [];
  for (let i = 0; i < count; i += 1) {
    const male = random() < menShare;
    const age = Math.round(Math.min(50, Math.max(18, 29 + (male ? 1.5 : -0.5) + 6 * gaussian(random))));
    let country = 0;
    let city: [number, number, number] = [51.5, -0.1, 1];
    if (cohort === 'world') {
      const pick = weighted(random, COUNTRIES.map(([share], at) => [at, share] as const));
      country = pick;
      city = weighted(random, COUNTRIES[pick]![1].map((c) => [c, c[2]] as const));
    }
    const narrow = random() < 0.2;
    const up = narrow ? 2 : male ? 3 : 8;
    const down = narrow ? 2 : male ? 8 : 2;
    const habit = weighted(random, [[0.25, 25], [0.6, 45], [0.9, 30]] as const);
    const joinDay = random() < 0.3 ? Math.floor(random() * days) : 0;
    const oneAndDone = random() < 0.15;
    const practice = Math.floor(random() * 4);
    const rare = random() < 0.03;
    people.push({
      i,
      male,
      premium: random() < 0.12,
      age,
      lat: city[0] + gaussian(random) * 0.12,
      lng: city[1] + gaussian(random) * 0.18,
      country,
      minAge: Math.max(18, age - down),
      maxAge: age + up,
      mustAge: narrow || random() < 0.5,
      maxKm: weighted(random, [[25, 30], [50, 30], [100, 25], [500, 15]] as const),
      mustKm: random() < 0.3,
      sect: rare ? 3 : weighted(random, [[0, 85], [1, 12], [2, 3]] as const),
      mustSect: rare || random() < 0.4,
      practice,
      wantsPractice: Math.max(0, Math.min(3, practice + Math.round(gaussian(random) * 0.7))),
      mustPractice: random() < 0.15,
      timeline: Math.floor(random() * 3),
      family: Math.floor(random() * 3),
      narrow,
      rare,
      places: cohort !== 'world' || random() < 0.6
        ? [country]
        : [country, ...COUNTRIES.map((_, at) => at).filter((at) => at !== country && random() < 0.25)],
      appeal: gaussian(random),
      selectivity: gaussian(random) * 0.5,
      openRate: habit,
      joinDay,
      lastDay: oneAndDone ? joinDay : joinDay + Math.round(-Math.log(Math.max(random(), 1e-6)) / 0.015),
    });
  }
  return people;
}

const km = (a: Person, b: Person) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180));

function accepts(a: Person, b: Person, distance: number): boolean {
  if (a.mustAge && (b.age < a.minAge || b.age > a.maxAge)) return false;
  if (a.mustSect && a.sect !== b.sect) return false;
  if (a.mustPractice && Math.abs(a.wantsPractice - b.practice) > 1) return false;
  if (a.mustKm && distance > a.maxKm) return false;
  if (!a.places.includes(b.country)) return false;
  return true;
}

/** What the viewer said they want, 0 to 1. The only thing a matcher knows before real picks. */
function fit(a: Person, b: Person, distance: number): number {
  const outside = b.age < a.minAge ? a.minAge - b.age : b.age > a.maxAge ? b.age - a.maxAge : 0;
  return 0.25 * Math.max(0, 1 - outside / 5)
    + 0.25 * Math.max(0, 1 - Math.abs(a.wantsPractice - b.practice) / 2)
    + 0.15 * (a.sect === b.sect ? 1 : 0)
    + 0.15 * (distance <= a.maxKm ? 1 : Math.max(0, 1 - (distance - a.maxKm) / (a.maxKm + 400)))
    + 0.1 * (a.timeline === b.timeline ? 1 : 0)
    + 0.1 * (a.family === b.family ? 1 : 0);
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const mix = (seed: number, value: number) => {
  let h = Math.imul(seed ^ value, 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};
/** A draw that depends only on what it is about, so every method faces the same behaviour. */
const draw = (seed: number, tag: number, a: number, b = 0, c = 0) =>
  mix(mix(mix(seed + tag * 104729, a), b), c) / 4294967296;

function chemistry(seed: number, viewer: number, subject: number): number {
  const u = Math.min(1 - 1e-9, draw(seed, 9, viewer, subject) + 1e-9);
  return Math.log(u / (1 - u)) / 1.8;
}

/**
 * Hidden taste models. They disagree on purpose: is there a common "most wanted", does what people
 * state predict what they pick? A method that only wins in one of these has not won.
 */
export const TASTES: Record<string, (a: Person, b: Person, stated: number, chem: number) => number> = {
  appeal: (a, b, stated, chem) => (a.male ? -0.5 : -1.5) - a.selectivity + 0.9 * b.appeal + 1.6 * (stated - 0.5) + 0.8 * chem,
  chemistry: (a, _b, stated, chem) => (a.male ? -0.5 : -1.5) - a.selectivity + 1.6 * (stated - 0.5) + 1.4 * chem,
  statedUseless: (a, b, _stated, chem) => (a.male ? -0.5 : -1.5) - a.selectivity + 0.9 * b.appeal + 1.2 * chem,
  // The founder's account: everyone aims above themselves, and the most wanted are the choosiest.
  hypergamy: (a, b, stated, chem) => (a.male ? -0.5 : -1.5) - a.selectivity + 1.4 * b.appeal - 0.7 * a.appeal + 1 * (stated - 0.5) + 0.8 * chem,
  superstars: (a, b, stated, chem) => (a.male ? -1 : -2) - a.selectivity + 2 * b.appeal + 0.8 * (stated - 0.5) + 0.5 * chem,
};

export interface Edge {
  a: number;
  b: number;
  wa: number;
  wb: number;
  /** Lower for a pair who have been shown before, so anyone new comes first. */
  fresh: number;
  abroad: boolean;
}

export interface Today {
  people: Person[];
  /** Introductions each person may still receive from this allocator call. */
  left: Int32Array;
  /** Introductions each person has already been given today. */
  given: Int32Array;
  activity: Float64Array;
  random: () => number;
  blocked: (a: number, b: number) => boolean;
  freshness: (a: number, b: number) => number;
  /** How people have been received so far, and how much evidence backs it. Never shown to anyone. */
  reception: Float64Array;
  receptionConfidence: Float64Array;
  similarity: number;
  /** Compare people by where they stand among everyone, not by the raw score. */
  byLevel: boolean;
  taken: Set<number>;
  key: (a: number, b: number) => number;
  day: number;
  useActivity: boolean;
  decay: number;
}

function edgesAmong(men: Person[], women: Person[], today: Today): Edge[] {
  const out: Edge[] = [];
  for (const a of men) {
    for (const b of women) {
      const abroad = a.country !== b.country;
      const distance = km(a, b);
      if (!accepts(a, b, distance) || !accepts(b, a, distance)) continue;
      if (today.blocked(a.i, b.i) || today.taken.has(today.key(a.i, b.i))) continue;
      out.push({
        a: a.i,
        b: b.i,
        wa: 0.5 + 0.25 * fit(a, b, distance),
        wb: 0.5 + 0.25 * fit(b, a, distance),
        fresh: today.freshness(a.i, b.i) * (today.byLevel
          ? Math.exp(-today.similarity * today.receptionConfidence[a.i]! * today.receptionConfidence[b.i]! * Math.abs(today.reception[a.i]! - today.reception[b.i]!))
          : 1 - today.similarity * today.receptionConfidence[a.i]! * today.receptionConfidence[b.i]! * Math.abs(today.reception[a.i]! - today.reception[b.i]!)),
        abroad,
      });
    }
  }
  return out;
}

// --------------------------------------------------------------------- allocators

/**
 * Slots: everyone gets a first before anyone gets a second, and everyone gets five before anyone
 * gets a sixth. One line of value: how much both might want this, times how much each still needs it.
 */
export function slot(edges: Edge[], today: Today): Edge[] {
  const { left, given, decay } = today;
  const chosen: Edge[] = [];
  let alive = edges.filter((e) => left[e.a]! > 0 && left[e.b]! > 0);
  const need = (i: number) => Math.pow(decay, given[i]!);
  for (let round = 0; alive.length > 0 && round < 40; round += 1) {
    const scored = alive.map((e) => ({
      e,
      v: e.wa * e.wb * e.fresh * (need(e.a) + need(e.b))
        * (today.useActivity ? today.activity[e.a]! * today.activity[e.b]! : 1)
        * (1 + 1e-3 * today.random()),
    }));
    scored.sort((x, y) => y.v - x.v);
    const used = new Set<number>();
    const placed: Edge[] = [];
    for (const { e } of scored) {
      if (used.has(e.a) || used.has(e.b) || left[e.a]! <= 0 || left[e.b]! <= 0) continue;
      used.add(e.a);
      used.add(e.b);
      left[e.a]! -= 1;
      left[e.b]! -= 1;
      today.taken.add(today.key(e.a, e.b));
      placed.push(e);
    }
    if (placed.length === 0) break;
    for (const e of placed) {
      given[e.a]! += 1;
      given[e.b]! += 1;
      chosen.push(e);
    }
    alive = alive.filter((e) => !today.taken.has(today.key(e.a, e.b)) && left[e.a]! > 0 && left[e.b]! > 0);
  }
  return chosen;
}

/** Any feasible set, in random order. The floor everything must beat. */
export function randomAllocate(edges: Edge[], today: Today): Edge[] {
  const { left, given } = today;
  const order = edges.map((e) => ({ e, k: today.random() })).sort((x, y) => x.k - y.k);
  const chosen: Edge[] = [];
  for (const { e } of order) {
    if (left[e.a]! <= 0 || left[e.b]! <= 0) continue;
    left[e.a]! -= 1;
    left[e.b]! -= 1;
    given[e.a]! += 1;
    given[e.b]! += 1;
    today.taken.add(today.key(e.a, e.b));
    chosen.push(e);
  }
  return chosen;
}

type Allocator = (edges: Edge[], today: Today) => Edge[];

// ---------------------------------------------------------------------- retrieval

interface Schedule {
  groups: number;
  startedOn: number;
  /** Games per day in this stratum. Never more than there are groups, so no pair meets twice in a day. */
  games: number;
  /** Days until every group of men has met every group of women. */
  days: number;
}

/**
 * The league. Each side of a stratum is split into groups, frozen for a cycle. Each game, group t of
 * men sits with group t + offset of women, so across one cycle every pair shares a table exactly once.
 * Coverage is a schedule, not a hope. A pool smaller than a table is one table, which is exhaustive.
 */
class League {
  schedules = new Map<number, Schedule>();
  readonly seed: number;
  readonly size: number;
  readonly games: number;

  constructor(seed: number, size: number, games: number) {
    this.seed = seed;
    this.size = size;
    this.games = games;
  }

  schedule(stratum: number, day: number, men: number, women: number): Schedule {
    const current = this.schedules.get(stratum);
    if (current && day - current.startedOn < current.days) return current;
    const groups = Math.max(1, Math.ceil(Math.max(men, women) / (this.size / 2)));
    const games = Math.min(this.games, groups);
    const next = { groups, startedOn: day, games, days: Math.max(1, Math.ceil(groups / games)) };
    this.schedules.set(stratum, next);
    return next;
  }

  /** Who sits with whom in one game, for one stratum. */
  tables(stratum: number, day: number, game: number, men: Person[], women: Person[]): [Person[], Person[]][] {
    const s = this.schedule(stratum, day, men.length, women.length);
    const seed = mix(this.seed + stratum * 31, s.startedOn * 7919 + s.groups);
    const groupsOfMen: Person[][] = Array.from({ length: s.groups }, () => []);
    const groupsOfWomen: Person[][] = Array.from({ length: s.groups }, () => []);
    for (const p of men) groupsOfMen[mix(seed, p.i) % s.groups]!.push(p);
    for (const p of women) groupsOfWomen[mix(seed + 1, p.i) % s.groups]!.push(p);
    const offset = ((day - s.startedOn) * s.games + game) % s.groups;
    return groupsOfMen.map((group, t) => [group, groupsOfWomen[(t + offset) % s.groups]!]);
  }
}

const seatsInGame = (k: number, game: number, games: number) =>
  Math.floor((k * (game + 1)) / games) - Math.floor((k * game) / games);

const MAKEUP_STRATUM = 2_000_000;
const MAKEUP_WAVES = 5;

function playLeague(
  today: Today,
  pool: Person[],
  allocator: Allocator,
  league: League,
  stats: Stats,
  seed: number,
  elastic: boolean,
  elasticCap: number,
  independent: boolean,
  reserved?: Int32Array,
): Edge[] {
  const chosen: Edge[] = [];
  const { day } = today;
  const remaining = new Int32Array(today.left.length);

  const play = (stratum: number, game: number, men: Person[], women: Person[], seats: (p: Person) => number) => {
    for (const [m, w] of league.tables(stratum, day, game, men, women)) {
      const started = performance.now();
      const seatedMen = m.filter((p) => seats(p) > 0);
      const seatedWomen = w.filter((p) => seats(p) > 0);
      const edges = edgesAmong(seatedMen, seatedWomen, today);
      const left = today.left;
      left.fill(0);
      for (const p of seatedMen) left[p.i] = seats(p);
      for (const p of seatedWomen) left[p.i] = seats(p);
      // Tables running at once cannot see each other: each only knows its own game.
      if (independent) today.given.fill(0);
      for (const e of allocator(edges, today)) {
        remaining[e.a]! -= 1;
        remaining[e.b]! -= 1;
        chosen.push(e);
      }
      stats.tables += 1;
      stats.worstTableMs = Math.max(stats.worstTableMs, performance.now() - started);
      stats.worstTableEdges = Math.max(stats.worstTableEdges, edges.length);
    }
  };

  const homes = new Map<number, Person[]>();
  for (const p of pool) {
    const list = homes.get(p.country);
    if (list) list.push(p);
    else homes.set(p.country, [p]);
  }

  // With more of one side here, each of the fewer may be shown more people, so nobody on the other
  // side goes without. Picks stay the same. Counted where people can actually meet, not worldwide.
  const base = new Int32Array(today.left.length);
  for (const members of homes.values()) {
    const men = members.filter((p) => p.male).length;
    const women = members.length - men;
    const stretch = Math.max(men, women) / Math.max(1, Math.min(men, women));
    for (const p of members) {
      const scarce = p.male ? men < women : women < men;
      const held = reserved?.[p.i] ?? 0;
      const seats = elastic && scarce ? Math.min(elasticCap, Math.ceil(5 * stretch)) : 5;
      base[p.i] = Math.max(0, seats - held);
      remaining[p.i] = Math.max(0, (p.premium ? Math.max(10, seats) : seats) - held);
    }
  }

  // Each seat is in one of the countries they chose, taking the list in turn.
  const seatsIn = new Map<number, Map<number, number>>();
  for (const p of pool) {
    const start = mix(seed + day, p.i);
    for (let seat = 0; seat < base[p.i]!; seat += 1) {
      const place = p.places[(start + seat) % p.places.length]!;
      let there = seatsIn.get(place);
      if (!there) seatsIn.set(place, (there = new Map()));
      there.set(p.i, (there.get(p.i) ?? 0) + 1);
    }
  }

  // The games everyone plays.
  const people = today.people;
  for (let game = 0; game < league.games; game += 1) {
    for (const [place, there] of seatsIn) {
      const here = [...there.keys()].map((i) => people[i]!);
      const men = here.filter((p) => p.male);
      const women = here.filter((p) => !p.male);
      const s = league.schedule(place, day, men.length, women.length);
      if (game < s.games) play(place, game, men, women, (p) => seatsInGame(there.get(p.i)!, game, s.games));
    }
  }

  // Then anyone with a seat left, a seat at a time, each wave trying the next of their countries.
  for (let wave = 0; wave < MAKEUP_WAVES; wave += 1) {
    const short = new Map<number, Person[]>();
    for (const p of pool) {
      if (remaining[p.i]! <= 0) continue;
      const place = p.places[(mix(seed, p.i) + wave) % p.places.length]!;
      const list = short.get(place);
      if (list) list.push(p);
      else short.set(place, [p]);
    }
    for (const [place, members] of short) {
      const men = members.filter((p) => p.male);
      const women = members.filter((p) => !p.male);
      if (!men.length || !women.length) continue;
      league.schedules.delete(MAKEUP_STRATUM + place);
      const s = league.schedule(MAKEUP_STRATUM + place, day, men.length, women.length);
      const seats = s.groups === 1 ? (p: Person) => remaining[p.i]! : (p: Person) => Math.min(1, remaining[p.i]!);
      play(MAKEUP_STRATUM + place, wave, men, women, seats);
    }
  }
  return chosen;
}

/**
 * The floor: a last pass that gets anyone short of five up to five wherever that is possible at all.
 * It moves people along a chain, so a man short of one can take a seat if the man in it can go elsewhere,
 * and it takes someone's sixth before anyone goes without a fifth.
 */
function fillToFive(edges: Edge[], pool: Person[], today: Today, seatsOf: (p: Person) => number, others: Edge[]): Edge[] {
  const people = today.people;
  const neighbours = new Map<number, number[]>();
  for (const e of others) {
    if (!neighbours.has(e.a)) neighbours.set(e.a, []);
    neighbours.get(e.a)!.push(e.b);
  }
  const held = new Map<number, Set<number>>();
  const give = (a: number, b: number) => {
    if (!held.has(a)) held.set(a, new Set());
    if (!held.has(b)) held.set(b, new Set());
    held.get(a)!.add(b);
    held.get(b)!.add(a);
  };
  const take = (a: number, b: number) => {
    held.get(a)!.delete(b);
    held.get(b)!.delete(a);
  };
  const byPair = new Map<number, Edge>();
  for (const e of [...edges, ...others]) byPair.set(today.key(e.a, e.b), e);
  for (const e of edges) give(e.a, e.b);
  const count = (i: number) => held.get(i)?.size ?? 0;

  const men = pool.filter((p) => p.male && count(p.i) < 5);
  for (const m of men) {
    let guard = 0;
    const wanted = Math.min(5, seatsOf(m));
    while (count(m.i) < wanted && guard < 5) {
      guard += 1;
      const seen = new Set<number>();
      const place = (man: number): boolean => {
        for (const w of neighbours.get(man) ?? []) {
          if (seen.has(w) || held.get(man)?.has(w)) continue;
          seen.add(w);
          if (count(w) < seatsOf(people[w]!)) {
            give(man, w);
            return true;
          }
          for (const other of [...(held.get(w) ?? [])]) {
            // A man past five gives up his extra before anyone goes short.
            if (count(other) > 5) {
              take(other, w);
              give(man, w);
              return true;
            }
          }
          for (const other of [...(held.get(w) ?? [])]) {
            take(other, w);
            give(man, w);
            if (place(other)) return true;
            take(man, w);
            give(other, w);
          }
        }
        return false;
      };
      if (!place(m.i)) break;
    }
  }
  const out: Edge[] = [];
  for (const [a, set] of held) {
    if (!people[a]!.male) continue;
    for (const b of set) out.push(byPair.get(today.key(a, b))!);
  }
  return out;
}

// ------------------------------------------------------------------------ the run

interface Stats {
  tables: number;
  worstTableMs: number;
  worstTableEdges: number;
}

export function run(options: { method: string; taste: string; members: number; days: number; seed: number; cohort: string; menShare: number }) {
  const { method, taste, members, days, seed, cohort, menShare } = options;
  const [core, ...flags] = method.split('@');
  const has = (name: string) => flags.includes(name);
  const number = (name: string, fallback: number) => {
    const found = flags.find((f) => f.startsWith(name));
    return found ? Number(found.slice(name.length)) : fallback;
  };
  const gap = number('gap', 7);
  const maxShown = number('max', 1000);
  // After this many days apart, a pair that has hit the limit may be shown again.
  const resetAfter = number('reset', 0);
  const freshDecay = number('fresh', 0.7);
  // Delayed: the scarcer side is shown to more people, but only sees five. They see someone later,
  // and only if that person picked them, so nobody's interest waits on a seat it does not need.
  const delayedCap = number('delayed', 0);
  const returnLife = number('life', 14);
  const elastic = has('elastic') || delayedCap > 0;
  const elasticCap = delayedCap > 0 ? delayedCap : number('elasticcap', 10);
  const floor = has('flow');
  // Fill: everyone is dealt two-way cards as now. Anyone still short is topped up with one-way cards,
  // least-seen people first, so no fixed cap is needed. A yes on one comes back to that person later.
  const fill = has('fill');
  // Limits to lift, to find how high daily matches can go at all.
  const openCap = number('open', 5);
  const pickCap = number('picks', 3);
  const everyoneOpens = has('allopen');
  // Stress: each earlier showing makes a yes this much less likely, people stay half as long, fewer open.
  const weary = number('weary', 1);
  const attendance = number('attend', 1);
  const similarity = number('level', number('similar', 0));
  const byLevel = flags.some((f) => f.startsWith('level'));

  const people = population(members, cohort, menShare, seed, days);
  if (flags.includes('churn')) for (const q of people) q.lastDay = q.joinDay + Math.floor((q.lastDay - q.joinDay) / 2);
  const random = prng(seed * 31 + 7);
  const like = TASTES[taste]!;
  const N = members;
  const key = (a: number, b: number) => (a < b ? a * N + b : b * N + a);
  const seenKey = (viewer: number, subject: number) => viewer * N + subject;
  const shown = new Map<number, { times: number; last: number }>();
  const passes = new Map<number, { count: number; until: number }>();
  const matched = new Set<number>();
  const open = new Int32Array(N);
  const connections: { a: number; b: number; key: number }[] = [];
  const waitingToOpen: { a: number; b: number; key: number }[] = [];
  const lastMatch = new Int32Array(N).fill(-1);
  const lastSeen = new Int32Array(N).fill(-1);
  const matches = new Int32Array(N);
  const emptyDays = new Int32Array(N);
  const poolDays = new Int32Array(N);
  const underFive = new Int32Array(N);
  const firstIntro = new Int32Array(N).fill(-1);
  const spell = new Int32Array(N);
  const hadSpell = new Uint8Array(N);
  const activity = new Float64Array(N).fill(0.5);
  const seen = new Int32Array(N);
  const kept = new Int32Array(N);
  const reception = new Float64Array(N).fill(0.5);
  const receptionConfidence = new Float64Array(N);
  let total = 0;
  let totalIntros = 0;
  let abroadIntros = 0;
  let ageGap = 0;
  let repeatIntros = 0;
  let computeMs = 0;
  // How close in hidden appeal the people introduced were, once the score has had time to form.
  let appealGap = 0;
  let appealGapPairs = 0;
  const returnsFor = new Map<number, { from: number; day: number }[]>();
  let shownToTotal = 0;
  let shownToDays = 0;
  const abroadByAnswer = [0, 0];
  const introsByAnswer = [0, 0];
  const stats: Stats = { tables: 0, worstTableMs: 0, worstTableEdges: 0 };
  // Why a short day was short: too few people exist under their rules, they have all been seen too
  // lately, or they exist but their seats went elsewhere.
  // How often people are matched, read three ways: that day, that week, and among those not already full.
  let matchedDays = 0;
  let openedDays = 0;
  let matchedOnOpenedDays = 0;
  let duplicateSets = 0;
  const setSizes = [0, 0, 0, 0, 0, 0];
  let activeDays = 0;
  let fullDays = 0;
  let matchedWeeks = 0;
  let activeWeeks = 0;
  const matchedThisWeek = new Set<number>();
  // Cards by how many times that pair has been shown before: new, seen once, seen twice or more.
  const cardsBySeen = [0, 0, 0];
  const audience = new Map<number, Map<number, number>>();
  const dailyAudience: number[] = [];
  let shortFilters = 0;
  let shortHistory = 0;
  let shortSeats = 0;

  const [retrieval, allocatorName] = core!.split('+') as [string, string];
  const allocator: Allocator = allocatorName === 'random' ? randomAllocate : slot;
  const leagueShape = retrieval.match(/^league(\d+)x(\d+)$/);
  if (!leagueShape) throw new Error(`Unknown method ${method}`);
  const league = new League(seed * 7 + 1, Number(leagueShape[1]), Number(leagueShape[2]));

  for (let day = 0; day < days; day += 1) {
    const pool = people.filter((p) => {
      if (p.joinDay > day) return false;
      // Someone gone a fortnight stops taking up other people's introductions.
      const seen = lastSeen[p.i]! >= 0 ? lastSeen[p.i]! : p.joinDay;
      if (day - seen > 14) return false;
      return open[p.i]! < (p.premium ? Math.max(10, openCap) : openCap);
    });
    activeDays += pool.length;
    fullDays += people.filter((q) => {
      if (q.joinDay > day) return false;
      const was = lastSeen[q.i]! >= 0 ? lastSeen[q.i]! : q.joinDay;
      return day - was <= 14 && open[q.i]! >= (q.premium ? Math.max(10, openCap) : openCap);
    }).length;
    // Someone already waiting on an answer is not dealt again, either way round.
    const queued = new Set<number>();
    const closed = (a: number, b: number) => {
      const k = key(a, b);
      if (matched.has(k) || queued.has(k)) return true;
      const pass = passes.get(k);
      return !!pass && (pass.count >= 2 || pass.until > day);
    };
    const seenTooLately = (viewer: number, subject: number) => {
      const h = shown.get(seenKey(viewer, subject));
      if (!h) return false;
      if (resetAfter > 0 && day - h.last >= resetAfter) return false;
      return h.times >= maxShown || day - h.last < gap;
    };
    const today: Today = {
      people,
      left: new Int32Array(N),
      given: new Int32Array(N),
      activity,
      reception,
      receptionConfidence,
      similarity,
      byLevel,
      random,
      key,
      day,
      useActivity: has('active'),
      decay: 0.7,
      taken: new Set(),
      blocked: (a, b) => closed(a, b) || seenTooLately(a, b) || seenTooLately(b, a),
      freshness: (a, b) => Math.pow(freshDecay, Math.max(shown.get(seenKey(a, b))?.times ?? 0, shown.get(seenKey(b, a))?.times ?? 0)),
    };

    const started = performance.now();
    // Those who said yes come first in tomorrow's five, and take ordinary seats.
    const returnsToday = new Map<number, number[]>();
    const reservedNow = new Int32Array(N);
    const roomFor = (q: Person) => (q.premium ? 10 : 5);
    if (fill) {
      for (const q of pool) {
        const waiting = (returnsFor.get(q.i) ?? []).filter((r) => {
          const k = key(q.i, r.from);
          return day - r.day <= returnLife && !matched.has(k) && day <= people[r.from]!.lastDay && (passes.get(k)?.until ?? -1) < day;
        });
        returnsFor.set(q.i, waiting);
        for (const r of waiting) queued.add(key(q.i, r.from));
        const now = waiting.slice(0, roomFor(q)).map((r) => r.from);
        if (now.length) returnsToday.set(q.i, now);
        reservedNow[q.i] = now.length;
      }
    }
    let edges = playLeague(today, pool, allocator, league, stats, seed, elastic, elasticCap, has('independent'), fill ? reservedNow : undefined);
    computeMs += performance.now() - started;

    const canEver = new Int32Array(N);
    const canToday = new Int32Array(N);
    const poolMen = pool.filter((p) => p.male);
    const poolWomen = pool.filter((p) => !p.male);
    const inSet = new Set(edges.map((e) => key(e.a, e.b)));
    for (const a of poolMen) {
      for (const b of poolWomen) {
        const d = km(a, b);
        if (!accepts(a, b, d) || !accepts(b, a, d)) continue;
        canEver[a.i]! += 1;
        canEver[b.i]! += 1;
        const dealt = inSet.has(key(a.i, b.i));
        if (dealt || (!closed(a.i, b.i) && !seenTooLately(a.i, b.i))) canToday[a.i]! += 1;
        if (dealt || (!closed(a.i, b.i) && !seenTooLately(b.i, a.i))) canToday[b.i]! += 1;
      }
    }
    if (floor) {
      const counts = new Map<number, { men: number; women: number }>();
      for (const q of pool) {
        const c = counts.get(q.country) ?? { men: 0, women: 0 };
        if (q.male) c.men += 1;
        else c.women += 1;
        counts.set(q.country, c);
      }
      const seatsOf = (q: Person) => {
        const c = counts.get(q.country)!;
        const scarce = q.male ? c.men < c.women : c.women < c.men;
        const seats = elastic && scarce ? Math.min(elasticCap, Math.ceil((5 * Math.max(c.men, c.women)) / Math.max(1, Math.min(c.men, c.women)))) : 5;
        return Math.max(0, (q.premium ? Math.max(10, seats) : seats) - reservedNow[q.i]!);
      };
      edges = fillToFive(edges, pool, today, seatsOf, edgesAmong(poolMen, poolWomen, today));
    }

    const sets = new Map<number, number[]>();
    for (const e of edges) {
      for (const [viewer, subject] of [[e.a, e.b], [e.b, e.a]] as const) {
        const seenAs = seenKey(viewer, subject);
        const h = shown.get(seenAs);
        if (h) repeatIntros += 0.5;
        cardsBySeen[Math.min(2, h?.times ?? 0)]! += 1;
        shown.set(seenAs, { times: (h?.times ?? 0) + 1, last: day });
      }
      if (!sets.has(e.a)) sets.set(e.a, []);
      if (!sets.has(e.b)) sets.set(e.b, []);
      sets.get(e.a)!.push(e.b);
      sets.get(e.b)!.push(e.a);
      if (e.abroad) abroadIntros += 2;
      for (const i of [e.a, e.b]) {
        const answer = people[i]!.places.length > 1 ? 1 : 0;
        introsByAnswer[answer]! += 1;
        if (e.abroad) abroadByAnswer[answer]! += 1;
      }
      ageGap += Math.abs(people[e.a]!.age - people[e.b]!.age);
      if (day >= days / 2) {
        appealGap += Math.abs(people[e.a]!.appeal - people[e.b]!.appeal);
        appealGapPairs += 1;
      }
    }
    totalIntros += edges.length * 2;

    const oneWay: [number, number][] = [];
    const returned = new Set<string>();
    if (fill) {
      const counted = new Int32Array(N);
      for (const e of edges) {
        counted[e.a]! += 1;
        counted[e.b]! += 1;
      }
      for (const [q, list] of returnsToday) {
        if (!sets.has(q)) sets.set(q, []);
        for (const from of list) {
          sets.get(q)!.push(from);
          returned.add(`${q}:${from}`);
          counted[from]! += 1;
        }
      }
      const shortOnes = pool
        .filter((q) => (sets.get(q.i)?.length ?? 0) < roomFor(q))
        .map((q) => ({ q, k: random() }))
        .sort((x, y) => x.k - y.k)
        .map(({ q }) => q);
      for (const viewer of shortOnes) {
        const set = sets.get(viewer.i) ?? [];
        sets.set(viewer.i, set);
        const options = (viewer.male ? poolWomen : poolMen)
          .filter((other) => {
            if (set.includes(other.i) || closed(viewer.i, other.i) || seenTooLately(viewer.i, other.i)) return false;
            const d = km(viewer, other);
            return accepts(viewer, other, d) && accepts(other, viewer, d);
          })
          .map((other) => ({ other, v: fit(viewer, other, km(viewer, other)) }));
        while (set.length < roomFor(viewer) && options.length) {
          let best = 0;
          for (let t = 1; t < options.length; t += 1) {
            const a = options[t]!;
            const b = options[best]!;
            const timesA = shown.get(seenKey(viewer.i, a.other.i))?.times ?? 0;
            const timesB = shown.get(seenKey(viewer.i, b.other.i))?.times ?? 0;
            if (timesA !== timesB) {
              if (timesA < timesB) best = t;
            } else if (counted[a.other.i]! < counted[b.other.i]! || (counted[a.other.i] === counted[b.other.i] && a.v > b.v)) best = t;
          }
          const { other } = options.splice(best, 1)[0]!;
          set.push(other.i);
          counted[other.i]! += 1;
          oneWay.push([viewer.i, other.i]);
          const seenAs = seenKey(viewer.i, other.i);
          const h = shown.get(seenAs);
          if (h) repeatIntros += 0.5;
          cardsBySeen[Math.min(2, h?.times ?? 0)]! += 1;
          shown.set(seenAs, { times: (h?.times ?? 0) + 1, last: day });
          totalIntros += 1;
        }
      }
      for (const q of pool) {
        dailyAudience.push(counted[q.i]!);
        for (const j of sets.get(q.i) ?? []) {
          if (returned.has(`${q.i}:${j}`)) continue;
          if (!audience.has(j)) audience.set(j, new Map());
          audience.get(j)!.set(q.i, day);
        }
      }
    }

    // Who a scarce-side member actually sees today: those who already picked them first, then today's.
    const sawToday = new Set<string>();
    const fromReturn = new Set<string>();
    if (delayedCap > 0) {
      const menHere = pool.filter((p) => p.male).length;
      const scarceMale = menHere < pool.length - menHere;
      for (const p of pool) {
        if (p.male !== scarceMale) continue;
        if (!sets.has(p.i) && !returnsFor.has(p.i)) continue;
        const today_ = sets.get(p.i) ?? [];
        shownToTotal += today_.length;
        shownToDays += 1;
        // Interest only lives so long, and is checked again on delivery: they may have left or closed the pair.
        const waiting = (returnsFor.get(p.i) ?? []).filter((r) => {
          const k = key(p.i, r.from);
          return day - r.day <= returnLife && !matched.has(k) && day <= people[r.from]!.lastDay && (passes.get(k)?.until ?? -1) < day;
        });
        returnsFor.set(p.i, waiting);
        const room = p.premium ? 10 : 5;
        const fromQueue = waiting.slice(0, room);
        const visible = [...fromQueue.map((r) => r.from), ...today_.filter((j) => !fromQueue.some((r) => r.from === j))].slice(0, room);
        for (const r of fromQueue) fromReturn.add(`${p.i}:${r.from}`);
        for (const j of visible) sawToday.add(`${p.i}:${j}`);
        sets.set(p.i, visible);
      }
    }

    for (const [q, list] of sets) {
      if (new Set(list).size !== list.length) duplicateSets += 1;
    }
    const openedToday = new Set<number>();
    const picked = new Set<string>();
    for (const p of pool) {
      const i = p.i;
      poolDays[i]! += 1;
      const size = sets.get(i)?.length ?? 0;
      setSizes[Math.min(5, size)]! += 1;
      if (size === 0) emptyDays[i]! += 1;
      else if (firstIntro[i] === -1) firstIntro[i] = day;
      if (size < 5) {
        underFive[i]! += 1;
        if (canEver[i]! < 5) shortFilters += 1;
        else if (canToday[i]! < 5) shortHistory += 1;
        else shortSeats += 1;
      }

      const recentlyActive = day - Math.max(lastSeen[i]!, p.joinDay) <= 7;
      spell[i] = size === 0 && recentlyActive ? spell[i]! + 1 : 0;
      if (spell[i]! >= 7) hadSpell[i] = 1;

      if (day > p.lastDay) continue;
      const weekly = [1, 1, 1, 0.9, 1.05, 1.1, 1][day % 7]!;
      const dry = day - Math.max(lastMatch[i]!, p.joinDay);
      const opened = everyoneOpens || draw(seed, 1, i, day) < Math.min(0.98, attendance * p.openRate * weekly * Math.max(0.5, Math.pow(0.97, dry)));
      activity[i] = 0.93 * activity[i]! + 0.07 * (opened ? 1 : 0);
      if (!opened) continue;
      openedDays += 1;
      openedToday.add(i);
      lastSeen[i] = day;
      const set = sets.get(i);
      if (!set) continue;
      const wanted = set
        .map((j) => {
          const q = people[j]!;
          const before = Math.max(0, (shown.get(seenKey(i, j))?.times ?? 1) - 1);
          return { j, v: sigmoid(like(p, q, fit(p, q, km(p, q)), chemistry(seed, i, j))) * Math.pow(weary, before) };
        })
        .filter(({ j, v }) => draw(seed, 2, i, j, day) < v)
        .sort((x, y) => y.v - x.v)
        .slice(0, p.premium ? Math.max(10, pickCap) : pickCap);
      const keeps = new Set(wanted.map(({ j }) => j));
      for (const j of set) {
        seen[j]! += 1;
        if (keeps.has(j)) kept[j]! += 1;
      }
      for (const j of keeps) picked.add(`${i}:${j}`);
      // Some of those left unchosen are a deliberate pass, which closes the pair for a while.
      for (const j of set) {
        if (keeps.has(j) || draw(seed, 5, i, j, day) >= 0.15) continue;
        const k = key(i, j);
        const pass = passes.get(k);
        passes.set(k, { count: (pass?.count ?? 0) + 1, until: day + 30 });
      }
    }
    const mutuals: { a: number; b: number }[] = delayedCap > 0 ? [] : edges.filter((e) => picked.has(`${e.a}:${e.b}`) && picked.has(`${e.b}:${e.a}`));
    if (delayedCap > 0) {
      const menHere = pool.filter((p) => p.male).length;
      const scarceMale = menHere < pool.length - menHere;
      // Anyone the scarce side picked from their queue had already picked them.
      for (const entry of fromReturn) {
        const [w, m] = entry.split(':').map(Number) as [number, number];
        if (lastSeen[w] === day) {
          returnsFor.set(w, (returnsFor.get(w) ?? []).filter((r) => r.from !== m));
          if (picked.has(entry)) mutuals.push({ a: m, b: w });
        }
      }
      for (const e of edges) {
        const surplus = people[e.a]!.male === scarceMale ? e.b : e.a;
        const scarce = surplus === e.a ? e.b : e.a;
        if (fromReturn.has(`${scarce}:${surplus}`)) continue;
        if (!picked.has(`${surplus}:${scarce}`)) continue;
        if (sawToday.has(`${scarce}:${surplus}`) && lastSeen[scarce] === day) {
          if (picked.has(`${scarce}:${surplus}`)) mutuals.push(e);
        } else {
          const list = returnsFor.get(scarce) ?? [];
          if (!list.some((r) => r.from === surplus)) list.push({ from: surplus, day });
          returnsFor.set(scarce, list);
        }
      }
    }
    if (fill) {
      for (const [v, subject] of oneWay) {
        if (!picked.has(`${v}:${subject}`)) continue;
        const list = returnsFor.get(subject) ?? [];
        if (!list.some((r) => r.from === v)) list.push({ from: v, day });
        returnsFor.set(subject, list);
      }
      for (const entry of returned) {
        const [q, from] = entry.split(':').map(Number) as [number, number];
        if (lastSeen[q] !== day) continue;
        returnsFor.set(q, (returnsFor.get(q) ?? []).filter((r) => r.from !== from));
        const seenAs = seenKey(q, from);
        const h = shown.get(seenAs);
        if (h) repeatIntros += 0.5;
        cardsBySeen[Math.min(2, h?.times ?? 0)]! += 1;
        shown.set(seenAs, { times: (h?.times ?? 0) + 1, last: day });
        totalIntros += 1;
        if (!audience.has(from)) audience.set(from, new Map());
        audience.get(from)!.set(q, day);
        if (picked.has(entry)) mutuals.push({ a: from, b: q } as never);
      }
    }
    const matchedNow = new Set<number>();
    for (const e of mutuals) {
      matchedNow.add(e.a);
      matchedNow.add(e.b);
      matchedThisWeek.add(e.a);
      matchedThisWeek.add(e.b);
    }
    matchedDays += matchedNow.size;
    for (const i of matchedNow) if (openedToday.has(i)) matchedOnOpenedDays += 1;
    if (day % 7 === 6) {
      activeWeeks += pool.length;
      matchedWeeks += pool.filter((q) => matchedThisWeek.has(q.i)).length;
      matchedThisWeek.clear();
    }
    for (const e of mutuals) {
      {
        const k = key(e.a, e.b);
        matched.add(k);
        total += 1;
        matches[e.a]! += 1;
        matches[e.b]! += 1;
        lastMatch[e.a] = day;
        lastMatch[e.b] = day;
        waitingToOpen.push({ a: e.a, b: e.b, key: k });
      }
    }
    // Evidence comes slowly, so a newcomer stays at the middle until there is some.
    for (let i = 0; i < N; i += 1) {
      receptionConfidence[i] = Math.min(1, seen[i]! / 30);
      reception[i] = seen[i]! ? kept[i]! / seen[i]! : 0.5;
    }
    if (byLevel) {
      const order = people.filter((p) => seen[p.i]! > 0).sort((x, y) => reception[x.i]! - reception[y.i]!);
      order.forEach((p, at) => { reception[p.i] = (at + 0.5) / order.length; });
    }
    // A connection opens when both have room, and ends for both of them together.
    for (let at = connections.length - 1; at >= 0; at -= 1) {
      const c = connections[at]!;
      if (draw(seed, 3, c.a, c.b, day) < 0.05) {
        open[c.a]! -= 1;
        open[c.b]! -= 1;
        connections.splice(at, 1);
      }
    }
    for (let at = 0; at < waitingToOpen.length; at += 1) {
      const c = waitingToOpen[at]!;
      const room = (i: number) => open[i]! < (people[i]!.premium ? Math.max(10, openCap) : openCap);
      if (room(c.a) && room(c.b)) {
        open[c.a]! += 1;
        open[c.b]! += 1;
        connections.push(c);
        waitingToOpen.splice(at, 1);
        at -= 1;
      }
    }
  }

  const counted = people.filter((p) => poolDays[p.i]! >= 7);
  const pct = (part: number, whole: number) => (whole ? Math.round((1000 * part) / whole) / 10 : null);
  const noMatch = (group: Person[]) => pct(group.filter((p) => matches[p.i]! === 0).length, group.length);
  const sum = (group: Person[], values: Int32Array) => group.reduce((s, p) => s + values[p.i]!, 0);
  const byAppeal = [...counted].sort((x, y) => x.appeal - y.appeal);
  const tenth = Math.floor(byAppeal.length / 10);
  const free = people.filter((p) => !p.premium);

  // How many people each member could ever be shown, under both people's rules.
  const reach = new Int32Array(N);
  if (N <= 3000) {
    for (const a of people.filter((p) => p.male)) {
      for (const b of people.filter((p) => !p.male)) {
        const d = km(a, b);
        if (accepts(a, b, d) && accepts(b, a, d)) {
          reach[a.i]! += 1;
          reach[b.i]! += 1;
        }
      }
    }
  }
  const narrowReach = N <= 3000 ? people.filter((p) => reach[p.i]! < 35) : [];
  const wideReach = N <= 3000 ? people.filter((p) => reach[p.i]! >= 35) : people;

  return {
    method, taste, seed, members, days, cohort, menShare,
    matches: total,
    noMatch: noMatch(counted),
    noMatchBottomAppeal: noMatch(byAppeal.slice(0, tenth)),
    noMatchTopAppeal: noMatch(byAppeal.slice(-tenth)),
    noMatchMen: noMatch(counted.filter((p) => p.male)),
    noMatchWomen: noMatch(counted.filter((p) => !p.male)),
    noMatchNarrow: noMatch(counted.filter((p) => p.narrow)),
    noMatchRare: noMatch(counted.filter((p) => p.rare)),
    noMatchFree: noMatch(counted.filter((p) => !p.premium)),
    noMatchPremium: noMatch(counted.filter((p) => p.premium)),
    noMatchNewcomers: noMatch(counted.filter((p) => p.joinDay > 0)),
    meanIntros: pct(totalIntros, poolDays.reduce((s, v) => s + v, 0) * 10) === null ? 0 : Math.round((totalIntros / poolDays.reduce((s, v) => s + v, 0)) * 100) / 100,
    under5: pct(sum(people, underFive), sum(people, poolDays)),
    under5Men: pct(sum(people.filter((p) => p.male), underFive), sum(people.filter((p) => p.male), poolDays)),
    under5Women: pct(sum(people.filter((p) => !p.male), underFive), sum(people.filter((p) => !p.male), poolDays)),
    under5Free: pct(sum(free, underFive), sum(free, poolDays)),
    under5WideReach: pct(sum(wideReach, underFive), sum(wideReach, poolDays)),
    audienceMean: dailyAudience.length ? Math.round((dailyAudience.reduce((a, b) => a + b, 0) / dailyAudience.length) * 100) / 100 : 0,
    audienceP95: dailyAudience.length ? [...dailyAudience].sort((a, b) => a - b)[Math.floor(dailyAudience.length * 0.95)]! : 0,
    audienceMax: dailyAudience.length ? Math.max(...dailyAudience.slice(-Math.min(dailyAudience.length, 50000))) : 0,
    weekAudienceP95: (() => {
      const weekly: number[] = [];
      for (const q of people) {
        if (q.male) continue;
        let n = 0;
        for (const last of audience.get(q.i)?.values() ?? []) if (last >= days - 7) n += 1;
        weekly.push(n);
      }
      return weekly.sort((a, b) => a - b)[Math.floor(weekly.length * 0.95)] ?? 0;
    })(),
    cardsBySeen: cardsBySeen.map((n) => pct(n, cardsBySeen[0]! + cardsBySeen[1]! + cardsBySeen[2]!)),
    matchedPerDay: pct(matchedDays, activeDays),
    matchedPerOpenDay: pct(matchedOnOpenedDays, openedDays),
    duplicateSets,
    weekAudienceMenP95: (() => {
      const weekly: number[] = [];
      for (const q of people) {
        if (!q.male) continue;
        let n = 0;
        for (const last of audience.get(q.i)?.values() ?? []) if (last >= days - 7) n += 1;
        weekly.push(n);
      }
      return weekly.sort((a, b) => a - b)[Math.floor(weekly.length * 0.95)] ?? 0;
    })(),
    openedShare: pct(openedDays, activeDays),
    setSizes: setSizes.map((n) => pct(n, setSizes.reduce((a, b) => a + b, 0))),
    matchedPerWeek: pct(matchedWeeks, activeWeeks),
    fullShare: pct(fullDays, activeDays + fullDays),
    shortFilters: pct(shortFilters, sum(people, poolDays)),
    shortHistory: pct(shortHistory, sum(people, poolDays)),
    shortSeats: pct(shortSeats, sum(people, poolDays)),
    under5NarrowReach: pct(sum(narrowReach, underFive), sum(narrowReach, poolDays)),
    narrowReachShare: pct(narrowReach.length, N),
    zeroDays: pct(sum(people, emptyDays), sum(people, poolDays)),
    zeroDaysWideReach: pct(sum(wideReach, emptyDays), sum(wideReach, poolDays)),
    spell7: pct(counted.filter((p) => hadSpell[p.i]).length, counted.length),
    spell7WideReach: pct(wideReach.filter((p) => hadSpell[p.i]).length, wideReach.length),
    abroadShare: pct(abroadIntros, totalIntros),
    abroadByAnswer: abroadByAnswer.map((n, at) => pct(n, introsByAnswer[at]!) ?? 0),
    repeatShare: pct(repeatIntros * 2, totalIntros),
    ageGap: totalIntros ? Math.round((ageGap / (totalIntros / 2)) * 100) / 100 : 0,
    appealGap: appealGapPairs ? Math.round((appealGap / appealGapPairs) * 1000) / 1000 : 0,
    shownToPerDay: shownToDays ? Math.round((shownToTotal / shownToDays) * 100) / 100 : 0,
    computeMsPerDay: Math.round(computeMs / days),
    tablesPerDay: Math.round(stats.tables / days),
    worstTableMs: Math.round(stats.worstTableMs),
    worstTableEdges: stats.worstTableEdges,
  };
}

if (process.argv[1]?.endsWith('lab.mts')) {
  console.log(JSON.stringify(run({
    method: flag('method', 'league500x5+slot'),
    taste: flag('taste', 'appeal'),
    members: Number(flag('members', '2000')),
    days: Number(flag('days', '30')),
    seed: Number(flag('seed', '1')),
    cohort: flag('cohort', 'city'),
    menShare: Number(flag('men', '0.5')),
  })));
}
