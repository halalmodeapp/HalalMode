/**
 * The league: who meets whom at one table.
 *
 * The pool is split into tables small enough to compare everyone at them, and a
 * schedule moves people between tables so that every pair shares one within days
 * (see `league_deal` in the database). This module is what happens at a table. It
 * is pure, needs nothing but the table, and fits well inside an Edge request.
 *
 * It only proposes. The database checks every proposal against the live rules when
 * it commits, so the worst a mistake here can do is lose an introduction, never
 * show one that should not be shown. tests/leagueParity.test.ts and the backend
 * simulation hold the rules here to the ones in `member_accepts`.
 *
 * Five curated introductions only work if they are people who could really choose each other, so like
 * meets like: the private reception estimate gently favours pairs who are received alike. It never lifts
 * anyone for being wanted, is never shown, and counts only as far as there is evidence about both people.
 */

/** Everything about a member a table needs. Server-side only. */
export interface LeagueMember {
  id: string;
  gender: string;
  isPremium: boolean;
  /** Seats this member has at this table. */
  seats: number;
  /** Introductions this member already has in this cycle. */
  given: number;
  /** Private estimate of how this member is received, and how much evidence backs it. Never shown. */
  receptionScore: number;
  receptionConfidence: number;
  maritalStatus: string | null;
  countryKey: string;
  latitude: number | null;
  longitude: number | null;
  age: number;
  sect: string | null;
  sectDetail: string | null;
  religiousPractice: string | null;
  timeline: string | null;
  familyGoals: string | null;
  hasChildren: string | null;
  occupation: string | null;
  education: string | null;
  religiousDress: string | null;
  languagesSpoken: string[];
  ethnicities: string[];
  heritageCountries: string[];
  grewUpCountries: string[];
  diet: string[];
  minAge: number;
  maxAge: number;
  minHeightCm: number;
  maxHeightCm: number;
  ownHeightCm: number | null;
  preferredBuilds: string[];
  ownBuild: string | null;
  ownBuildAlso: string | null;
  preferredPractice: string[];
  desiredTimeline: string[];
  desiredFamilyGoals: string[];
  preferredSects: string[];
  preferredSectDetails: string[];
  /** Sect of each chosen madhhab, so a whole sect can be told from a part of one. */
  detailSects: Record<string, string>;
  maxDistanceKm: number;
  preferredCountryKeys: string[];
  acceptedMaritalStatuses: string[];
  mustHave: Record<string, unknown>;
  premiumMustHave: Record<string, unknown>;
  preferredHasChildren: string[];
  preferredOccupations: string[];
  preferredLanguages: string[];
  preferredEducation: string[];
  preferredDress: string[];
  preferredEthnicities: string[];
  preferredHeritageCountries: string[];
  preferredGrewUpCountries: string[];
  preferredDiet: string[];
}

export interface LeagueSettings {
  seatDecay: number;
  freshDecay: number;
  /** How strongly people at the same level are favoured. */
  likeMeetsLike: number;
  weights: Record<string, number>;
  falloff: Record<string, number>;
  distanceFreeKm: number;
  sectMismatchScore: number;
  /** Position of each value on each ordered scale: criterion, then value. */
  scales: Record<string, Record<string, number>>;
}

export interface LeagueProposal {
  a: string;
  b: string;
  score: number;
}

const must = (flags: Record<string, unknown>, name: string) => flags[name] === true;
const overlaps = (left: string[], right: string[]) => left.some((value) => right.includes(value));

export function distanceKm(a: LeagueMember, b: LeagueMember): number | null {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return null;
  const radians = Math.PI / 180;
  const cosine = Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians)
    * Math.cos((b.longitude - a.longitude) * radians)
    + Math.sin(a.latitude * radians) * Math.sin(b.latitude * radians);
  return 6371 * Math.acos(Math.min(1, Math.max(-1, cosine)));
}

function sectAllows(viewer: LeagueMember, subject: LeagueMember): boolean {
  if (viewer.preferredSects.length === 0 || subject.sect === 'prefer_not_to_say') return true;
  if (subject.sect === null || !viewer.preferredSects.includes(subject.sect)) return false;
  const madhhabChosen = viewer.preferredSectDetails.some((detail) => viewer.detailSects[detail] === subject.sect);
  return !madhhabChosen || subject.sectDetail === null || viewer.preferredSectDetails.includes(subject.sectDetail);
}

function premiumFiltersAllow(viewer: LeagueMember, subject: LeagueMember): boolean {
  if (!viewer.isPremium) return true;
  const flags = viewer.premiumMustHave;
  if (must(flags, 'has_children') && viewer.preferredHasChildren.length > 0 && subject.hasChildren !== null
      && subject.hasChildren !== 'prefer_not_to_say' && !viewer.preferredHasChildren.includes(subject.hasChildren)) return false;
  if (must(flags, 'occupations') && viewer.preferredOccupations.length > 0 && subject.occupation
      && !viewer.preferredOccupations.includes(subject.occupation)) return false;
  if (must(flags, 'languages') && viewer.preferredLanguages.length > 0 && subject.languagesSpoken.length > 0
      && !overlaps(subject.languagesSpoken, viewer.preferredLanguages)) return false;
  if (must(flags, 'education') && viewer.preferredEducation.length > 0 && subject.education !== null
      && !viewer.preferredEducation.includes(subject.education)) return false;
  if (must(flags, 'dress') && viewer.preferredDress.length > 0 && subject.religiousDress !== null
      && !viewer.preferredDress.includes(subject.religiousDress)) return false;
  if (must(flags, 'ethnicities') && viewer.preferredEthnicities.length > 0 && subject.ethnicities.length > 0
      && !subject.ethnicities.includes('prefer_not_to_say') && !overlaps(subject.ethnicities, viewer.preferredEthnicities)) return false;
  if (must(flags, 'heritage') && viewer.preferredHeritageCountries.length > 0 && subject.heritageCountries.length > 0
      && !subject.heritageCountries.includes('prefer_not_to_say') && !overlaps(subject.heritageCountries, viewer.preferredHeritageCountries)) return false;
  if (must(flags, 'grew_up') && viewer.preferredGrewUpCountries.length > 0 && subject.grewUpCountries.length > 0
      && !overlaps(subject.grewUpCountries, viewer.preferredGrewUpCountries)) return false;
  if (must(flags, 'diet') && viewer.preferredDiet.length > 0 && subject.diet.length > 0
      && !overlaps(subject.diet, viewer.preferredDiet)) return false;
  return true;
}

/** Whether `viewer` accepts `subject`, under the viewer's own rules. Mirrors `member_accepts`. */
export function accepts(viewer: LeagueMember, subject: LeagueMember, distance: number | null): boolean {
  if (subject.maritalStatus === null || !viewer.acceptedMaritalStatuses.includes(subject.maritalStatus)) return false;
  const flags = viewer.mustHave;
  if (must(flags, 'age') && (subject.age < viewer.minAge || subject.age > viewer.maxAge)) return false;
  if (must(flags, 'height') && subject.ownHeightCm !== null
      && (subject.ownHeightCm < viewer.minHeightCm || subject.ownHeightCm > viewer.maxHeightCm)) return false;
  if (must(flags, 'build') && viewer.preferredBuilds.length > 0 && subject.ownBuild !== null
      && !viewer.preferredBuilds.includes(subject.ownBuild)
      && !(subject.ownBuildAlso !== null && viewer.preferredBuilds.includes(subject.ownBuildAlso))) return false;
  if (viewer.isPremium && must(flags, 'practice') && viewer.preferredPractice.length > 0
      && !(subject.religiousPractice !== null && viewer.preferredPractice.includes(subject.religiousPractice))) return false;
  if (viewer.isPremium && must(flags, 'timeline') && viewer.desiredTimeline.length > 0
      && !(subject.timeline !== null && viewer.desiredTimeline.includes(subject.timeline))) return false;
  if (viewer.isPremium && must(flags, 'children') && viewer.desiredFamilyGoals.length > 0
      && !(subject.familyGoals !== null && viewer.desiredFamilyGoals.includes(subject.familyGoals))) return false;
  if (must(flags, 'sect') && !sectAllows(viewer, subject)) return false;
  // A must-have distance is a must-have wherever the other person lives. Unknown is not near.
  if (must(flags, 'distance') && (distance === null || distance > viewer.maxDistanceKm)) return false;
  if (!viewer.preferredCountryKeys.includes(subject.countryKey)) return false;
  return premiumFiltersAllow(viewer, subject);
}

function proximity(settings: LeagueSettings, criterion: string, left: string, right: string | null): number {
  const scale = settings.scales[criterion];
  const from = scale?.[left];
  const to = right === null ? undefined : scale?.[right];
  if (from === undefined || to === undefined) return 1;
  const falloff = Math.max(0.01, Math.min(1, settings.falloff[criterion] ?? 1));
  return Math.pow(falloff, Math.abs(from - to));
}

function closestOf(settings: LeagueSettings, criterion: string, wanted: string[], actual: string | null): number {
  let best = 0;
  for (const value of wanted) best = Math.max(best, proximity(settings, criterion, value, actual));
  return best;
}

function taper(value: number, low: number, high: number): number {
  if (value >= low && value <= high) return 1;
  const outside = value < low ? low - value : value - high;
  return Math.max(0, 1 - outside / Math.max(1, high - low));
}

/**
 * How well `subject` fits what `viewer` said they want, 0 to 1. Mirrors `compatibility`, without
 * relocation: wanting someone abroad is a separate question from being willing to move.
 */
export function fit(viewer: LeagueMember, subject: LeagueMember, distance: number | null, settings: LeagueSettings): number {
  const { weights } = settings;
  let total = 0;
  let used = 0;
  const add = (term: number, weight: number | undefined) => {
    total += term * (weight ?? 0);
    used += weight ?? 0;
  };
  add(taper(subject.age, viewer.minAge, viewer.maxAge), weights.age);
  if (subject.ownHeightCm !== null) add(taper(subject.ownHeightCm, viewer.minHeightCm, viewer.maxHeightCm), weights.height);
  if (viewer.preferredBuilds.length > 0 && subject.ownBuild !== null) {
    add(closestOf(settings, 'build', viewer.preferredBuilds, subject.ownBuild), weights.build);
  }
  if (viewer.preferredPractice.length > 0) add(closestOf(settings, 'practice', viewer.preferredPractice, subject.religiousPractice), weights.practice);
  if (viewer.desiredTimeline.length > 0) add(closestOf(settings, 'timeline', viewer.desiredTimeline, subject.timeline), weights.timeline);
  if (viewer.desiredFamilyGoals.length > 0) add(closestOf(settings, 'children', viewer.desiredFamilyGoals, subject.familyGoals), weights.children);
  if (viewer.preferredSects.length > 0) {
    const same = subject.sect === 'prefer_not_to_say' || (subject.sect !== null && viewer.preferredSects.includes(subject.sect));
    add(same ? 1 : settings.sectMismatchScore, (weights.practice ?? 0) * 0.5);
  }
  if (viewer.countryKey === subject.countryKey && distance !== null) {
    add(distance <= settings.distanceFreeKm
      ? 1
      : Math.max(0, 1 - (distance - settings.distanceFreeKm) / Math.max(1, viewer.maxDistanceKm - settings.distanceFreeKm)), weights.distance);
  } else {
    add(0.75, weights.distance);
  }
  const shared = viewer.languagesSpoken.filter((language) => subject.languagesSpoken.includes(language)).length;
  add(Math.min(1, shared / 2), weights.languages);
  return used > 0 ? Math.min(1, Math.max(0, total / used)) : 0.5;
}

export interface LeagueTable {
  members: LeagueMember[];
  /** Pairs who must not meet: blocked, hidden, connected, passed, shown too recently. */
  closed: [string, string][];
  /** How many times each pair at the table has already been shown. */
  shown: [string, string, number][];
  seed: number;
  /** A table of one-way cards: those with seats are shown people, and the others are only shown. */
  oneWay?: boolean;
  /** How many times each of a pair has seen the other: first id, second id, first saw, second saw. */
  seen?: [string, string, number, number][];
}

/**
 * Where each person with any evidence stands among the people at this table, 0 to 1. Raw scores bunch
 * together, so standing is what tells people apart.
 */
export function levelsAt(members: LeagueMember[]): Map<string, number> {
  const known = members.filter((m) => m.receptionConfidence > 0)
    .sort((x, y) => x.receptionScore - y.receptionScore || (x.id < y.id ? -1 : 1));
  return new Map(known.map((m, at) => [m.id, (at + 0.5) / known.length]));
}

/**
 * Favours people at the same level, as far as the evidence about both allows. With nothing known about
 * either person it is exactly 1, so a newcomer, and everyone at launch, is simply unaffected.
 */
export function likeMeetsLike(levelA: number | undefined, confidenceA: number, levelB: number | undefined, confidenceB: number, strength: number): number {
  if (levelA === undefined || levelB === undefined) return 1;
  return Math.exp(-strength * confidenceA * confidenceB * Math.abs(levelA - levelB));
}

/** A stable number for a member, so a table played twice gives the same answer. */
function memberHash(seed: number, id: string): number {
  let hash = seed >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * How many candidates each member brings to the table at a time. Someone can only be shown a handful a
 * day, so comparing all 500 people opposite them for every seat would be wasted work. Anyone still short
 * when these run out brings the next ones, so this saves time and never costs a seat.
 */
const CANDIDATES_AT_A_TIME = 50;

/**
 * Plays one table.
 *
 * Everyone gets a first before anyone gets a second. The value of an introduction is how much both
 * might want it, ranked below anyone new if they have met before, times how much each person still
 * needs one. That one line does the work of a fairness boost, a rotation queue, an exploration pass
 * and a repair pass, because a person with few introductions is worth more to everybody at the table.
 */
export function playTable(table: LeagueTable, settings: LeagueSettings): LeagueProposal[] {
  const genders = [...new Set(table.members.map((m) => m.gender))].sort();
  if (genders.length !== 2) return [];
  const byId = (x: LeagueMember, y: LeagueMember) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const left = table.members.filter((m) => m.gender === genders[0]).sort(byId);
  const right = table.members.filter((m) => m.gender === genders[1]).sort(byId);
  const leftAt = new Map(left.map((m, at) => [m.id, at]));
  const rightAt = new Map(right.map((m, at) => [m.id, at]));
  const R = right.length;
  const pairOf = (x: string, y: string): number | null => {
    const l = leftAt.get(x) ?? leftAt.get(y);
    const r = rightAt.get(x) ?? rightAt.get(y);
    return l === undefined || r === undefined ? null : l * R + r;
  };
  const closed = new Set<number>();
  for (const [x, y] of table.closed) {
    const pair = pairOf(x, y);
    if (pair !== null) closed.add(pair);
  }
  const shown = new Map<number, number>();
  for (const [x, y, times] of table.shown) {
    const pair = pairOf(x, y);
    if (pair !== null) shown.set(pair, times);
  }

  // Everyone who could meet, and how much they might want to.
  const levels = levelsAt(table.members);
  const hashes = [...left, ...right].map((m) => memberHash(table.seed, m.id));
  const L = left.length;
  const pairs: number[] = [];
  const wants: number[] = [];
  const ties: number[] = [];
  for (let l = 0; l < L; l += 1) {
    const a = left[l]!;
    if (a.seats <= 0) continue;
    for (let r = 0; r < R; r += 1) {
      const b = right[r]!;
      if (b.seats <= 0) continue;
      const pair = l * R + r;
      if (closed.has(pair)) continue;
      const distance = distanceKm(a, b);
      if (!accepts(a, b, distance) || !accepts(b, a, distance)) continue;
      const wa = 0.5 + 0.25 * fit(a, b, distance, settings);
      const wb = 0.5 + 0.25 * fit(b, a, distance, settings);
      pairs.push(pair);
      wants.push(wa * wb * Math.pow(settings.freshDecay, shown.get(pair) ?? 0)
        * likeMeetsLike(levels.get(a.id), a.receptionConfidence, levels.get(b.id), b.receptionConfidence, settings.likeMeetsLike));
      ties.push(Math.imul(hashes[l]! ^ Math.imul(hashes[L + r]!, 0x9e3779b1), 0x85ebca6b) >>> 0);
    }
  }

  // Each person's best candidates, which is enough to fill any set.
  const byValue = (x: number, y: number) => wants[y]! - wants[x]! || ties[x]! - ties[y]!;
  const ofMember: number[][] = Array.from({ length: L + R }, () => []);
  for (let at = 0; at < pairs.length; at += 1) {
    const pair = pairs[at]!;
    ofMember[Math.floor(pair / R)]!.push(at);
    ofMember[L + pair % R]!.push(at);
  }
  for (const list of ofMember) list.sort(byValue);
  const reachedInList = new Int32Array(L + R);
  const broughtIn = new Uint8Array(pairs.length);

  const room = [...left, ...right].map((m) => m.seats);
  const given = [...left, ...right].map((m) => m.given);
  const needs = Array.from({ length: 64 }, (_, n) => Math.pow(settings.seatDecay, n));
  const need = (at: number) => needs[Math.min(63, given[at]!)]!;
  const proposals: LeagueProposal[] = [];
  const otherSide = (at: number, member: number) => {
    const pair = pairs[at]!;
    const l = Math.floor(pair / R);
    return member === l ? L + pair % R : l;
  };
  // Whoever still has a seat brings their next few candidates who also have one.
  const bringNext = () => {
    const brought: number[] = [];
    for (let member = 0; member < L + R; member += 1) {
      if (room[member]! <= 0) continue;
      const list = ofMember[member]!;
      let count = 0;
      while (reachedInList[member]! < list.length && count < CANDIDATES_AT_A_TIME) {
        const at = list[reachedInList[member]!]!;
        reachedInList[member]! += 1;
        if (broughtIn[at] || room[otherSide(at, member)]! <= 0) continue;
        broughtIn[at] = 1;
        brought.push(at);
        count += 1;
      }
    }
    return brought;
  };

  let alive = bringNext();
  while (alive.length > 0) {
    const values = new Map<number, number>();
    for (const at of alive) {
      const pair = pairs[at]!;
      values.set(at, wants[at]! * (need(Math.floor(pair / R)) + need(L + pair % R)));
    }
    alive.sort((x, y) => values.get(y)! - values.get(x)! || ties[x]! - ties[y]!);
    const seatedNow = new Uint8Array(L + R);
    const placedNow = new Set<number>();
    for (const at of alive) {
      const pair = pairs[at]!;
      const l = Math.floor(pair / R);
      const r = L + pair % R;
      if (seatedNow[l] || seatedNow[r]) continue;
      seatedNow[l] = 1;
      seatedNow[r] = 1;
      room[l]! -= 1;
      room[r]! -= 1;
      proposals.push({ a: left[l]!.id, b: right[pair % R]!.id, score: Number(wants[at]!.toFixed(5)) });
      placedNow.add(at);
    }
    for (let at = 0; at < L + R; at += 1) if (seatedNow[at]) given[at]! += 1;
    alive = alive.filter((at) => {
      const pair = pairs[at]!;
      return !placedNow.has(at) && room[Math.floor(pair / R)]! > 0 && room[L + pair % R]! > 0;
    });
    if (alive.length === 0) alive = bringNext();
  }
  return proposals;
}

/**
 * Fills seats one way, for anyone the games left short. People they have seen least come first, then
 * whoever is in fewest sets today, then whoever fits best, so nobody needs a fixed limit: the load simply
 * spreads as evenly as the rules allow. `given` is how many sets a member is already in today.
 */
export function playOneWay(table: LeagueTable, settings: LeagueSettings): LeagueProposal[] {
  const closed = new Set<string>();
  for (const [x, y] of table.closed) {
    closed.add(`${x}:${y}`);
    closed.add(`${y}:${x}`);
  }
  const seen = new Map<string, number>();
  for (const [x, y, xSaw, ySaw] of table.seen ?? []) {
    seen.set(`${x}:${y}`, xSaw);
    seen.set(`${y}:${x}`, ySaw);
  }
  const load = new Map(table.members.map((m) => [m.id, m.given]));
  const viewers = table.members
    .filter((m) => m.seats > 0)
    .sort((x, y) => memberHash(table.seed, x.id) - memberHash(table.seed, y.id) || (x.id < y.id ? -1 : 1));
  const proposals: LeagueProposal[] = [];
  for (const viewer of viewers) {
    const options: { subject: LeagueMember; times: number; fits: number }[] = [];
    for (const subject of table.members) {
      if (subject.gender === viewer.gender || closed.has(`${viewer.id}:${subject.id}`)) continue;
      const distance = distanceKm(viewer, subject);
      if (!accepts(viewer, subject, distance) || !accepts(subject, viewer, distance)) continue;
      options.push({ subject, times: seen.get(`${viewer.id}:${subject.id}`) ?? 0, fits: fit(viewer, subject, distance, settings) });
    }
    for (let seat = 0; seat < viewer.seats && options.length > 0; seat += 1) {
      let best = 0;
      for (let at = 1; at < options.length; at += 1) {
        const x = options[at]!;
        const y = options[best]!;
        const loadX = load.get(x.subject.id)!;
        const loadY = load.get(y.subject.id)!;
        if (x.times < y.times || (x.times === y.times && (loadX < loadY || (loadX === loadY && x.fits > y.fits)))) best = at;
      }
      const { subject, fits } = options.splice(best, 1)[0]!;
      load.set(subject.id, load.get(subject.id)! + 1);
      // A pair is dealt once a day, so the other of them is not then shown this one as well.
      closed.add(`${subject.id}:${viewer.id}`);
      proposals.push({ a: viewer.id, b: subject.id, score: Number(fits.toFixed(5)) });
    }
  }
  return proposals;
}
