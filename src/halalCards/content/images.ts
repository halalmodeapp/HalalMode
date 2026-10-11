import type { ImageSlot } from '../types.ts';

/**
 * The Halal Mode illustration system: one visual language for every Halal
 * Cards picture, so an image generated today sits beside one generated next
 * year as if drawn by the same illustrator. `fullPrompt` places each slot's
 * scene into the SCENE DESIGN section.
 */
export const STYLE_REFERENCE_IMAGE = 'docs/halal-cards-style-reference.webp';

export const ILLUSTRATION_STYLE = `HALAL MODE — ILLUSTRATION SYSTEM

Create a consistent family of editorial flat illustrations for Halal Mode, a modern Muslim relationship and marriage app.

Use the attached reference image as the main visual style reference.

STYLE
Use clean contemporary editorial flat illustration:
- simple geometric shapes
- flat matte colors
- thin, subtle dark outlines
- simplified facial features
- expressive but understated body language
- slightly stylized human proportions
- warm, friendly, sophisticated and modern
- polished enough for a premium app
- visually similar to illustrations found in modern editorial magazines, fintech apps and lifestyle publications
- avoid childish/cartoonish proportions
- avoid exaggerated anime or comic-book expressions
- no photorealism
- no 3D
- no glossy rendering
- no dramatic lighting
- no detailed textures
- no heavy gradients
- no overly intricate patterns

COLOR SYSTEM
Keep colors soft, harmonious and easy on the eyes.

Favor:
- warm cream and off-white backgrounds
- muted sand, beige, camel and terracotta
- dusty blues
- muted sage and olive
- soft browns
- deep navy and charcoal
- restrained warm accent colors

Avoid neon colors, highly saturated palettes, excessive contrast, rainbow-like color combinations or colors that compete for attention.

Maintain approximately the same saturation, line weight and visual contrast across every Halal Mode illustration.

CHARACTERS
All characters exist within a contemporary Muslim context.

Represent a wide variety of Muslim ethnic and cultural backgrounds naturally across the illustration library, including Gulf Arab, Levantine, North African, East African, West African, South Asian, Southeast Asian, Central Asian, Turkish and mixed-background characters.

Do not turn ethnicity into caricature. Diversity should come naturally through skin tone, facial features, hair, clothing and environment.

Women will commonly wear tasteful modern hijabs and modest clothing. Depending on the situation, they may wear abayas, dresses, skirts, trousers, jackets, professional clothing or casual modest outfits.

Men will commonly have some form of facial hair, ranging from light stubble to short or fuller beards. Clothing may include thobes, casual shirts, jackets, sweaters, trousers, professional clothing or other contemporary modest clothing.

Do not make every character look traditionally dressed. Mix contemporary Muslim life with traditional clothing where appropriate.

Keep faces simple and graphic, with small eyes, eyebrows, noses and mouths. Emotion should primarily be communicated through posture, gestures, facial expression and the relationship between characters.

BACKGROUND & COMPOSITION
The characters are always the visual focus.

Backgrounds should provide enough context to immediately understand the scene without becoming detailed or visually busy.

Use minimal environmental storytelling:
- a table and two chairs for a restaurant
- a counter, shelf and shopping bag for a store
- a sofa, lamp and plant for a home
- a bench and simplified trees for a park
- a few storefront shapes for a mall
- a desk and laptop for an office
- simple kitchen elements for a home discussion
- a car interior or simplified street for a travel scene

Usually use only a few environmental elements.

Background objects should have lower contrast and less detail than the characters.

Leave comfortable negative space around the composition.

Avoid clutter, complicated architecture, crowded rooms, excessive decoration and backgrounds that compete with the people.`;

/** Follows the scene in every prompt. */
export const ILLUSTRATION_RULES = `Create a natural candid moment rather than characters posing for the viewer.

Use body language that clearly communicates what is happening.

If the subject is serious, keep the illustration warm and human rather than depressing or melodramatic.

If the subject is playful, use subtle humor through expressions, posture and situational details rather than exaggerated cartoon effects.

CONSISTENCY RULES
Every illustration should feel as though it was created by the exact same illustrator for the exact same product.

Keep consistent:
- line thickness
- facial simplification
- character proportions
- shadow treatment
- color saturation
- background complexity
- clothing detail
- perspective
- overall visual density

Do not randomly switch illustration styles between scenes.

Prefer one strong visual idea per illustration instead of filling the image with unnecessary details.

Do not include text, captions, speech bubbles, logos or UI elements inside the illustration unless specifically requested.

The final image should feel calm, contemporary, inclusive, thoughtful and premium — appropriate for a modern Muslim relationship app rather than explicitly religious educational material.`;

/** Size to generate each kind of slot at, and how the app crops it. */
export const SLOT_FORMAT: Record<ImageSlot['role'], { size: string; note: string }> = {
  cover: {
    size: '1600 × 2000 px (4:5, portrait)',
    note: 'Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).',
  },
  scene: {
    size: '1920 × 1200 px (16:10, landscape)',
    note: 'The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.',
  },
  turning_point: {
    size: '1920 × 1200 px (16:10, landscape)',
    note: 'A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.',
  },
  outcome: {
    size: '1600 × 2000 px (4:5, portrait)',
    note: 'The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.',
  },
};

export function slot(id: string, role: ImageSlot['role'], prompt: string, alt: string): ImageSlot {
  return { id, role, prompt, alt };
}

/** Just the SCENE DESIGN section for a slot — what changes from image to image. */
export function sceneDesign(image: ImageSlot, mood?: string): string {
  return [
    'SCENE DESIGN',
    'Illustrate the following scenario:',
    '',
    image.prompt,
    ...(mood ? ['', `Emotional tone: ${mood}`] : []),
    '',
    `Format: ${SLOT_FORMAT[image.role].size}. ${SLOT_FORMAT[image.role].note}`,
    'Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.',
  ].join('\n');
}

/** The full prompt to give the image model for a slot. */
export function fullPrompt(image: ImageSlot, mood?: string): string {
  return `${ILLUSTRATION_STYLE}\n\n${sceneDesign(image, mood)}\n\n${ILLUSTRATION_RULES}`;
}

/** Slots that belong to screens rather than to one activity. */
export const HUB_HERO = slot(
  'hub-hero',
  'cover',
  'A young married Muslim couple sitting on a low cushioned bench under an arched window at golden hour, playing a card game on a small brass tray with tea glasses, both laughing, a fan of illustrated cards in her hand, lanterns and plants around them.',
  'A married couple laughing over a card game beneath an arched window.'
);

export const GUIDE_HERO = slot(
  'guide-hero',
  'cover',
  'A husband and wife writing together in a handsome cloth-bound book at a wooden table, his hand steadying the page while she writes, a Qur’an on a stand, a teapot and a sprig of jasmine nearby, soft lamp light.',
  'A married couple writing together in a shared book.'
);
