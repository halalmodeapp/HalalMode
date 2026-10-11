# Halal Cards — illustration brief

Every picture in Halal Cards has a slot. A slot without its own illustration
shows a drawn placeholder. This file is generated from the content —
regenerate it with `npm run cards:illustrations` after adding or changing
scenes. A machine-readable copy is in `docs/halal-cards-illustrations.json`.

**120 illustrations** in total.

## How to add a picture

1. Give the image model the **Halal Mode illustration system** below, with the
   slot’s **Scene design** block in place of the SCENE DESIGN section, and
   attach the style reference image (`docs/halal-cards-style-reference.webp`). In
   ChatGPT you can paste the system once per chat, then one scene block per
   image. The JSON has every prompt already assembled.
2. Save it as the **Save as** path (WebP).
3. Run `python scripts/optimize-halal-cards-images.py`. It resizes the
   picture for the app, makes a thumbnail if it is a cover, and registers it
   in `src/halalCards/illustrations.ts` — no hand edits needed.

## Readability

The app lays titles over the bottom of most pictures on its own dark
gradient, in light text with a soft shadow. Keep the **lower quarter of every
picture simple and uncluttered** — no faces or important detail there.

## The Halal Mode illustration system

Every prompt is this system with the slot’s scene inserted where it says
SCENE DESIGN.

```text
HALAL MODE — ILLUSTRATION SYSTEM

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

Avoid clutter, complicated architecture, crowded rooms, excessive decoration and backgrounds that compete with the people.

SCENE DESIGN
(the slot’s Scene design block goes here)

Create a natural candid moment rather than characters posing for the viewer.

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

The final image should feel calm, contemporary, inclusive, thoughtful and premium — appropriate for a modern Muslim relationship app rather than explicitly religious educational material.
```

## Screens

### `hub-hero` · Cover

- **Where it appears:** Halal Cards home — the large picture at the top, behind the “Halal Cards” title.
- **Save as:** `assets/halal-cards/hub-hero.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A married couple laughing over a card game beneath an arched window.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young married Muslim couple sitting on a low cushioned bench under an arched window at golden hour, playing a card game on a small brass tray with tea glasses, both laughing, a fan of illustrated cards in her hand, lanterns and plants around them.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `guide-hero` · Cover

- **Where it appears:** Relationship Guide — the picture on the home-screen Guide card and at the top of the Guide screen.
- **Save as:** `assets/halal-cards/guide-hero.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A married couple writing together in a shared book.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife writing together in a handsome cloth-bound book at a wooden table, his hand steadying the page while she writes, a Qur’an on a stand, a teapot and a sprig of jasmine nearby, soft lamp light.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Lab — Rule Zero: Pick well

### `lab-zero-cover` · Cover

- **Where it appears:** Cover of “Pick well”: its card on the Halal Cards home, the top of its lesson page, the invitation, the lesson’s first card and the “Lesson complete” card.
- **Save as:** `assets/halal-cards/lab-zero-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two cups of tea on a café table in late afternoon light.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two cups of tea on a small café table, one book about marriage between them, late afternoon light through a window, a chaperone’s coat on a nearby chair.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-zero-charm` · Scene

- **Where it appears:** Scenario “The charming one” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-zero-charm.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A charming man laughing while a waiter looks uncomfortable.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man laughing confidently at a café table while a waiter stands awkwardly to one side, a woman across from him watching thoughtfully.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-zero-list` · Scene

- **Where it appears:** Scenario “The list” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-zero-list.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A young woman revising a handwritten list.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman in a soft hijab sitting at a window seat with a handwritten list in her lap, crossing one line out with a pencil, thoughtful half-smile.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-zero-money` · Scene

- **Where it appears:** Scenario “The question nobody asks” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-zero-money.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A couple looking at a notebook of sums together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple and a chaperoning older sister at a café table, a small notebook open between the couple showing simple sums, both leaning in, relaxed and honest.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-zero-stress` · Scene

- **Where it appears:** Scenario “The bad day” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-zero-stress.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A tired young man apologising to a guard on a train platform.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A delayed train platform at dusk, a tired young man in a jacket apologising to a station guard while a young woman and her brother watch from a bench with suitcases.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Lab — Rule 1: Sweat the small stuff

### `lab-one-cover` · Cover

- **Where it appears:** Cover of “Sweat the small stuff”: its card on the Halal Cards home, the top of its lesson page, the invitation, the lesson’s first card and the “Lesson complete” card.
- **Save as:** `assets/halal-cards/lab-one-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A single mug left beside a kitchen sink.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A single unwashed mug beside a kitchen sink, a shadow of a person walking past it, soft morning light.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-one-phone` · Scene

- **Where it appears:** Scenario “Dinner and the phone” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-one-phone.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A husband on his phone at dinner while his wife looks away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a dinner table, the husband looking down at his phone, the wife looking at her plate, a candle between them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-one-mother` · Scene

- **Where it appears:** Scenario “A comment at his mother’s” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-one-mother.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A young wife smiling stiffly at a family dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A crowded family dining room at a mother-in-law's house, an older woman laughing and pointing at a dish, a young wife smiling politely but stiffly, the husband oblivious mid-conversation.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-one-receiver` · Scene

- **Where it appears:** Scenario “Now you are the one hearing it” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-one-receiver.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A husband turning to listen as his wife speaks.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A married couple on a sofa, the wife speaking quietly and the husband turning to face her with an open, listening expression, a weekend planner on the coffee table.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Lab — Rule 2: Listen before you defend

### `lab-two-cover` · Cover

- **Where it appears:** Cover of “Listen before you defend”: its card on the Halal Cards home, the top of its lesson page, the invitation, the lesson’s first card and the “Lesson complete” card.
- **Save as:** `assets/halal-cards/lab-two-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** One person speaking while the other leans in to listen.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two people sitting on a sofa, one speaking with open hands, the other leaning in to listen, a warm lamp between them.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-two-late` · Scene

- **Where it appears:** Scenario “Late again” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-two-late.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A woman alone at an iftar table as her husband arrives late.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting alone at an iftar table with dates and water at dusk, one place setting untouched, a man arriving at the door with his coat still on.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-two-unfair` · Scene

- **Where it appears:** Scenario “When it feels unfair” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-two-unfair.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A wife pausing to listen as her husband talks in frustration.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife at a kitchen counter, he gesturing in frustration, she pausing mid-reply with a curious, gentle expression, a family photo on the fridge behind them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-two-validate` · Scene

- **Where it appears:** Scenario “Validation without agreement” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-two-validate.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** One spouse kneeling to comfort the other.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple in a quiet room, one sitting on the edge of a sofa looking hurt, the other kneeling beside them with a hand open, speaking softly.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Lab — Rule 3: The anxious–avoidant loop

### `lab-three-cover` · Cover

- **Where it appears:** Cover of “The anxious–avoidant loop”: its card on the Halal Cards home, the top of its lesson page, the invitation, the lesson’s first card and the “Lesson complete” card.
- **Save as:** `assets/halal-cards/lab-three-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two figures on a looping path, one reaching, one turning away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two figures on either side of a circular path, one reaching forward and one turning away, a soft gold line looping between them.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-three-quiet` · Scene

- **Where it appears:** Scenario “He has gone quiet” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-three-quiet.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A woman looking at her phone while her husband sits alone in another room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman holding her phone looking at an unanswered message, while in the next room a man sits alone on the edge of a bed with his head in his hands.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-three-space` · Scene

- **Where it appears:** Scenario “Now you are Bilal” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-three-space.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A tired husband in a dim study, his wife's shadow at the door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man in a dim study with headphones around his neck and a laptop closed, looking overwhelmed, a door ajar with warm light and his wife's silhouette beyond it.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `lab-three-loop` · Scene

- **Where it appears:** Scenario “Spotting it mid-argument” — the picture at the top of the scenario card, with the scenario title laid over it.
- **Save as:** `assets/halal-cards/lab-three-loop.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A wife following her husband down a hallway as he turns away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A narrow hallway in a home, a wife following her husband with an outstretched hand while he turns toward a doorway with his palm raised, both mid-step, a soft gold light between them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Quizzes

### `quiz-know-me-cover` · Cover

- **Where it appears:** Cover of “How well do you know me?”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-know-me-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two hands holding cards face down.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two hands each holding a playing card face-down over a low table, a plate of dates between them.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-guess-cover` · Cover

- **Where it appears:** Cover of “Guess my answer”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-guess-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two overlapping card-shaped speech bubbles.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two speech bubbles shaped like cards overlapping, one with a question mark in gold.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-money-cover` · Cover

- **Where it appears:** Cover of “Money”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-money-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A bowl of coins beside a shared notebook.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small brass bowl of coins beside a notebook with two pens, one gold and one black.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-family-cover` · Cover

- **Where it appears:** Cover of “Family”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-family-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Many hands passing dishes around a family table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A long dinner table seen from above, many hands passing dishes, two hands in the middle touching gently.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-expect-cover` · Cover

- **Where it appears:** Cover of “Expectations”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-expect-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A balance scale holding a key and a teacup.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A brass balance scale on a wooden table with a key on one side and a teacup on the other.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-future-cover` · Cover

- **Where it appears:** Cover of “Future plans”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-future-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A window at dawn with two mugs on the sill.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A window looking out at a distant city skyline at dawn, two mugs on the sill.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-affection-cover` · Cover

- **Where it appears:** Cover of “Love languages”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-affection-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A folded note in a coat pocket with jasmine.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A folded note tucked into a coat pocket, a sprig of jasmine beside it.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-likely-cover` · Cover

- **Where it appears:** Cover of “Who is more likely to…?”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-likely-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two hands pointing playfully at each other.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two playful hands pointing at each other across a table scattered with sweets.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-wyr-cover` · Cover

- **Where it appears:** Cover of “Would you rather?”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-wyr-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A garden path forking two ways.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A fork in a garden path lined with lanterns, one path toward mountains, one toward the sea.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-nikah-cover` · Cover

- **Where it appears:** Cover of “Planning the nikah”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-nikah-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** An engaged couple planning with their mothers at a café table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple sitting at a café table with their two mothers, a small notebook and a calendar between them, everyone leaning in kindly.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-first-year-cover` · Cover

- **Where it appears:** Cover of “The first year”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-first-year-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A newly married couple unpacking boxes in their first home.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young married couple in a small flat unpacking boxes together, one holding a framed picture, the other laughing, a kettle on the counter.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-check-in-cover` · Cover

- **Where it appears:** Cover of “Married check-in”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-check-in-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A married couple talking over tea at the end of the day.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A married couple sitting on a sofa at the end of the day with mugs of tea, turned toward each other, talking softly, a lamp glowing.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The First Ramadan

### `adv-ramadan-cover` · Cover

- **Where it appears:** Cover of “The First Ramadan”: its card on the Halal Cards home, the top of its adventure page and the invitation.
- **Save as:** `assets/halal-cards/adv-ramadan-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A young couple preparing a big iftar in a small flat.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A newlywed couple’s small flat at maghrib, lanterns in the window, a long table being laid for many guests, the young wife pausing with a tray of dates.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-invite` · Scene

- **Where it appears:** Scene “The phone call” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-invite.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza on the phone in the hallway while Noor unpacks shopping.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man on the phone in a narrow hallway, smiling but uncertain, his wife visible in the kitchen behind him unpacking groceries.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-groupchat` · Scene

- **Where it appears:** Scene “The group chat” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-groupchat.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Noor reading the family group chat at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman sitting on the edge of a bed at night in a loose hijab, lit by her phone screen showing a busy family group chat full of hearts, her face quietly hurt.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-fallout` · Scene

- **Where it appears:** Scene “The silence after” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-fallout.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza on an upsetting call from his mother.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man standing in a narrow kitchen holding a phone to his ear, eyes closed, a framed photo of his mother on the wall behind him.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-plan` · Scene

- **Where it appears:** Scene “Kitchen table” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-plan.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor planning Ramadan over tea.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young married couple at a small kitchen table with two cups of tea and a paper Ramadan calendar between them, pens in hand, talking seriously but warmly.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-friday` · Turning point

- **Where it appears:** Turning-point scene “The first Friday” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-friday.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A crowded iftar where an older woman comments on the food.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A crowded living room at iftar, plates of samosas and dates, an older woman gesturing at a plate while a young wife stands frozen holding a jug of water and her husband laughs nervously.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-kitchen` · Scene

- **Where it appears:** Scene “The kitchen, after” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-kitchen.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Noor and her mother-in-law laughing at the sink.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An older woman and a young woman laughing together at a kitchen sink full of dishes after iftar, sleeves rolled up, steam rising, warm light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-drive` · Scene

- **Where it appears:** Scene “The silent drive” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-drive.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A silent drive to tarawih at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in a small car at night driving to the mosque, the wife looking out of the window, the husband gripping the wheel, streetlights streaking, a minaret in the distance.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-midnight` · Scene

- **Where it appears:** Scene “After everyone leaves” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-midnight.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor in the kitchen after guests leave.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small flat at midnight after guests have left, a sink full of dishes, leftover dates on a plate, a young wife leaning on the counter and her husband in the doorway.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-listen` · Scene

- **Where it appears:** Scene “Hamza listens” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-listen.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza listening carefully to Noor.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a sofa at night, the wife talking with her hands, the husband leaning forward listening intently, a lantern glowing on the side table.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-mum` · Turning point

- **Where it appears:** Turning-point scene “A word with Mum” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-mum.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza talking with his mother at her kitchen table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man and his mother sitting at her kitchen table after suhoor, a teapot between them, early grey light, him leaning forward earnestly.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-blowup` · Scene

- **Where it appears:** Scene “Everything at once” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-blowup.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Noor letting everything out as Hamza stands stunned.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young wife standing in a kitchen speaking emotionally, a crumpled tea towel in her hand, her husband frozen in the doorway, stunned, half-lit.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-cold` · Scene

- **Where it appears:** Scene “A cold week” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-cold.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor praying apart in a cold silence.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two prayer mats laid out in the same room but far apart, a husband and wife praying with a cool blue distance between them, night light through the window.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-olive` · Scene

- **Where it appears:** Scene “An olive branch” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-olive.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A cup of tea offered as a peace gesture.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A single cup of tea being set down beside someone's hand on a table, the other hand hesitating, morning light, a small gesture of peace.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-qadr` · Scene

- **Where it appears:** Scene “The twenty-seventh night” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-qadr.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor walking home together late at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife walking home side by side under a deep blue night sky after late prayers, a crescent moon, streetlights, a quiet suburban street.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-boundary` · Scene

- **Where it appears:** Scene “A plan for the two of you” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-boundary.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor making a plan together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife sitting cross-legged on a rug facing each other, holding hands, a notebook between them, calm and resolved, lanterns behind them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-lastten` · Scene

- **Where it appears:** Scene “The last ten nights” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-lastten.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** The mosque during the last ten nights.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A mosque interior on one of the last ten nights of Ramadan, rows of worshippers under soft chandeliers, a man's and a woman's shoes side by side at the entrance.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-eid` · Turning point

- **Where it appears:** Turning-point scene “Eid morning” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-eid.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamza and Noor dressed for Eid at their front door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Eid morning, a couple in new clothes at their front door, both phones lighting up with messages, sunlight and a tray of sweets.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-table` · Outcome

- **Where it appears:** Ending “One table” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-table.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Both families at one long Eid table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two extended families squeezed around one long Eid table in a garden, two mothers laughing together, the young couple at the centre.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-ours` · Outcome

- **Where it appears:** Ending “Their own Ramadan” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-ours.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor praying side by side at home.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple praying side by side on two prayer mats in a softly lit living room at night, lanterns glowing.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-cracks` · Outcome

- **Where it appears:** Ending “Cracks under the lanterns” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-cracks.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor at opposite ends of an Eid table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A beautifully laid Eid table with a husband and wife sitting at opposite ends, not looking at each other, decorations still up.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-us` · Outcome

- **Where it appears:** Ending “Us against them” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-us.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor alone at Eid breakfast, a phone ignored.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple eating Eid breakfast alone together in their small flat, smiling at each other, an unanswered phone glowing on the counter.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-lonely` · Outcome

- **Where it appears:** Ending “Everyone happy but Noor” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-lonely.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Noor alone in the kitchen while the family laughs next door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman alone in a kitchen at night surrounded by stacks of washed dishes, laughter and light from the living room behind her.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-truce` · Outcome

- **Where it appears:** Ending “A polite truce” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-truce.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor exchanging gifts politely.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife exchanging Eid gifts politely in a living room, smiling slightly, sitting a little too far apart on the sofa.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-quiet` · Outcome

- **Where it appears:** Ending “A quiet Eid” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-quiet.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor getting ready for Eid in separate rooms.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Eid morning, a husband and wife getting ready in separate rooms of a flat, a closed door between them.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-steady` · Outcome

- **Where it appears:** Ending “A first Ramadan, survived” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-steady.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamza and Noor sharing sweets on a balcony after Eid.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a balcony at night after Eid, tired, sharing a plate of sweets, the city lights below.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-ramadan-end-kitchen` · Outcome

- **Where it appears:** Ending “Peace in the kitchen” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-ramadan-end-kitchen.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Noor and her mother-in-law folding samosas together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An older woman and a young woman laughing while folding samosas together at a kitchen counter, flour everywhere.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Read at 11:42

### `adv-1142-cover` · Cover

- **Where it appears:** Cover of “Read at 11:42”: its card on the Halal Cards home, the top of its adventure page and the invitation.
- **Save as:** `assets/halal-cards/adv-1142-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A phone on a bedside table showing an unanswered message.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A phone lying on a bedside table showing a single unanswered message with a tiny “read 11:42” label, a hijab folded beside it, morning light.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-message` · Scene

- **Where it appears:** Scene “Read, 11:42” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-message.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Maryam glancing at an unanswered message at work.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman at her office desk glancing at her phone, the screen showing a message marked read with no reply, a half-finished coffee.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-like` · Scene

- **Where it appears:** Scene “The like” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-like.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Maryam looking at a liked photo on her phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Close-up of a young woman in a hijab lit by a phone screen showing a social media photo of a smiling graduate in a gown, her expression a mix of hurt and suspicion.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-yusuf` · Scene

- **Where it appears:** Scene “Meanwhile, in Manchester” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-yusuf.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf alone in a stairwell, staring at his phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man sitting alone in a corporate stairwell, tie loosened, staring at his phone without typing, grey city light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-night` · Turning point

- **Where it appears:** Turning-point scene “Nine o’clock, ten, eleven” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-night.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Maryam awake in separate cities.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Split scene at night: a man in a hotel room lying awake with his phone face down; a woman at home sitting up in bed holding her phone, both lit by screen glow.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-loop` · Scene

- **Where it appears:** Turning-point scene “The loop” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-loop.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf overwhelmed by missed calls.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A hotel bed with a phone buzzing beside a man who presses his palms to his eyes, the screen showing many missed calls, a circular gold line looping around the scene.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-call` · Scene

- **Where it appears:** Scene “The call” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-call.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Maryam listening to Yusuf on the phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman on her sofa with her phone to her ear, listening with soft eyes, a cup of tea on her knee, a city window at night behind her.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-liketalk` · Scene

- **Where it appears:** Scene “About that photo” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-liketalk.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Maryam on a difficult phone call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Split view of a couple on a phone call, the man in a hotel room rubbing his neck, the woman at home holding her phone carefully, both serious.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-jealousy` · Scene

- **Where it appears:** Scene “What’s underneath” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-jealousy.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Maryam alone on the kitchen floor, thinking.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman sitting alone on a kitchen floor against a cupboard, phone face down beside her, looking up thoughtfully, evening light through blinds.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-coldwar` · Scene

- **Where it appears:** Scene “Short texts” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-coldwar.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Short, cold text messages on two phones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two phone screens side by side showing short replies like ok and a thumbs up, one held by a man in an office, one by a woman on a bus, grey tones.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-morning` · Scene

- **Where it appears:** Scene “Nine o’clock” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-morning.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Maryam on a morning call after Fajr.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Early morning after Fajr, a young woman by a window with the sunrise, smiling slightly during a phone call, a prayer mat folded on a chair.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-home` · Turning point

- **Where it appears:** Turning-point scene “Friday night” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-home.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf arriving home with a suitcase as Maryam opens the door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man arriving home with a suitcase at night, his wife at the open door, both hesitating on the threshold, warm hallway light.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-fight` · Scene

- **Where it appears:** Scene “The list” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-fight.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Maryam arguing by his suitcase.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A living room with a suitcase still by the door, a husband and wife standing apart mid-argument, both gesturing, a coat half off, harsh overhead light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-weekend` · Scene

- **Where it appears:** Scene “A lovely weekend” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-weekend.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Maryam enjoying a weekend walk.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking in a park in autumn holding takeaway cups and laughing, leaves falling, a hint of something unspoken in the wife's glance.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-talk` · Scene

- **Where it appears:** Scene “The talk” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-talk.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Maryam talking on the floor with a notebook between them.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting cross-legged on a living-room floor facing each other, two mugs, a notebook between them, lamp light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-return` · Outcome

- **Where it appears:** Ending ““Back at nine”” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-return.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Maryam smiling at a message saying “back at 9”.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A phone screen showing a simple message “Busy day — back at 9 🤍” with a woman smiling at it while making tea.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-phones` · Outcome

- **Where it appears:** Ending “Nothing to guess” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-phones.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two phones side by side, ignored, as the couple share tea.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two phones lying side by side on a sofa cushion, screens dark, a couple’s hands nearby holding mugs.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-oneline` · Outcome

- **Where it appears:** Ending “One line” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-oneline.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf quickly sending a one-line message from a meeting.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in a meeting room glancing down and quickly typing a short message under the table, smiling slightly.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-loop` · Outcome

- **Where it appears:** Ending “The loop wins” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-loop.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two figures on a circular staircase, never meeting.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A circular staircase seen from above, a man walking up and a woman following, never meeting, muted colours.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-pass` · Outcome

- **Where it appears:** Ending “The passwords” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-pass.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A phone lying between Yusuf and Maryam at dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A phone lying between a couple at a dinner table like a third guest, both looking at it rather than each other.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-next` · Outcome

- **Where it appears:** Ending “Next month” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-next.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A packed suitcase by the door at dawn.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A packed suitcase standing by a front door at dawn, a woman watching it from the stairs.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-closer` · Outcome

- **Where it appears:** Ending “Closer than before” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-closer.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Maryam asleep on the sofa after talking.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple asleep on a sofa after a long talk, a blanket over them, two empty mugs, morning light starting.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-distance` · Outcome

- **Where it appears:** Ending “Quiet distance” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-distance.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Maryam on their phones, a gap between them.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in the same room each absorbed in their own phone, lit by separate screens, an empty space on the sofa between them.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-1142-end-learning` · Outcome

- **Where it appears:** Ending “A learning curve” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-1142-end-learning.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Maryam walking by a canal, talking.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking along a canal path at dusk, talking, one gesturing as if explaining something, the other listening.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Offer

### `adv-offer-cover` · Cover

- **Where it appears:** Cover of “The Offer”: its card on the Halal Cards home, the top of its adventure page and the invitation.
- **Save as:** `assets/halal-cards/adv-offer-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hana holding a job offer letter while Idris looks at a family photo.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman holding a printed job offer letter at a kitchen table, a laptop showing a Dubai skyline, her husband in the background holding a phone with a family photo on it.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-email` · Scene

- **Where it appears:** Scene “The email” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-email.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hana reading a job offer email in surprise.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman at her desk at night, laptop open, hand over her mouth in surprise, the subject line “Offer of employment” glowing.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-react` · Scene

- **Where it appears:** Scene “Downstairs” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-react.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris reacting as Hana shares the news.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man in a living room lowering his phone, turning toward his wife who stands in the doorway holding a laptop and beaming, his expression caught between pride and worry.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-dinner` · Scene

- **Where it appears:** Scene “At her parents’ dinner” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-dinner.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris hearing the news from Hana's sister at dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A lively family dinner table, a smiling sister raising a cup toward a young man whose polite smile hides confusion, his wife beside him looking down.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-regret` · Scene

- **Where it appears:** Scene “Three weeks later” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-regret.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris noticing Hana's quiet sadness.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman sitting on a bed folding laundry slowly, staring into the distance, her husband in the doorway noticing her quiet sadness.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-talk` · Turning point

- **Where it appears:** Turning-point scene “What matters most” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-talk.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris and Hana each writing privately on a card.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting at opposite sides of a kitchen table late at night, each writing privately on a small card, a single lamp between them.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-stalemate` · Scene

- **Where it appears:** Scene “After you” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-stalemate.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris and Hana each insisting on the other's wish.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting at a table each sliding a card toward the other, both smiling helplessly, two cups of tea going cold.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-mother` · Turning point

- **Where it appears:** Turning-point scene “His mother calls” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-mother.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris on the phone with his mother while Hana watches.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man standing by a window on the phone, eyes closed, while a woman watches him from across the room, a suitcase-shaped shadow on the wall.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-learns` · Scene

- **Where it appears:** Scene “Hana hears” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-learns.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hana stunned by a call from her mother-in-law.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman in a hijab standing in a kitchen holding a phone slightly away from her ear, her face stunned, afternoon light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-options` · Turning point

- **Where it appears:** Turning-point scene “The options” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-options.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Four option cards laid out on a table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple’s hands arranging four paper cards on a table, each card showing a simple drawing: a plane, a house, a laptop, a heart.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-negotiate` · Scene

- **Where it appears:** Scene “The counter-offer” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-negotiate.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hana negotiating on a video call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman in a smart hijab on a video call at a home desk, confident and composed, notes beside her, her husband in the background giving a thumbs-up.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-dubai` · Scene

- **Where it appears:** Scene “Six months in” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-dubai.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris on a video call with his father from a Dubai balcony.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a high apartment balcony in Dubai at dusk, the man on a video call with an older man in a hospital bed, the woman with a hand on his shoulder.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-strain` · Scene

- **Where it appears:** Scene “Guilt” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-strain.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris working late in Dubai.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man alone in a glass office at night in a high-rise, working late, a family photo face down on the desk, city lights below.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-settles` · Scene

- **Where it appears:** Scene “A rhythm” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-settles.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris and Hana on a happy call with his father.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a video call with an older man sitting in a garden in a cardigan, all laughing, a calendar on the wall marked with visit dates.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-homecoming` · Scene

- **Where it appears:** Scene “Home” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-homecoming.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A family reunion at the airport.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An airport arrivals hall, an older man with a walking stick hugging his son, a young woman beside them with luggage, eyes wet, both happy and wistful.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-staying` · Scene

- **Where it appears:** Scene “Staying” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-staying.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris helping his father walk as Hana works nearby.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man helping his elderly father walk in a garden on a sunny afternoon while his wife works on a laptop at a garden table nearby.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-year` · Turning point

- **Where it appears:** Turning-point scene “One year later” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-year.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Idris and Hana on a bench a year later.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a garden bench in autumn, a year older, looking at a calendar on a phone together, leaves falling.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-promise` · Outcome

- **Where it appears:** Ending “The promise” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-promise.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hana at a rainy window, the old offer pinned behind her.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman looking out of a rainy London window holding a mug, an old printed job offer pinned to a corkboard behind her.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-both` · Outcome

- **Where it appears:** Ending “Both, and” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-both.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Idris’s father laughing on a video call with the couple.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An older man with a walking stick laughing on a video call on a tablet held by a young couple, half their faces lit by sunset.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-guilt` · Outcome

- **Where it appears:** Ending “Far from home” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-guilt.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Idris alone in an office at night beside a family photo.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man alone in a glass office at night overlooking a city, phone face down on the desk, a family photo beside it.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-home` · Outcome

- **Where it appears:** Ending “Home again” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-home.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A family lunch at home, with moving boxes in the corner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A family Friday lunch in a modest home, an older man at the head of the table, a young woman smiling but a little wistful, moving boxes still in the corner.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-road` · Outcome

- **Where it appears:** Ending “The road not taken” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-road.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hana walking a road, glancing back at the other path.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman walking alone on a quiet road at dusk that forks, glancing back at the other path lit by distant city lights.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-separate` · Outcome

- **Where it appears:** Ending “Two separate decisions” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-separate.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Idris and Hana working back to back in their kitchen.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two people in the same kitchen each on their own laptop, backs to each other, two separate calendars on the wall.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-shape` · Outcome

- **Where it appears:** Ending “A new shape” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-shape.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hana working from home with a boarding pass, Idris bringing tea.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman working on a laptop at a kitchen table in London, a boarding pass beside her, her husband bringing her tea, sunlight.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-together` · Outcome

- **Where it appears:** Ending “Decided together” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-together.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Idris and Hana holding hands across a café table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple holding hands across a café table with two cups, a calm closeness, a small notebook between them with a list.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-offer-end-still` · Outcome

- **Where it appears:** Ending “Still deciding” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-offer-end-still.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Idris and Hana walking by a river at sunset.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking slowly along a river path at sunset, side by side, deep in conversation.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Adventures coming soon

### `concept-practice-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Fajr Alarm” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-practice-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A man unrolling a prayer mat before dawn as his wife sleeps.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A dim bedroom before dawn, a man rolling out a prayer mat while his wife sleeps, an alarm clock glowing 5:02.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-mahr-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “The Mahr Conversation” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-mahr-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two fathers in tense conversation while the couple watch.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two older men across a formal living room, tea untouched, a young couple watching nervously from the doorway.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-baby-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Three in the Morning” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-baby-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Exhausted new parents in the kitchen at 3am.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A kitchen at 3am, a father warming a bottle and a mother asleep at the table with her head on her arms, a baby monitor glowing.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-insta-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Public Couple, Private Couple” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-insta-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A wife filming coffees while her husband hides behind a menu.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a café, the woman holding up a phone to film their coffees, the man covering his face with a menu, laughing.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-house-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “The Upstairs Room” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-house-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A family staircase leading to the couple’s room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A family staircase with a young couple’s door at the top slightly ajar, a mother’s hand on the banister below.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-friend-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “The Old Friend” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-friend-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A phone notification glowing at night beside a sleeping husband.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A phone lighting up on a dark bedside table with a notification, a man asleep and a woman awake beside him looking at it.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-ignored-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Background Noise” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-ignored-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A wife talking while her husband watches TV without looking.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a sofa, the husband watching football and the wife talking to him while he nods without looking, an untouched slice of cake.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-career-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Starting Over at Thirty-Four” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-career-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A husband studying Arabic texts as his wife returns from work.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man at a desk covered in classical Arabic texts at night, his wife in the doorway in work clothes holding car keys.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-brother-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “The Brother” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-brother-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A brother asking his sister for help as her husband watches.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man sitting with his head down on his sister’s sofa, the sister holding an envelope, her husband standing in the kitchen doorway.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-wedding-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “Whose Wedding Is It?” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-wedding-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** An engaged couple buried in wedding plans as both mothers talk on phones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple sitting on the floor surrounded by wedding planning lists and fabric samples, both mothers looming in the background on phones.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-town-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “A Long Way from the Masjid” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-town-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple outside a countryside cottage, one excited, one uncertain.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple standing outside a cottage in a quiet countryside town, one looking around with excitement, the other with uncertainty, a compass in hand.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `concept-anger-cover` · Cover

- **Where it appears:** Cover of the upcoming adventure “The Raised Voice” in the “Coming soon” row on the Halal Cards home.
- **Save as:** `assets/halal-cards/concept-anger-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple on opposite sides of a kitchen after an argument.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A kitchen with a single broken plate on the floor, a husband and wife on opposite sides of the room, one with hands raised apologetically.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```
