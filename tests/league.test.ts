import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accepts,
  distanceKm,
  fit,
  likeMeetsLike,
  playOneWay,
  playTable,
  type LeagueMember,
  type LeagueSettings,
} from '../src/matching/league';

const settings: LeagueSettings = {
  seatDecay: 0.7,
  freshDecay: 0.7,
  likeMeetsLike: 2,
  weights: { age: 0.15, height: 0.09, build: 0.11, practice: 0.2, timeline: 0.11, children: 0.14, distance: 0.1, languages: 0.02 },
  falloff: { practice: 0.7, timeline: 0.85, children: 0.65, build: 0.88 },
  distanceFreeKm: 25,
  sectMismatchScore: 0.15,
  scales: { practice: { very_practicing: 1, practicing: 2, moderate: 3, learning: 4 } },
};

function member(id: string, gender: string, overrides: Partial<LeagueMember> = {}): LeagueMember {
  return {
    id,
    gender,
    isPremium: false,
    seats: 5,
    given: 0,
    receptionScore: 0.5,
    receptionConfidence: 0,
    maritalStatus: 'never_married',
    countryKey: 'united kingdom',
    latitude: 51.5,
    longitude: -0.12,
    age: 30,
    sect: 'sunni',
    sectDetail: null,
    religiousPractice: 'practicing',
    timeline: 'within_year',
    familyGoals: 'wants_children_soon',
    hasChildren: 'no',
    occupation: 'engineer',
    education: 'university',
    religiousDress: null,
    languagesSpoken: ['English'],
    ethnicities: ['arab'],
    heritageCountries: ['Egypt'],
    grewUpCountries: [],
    diet: [],
    minAge: 18,
    maxAge: 60,
    minHeightCm: 120,
    maxHeightCm: 220,
    ownHeightCm: null,
    preferredBuilds: [],
    ownBuild: null,
    ownBuildAlso: null,
    preferredPractice: [],
    desiredTimeline: [],
    desiredFamilyGoals: [],
    preferredSects: [],
    preferredSectDetails: [],
    detailSects: {},
    maxDistanceKm: 100,
    preferredCountryKeys: ['united kingdom', 'ireland', 'turkey', 'pakistan'],
    acceptedMaritalStatuses: ['never_married', 'divorced', 'widowed'],
    mustHave: {},
    premiumMustHave: {},
    preferredHasChildren: [],
    preferredOccupations: [],
    preferredLanguages: [],
    preferredEducation: [],
    preferredDress: [],
    preferredEthnicities: [],
    preferredHeritageCountries: [],
    preferredGrewUpCountries: [],
    preferredDiet: [],
    ...overrides,
  };
}

const men = (count: number, overrides: Partial<LeagueMember> = {}) =>
  Array.from({ length: count }, (_, at) => member(`m${at}`, 'male', overrides));
const women = (count: number, overrides: Partial<LeagueMember> = {}) =>
  Array.from({ length: count }, (_, at) => member(`w${at}`, 'female', overrides));

const table = (members: LeagueMember[], rest: Partial<Parameters<typeof playTable>[0]> = {}) =>
  ({ members, closed: [], shown: [], seed: 7, ...rest });

const countsOf = (edges: { a: string; b: string }[]) => {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    counts.set(edge.a, (counts.get(edge.a) ?? 0) + 1);
    counts.set(edge.b, (counts.get(edge.b) ?? 0) + 1);
  }
  return counts;
};

test('a must-have age is a hard rule, and an unmarked one is not', () => {
  const viewer = member('a', 'male', { minAge: 25, maxAge: 30 });
  const older = member('b', 'female', { age: 40 });
  assert.equal(accepts(viewer, older, 0), true);
  assert.equal(accepts({ ...viewer, mustHave: { age: true } }, older, 0), false);
});

test('a must-have distance holds across a border, so a neighbour counts and a continent does not', () => {
  const viewer = member('a', 'male', { mustHave: { distance: true }, maxDistanceKm: 50, latitude: 54.6, longitude: -5.9 });
  const neighbour = member('b', 'female', { countryKey: 'ireland', latitude: 54.3, longitude: -6.2 });
  const faraway = member('c', 'female', { countryKey: 'pakistan', latitude: 24.9, longitude: 67 });
  assert.equal(accepts(viewer, neighbour, distanceKm(viewer, neighbour)), true);
  assert.equal(accepts(viewer, faraway, distanceKm(viewer, faraway)), false);
  assert.equal(accepts(viewer, member('d', 'female', { latitude: null }), null), false);
});

test('only the countries a member chose, and their own is a choice like any other', () => {
  const inTurkey = member('b', 'female', { countryKey: 'turkey' });
  const atHome = member('c', 'female');
  const homeOnly = member('a', 'male', { preferredCountryKeys: ['united kingdom'] });
  assert.equal(accepts(homeOnly, atHome, 5), true);
  assert.equal(accepts(homeOnly, inTurkey, 3000), false);
  const turkeyOnly = member('a', 'male', { preferredCountryKeys: ['turkey'] });
  assert.equal(accepts(turkeyOnly, inTurkey, 3000), true);
  assert.equal(accepts(turkeyOnly, atHome, 5), false);
});

test('declining to state a sect is never a mismatch, and a chosen madhhab narrows only its own sect', () => {
  const viewer = member('a', 'male', {
    mustHave: { sect: true },
    preferredSects: ['sunni'],
    preferredSectDetails: ['hanafi'],
    detailSects: { hanafi: 'sunni' },
  });
  assert.equal(accepts(viewer, member('b', 'female', { sect: 'prefer_not_to_say' }), 0), true);
  assert.equal(accepts(viewer, member('c', 'female', { sect: 'sunni', sectDetail: 'hanafi' }), 0), true);
  assert.equal(accepts(viewer, member('d', 'female', { sect: 'sunni', sectDetail: 'shafii' }), 0), false);
  assert.equal(accepts(viewer, member('e', 'female', { sect: 'sunni', sectDetail: null }), 0), true);
  assert.equal(accepts(viewer, member('f', 'female', { sect: 'shia' }), 0), false);
});

test('premium filters bind only premium members, and silence is never held against someone', () => {
  const viewer = member('a', 'male', {
    premiumMustHave: { ethnicities: true },
    preferredEthnicities: ['arab'],
  });
  const other = member('b', 'female', { ethnicities: ['south_asian'] });
  assert.equal(accepts(viewer, other, 0), true);
  assert.equal(accepts({ ...viewer, isPremium: true }, other, 0), false);
  assert.equal(accepts({ ...viewer, isPremium: true }, member('c', 'female', { ethnicities: [] }), 0), true);
});

test('fit prefers what was asked for, and ignores relocation', () => {
  const viewer = member('a', 'male', { preferredPractice: ['practicing'] });
  const close = fit(viewer, member('b', 'female', { religiousPractice: 'practicing' }), 5, settings);
  const far = fit(viewer, member('c', 'female', { religiousPractice: 'learning' }), 5, settings);
  assert.ok(close > far);
  assert.ok(close <= 1 && far >= 0);
});

test('every proposal is one man and one woman, within seats, never a closed pair, never twice', () => {
  const members = [...men(6), ...women(6)];
  const edges = playTable(table(members, { closed: [['m0', 'w0'], ['w1', 'm1']] }), settings);
  const seen = new Set<string>();
  for (const edge of edges) {
    assert.ok(edge.a[0] !== edge.b[0]);
    const pair = [edge.a, edge.b].sort().join('|');
    assert.notEqual(pair, 'm0|w0');
    assert.notEqual(pair, 'm1|w1');
    assert.ok(!seen.has(pair));
    seen.add(pair);
  }
  for (const count of countsOf(edges).values()) assert.ok(count <= 5);
  assert.ok(edges.length >= 27, `${edges.length}`);
});

test('a table played twice gives the same answer, whatever order it arrives in', () => {
  const members = [...men(8), ...women(8)];
  const first = playTable(table(members), settings);
  const second = playTable(table([...members].reverse()), settings);
  const key = (edges: typeof first) => edges.map((e) => [e.a, e.b].sort().join('|')).sort().join();
  assert.equal(key(first), key(second));
});

test('with more of one side, everyone gets a first before anyone gets a second', () => {
  const edges = playTable(table([...men(10), ...women(4)]), settings);
  const counts = countsOf(edges);
  const given = men(10).map((m) => counts.get(m.id) ?? 0);
  assert.equal(edges.length, 20);
  assert.ok(Math.min(...given) >= 1 && Math.max(...given) <= 3, `spread ${given}`);
});

test('anyone given least today comes first, so a member short of five is ahead of a sixth', () => {
  const members = [
    member('m-extra', 'male', { seats: 1, given: 7, isPremium: true }),
    member('m-short', 'male', { seats: 1, given: 2 }),
    member('w', 'female', { seats: 1, given: 3 }),
  ];
  const edges = playTable(table(members), settings);
  assert.deepEqual(edges.map((e) => [e.a, e.b].sort()[0]), ['m-short']);
});

test('someone new is ranked ahead of someone seen before, who still fills an empty seat', () => {
  const members = [member('m', 'male', { seats: 1 }), member('w-seen', 'female', { seats: 1 }), member('w-new', 'female', { seats: 1 })];
  const other = (edges: { a: string; b: string }[]) => edges.map((e) => (e.a === 'm' ? e.b : e.a));
  assert.deepEqual(other(playTable(table(members, { shown: [['m', 'w-seen', 2]] }), settings)), ['w-new']);
  const onlySeen = [member('m', 'male', { seats: 1 }), member('w-seen', 'female', { seats: 1 })];
  assert.deepEqual(other(playTable(table(onlySeen, { shown: [['m', 'w-seen', 2]] }), settings)), ['w-seen']);
});

test('at a table, people only meet if each chose the other\'s country', () => {
  const visitor = member('m', 'male', { countryKey: 'pakistan', preferredCountryKeys: ['united kingdom'] });
  const welcoming = member('w-yes', 'female', { preferredCountryKeys: ['united kingdom', 'pakistan'] });
  const notLooking = member('w-no', 'female', { preferredCountryKeys: ['united kingdom'] });
  const other = (edges: { a: string; b: string }[]) => edges.map((e) => (e.a === 'm' ? e.b : e.a));
  assert.deepEqual(other(playTable(table([visitor, welcoming, notLooking]), settings)), ['w-yes']);
});

test('people received alike are favoured, as far as there is evidence about both', () => {
  assert.equal(likeMeetsLike(undefined, 0, 0.9, 1, 2), 1, 'a newcomer is exactly neutral, not treated as average');
  assert.equal(likeMeetsLike(0.1, 1, undefined, 0, 2), 1);
  assert.ok(likeMeetsLike(0.8, 1, 0.75, 1, 2) > likeMeetsLike(0.8, 1, 0.2, 1, 2));
  assert.ok(likeMeetsLike(0.8, 0.1, 0.2, 0.1, 2) > likeMeetsLike(0.8, 1, 0.2, 1, 2), 'thin evidence counts for little');

  const seats = { seats: 1, receptionConfidence: 1 };
  const members = [
    member('m-high', 'male', { ...seats, receptionScore: 0.9 }),
    member('m-low', 'male', { ...seats, receptionScore: 0.2 }),
    member('w-high', 'female', { ...seats, receptionScore: 0.85 }),
    member('w-low', 'female', { ...seats, receptionScore: 0.25 }),
  ];
  const pairs = playTable(table(members), settings).map((e) => [e.a, e.b].sort().join('+')).sort();
  assert.deepEqual(pairs, ['m-high+w-high', 'm-low+w-low']);
});

test('being wanted never earns anyone more or better introductions', () => {
  const popular = member('m-popular', 'male', { seats: 1, receptionScore: 0.95, receptionConfidence: 1 });
  const quiet = member('m-quiet', 'male', { seats: 1, receptionScore: 0.3, receptionConfidence: 1 });
  const woman = member('w', 'female', { seats: 1, receptionScore: 0.3, receptionConfidence: 1 });
  const edges = playTable(table([popular, quiet, woman]), settings);
  assert.deepEqual(edges.map((e) => [e.a, e.b].sort()[0]), ['m-quiet']);
});

test('a table with only one side, or nobody who can meet, proposes nothing', () => {
  assert.deepEqual(playTable(table(men(5)), settings), []);
  const strict = men(3, { mustHave: { age: true }, minAge: 50, maxAge: 60 });
  assert.deepEqual(playTable(table([...strict, ...women(3)]), settings), []);
});

test('when everyone looks the same, a table still fills every seat it can', () => {
  // Everyone's first candidates can be the same few people. Whoever is left short must keep looking.
  const edges = playTable(table([...men(120), ...women(120)]), settings);
  const short = [...men(120), ...women(120)].filter((m) => (countsOf(edges).get(m.id) ?? 0) < 5);
  assert.ok(edges.length >= 595, `${edges.length} pairs`);
  assert.ok(short.length <= 10, `${short.length} short`);
});

test('a thousand-person table fits well inside the Edge CPU limit', () => {
  const members = [...men(500), ...women(500)];
  const started = performance.now();
  const edges = playTable(table(members), settings);
  const ms = performance.now() - started;
  assert.ok(edges.length >= 2480, `${edges.length}`);
  assert.ok(ms < 2000, `${Math.round(ms)}ms`);
});

test('one way: anyone short is shown people, and those shown give up nothing', () => {
  const table = {
    members: [
      member('m0', 'male', { seats: 3 }),
      member('w0', 'female', { seats: 0 }),
      member('w1', 'female', { seats: 0 }),
      member('w2', 'female', { seats: 0 }),
    ],
    closed: [],
    shown: [],
    seed: 1,
    oneWay: true,
  };
  const cards = playOneWay(table, settings);
  assert.deepEqual(cards.map((c) => c.a), ['m0', 'm0', 'm0']);
  assert.deepEqual(cards.map((c) => c.b).sort(), ['w0', 'w1', 'w2']);
});

test('one way: new people first, then whoever they have seen least', () => {
  const table = {
    members: [member('m0', 'male', { seats: 2 }), member('w0', 'female', { seats: 0 }), member('w1', 'female', { seats: 0 }), member('w2', 'female', { seats: 0 })],
    closed: [],
    shown: [],
    seen: [['m0', 'w0', 2, 0], ['m0', 'w1', 1, 0]] as [string, string, number, number][],
    seed: 1,
    oneWay: true,
  };
  assert.deepEqual(playOneWay(table, settings).map((c) => c.b), ['w2', 'w1']);
});

test('one way: what the other person has seen does not count against the viewer', () => {
  const table = {
    members: [member('m0', 'male', { seats: 1 }), member('w0', 'female', { seats: 0 }), member('w1', 'female', { seats: 0, given: 1 })],
    closed: [],
    shown: [],
    seen: [['m0', 'w0', 0, 3]] as [string, string, number, number][],
    seed: 1,
    oneWay: true,
  };
  assert.equal(playOneWay(table, settings)[0]!.b, 'w0');
});

test('one way: the load spreads to whoever is in fewest sets today', () => {
  const table = {
    members: [member('m0', 'male', { seats: 1 }), member('m1', 'male', { seats: 1 }), member('w0', 'female', { seats: 0, given: 5 }), member('w1', 'female', { seats: 0, given: 2 })],
    closed: [],
    shown: [],
    seed: 1,
    oneWay: true,
  };
  const cards = playOneWay(table, settings);
  assert.deepEqual(cards.map((c) => c.b), ['w1', 'w1']);
});

test('one way: two people both short are dealt once, not once each way', () => {
  const table = {
    members: [member('m0', 'male', { seats: 1 }), member('w0', 'female', { seats: 1 })],
    closed: [],
    shown: [],
    seed: 1,
    oneWay: true,
  };
  assert.equal(playOneWay(table, settings).length, 1);
});

test('one way: closed pairs and the rules still hold, either way round', () => {
  const table = {
    members: [
      member('m0', 'male', { seats: 5 }),
      member('w0', 'female', { seats: 0 }),
      member('w1', 'female', { seats: 0 }),
      member('w2', 'female', { seats: 0, acceptedMaritalStatuses: [] }),
    ],
    closed: [['w0', 'm0']] as [string, string][],
    shown: [],
    seed: 1,
    oneWay: true,
  };
  assert.deepEqual(playOneWay(table, settings).map((c) => c.b), ['w1']);
});
