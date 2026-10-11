/**
 * Writes the Halal Cards illustration brief from the content itself, so it can
 * never drift from what the app shows:
 *
 *   docs/HALAL_CARDS_ILLUSTRATIONS.md   — for a person generating images
 *   docs/halal-cards-illustrations.json — for an agent (Codex) doing the same
 *
 * Run with `npm run cards:illustrations` (it compiles the content first).
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const content = require('../.test-build/src/halalCards/content/index.js');
const images = require('../.test-build/src/halalCards/content/images.js');

const slots = [];
const add = (image, section, placement, mood) => slots.push({ image, section, placement, mood });

/** How each kind of ending should feel, for the system's "Emotional tone". */
const MOOD = {
  steady: 'steady and quietly hopeful',
  tender: 'tender and warm',
  fragile: 'fragile — a little distance, but care is still there',
  strained: 'strained, yet warm and human rather than bleak',
  bittersweet: 'bittersweet — love alongside something lost',
  renewed: 'renewed, relieved and joyful in a calm way',
};

add(images.HUB_HERO, 'Screens', 'Halal Cards home — the large picture at the top, behind the “Halal Cards” title.');
add(images.GUIDE_HERO, 'Screens', 'Relationship Guide — the picture on the home-screen Guide card and at the top of the Guide screen.');

for (const lesson of content.LAB_LESSONS) {
  const section = `Relationship Lab — ${lesson.ruleLabel}: ${lesson.title}`;
  add(lesson.cover, section, `Cover of “${lesson.title}”: its card on the Halal Cards home, the top of its lesson page, the invitation, the lesson’s first card and the “Lesson complete” card.`);
  for (const step of lesson.steps) {
    if (step.type === 'scenario' && step.image) {
      add(step.image, section, `Scenario “${step.title}” — the picture at the top of the scenario card, with the scenario title laid over it.`);
    }
  }
}

for (const quiz of content.QUIZZES) {
  add(quiz.cover, 'Relationship Quizzes', `Cover of “${quiz.title}”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.`);
}

for (const adventure of content.ADVENTURES) {
  const section = `Relationship Adventure — ${adventure.title}`;
  add(adventure.cover, section, `Cover of “${adventure.title}”: its card on the Halal Cards home, the top of its adventure page and the invitation.`);
  for (const scene of Object.values(adventure.scenes)) {
    if (!scene.image) continue;
    const kind = scene.turningPoint ? 'Turning-point scene' : 'Scene';
    add(scene.image, section, `${kind} “${scene.title}” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.`);
  }
  for (const ending of Object.values(adventure.endings)) {
    add(ending.image, section, `Ending “${ending.title}” — the large picture at the top of the ending, with the ending’s title laid over it.`, MOOD[ending.mood]);
  }
}

for (const concept of content.ADVENTURE_CONCEPTS) {
  add(concept.cover, 'Adventures coming soon', `Cover of the upcoming adventure “${concept.title}” in the “Coming soon” row on the Halal Cards home.`);
}

const ids = new Set();
for (const { image } of slots) {
  if (ids.has(image.id)) throw new Error(`Duplicate image slot id: ${image.id}`);
  ids.add(image.id);
}

const entries = slots.map(({ image, section, placement, mood }) => ({
  id: image.id,
  section,
  role: image.role,
  placement,
  file: `assets/halal-cards/${image.id}.webp`,
  size: images.SLOT_FORMAT[image.role].size,
  alt: image.alt,
  ...(mood ? { mood } : {}),
  scene: images.sceneDesign(image, mood),
  prompt: images.fullPrompt(image, mood),
}));

const brief = {
  instructions:
    'For each slot: generate an image from `prompt` (the Halal Mode illustration system with this slot\'s scene ' +
    'already placed in SCENE DESIGN), attaching `referenceImage` as the style reference. Save it as WebP (about ' +
    '300 KB or less) at `file`, then register it in src/halalCards/illustrations.ts under its `id`.',
  referenceImage: images.STYLE_REFERENCE_IMAGE,
  styleSystem: images.ILLUSTRATION_STYLE,
  rules: images.ILLUSTRATION_RULES,
  slots: entries,
};
writeFileSync('docs/halal-cards-illustrations.json', `${JSON.stringify(brief, null, 2)}\n`);

const ROLE = { cover: 'Cover', scene: 'Scene', turning_point: 'Turning point', outcome: 'Outcome' };
let md = `# Halal Cards — illustration brief

Every picture in Halal Cards has a slot. Until a slot has its own illustration
the app shows a stand-in stock photograph (\`src/halalCards/stockImages.ts\`),
so nothing looks empty. This file is generated from the content —
regenerate it with \`npm run cards:illustrations\` after adding or changing
scenes. A machine-readable copy is in \`docs/halal-cards-illustrations.json\`.

**${entries.length} illustrations** in total.

## How to add a picture

1. Give the image model the **Halal Mode illustration system** below, with the
   slot’s **Scene design** block in place of the SCENE DESIGN section, and
   attach the style reference image (\`${images.STYLE_REFERENCE_IMAGE}\`). In
   ChatGPT you can paste the system once per chat, then one scene block per
   image. The JSON has every prompt already assembled.
2. Save it as the **Save as** path — WebP, about 300 KB or less.
3. Register it in \`src/halalCards/illustrations.ts\`:

   \`\`\`ts
   export const ILLUSTRATIONS: Partial<Record<string, ImageSourcePropType>> = {
     'adv-ramadan-friday': require('../../assets/halal-cards/adv-ramadan-friday.webp'),
   };
   \`\`\`

   A registered illustration replaces the stock photo for that slot at once.
   Once every slot is registered, \`stockImages.ts\` can be deleted.

## Readability

The app lays titles over the bottom of most pictures on its own dark
gradient, in light text with a soft shadow. Keep the **lower quarter of every
picture simple and uncluttered** — no faces or important detail there.

## The Halal Mode illustration system

Every prompt is this system with the slot’s scene inserted where it says
SCENE DESIGN.

\`\`\`text
${images.ILLUSTRATION_STYLE}

SCENE DESIGN
(the slot’s Scene design block goes here)

${images.ILLUSTRATION_RULES}
\`\`\`
`;

let current = '';
for (const entry of entries) {
  if (entry.section !== current) {
    current = entry.section;
    md += `\n## ${current}\n`;
  }
  md += `\n### \`${entry.id}\` · ${ROLE[entry.role]}\n\n`;
  md += `- **Where it appears:** ${entry.placement}\n`;
  md += `- **Save as:** \`${entry.file}\`\n`;
  md += `- **Size:** ${entry.size}\n`;
  md += `- **Alt text:** ${entry.alt}\n\n`;
  md += '**Scene design**\n\n```text\n' + entry.scene + '\n```\n';
}

writeFileSync('docs/HALAL_CARDS_ILLUSTRATIONS.md', md);
console.log(`Wrote ${entries.length} illustration slots.`);
