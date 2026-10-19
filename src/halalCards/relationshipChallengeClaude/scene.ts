import type { RcCharacter, RcPoint, RcPose, RcTimeOfDay } from './types.ts';

/**
 * The scene manifest: every swappable asset, its canvas, anchor and layer,
 * and where each time of day places it.
 *
 * One room, one camera. Morning and night share the 1000 × 1500 room grid,
 * the shallow editorial overhead camera, the anchors and the character scale;
 * they differ in plates, window view, a few props and lighting. The runtime
 * draws back to front in `RC_LAYERS` order, and characters inside their
 * layer by the y of their feet.
 *
 * Source canvases are twice the room-unit size (a 1000-unit room is a
 * 2000 px plate), so the placeholder SVGs and the final WebP/PNG art share
 * one coordinate system and can be swapped without touching gameplay.
 */

export const RC_ROOM = { width: 1000, height: 1500 } as const;

/** Source pixels per room unit. */
export const RC_CANVAS_SCALE = 2;

export const RC_LAYERS = [
  'plate',
  'view',
  'floorDecor',
  'furniture',
  'object',
  'character',
  'foreground',
  'effect',
  'ui',
] as const;

export type RcLayer = (typeof RC_LAYERS)[number];

export type RcAssetFamily =
  | 'plate'
  | 'architecture'
  | 'furniture'
  | 'prop'
  | 'clue'
  | 'card'
  | 'character'
  | 'foreground'
  | 'effect';

export interface RcSceneAsset {
  id: string;
  family: RcAssetFamily;
  layer: RcLayer;
  /** Which rooms use it. Characters and clue art are used by both. */
  variants: RcTimeOfDay[];
  /** Relative to `assets/`. */
  placeholder: string;
  /** Size in room units; the source canvas is this × RC_CANVAS_SCALE. */
  size: { width: number; height: number };
  /** Normalized contact point within the canvas (0,0 top-left; 0.5,1 bottom-centre). */
  anchor: RcPoint;
  alpha: boolean;
  format: 'webp' | 'png';
  /** One line on what the finished art is. Fed into the ImageGen prompt. */
  description: string;
  /** Anything the generator must keep exact. */
  details?: string;
  /** Other assets this one is a state of (closed/open, off/on, poses). */
  stateOf?: string;
  /** Not drawn at runtime yet: procedural effects stand in for it. */
  optional?: boolean;
  /** Loaded early: plates and the window. */
  preload?: 'critical' | 'normal' | 'lazy';
}

const placeholder = (folder: string, name: string) => `relationship-challenge-claude/${folder}/${name}.svg`;

const POSES: RcPose[] = ['idle', 'noticing', 'interacting', 'celebrating'];
const CHARACTERS: RcCharacter[] = ['husband', 'wife'];

const POSE_DETAIL: Record<RcPose, string> = {
  idle: 'standing relaxed, arms loosely at the sides, looking slightly toward the room centre',
  noticing: 'leaning a little forward, one hand raised near the chin, attentive and curious',
  interacting: 'one arm extended forward at waist height as if picking up or setting down a small object',
  celebrating: 'a warm, modest smile, both hands lightly together at chest height',
};

const CHARACTER_DETAIL: Record<RcCharacter, string> = {
  husband:
    'a Muslim husband in his late twenties, short neat beard, olive or warm brown skin, wearing a navy overshirt over a cream crew-neck and dark trousers, modest everyday clothing',
  wife: 'a Muslim wife in her late twenties wearing a dusty-rose hijab, a long loose terracotta or olive abaya-style dress with long sleeves, modest everyday clothing',
};

const characterAssets: RcSceneAsset[] = CHARACTERS.flatMap((character) =>
  POSES.map(
    (pose): RcSceneAsset => ({
      id: `rc_claude_${character}_${pose}`,
      family: 'character',
      layer: 'character',
      variants: ['morning', 'night'],
      placeholder: placeholder('characters', `${character}-${pose}`),
      size: { width: 150, height: 330 },
      anchor: { x: 0.5, y: 1 },
      alpha: true,
      format: 'png',
      description: `${CHARACTER_DETAIL[character]}, ${POSE_DETAIL[pose]}`,
      details:
        'Full figure seen from the room’s shallow overhead camera, feet on the bottom-centre contact point, identical scale, head height and foot position across all four poses so poses can be swapped in place.',
      stateOf: pose === 'idle' ? undefined : `rc_claude_${character}_idle`,
      preload: pose === 'idle' ? 'critical' : 'normal',
    })
  )
);

export const RC_ASSETS: RcSceneAsset[] = [
  // 1. Plates
  {
    id: 'rc_claude_morning_room_plate',
    family: 'plate',
    layer: 'plate',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'room-plate'),
    size: { width: 1000, height: 1500 },
    anchor: { x: 0, y: 0 },
    alpha: false,
    format: 'webp',
    description:
      'the empty morning room: warm cream plaster back wall across the top 430 units with a slim terracotta skirting line, a plain wooden entry door at the far right of the back wall, warm oak plank floor filling the rest, soft morning tone',
    details:
      'No furniture, rug, window glass or props: those are separate layers. Back wall occupies y 0–430, floor y 430–1500. Leave the window opening area (x 350–650, y 60–360) as plain wall; the window is its own asset. Fill every edge completely.',
    preload: 'critical',
  },
  {
    id: 'rc_claude_night_room_plate',
    family: 'plate',
    layer: 'plate',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'room-plate'),
    size: { width: 1000, height: 1500 },
    anchor: { x: 0, y: 0 },
    alpha: false,
    format: 'webp',
    description:
      'the same empty room in the evening: back wall in deep muted teal-navy plaster, the same terracotta skirting and wooden door, floor in a darker walnut tone, calm and domestic',
    details: 'Identical architecture, wall line and door position to the morning plate. No props. Fill every edge completely.',
    stateOf: 'rc_claude_morning_room_plate',
    preload: 'critical',
  },
  // 2. Window and view
  {
    id: 'rc_claude_morning_window',
    family: 'architecture',
    layer: 'view',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'window'),
    size: { width: 300, height: 300 },
    anchor: { x: 0.5, y: 0 },
    alpha: true,
    format: 'png',
    description:
      'an arched-top balcony window with a slim cream frame, curtains tied open in dusty rose, a bright pale sky and a hint of low sand-coloured rooftops and a palm outside',
    preload: 'critical',
  },
  {
    id: 'rc_claude_night_window',
    family: 'architecture',
    layer: 'view',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'window'),
    size: { width: 300, height: 300 },
    anchor: { x: 0.5, y: 0 },
    alpha: true,
    format: 'png',
    description:
      'the same arched balcony window at night: curtains half drawn in deep rose, a cobalt night sky with a thin crescent moon and a few small warm city lights on distant rooftops',
    stateOf: 'rc_claude_morning_window',
    preload: 'critical',
  },
  // 3. Floor decoration
  {
    id: 'rc_claude_rug',
    family: 'furniture',
    layer: 'floorDecor',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'rug'),
    size: { width: 720, height: 520 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'webp',
    description:
      'a flat-woven rectangular rug seen from above with a simple geometric border in terracotta, cream and cobalt, a quiet central field, short tassels at the two short ends',
    details: 'Recolourable: the night room tints it at runtime, so keep the palette simple and the pattern abstract (no symbols that could be read as clues).',
  },
  // 4. Furniture
  {
    id: 'rc_claude_shelf',
    family: 'furniture',
    layer: 'furniture',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'shelf'),
    size: { width: 340, height: 250 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'webp',
    description: 'a low wooden sideboard against the back wall, two sliding doors with simple arched cut-outs, an empty flat top',
    details: 'Top surface empty: the vase and books are separate props that sit on it at y 270–330 in room units.',
  },
  {
    id: 'rc_claude_plant',
    family: 'furniture',
    layer: 'furniture',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'plant'),
    size: { width: 200, height: 320 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'webp',
    description: 'a tall leafy indoor plant (fiddle-leaf or olive) in a plain terracotta pot, opaque flat leaves in two or three greens',
  },
  {
    id: 'rc_claude_coffee_table',
    family: 'furniture',
    layer: 'furniture',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'coffee-table'),
    size: { width: 440, height: 240 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'webp',
    description: 'a low rectangular wooden coffee table with rounded corners seen from above, an empty top',
    details: 'Top empty: trays, the box and the envelope are separate props placed on it.',
  },
  {
    id: 'rc_claude_morning_sofa',
    family: 'furniture',
    layer: 'furniture',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'sofa'),
    size: { width: 660, height: 300 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'webp',
    description: 'a three-seat sofa in warm cobalt blue seen from behind and above, facing the coffee table, with two patterned cushions in mustard and dusty rose',
  },
  {
    id: 'rc_claude_night_sofa',
    family: 'furniture',
    layer: 'furniture',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'sofa'),
    size: { width: 660, height: 300 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'webp',
    description: 'the same cobalt sofa in the evening, cushions slightly rearranged and a folded cream-and-terracotta throw over one arm',
    stateOf: 'rc_claude_morning_sofa',
  },
  {
    id: 'rc_claude_table_lamp_off',
    family: 'furniture',
    layer: 'furniture',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'table-lamp-off'),
    size: { width: 150, height: 300 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'png',
    description: 'a small round side table with a ceramic table lamp and a pleated cream drum shade, switched off',
  },
  {
    id: 'rc_claude_table_lamp_on',
    family: 'furniture',
    layer: 'furniture',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'table-lamp-on'),
    size: { width: 150, height: 300 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'png',
    description:
      'the same side table and lamp switched on: the shade glows warm amber, and a small stitched crescent moon mark is visible on the front of the shade',
    details: 'The crescent is the scenario B orientation mark: one simple crescent shape only, no letters. No glow halo outside the shade; the runtime adds the glow.',
    stateOf: 'rc_claude_table_lamp_off',
  },
  // 5. Interactive objects
  {
    id: 'rc_claude_leaf_vase',
    family: 'prop',
    layer: 'object',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'leaf-vase'),
    size: { width: 110, height: 170 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'png',
    description: 'a cream ceramic vase painted with exactly four simple olive leaves in a row, holding two dried stems',
    details: 'Exactly four leaf motifs on the vase body, clearly separated and countable at phone size.',
  },
  {
    id: 'rc_claude_book_stack',
    family: 'prop',
    layer: 'object',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'book-stack'),
    size: { width: 120, height: 80 },
    anchor: { x: 0.5, y: 1 },
    alpha: true,
    format: 'png',
    description: 'a short stack of three cloth-bound books in mustard, cobalt and terracotta lying flat, no titles',
  },
  {
    id: 'rc_claude_framed_print',
    family: 'prop',
    layer: 'object',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'framed-print'),
    size: { width: 220, height: 240 },
    anchor: { x: 0.5, y: 0 },
    alpha: true,
    format: 'png',
    description: 'a thin oak frame holding a flat geometric print of exactly three tall arches side by side in cobalt, terracotta and mustard on cream',
    details: 'Exactly three arch motifs, clearly countable. No text, signature or numbers.',
  },
  {
    id: 'rc_claude_morning_breakfast_tray',
    family: 'prop',
    layer: 'object',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'breakfast-tray'),
    size: { width: 190, height: 130 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a round brass tray seen from above with exactly two small tea glasses or cups, a little dish of dates and a folded napkin',
    details: 'Exactly two cups, clearly countable.',
  },
  {
    id: 'rc_claude_keepsake_box_closed',
    family: 'prop',
    layer: 'object',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'keepsake-box-closed'),
    size: { width: 140, height: 110 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a small closed wooden keepsake box with a simple inlaid geometric lid and a tiny brass three-dial lock on the front',
    details: 'The dials show no numbers; the runtime draws them.',
  },
  {
    id: 'rc_claude_keepsake_box_open',
    family: 'prop',
    layer: 'object',
    variants: ['morning'],
    placeholder: placeholder('scene/morning', 'keepsake-box-open'),
    size: { width: 140, height: 110 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'the same keepsake box with the lid lifted open, a small folded cream note inside',
    details: 'Same canvas, footprint and contact point as the closed box. No readable writing on the note.',
    stateOf: 'rc_claude_keepsake_box_closed',
  },
  {
    id: 'rc_claude_evening_tray',
    family: 'prop',
    layer: 'object',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'evening-tray'),
    size: { width: 190, height: 130 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'the round brass tray in the evening: a teapot, two tea glasses and an empty space where a card could be set down',
    stateOf: 'rc_claude_morning_breakfast_tray',
  },
  {
    id: 'rc_claude_card_envelope',
    family: 'prop',
    layer: 'object',
    variants: ['night'],
    placeholder: placeholder('scene/night', 'card-envelope'),
    size: { width: 150, height: 110 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a cream paper envelope with a terracotta wax seal, slightly open, the corners of a few illustrated cards peeking out',
    details: 'No writing on the envelope or cards.',
  },
  // 7. Foreground occlusion
  {
    id: 'rc_claude_fg_plant',
    family: 'foreground',
    layer: 'foreground',
    variants: ['morning', 'night'],
    placeholder: placeholder('scene/shared', 'fg-plant'),
    size: { width: 260, height: 360 },
    anchor: { x: 1, y: 1 },
    alpha: true,
    format: 'png',
    description: 'large foreground leaves of a potted plant entering from the bottom-right corner, closer to the camera than the room, partly cropped by the frame',
    details: 'Occlusion piece: it sits over the sofa’s right end. Keep the left and top edges soft-shaped leaves with true transparency; the bottom and right edges may run off-canvas.',
  },
  // Characters
  ...characterAssets,
  // Clue art for focused panels
  {
    id: 'rc_claude_clue_card',
    family: 'clue',
    layer: 'ui',
    variants: ['morning'],
    placeholder: placeholder('clues', 'clue-card'),
    size: { width: 600, height: 380 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a small cream index card with a deckled edge and a thin terracotta border, blank, lying flat',
    details: 'Blank: the clue text and motif symbols are rendered on top in TypeScript.',
  },
  {
    id: 'rc_claude_note_paper',
    family: 'clue',
    layer: 'ui',
    variants: ['night'],
    placeholder: placeholder('clues', 'note-paper'),
    size: { width: 600, height: 380 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a folded-open pocket note on warm cream paper with soft fold lines, blank',
    details: 'Blank: the note text is rendered on top in TypeScript.',
  },
  ...(['leaf', 'arch', 'cup'] as const).map(
    (motif): RcSceneAsset => ({
      id: `rc_claude_token_${motif}`,
      family: 'clue',
      layer: 'ui',
      variants: ['morning'],
      placeholder: placeholder('clues', `token-${motif}`),
      size: { width: 120, height: 120 },
      anchor: { x: 0.5, y: 0.5 },
      alpha: true,
      format: 'png',
      description: {
        leaf: 'a single flat olive leaf motif, the same leaf painted on the vase, centred',
        arch: 'a single flat tall arch motif, the same arch used in the framed print, centred',
        cup: 'a single small tea glass or cup motif, the same cup on the breakfast tray, centred',
      }[motif],
      details: 'One motif only, bold and simple; it is repeated in code to show counts.',
    })
  ),
  {
    id: 'rc_claude_destination_card',
    family: 'card',
    layer: 'ui',
    variants: ['night'],
    placeholder: placeholder('clues', 'destination-card'),
    size: { width: 300, height: 420 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'a blank illustrated plan card: cream card with rounded corners and a thin cobalt border, an empty picture window at the top half and an empty lower half',
    details: 'Blank. The vignette, sun row, moon row, symbols and title are composited in TypeScript.',
  },
  ...(
    [
      ['park_loop', 'a small neighbourhood park path curving between trees and a bench under an early evening sky'],
      ['cafe_terrace', 'a café terrace with two small round tables and string lights, gently busy'],
      ['tea_at_home', 'a teapot and two tea glasses on a low table by a window, indoors'],
      ['bookshop', 'the inside of a small bookshop with tall shelves and a reading chair'],
    ] as const
  ).map(
    ([id, scene]): RcSceneAsset => ({
      id: `rc_claude_dest_${id}`,
      family: 'card',
      layer: 'ui',
      variants: ['night'],
      placeholder: placeholder('clues', `dest-${id.replace(/_/g, '-')}`),
      size: { width: 240, height: 160 },
      anchor: { x: 0.5, y: 0.5 },
      alpha: false,
      format: 'webp',
      description: `a small rectangular vignette for a plan card: ${scene}, no people`,
      details: 'Fills the whole canvas edge to edge (it is clipped to the card’s picture window). No text, signs or numbers.',
    })
  ),
  // 8. Optional effect masks: procedural shafts stand in until these exist
  {
    id: 'rc_claude_fx_morning_light',
    family: 'effect',
    layer: 'effect',
    variants: ['morning'],
    placeholder: placeholder('fx', 'morning-light'),
    size: { width: 1000, height: 1500 },
    anchor: { x: 0, y: 0 },
    alpha: true,
    format: 'png',
    description: 'a soft warm window-light shaft falling from the window area (x 350–650, y 360) down and to the right across the floor toward y 1100, low opacity, with a faint paper haze',
    optional: true,
    preload: 'lazy',
  },
  {
    id: 'rc_claude_fx_night_light',
    family: 'effect',
    layer: 'effect',
    variants: ['night'],
    placeholder: placeholder('fx', 'night-light'),
    size: { width: 1000, height: 1500 },
    anchor: { x: 0, y: 0 },
    alpha: true,
    format: 'png',
    description: 'a cool, very faint moonlight shaft from the window and a small warm pool of lamp light around the side table at the lower left',
    optional: true,
    preload: 'lazy',
  },
  {
    id: 'rc_claude_fx_dust',
    family: 'effect',
    layer: 'effect',
    variants: ['night'],
    placeholder: placeholder('fx', 'dust'),
    size: { width: 400, height: 400 },
    anchor: { x: 0.5, y: 0.5 },
    alpha: true,
    format: 'png',
    description: 'six to eight tiny soft cream dust motes scattered sparsely on a transparent square tile',
    optional: true,
    preload: 'lazy',
  },
];

const byId = new Map(RC_ASSETS.map((asset) => [asset.id, asset]));

export function rcAsset(id: string): RcSceneAsset {
  const asset = byId.get(id);
  if (!asset) throw new Error(`Unknown Relationship Challenge Claude asset ${id}.`);
  return asset;
}

export interface RcPlacement {
  assetId: string;
  /** Where the asset's anchor sits, in room units. */
  at: RcPoint;
  /** Runtime colour correction, applied as a flat overlay on the asset. */
  tint?: { color: string; opacity: number };
  /** The hotspot whose state may swap this asset (box closed → open). */
  hotspotId?: string;
}

const NIGHT_TINT = { color: '#14204A', opacity: 0.22 };

/**
 * Where each room puts its furniture and props. Characters are placed by the
 * renderer at `RC_CHARACTER_SPOTS`.
 */
export const RC_ROOM_LAYOUT: Record<RcTimeOfDay, RcPlacement[]> = {
  morning: [
    { assetId: 'rc_claude_morning_room_plate', at: { x: 0, y: 0 } },
    { assetId: 'rc_claude_morning_window', at: { x: 500, y: 60 } },
    { assetId: 'rc_claude_rug', at: { x: 500, y: 900 } },
    { assetId: 'rc_claude_shelf', at: { x: 185, y: 520 } },
    { assetId: 'rc_claude_plant', at: { x: 890, y: 640 } },
    { assetId: 'rc_claude_coffee_table', at: { x: 510, y: 900 } },
    { assetId: 'rc_claude_morning_sofa', at: { x: 500, y: 1480 } },
    { assetId: 'rc_claude_table_lamp_off', at: { x: 95, y: 1300 } },
    { assetId: 'rc_claude_leaf_vase', at: { x: 130, y: 330 }, hotspotId: 'shelf_leaf' },
    { assetId: 'rc_claude_book_stack', at: { x: 262, y: 330 } },
    { assetId: 'rc_claude_framed_print', at: { x: 800, y: 80 }, hotspotId: 'print_arch' },
    { assetId: 'rc_claude_morning_breakfast_tray', at: { x: 420, y: 890 }, hotspotId: 'tray_cup' },
    { assetId: 'rc_claude_keepsake_box_closed', at: { x: 620, y: 895 }, hotspotId: 'keepsake_box' },
    { assetId: 'rc_claude_fg_plant', at: { x: 1000, y: 1500 } },
  ],
  night: [
    { assetId: 'rc_claude_night_room_plate', at: { x: 0, y: 0 } },
    { assetId: 'rc_claude_night_window', at: { x: 500, y: 60 } },
    { assetId: 'rc_claude_rug', at: { x: 500, y: 900 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_shelf', at: { x: 185, y: 520 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_plant', at: { x: 890, y: 640 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_coffee_table', at: { x: 510, y: 900 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_night_sofa', at: { x: 500, y: 1480 } },
    { assetId: 'rc_claude_table_lamp_on', at: { x: 95, y: 1300 }, hotspotId: 'lamp_mark' },
    // Slightly rearranged: the books moved to the left, the vase to the right.
    { assetId: 'rc_claude_book_stack', at: { x: 110, y: 330 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_leaf_vase', at: { x: 262, y: 330 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_framed_print', at: { x: 800, y: 80 }, tint: NIGHT_TINT },
    { assetId: 'rc_claude_evening_tray', at: { x: 420, y: 890 }, hotspotId: 'evening_tray' },
    { assetId: 'rc_claude_card_envelope', at: { x: 620, y: 900 }, hotspotId: 'envelope_cards' },
    { assetId: 'rc_claude_fg_plant', at: { x: 1000, y: 1500 }, tint: NIGHT_TINT },
  ],
};

/** Feet positions. Host stands left, guest right, in both rooms. */
export const RC_CHARACTER_SPOTS = {
  host: { x: 205, y: 1000 },
  guest: { x: 800, y: 1000 },
} as const;

/** State swaps: the asset drawn instead once a hotspot's puzzle is solved. */
export const RC_SOLVED_SWAPS: Record<string, string> = {
  rc_claude_keepsake_box_closed: 'rc_claude_keepsake_box_open',
};

export function characterAssetId(character: RcCharacter, pose: RcPose): string {
  return `rc_claude_${character}_${pose}`;
}

/** Top-left of a placed asset, in room units. */
export function placedRect(placement: RcPlacement) {
  const asset = rcAsset(placement.assetId);
  return {
    x: placement.at.x - asset.anchor.x * asset.size.width,
    y: placement.at.y - asset.anchor.y * asset.size.height,
    width: asset.size.width,
    height: asset.size.height,
  };
}

export function canvasOf(asset: RcSceneAsset) {
  return { width: asset.size.width * RC_CANVAS_SCALE, height: asset.size.height * RC_CANVAS_SCALE };
}
