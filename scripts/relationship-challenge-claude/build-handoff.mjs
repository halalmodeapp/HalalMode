// Relationship Challenge Claude → Codex asset handoff.
//
//   node scripts/relationship-challenge-claude/build-handoff.mjs
//
// Writes docs/relationship-challenge/claude/relationship-challenge-codex-asset-handoff.ts
// (and a .json twin): one standalone, machine-readable entry per placeholder,
// with its canvas, anchor, layer, hit rectangle and the complete ImageGen
// prompt, generated from the same scene manifest the app renders from.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RC_ASSETS, RC_CANVAS_SCALE, RC_CHARACTER_SPOTS, RC_LAYERS, RC_ROOM, RC_ROOM_LAYOUT, canvasOf, placedRect } from '../../src/halalCards/relationshipChallengeClaude/scene.ts';
import { RC_CLAUDE_SCENARIOS } from '../../src/halalCards/relationshipChallengeClaude/scenarios.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'docs', 'relationship-challenge', 'claude');

// §15 of the shared brief, verbatim.
const STYLE_LOCK =
  'Match the supplied Halal Mode couple-on-the-stairs and homepage references: premium Muslim editorial-flat illustration, bold opaque painted shapes, crisp silhouettes, restrained paper grain, two or three tonal steps per material, warm cream, cobalt/navy, terracotta, olive, muted mustard, dusty rose, and small vivid pink accents. Keep the image culturally respectful, ordinary, warm, and authored. Use one consistent orthographic or top-down camera for the room and props. Do not introduce photorealism, glossy 3D, plastic rendering, generic cartoon styling, fantasy architecture, pixel art, heavy gradients, UI, logos, labels, readable generated text, or puzzle answers.';
const DEPENDENT_LOCK =
  "Match the accepted room's camera, scale, lighting direction, palette, contact anchor, and flat shading. Keep the full object complete, with clean edges and generous padding. If transparency is requested, output a true transparent background with no checkerboard, floor patch, room fragment, watermark, glow, or unrelated object.";

const CAMERA =
  'Camera: a shallow editorial overhead view of a portrait room 1000 units wide by 1500 tall. The back wall occupies the top 430 units and is seen nearly face-on; the floor below it is seen from about 60° above, so furniture shows its top surface and a sliver of its front. Light comes from the window at the top centre (morning: warm sun from the upper left through the window; night: a warm table lamp at the lower left plus faint cool moonlight from the window).';

function supportedSize({ width, height }) {
  const ratio = width / height;
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.83) return '1024x1536';
  return '1024x1024';
}

function placementsOf(assetId) {
  const out = [];
  for (const [variant, layout] of Object.entries(RC_ROOM_LAYOUT)) {
    for (const placement of layout) {
      if (placement.assetId !== assetId) continue;
      const rect = placedRect(placement);
      out.push({ variant, anchorAt: placement.at, roomRect: rect, tint: placement.tint ?? null });
    }
  }
  if (/^rc_claude_(husband|wife)_/.test(assetId)) {
    for (const variant of ['morning', 'night']) {
      for (const [seat, spot] of Object.entries(RC_CHARACTER_SPOTS)) out.push({ variant, seat, anchorAt: spot });
    }
  }
  return out;
}

function hotspotsOf(assetId) {
  return RC_CLAUDE_SCENARIOS.flatMap((scenario) =>
    scenario.hotspots
      .filter((hotspot) => hotspot.assetId === assetId)
      .map((hotspot) => ({ scenarioId: scenario.scenarioId, hotspotId: hotspot.id, roomUnits: hotspot.interactionBounds }))
  );
}

function layoutDescription(variant) {
  return RC_ROOM_LAYOUT[variant]
    .filter((placement) => !placement.assetId.endsWith('_room_plate'))
    .map((placement) => {
      const r = placedRect(placement);
      return `${placement.assetId.replace('rc_claude_', '').replace(/_/g, ' ')} at x ${Math.round(r.x)}–${Math.round(r.x + r.width)}, y ${Math.round(r.y)}–${Math.round(r.y + r.height)}`;
    })
    .join('; ');
}

function referenceFor(asset) {
  if (asset.family === 'character') return 'accepted morning room reference (for scale and light) + the Halal Mode couple-on-the-stairs illustration (for faces, clothing and style)';
  if (asset.variants.length === 2) return 'accepted morning room reference (and the night reference for night-only checks)';
  return `accepted ${asset.variants[0]} room reference`;
}

function familyLead(asset) {
  const d = asset.description;
  switch (asset.family) {
    case 'plate':
      return `Generate the complete ${asset.variants[0].toUpperCase()} room floor and wall clean plate for the accepted Relationship Challenge room: ${d}. Match the accepted composition exactly in camera, scale, palette, and architecture. Fill all floor and wall areas behind furniture, under future characters, and beyond the visible crop so modest camera movement never reveals transparent holes. Remove all movable clue props, characters, UI, labels, and generated text. Keep the plate coherent, flat, warm, and editorial.`;
    case 'architecture':
    case 'furniture':
      return `Generate only this one object, complete, as a separate asset matching the accepted Relationship Challenge room: ${d}. Use the exact accepted camera, scale, material palette, light direction, and editorial-flat Muslim illustration treatment. Keep the entire object visible with generous transparent padding. Do not include floor patches, wall fragments, room background, unrelated props, text, numbers, logos, checkerboard, or baked light rays. The asset must be easy to recolor or swap between morning and nighttime variants.`;
    case 'prop':
    case 'clue':
    case 'card':
    case 'foreground':
      return `Generate only this one ${asset.alpha ? 'object on a transparent background' : 'picture'}, complete, for Relationship Challenge: ${d}. Match the accepted room's camera, scale, anchor, palette, light direction, and flat editorial shading. Use bold opaque forms and a clean silhouette. No room background, floor patch, generated lettering, readable numbers, puzzle answer, watermark, checkerboard, unrelated objects, or excessive glow. Exact symbols and text will be rendered deterministically in TypeScript. If this is a state asset, keep morning and nighttime versions aligned to the same canvas and contact point.`;
    case 'character':
      return `Generate a transparent 2D character asset matching the accepted Relationship Challenge room: ${d}. Culturally respectful, clear readable silhouette, warm editorial-flat face, the same scale and light direction as the room. Preserve the same contact anchor across idle, noticing, interacting, and celebrating poses. No room background, floor patch, text, extra props, photorealism, glossy 3D, or perspective drift.`;
    case 'effect':
      return `Generate a subtle transparent editorial-flat atmosphere layer for the accepted Relationship Challenge room: ${d}. No room geometry, no objects, no characters, no text, no hard rectangular edge, no dramatic lens flare, no neon, and no heavy opacity. The runtime will animate, tint, cap, and disable this layer for reduced motion. Keep it visually subordinate to the room and clues.`;
    default:
      return d;
  }
}

function promptFor(asset) {
  const canvas = canvasOf(asset);
  const anchorPx = { x: Math.round(asset.anchor.x * canvas.width), y: Math.round(asset.anchor.y * canvas.height) };
  const parts = [
    familyLead(asset),
    asset.details ? `Must keep: ${asset.details}` : '',
    asset.family === 'plate' ? `${CAMERA} Furniture will be layered on top at: ${layoutDescription(asset.variants[0])}.` : CAMERA,
    `Output: final canvas exactly ${canvas.width}×${canvas.height} px (${asset.size.width}×${asset.size.height} room units at ${RC_CANVAS_SCALE} px per unit). Generate at ${supportedSize(canvas)}, keep that full-resolution master at assets/relationship-challenge-claude/source/, and scale/crop the runtime export to that canvas without distortion. ` +
      (asset.family === 'plate'
        ? 'Opaque, edge to edge.'
        : `The object fills the canvas the way the placeholder does, with roughly 4–6% clear padding; its contact point (where it touches the floor, wall or table) sits at normalized (${asset.anchor.x}, ${asset.anchor.y}) = pixel (${anchorPx.x}, ${anchorPx.y}).`),
    asset.alpha ? `True alpha transparency required; export ${asset.format.toUpperCase()} with alpha.` : `No transparency; export opaque ${asset.format.toUpperCase()}.`,
    STYLE_LOCK,
    asset.family === 'plate' ? '' : DEPENDENT_LOCK,
  ];
  return parts.filter(Boolean).join('\n\n');
}

const referenceEntries = ['morning', 'night'].map((variant) => ({
  id: `rc_codex_${variant}_room_reference`,
  claudeAssetId: null,
  kind: 'reference',
  placeholder: null,
  variant,
  format: 'png',
  alpha: false,
  canvas: { width: 1024, height: 1536 },
  anchor: { x: 0, y: 0 },
  zIndex: null,
  layer: null,
  interactionBounds: null,
  reference: variant === 'morning' ? 'Halal Mode couple-on-the-stairs illustration + homepage; docs/relationship-challenge/room-master-concept-v2.png as a mood guide only' : 'accepted morning room reference',
  description: `Composition and style reference for the ${variant} room. Not shipped; every runtime asset is generated against it.`,
  states: [],
  prompt: [
    variant === 'morning'
      ? 'Create a high-resolution visual reference for a compact contemporary Middle Eastern family living room in the established Halal Mode premium editorial-flat Muslim illustration style. This is the morning version of a two-player hidden-clue game called Relationship Challenge. Warm cream plaster, cobalt/navy sofa, patterned rug, wooden coffee table, low sideboard, terracotta plant, framed print, modest arched balcony window, normal entry door, and clear walkable floor. Make the room ordinary, calm, warm, and phone-readable. Leave complete filled surfaces under and around furniture for later layering and camera movement.'
      : 'Create the nighttime variation of the accepted Relationship Challenge living-room composition. Preserve the same floor plan, camera, object scale, and spatial anchors, but make it feel like the same home later that evening: deep cobalt, teal, navy, terracotta, warm lamp light, a darker balcony view with a thin crescent moon and a few small city lights, a folded throw on the sofa, an evening tray, and slightly rearranged small objects (books and vase swapped on the sideboard). Calm and domestic; no horror, danger, neon, glossy 3D, or cinematic perspective.',
    CAMERA,
    `Exact layout in room units (x left→right 0–${RC_ROOM.width}, y top→bottom 0–${RC_ROOM.height}); keep every object inside its box so gameplay hit rectangles line up: ${layoutDescription(variant)}. Two figures stand at feet positions (${RC_CHARACTER_SPOTS.host.x}, ${RC_CHARACTER_SPOTS.host.y}) and (${RC_CHARACTER_SPOTS.guest.x}, ${RC_CHARACTER_SPOTS.guest.y}) in the runtime; leave that floor clear.`,
    variant === 'morning'
      ? 'Countable motifs that gameplay depends on: exactly four leaves painted on the vase, exactly three arches in the framed print, exactly two cups on the breakfast tray.'
      : 'Gameplay detail: a single small crescent-moon mark on the front of the lit lamp shade.',
    'Do not include characters, UI, logos, generated words, numbers, or puzzle answers. This image is a composition/style reference; runtime art will be separated into layered assets. Generate at 1024×1536.',
    STYLE_LOCK,
  ].join('\n\n'),
  installTo: null,
  optional: false,
}));

const assetEntries = RC_ASSETS.map((asset) => {
  const canvas = canvasOf(asset);
  const states = RC_ASSETS.filter((other) => other.stateOf === asset.id || (asset.stateOf && (other.id === asset.stateOf || other.stateOf === asset.stateOf) && other.id !== asset.id)).map((other) => other.id.replace('rc_claude_', 'rc_codex_'));
  return {
    id: asset.id.replace('rc_claude_', 'rc_codex_'),
    claudeAssetId: asset.id,
    kind: asset.family,
    placeholder: asset.placeholder,
    variant: asset.variants.length === 2 ? 'both' : asset.variants[0],
    format: asset.format,
    alpha: asset.alpha,
    canvas,
    runtimeSize: asset.size,
    anchor: asset.anchor,
    anchorPx: { x: Math.round(asset.anchor.x * canvas.width), y: Math.round(asset.anchor.y * canvas.height) },
    zIndex: RC_LAYERS.indexOf(asset.layer),
    layer: asset.layer,
    placements: placementsOf(asset.id),
    interactionBounds: hotspotsOf(asset.id),
    reference: referenceFor(asset),
    description: asset.description,
    states,
    stateOf: asset.stateOf ? asset.stateOf.replace('rc_claude_', 'rc_codex_') : null,
    preload: asset.preload ?? 'normal',
    optional: !!asset.optional,
    installTo: `assets/relationship-challenge-claude/final/${asset.id}.${asset.format}`,
    prompt: promptFor(asset),
  };
});

const CODEX_INSTRUCTIONS = `You are generating the final art for Relationship Challenge Claude, whose gameplay, layout and hit rectangles are already built with flat SVG placeholders.

1. Generate the two references first (rc_codex_morning_room_reference, then rc_codex_night_room_reference). Show them to the user and wait for acceptance; every later asset is generated against the accepted reference and must keep its camera, scale and light.
2. Generate each remaining entry with its prompt, at the closest supported ImageGen size, then resize/crop to the exact canvas without distortion. Keep each asset's contact point at anchorPx.
3. Inspect every output: true alpha where alpha is true (no checkerboard, floor patch, room fragment, glow or watermark), complete silhouette, nothing cropped, no generated text or numbers, countable motifs exact (vase 4 leaves, print 3 arches, tray 2 cups, lamp shade 1 crescent). Regenerate anything that fails.
4. State groups (states[]) must share canvas, footprint and anchor so they swap in place: keepsake box closed/open, lamp off/on, morning/night sofa, plates, windows, trays, and the four poses per character.
5. Export optimized ${'WebP'}/PNG at the canvas size to installTo. Skip entries with optional: true unless asked; the runtime draws those effects procedurally.
6. Install: in src/components/relationshipChallengeClaude/assetSource.ts add one static require per file to RC_CLAUDE_INSTALLED, keyed by claudeAssetId, e.g.
   rc_claude_rug: require('../../../assets/relationship-challenge-claude/final/rc_claude_rug.webp'),
   Nothing else changes: hit rectangles, anchors and draw order come from the scene manifest, never from pixels.
7. Check both rooms in the preview routes (/halal-cards/<connectionId>/relationship-challenge-claude/preview/three_things_we_noticed and /evening_plan) on a phone width and a desktop width, with development labels off.

Do not write into the Codex implementation's own asset root or namespace when installing into the Claude build.`;

const handoff = {
  projectName: 'Relationship Challenge Codex',
  sourceImplementation: 'Relationship Challenge Claude',
  room: { width: RC_ROOM.width, height: RC_ROOM.height, pxPerUnit: RC_CANVAS_SCALE, layers: RC_LAYERS },
  styleLock: STYLE_LOCK,
  dependentLock: DEPENDENT_LOCK,
  instructions: CODEX_INSTRUCTIONS,
  assets: [...referenceEntries, ...assetEntries],
};

mkdirSync(outDir, { recursive: true });
const body = JSON.stringify(handoff, null, 2);
writeFileSync(
  join(outDir, 'relationship-challenge-codex-asset-handoff.ts'),
  `// Generated by scripts/relationship-challenge-claude/build-handoff.mjs from the Relationship Challenge Claude scene manifest.\n` +
    `// Standalone: give this file to Codex to generate and install the final art. ${handoff.assets.length} entries.\n\n` +
    `export const RELATIONSHIP_CHALLENGE_CODEX_ASSET_HANDOFF = ${body} as const;\n\n` +
    `export default RELATIONSHIP_CHALLENGE_CODEX_ASSET_HANDOFF;\n`
);
writeFileSync(join(outDir, 'relationship-challenge-codex-asset-handoff.json'), body + '\n');
console.log(`Wrote ${handoff.assets.length} handoff entries (${assetEntries.filter((a) => !a.optional).length} runtime, ${assetEntries.filter((a) => a.optional).length} optional, 2 references).`);
