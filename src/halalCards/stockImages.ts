/**
 * Stand-in photographs until the generated illustrations exist. Free Unsplash
 * images, loaded by URL (the Unsplash licence allows this and nothing is added
 * to the app bundle). Each slot names a photo close to its scene; any slot
 * without one gets a calm photo from the pool, chosen by its id so it never
 * changes between visits.
 *
 * Remove an entry — or this whole file — once that slot's illustration is in
 * illustrations.ts; generated pictures always win.
 */
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format&fit=crop`;

const P = {
  coupleSunset: photo('1519307212971-dd9561667ffb'),
  candlesCity: photo('1513279922550-250c2129b13a'),
  holdingHands: photo('1574740637579-9ca0a610e491'),
  archSteps: photo('1763990830191-77af51c5ceac'),
  archDoorway: photo('1763765415832-b438699250a8'),
  runway: photo('1762094769582-01864102de45'),
  byWater: photo('1659434585511-d2205b350a74'),
  beachWalk: photo('1588994538331-5cc9ba0284c3'),
  familyBeach: photo('1656413990498-c1d98c6d3b97'),
  quranDates: photo('1587617425953-9075d28b8c46'),
  prayer: photo('1574246604907-db69e30ddb97'),
  breakfast: photo('1786799445400-83aaee2c4065'),
  feast: photo('1661994215679-cde7c2c5c060'),
  madinah: photo('1605976528013-638e49b6599f'),
  fatherChild: photo('1763990830315-6abc5f405f65'),
  sistersWalk: photo('1779950656989-c3ce0a8e0e6b'),
  lantern: photo('1612176894219-8493bf9b9b1c'),
  lanterns: photo('1577214407836-1f3a0604ecb2'),
  samovar: photo('1787385629405-0e7805abe565'),
  mosqueRain: photo('1786523916085-b126a2cdcb85'),
  dome: photo('1774284594339-f2deaf73fbae'),
  grandMosque: photo('1590075865003-e48277faa558'),
  mosqueSunset: photo('1519818187420-8e49de7adeef'),
  hijabBench: photo('1627378228978-a62f71edff15'),
  hijabBook: photo('1633279309534-f761427548b6'),
  phone: photo('1575029130046-3aec3a1529d3'),
  hijabPhone: photo('1764642716231-b52fe5a4f6b4'),
  dubai: photo('1512453979798-5ea266f8880c'),
  dubaiSunset: photo('1772990897598-223d5fc7e8b5'),
  twoMugs: photo('1774423353430-f0fb213a9b5d'),
  henna: photo('1505932794465-147d1f1b2c97'),
  ring: photo('1766763844962-92467072e309'),
  sittingTogether: photo('1644337111604-aa1816b542a1'),
  handsFlatLay: photo('1522973717924-b10fe4e185cc'),
};

const BY_SLOT: Record<string, string> = {
  'hub-hero': P.coupleSunset,
  'guide-hero': P.quranDates,

  'lab-zero-cover': P.twoMugs,
  'lab-zero-charm': P.candlesCity,
  'lab-zero-list': P.hijabBook,
  'lab-zero-money': P.handsFlatLay,
  'lab-zero-stress': P.runway,
  'lab-one-cover': P.samovar,
  'lab-one-phone': P.phone,
  'lab-one-mother': P.feast,
  'lab-one-receiver': P.sittingTogether,
  'lab-two-cover': P.sittingTogether,
  'lab-two-late': P.breakfast,
  'lab-two-unfair': P.sistersWalk,
  'lab-two-validate': P.archDoorway,
  'lab-three-cover': P.archSteps,
  'lab-three-quiet': P.hijabPhone,
  'lab-three-space': P.hijabBench,
  'lab-three-loop': P.mosqueRain,

  'quiz-know-me-cover': P.twoMugs,
  'quiz-guess-cover': P.holdingHands,
  'quiz-money-cover': P.handsFlatLay,
  'quiz-family-cover': P.feast,
  'quiz-likely-cover': P.beachWalk,
  'quiz-wyr-cover': P.archSteps,
  'quiz-expect-cover': P.ring,
  'quiz-future-cover': P.coupleSunset,
  'quiz-affection-cover': P.henna,

  'adv-ramadan-cover': P.lanterns,
  'adv-ramadan-invite': P.lantern,
  'adv-ramadan-friday': P.feast,
  'adv-ramadan-mum': P.samovar,
  'adv-ramadan-qadr': P.mosqueRain,
  'adv-ramadan-eid': P.madinah,
  'adv-ramadan-end-table': P.feast,
  'adv-ramadan-end-ours': P.prayer,
  'adv-ramadan-end-kitchen': P.breakfast,

  'adv-1142-cover': P.hijabPhone,
  'adv-1142-message': P.phone,
  'adv-1142-night': P.candlesCity,
  'adv-1142-home': P.archDoorway,
  'adv-1142-talk': P.twoMugs,
  'adv-1142-end-return': P.hijabPhone,
  'adv-1142-end-closer': P.coupleSunset,

  'adv-offer-cover': P.dubai,
  'adv-offer-dubai': P.dubaiSunset,
  'adv-offer-end-both': P.familyBeach,
  'adv-offer-end-home': P.fatherChild,
  'adv-offer-end-shape': P.runway,
  'adv-offer-end-together': P.holdingHands,
};

const POOL = [
  P.archDoorway, P.coupleSunset, P.byWater, P.beachWalk, P.mosqueSunset, P.grandMosque,
  P.dome, P.twoMugs, P.sittingTogether, P.archSteps, P.samovar, P.lantern,
];

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

export function stockFor(slotId: string): string {
  return BY_SLOT[slotId] ?? (POOL[hash(slotId) % POOL.length] as string);
}
