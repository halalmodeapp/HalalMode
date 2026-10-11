# Halal Cards — illustration brief

Every picture in Halal Cards has a slot. A slot without its own illustration
shows a drawn placeholder. This file is generated from the content —
regenerate it with `npm run cards:illustrations` after adding or changing
scenes. A machine-readable copy is in `docs/halal-cards-illustrations.json`.

**309 illustrations** in total.

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

### `section-lab` · Cover

- **Where it appears:** Halal Cards home — the red title card for section 1, Relationship Lab. Tinted red so the section reads as its own chapter.
- **Save as:** `assets/halal-cards/section-lab.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple working through a notebook together, in warm red tones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Title card for “Relationship Lab”. A married couple sitting across a small table with an open notebook, sketching a simple diagram of two overlapping circles between them, thoughtful and engaged. The whole image is tinted in a warm, muted brick-red and terracotta palette — reds dominate the background, clothing accents and shadows, with cream highlights — so it reads unmistakably as the red chapter.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `section-quiz` · Cover

- **Where it appears:** Halal Cards home — the yellow title card for section 2, Relationship Quizzes. Tinted yellow so the section reads as its own chapter.
- **Save as:** `assets/halal-cards/section-quiz.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple about to reveal their cards, in warm yellow tones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Title card for “Relationship Quizzes”. A husband and wife on a sofa each holding a card close to their chest, grinning at each other as if about to reveal their answers, playful and light. The whole image is tinted in a warm, muted saffron and ochre-yellow palette — yellows and golds dominate the background, cushions and shadows, with cream highlights — so it reads unmistakably as the yellow chapter.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `section-adventure` · Cover

- **Where it appears:** Halal Cards home — the blue title card for section 3, Relationship Adventures. Tinted blue/cyan so the section reads as its own chapter.
- **Save as:** `assets/halal-cards/section-adventure.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple at a fork in a path, in cool blue tones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Title card for “Relationship Adventures”. A married couple standing together at the start of a winding path that forks ahead toward a distant city skyline and hills, one pointing ahead, the other holding a map, a sense of story and journey. The whole image is tinted in a muted teal, dusty cyan and soft blue palette — blues dominate the sky, path and shadows, with cream highlights — so it reads unmistakably as the blue chapter.

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

### `quiz-families-cover` · Cover

- **Where it appears:** Cover of “Meeting the families”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-families-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** An engaged couple arriving at a family home with sweets.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young engaged couple standing at the front door of a family home holding a box of sweets, an older couple opening the door warmly to welcome them.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-budget-cover` · Cover

- **Where it appears:** Cover of “The wedding budget”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-budget-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** An engaged couple planning a budget at a café.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple at a café table with a small notebook, a calculator and two cups of coffee, the woman writing numbers, the man pointing at one, smiling.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-love-cover` · Cover

- **Where it appears:** Cover of “Keeping love alive”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-love-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A husband handing his wife tea with a little note.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A married couple in their kitchen, the husband handing his wife a cup of tea with a small note on the saucer, both smiling, morning light.

Format: 1600 × 2000 px (4:5, portrait). Also shown cropped to 16:10 in lists — keep the characters in the middle third, and keep the lower quarter simple and uncluttered (the app lays the title over it).
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `quiz-parenting-cover` · Cover

- **Where it appears:** Cover of “Parenting together”: its tile on the Halal Cards home, the top of its quiz page, the invitation, the first quiz card and the “Quiz complete” card.
- **Save as:** `assets/halal-cards/quiz-parenting-cover.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A couple playing with their toddler on a rug.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A married couple sitting on a rug with a toddler stacking wooden blocks, the parents smiling at each other over the child’s head, soft afternoon light.

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

## Relationship Adventure — Fajr Alarm

### `concept-practice-cover` · Cover

- **Where it appears:** Cover of “Fajr Alarm”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-fajr-alarm-alarm` · Scene

- **Where it appears:** Scene “5:02 a.m.” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-alarm.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid silencing the alarm while Amal sleeps.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in a dark bedroom silencing a glowing alarm clock, prayer mat over his arm, glancing at his wife asleep under the covers after a night shift, her nurse’s lanyard on the bedside table.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-morning` · Scene

- **Where it appears:** Scene “Breakfast” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-morning.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal talking over a late breakfast.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a small kitchen table in late morning light, the wife in a cardigan holding a mug with tired eyes, the husband buttering toast and speaking earnestly.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-friend` · Scene

- **Where it appears:** Scene “A friend at the door” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-friend.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid’s friend making a remark in the doorway.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two bearded men in a living room doorway after prayer, one in a thobe gesturing casually, the host smiling uncomfortably, a woman visible in the kitchen behind them pausing mid-step.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-overheard` · Turning point

- **Where it appears:** Turning-point scene “Overheard” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-overheard.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Amal overhearing the conversation in the hall.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman standing still in a kitchen holding a dish towel, listening toward the hallway where two men are talking, her expression hurt and thoughtful.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-talk` · Scene

- **Where it appears:** Scene “The kitchen table” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-talk.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal talking at the kitchen table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife sitting across a small kitchen table at night, two cups of tea, his hands open, her arms relaxed, a calm honest conversation.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-distance` · Scene

- **Where it appears:** Scene “Separate rooms, separate mats” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-distance.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal praying in separate rooms.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two prayer mats in two different rooms of the same flat, seen through an open doorway, a man praying in one, a woman praying in the other, soft lamplight.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-ramadan` · Turning point

- **Where it appears:** Turning-point scene “Ramadan arrives” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-ramadan.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal preparing suhoor before dawn.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple preparing suhoor in a small kitchen before dawn, one pouring water, one setting dates on a plate, a crescent moon outside the window.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-lonely` · Scene

- **Where it appears:** Scene “Iftar for one” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-lonely.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Amal breaking her fast alone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman breaking her fast alone at a kitchen counter with a single date and glass of water, phone showing a message, the room quiet.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-qadr` · Scene

- **Where it appears:** Scene “The twenty-seventh night” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-qadr.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal praying together at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife praying side by side in their living room late at night, lamps low, a Qur’an on a stand between them, serene.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-after` · Scene

- **Where it appears:** Scene “After Eid” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-after.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Zaid and Amal reflecting after Eid.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a balcony in the morning after Eid, sharing tea and sweets, talking reflectively, festive lights still up.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-growing` · Outcome

- **Where it appears:** Ending “Growing together” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-growing.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Zaid and Amal walking home from Fajr together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife walking home from the masjid together at dawn, sky pink, sharing a quiet laugh.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-kindness` · Outcome

- **Where it appears:** Ending “Only when asked” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-kindness.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Amal setting her own alarm.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman setting her own alarm on a phone with a small smile while her husband reads nearby, morning light.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-performance` · Outcome

- **Where it appears:** Ending “Praying for an audience” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-performance.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Amal at Fajr, present but far away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman standing at the back of a women’s section of a masjid at dawn, present but distant, looking at her phone screen dimly.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-judged` · Outcome

- **Where it appears:** Ending “A scorecard home” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-judged.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Zaid glancing at the clock while Amal looks away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A tense couple at a dinner table, the husband glancing at the clock on the wall, the wife looking away, a prayer timetable stuck on the fridge.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-parallel` · Outcome

- **Where it appears:** Ending “Parallel prayer mats” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-parallel.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two prayer mats on separate shelves.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two prayer mats rolled up separately on two different shelves in the same hallway.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-defended` · Outcome

- **Where it appears:** Ending “He took her side” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-defended.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Amal resting on Zaid’s shoulder.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A wife resting her head on her husband’s shoulder on a sofa, both relaxed, a prayer mat folded beside them.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-one` · Outcome

- **Where it appears:** Ending “One prayer a day” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-one.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Zaid and Amal praying Isha together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple praying Isha together in a small living room, side by side, evening lamp light.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-fajr-alarm-end-pace` · Outcome

- **Where it appears:** Ending “At their own pace” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-fajr-alarm-end-pace.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Zaid and Amal walking at their own pace.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking slowly through a park at sunset, at slightly different paces but close together.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Mahr Conversation

### `concept-mahr-cover` · Cover

- **Where it appears:** Cover of “The Mahr Conversation”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-mahr-figures` · Scene

- **Where it appears:** Scene “Two numbers” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-figures.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** The two fathers naming figures in the living room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A formal living room with two older men on opposite sofas, a tea tray between them, one holding up a hand as if naming a figure, mothers sitting stiffly, an engaged couple on the edge of the frame.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-drive` · Scene

- **Where it appears:** Scene “The drive home” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-drive.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Layla looking at her phone on the drive home.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman in the back seat of a car at night beside her mother, looking at her phone, city lights through the window.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-fathers` · Scene

- **Where it appears:** Scene “The fathers meet alone” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-fathers.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** The two fathers meeting alone at a café.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two older bearded men sitting at a café table outdoors, one leaning back with folded arms, one gesturing firmly, cups of coffee untouched.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-just-us` · Scene

- **Where it appears:** Scene “Just the two of us” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-just-us.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Faris and Layla talking on a video call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple on a phone video call, each in their own family home, both leaning toward their screens, sincere expressions.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-leak` · Turning point

- **Where it appears:** Turning-point scene “The aunties hear” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-leak.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Layla seeing the gossip spread.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A busy family WhatsApp group shown as floating speech-bubble shapes around a young woman holding her phone in a kitchen, aunties gossiping in the background.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-pause` · Scene

- **Where it appears:** Scene “A pause” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-pause.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Faris alone on a park bench.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man sitting alone on a park bench at dusk holding his phone, an unsent message on the screen, trees around him.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-decide` · Scene

- **Where it appears:** Scene “The decision” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-decide.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Layla speaking while the families listen.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple sitting at a café table with both mothers, a small notebook open, everyone listening to the young woman speak.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-tell` · Scene

- **Where it appears:** Scene “Telling the fathers” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-tell.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Faris and Layla telling their fathers.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man and woman standing respectfully before two seated older men in a living room, the young man speaking, everyone attentive.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-hers` · Outcome

- **Where it appears:** Ending “Her mahr, her choice” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-hers.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Faris and Layla at their nikah.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A bride and groom at a simple nikah ceremony, the bride smiling as an imam writes in a register, families gathered warmly.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-meaningful` · Outcome

- **Where it appears:** Ending “A meaningful mahr” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-meaningful.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A box holding a Qur’an, a letter and a bracelet.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small wooden box opened on a table showing a Qur’an, a handwritten letter and a modest gold bracelet, two pairs of hands nearby.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-deal` · Outcome

- **Where it appears:** Ending “Settled without her” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-deal.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** The fathers shaking hands while Layla stands apart.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two older men shaking hands in a hallway while a young woman stands slightly apart, looking down at her hands.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-halfway` · Outcome

- **Where it appears:** Ending “Halfway” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-halfway.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Both families at the engagement gathering.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engagement gathering with two families seated together, polite smiles, a cake on the table, the couple in the middle exchanging a relieved look.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-stronger` · Outcome

- **Where it appears:** Ending “Stronger for it” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-stronger.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Faris and Layla walking through a market together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple walking side by side through a market, carrying a small bag each, comfortable and smiling, chaperone sister a few steps behind.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-bruised` · Outcome

- **Where it appears:** Ending “A bruised beginning” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-bruised.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two mothers not speaking at the engagement dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two mothers sitting at opposite ends of a long table at a small engagement dinner, not speaking, the couple between them looking tense.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-apart` · Outcome

- **Where it appears:** Ending “Not meant to be” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-apart.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Layla returning the ring box.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman returning a small ring box to her mother in a quiet room, both sad but calm.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-mahr-end-number` · Outcome

- **Where it appears:** Ending “Just a number” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-mahr-end-number.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Faris signing the nikah document.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man signing a document at a desk with an imam, the bride beside him calmly, a plain room, ordinary and quiet.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Three in the Morning

### `concept-baby-cover` · Cover

- **Where it appears:** Cover of “Three in the Morning”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-baby-cry` · Scene

- **Where it appears:** Scene “3:07 a.m.” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-cry.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ruqayya sitting up with the crying baby at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A dark bedroom lit by a baby monitor glow, a mother sitting up with a crying baby, a father half-awake reaching for his phone alarm, both exhausted.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-morning` · Scene

- **Where it appears:** Scene “Morning” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-morning.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim leaving for work as Ruqayya holds the baby.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A kitchen in the morning, a husband in work clothes grabbing a coffee by the door, his wife in pyjamas on a sofa with a baby asleep on her chest, both looking at each other tiredly.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-grandma` · Scene

- **Where it appears:** Scene “The grandmothers” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-grandma.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Two grandmothers giving advice to Ruqayya.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A living room with two grandmothers, one holding the baby and one gesturing advice, a young mother sitting between them looking overwhelmed, a bag of homemade food on the table.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-evening` · Turning point

- **Where it appears:** Turning-point scene “The evening” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-evening.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim and Ruqayya on the sofa, the baby asleep between them.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife on opposite ends of a sofa in the evening, a baby asleep in a bassinet between them, both staring at their phones, a tense silence.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-scorecard` · Scene

- **Where it appears:** Scene “The scorecard” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-scorecard.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A notepad of tally marks on the kitchen counter.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A notepad on a kitchen counter with two columns of tally marks, a baby bottle beside it, an empty room in early morning light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-plan` · Scene

- **Where it appears:** Scene “A plan for the nights” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-plan.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim and Ruqayya planning the nights in a notebook.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a bed with a notebook, sketching a simple night schedule, a baby monitor on the bedside table, soft lamp light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-out` · Turning point

- **Where it appears:** Turning-point scene “The first evening alone” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-out.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim and Ruqayya on their first evening out.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple at a small restaurant table by a window in the evening, both glancing at a phone showing a baby monitor app, half-smiling.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-month` · Scene

- **Where it appears:** Scene “Three months” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-month.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim playing with the baby as Ruqayya watches.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A father lying on a rug playing with a smiling baby while the mother sits nearby with tea, watching them, afternoon light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-team` · Outcome

- **Where it appears:** Ending “A real team” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-team.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Ruqayya pushing the pram through a park.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple pushing a pram together through a park on a sunny day, both laughing, the baby visible.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-tally` · Outcome

- **Where it appears:** Ending “Keeping score” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-tally.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Ruqayya passing the baby without eye contact.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife passing a baby between them in a hallway without looking at each other, cold body language.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-village` · Outcome

- **Where it appears:** Ending “It takes a village” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-village.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A grandmother rocking the baby while the couple sleep.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A grandmother rocking a baby in an armchair while a young couple sleep on a sofa beside her, peaceful.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-seen` · Outcome

- **Where it appears:** Ending “Finally seen” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-seen.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim hugging Ruqayya as she holds the baby.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband hugging his wife from behind in a kitchen while she holds the baby, her eyes closed in relief.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-apart` · Outcome

- **Where it appears:** Ending “Two homes for a week” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-apart.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim alone in the empty nursery.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man standing alone in a quiet nursery holding a small baby sock, an empty crib beside him.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-weekend` · Outcome

- **Where it appears:** Ending “Saturday mornings” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-weekend.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim feeding the baby at sunrise.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A father feeding a baby a bottle in a kitchen at sunrise, wearing a hoodie, smiling down at her, quiet house.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-unsaid` · Outcome

- **Where it appears:** Ending “Survived, unsaid” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-unsaid.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Ruqayya smiling for a photo at the first birthday.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a baby’s first birthday party, smiling for a photo, the mother’s smile not quite reaching her eyes.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-baby-end-by` · Outcome

- **Where it appears:** Ending “Getting by” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-baby-end-by.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Ruqayya sharing late-night noodles on the stairs.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A tired but calm couple sitting on stairs at home sharing a single bowl of noodles late at night, baby monitor between them.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Public Couple, Private Couple

### `concept-insta-cover` · Cover

- **Where it appears:** Cover of “Public Couple, Private Couple”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-insta-sponsor` · Scene

- **Where it appears:** Scene “The offer” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-sponsor.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Rania showing Tariq a sponsorship email.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman in a hijab on a sofa holding up her phone excitedly to show an email, her husband beside her with a laptop, eyebrows raised cautiously.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-reaction` · Scene

- **Where it appears:** Scene “Tariq hears” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-reaction.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Tariq considering his answer at the kitchen table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man sitting at a kitchen table with a calm but serious face, hands folded, his wife standing by the counter waiting for his answer.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-argument` · Scene

- **Where it appears:** Scene “The first real argument” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-argument.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Tariq and Rania arguing beside her ring light.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in a living room mid-argument, both standing, gesturing, a ring light and tripod set up in the corner of the room.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-viral` · Turning point

- **Where it appears:** Turning-point scene “It goes viral” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-viral.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Tariq at work seeing the viral post.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man sitting at an office desk staring at his phone, surrounded by floating simple heart and comment shapes, a colleague glancing over his shoulder.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-comments` · Scene

- **Where it appears:** Scene “The comment section” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-comments.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Rania reading comments late at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman sitting on the floor against a bed late at night scrolling her phone, face lit by the screen, looking hurt, many comment shapes floating.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-boundaries` · Turning point

- **Where it appears:** Turning-point scene “What stays private” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-boundaries.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Tariq and Rania listing what stays private.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting cross-legged on a bed with a notebook between them, listing two columns, a phone face down on the duvet.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-campaign` · Scene

- **Where it appears:** Scene “The campaign” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-campaign.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Rania filming while Tariq reads out of frame.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman in modest fashion posing for a phone camera on a tripod in a sunny living room, her husband reading on the sofa out of frame, relaxed.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-protected` · Outcome

- **Where it appears:** Ending “A protected marriage” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-protected.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq and Rania laughing at a picnic, phones away.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple laughing together at a picnic in a park, no phones in sight, a blanket and thermos between them.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-offscreen` · Outcome

- **Where it appears:** Ending “Off camera” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-offscreen.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq’s hand passing Rania tea, just out of frame.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman filming herself making tea, a man’s hand only just visible at the edge of the frame passing her a cup.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-quiet` · Outcome

- **Where it appears:** Ending “The quiet season” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-quiet.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq and Rania on a balcony, phone face down.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a balcony at sunset with tea, a phone lying face down on a small table, both looking out at the city.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-exposed` · Outcome

- **Where it appears:** Ending “Exposed” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-exposed.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq alone with a couple photo on his phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man sitting alone in a dark living room lit only by a phone screen showing a couple photo, looking tired and distant.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-engagement` · Outcome

- **Where it appears:** Ending “Good for engagement” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-engagement.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Rania filming while Tariq leaves the room behind her.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman smiling into a ring light while, out of focus behind her, her husband walks out of the room.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-together` · Outcome

- **Where it appears:** Ending “Through it together” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-together.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq and Rania close on the sofa, phone switched off.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife sitting close on a sofa, she resting against him, his hand on hers, a phone switched off on the cushion.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-compromise` · Outcome

- **Where it appears:** Ending “Working it out” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-compromise.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq and Rania reviewing photos together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a kitchen table reviewing photos on a laptop together, the woman pointing, the man nodding, cups of coffee.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-insta-end-cold` · Outcome

- **Where it appears:** Ending “Cold war, online and off” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-insta-end-cold.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Tariq and Rania on their phones at opposite ends of the sofa.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in the same room each on their own phone, sitting far apart on a long sofa, harsh blue screen light.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Upstairs Room

### `concept-house-cover` · Cover

- **Where it appears:** Cover of “The Upstairs Room”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-house-knock` · Scene

- **Where it appears:** Scene “The knock that isn’t” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-knock.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yahya’s mother walking in with laundry.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple’s bedroom door opening without a knock, an older woman stepping in holding folded laundry, the young wife sitting up surprised in a loose hijab.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-mum` · Scene

- **Where it appears:** Scene “A word with Mum” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-mum.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yahya talking with his mother in the kitchen.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man and his mother in a kitchen, him leaning against the counter speaking gently, her stirring a pot with a slightly hurt expression.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-kitchen` · Scene

- **Where it appears:** Scene “Whose kitchen” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-kitchen.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sumaya and her mother-in-law in the kitchen.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A family kitchen with an older woman reorganising jars on a shelf while a young woman holds a cookbook, both trying to be polite, tension in their postures.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-overheard` · Turning point

- **Where it appears:** Turning-point scene “Through the wall” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-overheard.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yahya and Sumaya overhearing through the wall.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple in their bedroom at night sitting up, frozen, looking at the wall as voices of older parents are heard from the next room, a lamp on.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-savings` · Scene

- **Where it appears:** Scene “The savings account” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-savings.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yahya and Sumaya looking at their savings.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a bed with a laptop showing a simple savings bar chart, calculator and notebook, serious faces.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-deadline` · Turning point

- **Where it appears:** Turning-point scene “A date on the calendar” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-deadline.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A move-out date circled on the calendar.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A wall calendar in a bedroom with a date circled in red marker, a young couple’s hands visible, one holding the marker.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-tell` · Scene

- **Where it appears:** Scene “Telling his parents” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-house-tell.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yahya and Sumaya talking with his parents.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple sitting together on one sofa facing his seated parents in a living room, tea on the table, the son speaking calmly.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-door` · Outcome

- **Where it appears:** Ending “Their own front door” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-door.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yahya and Sumaya at their own front door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple standing at the front door of a small new flat with a single moving box, the man holding up a key, both smiling.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-rules` · Outcome

- **Where it appears:** Ending “House rules” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-rules.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** His mother knocking politely on their door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small handwritten note taped to a bedroom door saying nothing readable, a mother knocking politely, a young woman opening the door with a smile.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-flat` · Outcome

- **Where it appears:** Ending “A small flat, a big relief” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-flat.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yahya and Sumaya eating takeaway on the floor of a tiny flat.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple sitting on the floor of a tiny flat eating takeaway from boxes, no furniture yet, laughing.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-guest` · Outcome

- **Where it appears:** Ending “A guest in her marriage” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-guest.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sumaya alone, suitcase still half unpacked.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman sitting alone on the edge of a bed in a small room with her suitcase still half unpacked in the corner, looking out of the window.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-between` · Outcome

- **Where it appears:** Ending “Caught between” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-between.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yahya standing between two doors.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man standing in a hallway between two closed doors, one leading to his parents’ room, one to his and his wife’s, looking torn.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-warm` · Outcome

- **Where it appears:** Ending “A warm house” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-warm.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** The whole family laughing at dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two generations at a dinner table laughing together, an older woman passing a dish to her daughter-in-law, warm lamp light.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-sour` · Outcome

- **Where it appears:** Ending “Leaving on a sour note” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-sour.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** His parents watching them load the car.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young couple loading boxes into a car outside a house while an older couple watch from the doorway with folded arms.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-house-end-patience` · Outcome

- **Where it appears:** Ending “Patience, for now” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-house-end-patience.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yahya and Sumaya talking quietly on the balcony.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a small balcony of a family house at dusk, sharing tea, talking quietly with their heads close.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Old Friend

### `concept-friend-cover` · Cover

- **Where it appears:** Cover of “The Old Friend”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-friend-notification` · Scene

- **Where it appears:** Scene “11:40 p.m.” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-notification.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Leila noticing a late-night message on Sami’s phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A dark bedroom, a phone screen lighting up on a bedside table, a woman lying awake looking at it, her husband asleep facing away.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-answers` · Scene

- **Where it appears:** Scene ““Oh, Hana?”” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-answers.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sami explaining over breakfast.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man at a breakfast table holding his phone up casually as if explaining, his wife across from him with a cup, watching his face carefully.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-dinner` · Scene

- **Where it appears:** Scene “The work dinner” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-dinner.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sami and Leila reading a dinner invitation.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man reading an email invitation on a laptop at a home desk, his wife reading over his shoulder, a restaurant name implied by a simple illustrated menu card icon.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-feelings` · Turning point

- **Where it appears:** Turning-point scene “What Leila feels” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-feelings.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Leila speaking honestly as Sami listens.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting on the edge of a bed holding a cushion, speaking vulnerably, her husband kneeling in front of her listening.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-boundary` · Scene

- **Where it appears:** Scene “The boundary” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-boundary.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sami and Leila agreeing boundaries, phones on the table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting close on a sofa with two phones laid face up on the coffee table in front of them, calm, talking.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-again` · Turning point

- **Where it appears:** Turning-point scene “Another message” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-again.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sami hesitating over a new message at work.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in an office looking at his phone showing a new message, a small hesitation in his face, sunlight through blinds.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-year` · Scene

- **Where it appears:** Scene “A year on” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-year.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sami and Leila walking by the river.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking along a river path in autumn, the wife holding the husband’s arm, both talking easily.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-nothing` · Outcome

- **Where it appears:** Ending “Nothing to hide” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-nothing.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sami and Leila cooking together, a phone face up beside them.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife cooking together in a kitchen, one phone lying face up on the counter beside them, relaxed and laughing.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-heard` · Outcome

- **Where it appears:** Ending “Heard” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-heard.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sami and Leila forehead to forehead.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A wife resting her forehead against her husband’s, both eyes closed, a gentle reconciled moment in a dim living room.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-ended` · Outcome

- **Where it appears:** Ending “A kind ending” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-ended.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sami typing a kind goodbye message.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man typing a kind message on his phone at a desk, his wife beside him with a hand on his shoulder, calm.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-hidden` · Outcome

- **Where it appears:** Ending “The call she found” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-hidden.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Leila holding Sami’s phone, hurt.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman holding her husband’s phone showing a call log, looking at him across a room, hurt rather than angry.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-phones` · Outcome

- **Where it appears:** Ending “Open phones, closed hearts” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-phones.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two phones on the table, the couple not looking at each other.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two phones side by side on a table, both screens lit, a couple sitting at the table not looking at each other.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-loyalty` · Outcome

- **Where it appears:** Ending “A fight about loyalty” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-loyalty.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sami and Leila on opposite sides of the kitchen island.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple standing on opposite sides of a kitchen island, arms crossed, a phone face down between them.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-worry` · Outcome

- **Where it appears:** Ending “A quiet worry” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-worry.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Leila glancing at Sami’s buzzing phone.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman glancing at her husband’s phone as it buzzes on a sofa while he reads, a small shadow of doubt on her face.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-friend-end-steady` · Outcome

- **Where it appears:** Ending “Steady enough” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-friend-end-steady.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sami and Leila reading together on the sofa.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple reading on a sofa in the evening, feet touching, a lamp between them, peaceful and ordinary.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Background Noise

### `concept-ignored-cover` · Cover

- **Where it appears:** Cover of “Background Noise”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-noise-bid` · Scene

- **Where it appears:** Scene “Something funny happened” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-bid.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sumayya starting a story while Ibrahim watches TV.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman in work clothes standing in a living room doorway starting to tell a story with animated hands, her husband on the sofa looking at a football match on TV.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-later` · Scene

- **Where it appears:** Scene “Half-time” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-later.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sumayya messaging a friend in the bedroom.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman alone in a bedroom scrolling her phone and smiling at a message from a friend, the TV glow and sound coming faintly from the other room.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-anniversary` · Turning point

- **Where it appears:** Turning-point scene “The date” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-anniversary.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sumayya waiting with a small cake.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman at a kitchen table at night with two plates and a small homemade cake, one candle, checking the clock, the chair opposite empty.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-asma` · Scene

- **Where it appears:** Scene “A better listener” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-asma.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Sumayya confiding in her friend Asma.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two women in hijabs at a café table, one talking and the other listening attentively with a hand on her arm, cups of coffee.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-notices` · Scene

- **Where it appears:** Scene “Ibrahim notices” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-notices.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim realising something is wrong.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man sitting alone on a bed in the evening holding his phone with a thoughtful, slightly worried expression, the room quiet.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-weekend` · Turning point

- **Where it appears:** Turning-point scene “No phones” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-weekend.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim and Sumayya walking a coastal path, no phones.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking along a quiet coastal path in jackets, phones nowhere in sight, the wife laughing at something the husband said, sea in the background.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-month` · Scene

- **Where it appears:** Scene “A month later” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-month.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Ibrahim closing his book as Sumayya comes home.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman coming in through a front door after work, her husband looking up from a book on the sofa and closing it, smiling to listen.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-close` · Outcome

- **Where it appears:** Ending “Close again” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-close.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya laughing on the kitchen floor.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on their kitchen floor late at night laughing together over tea, leaning on cupboards, completely at ease.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-housemates` · Outcome

- **Where it appears:** Ending “Good housemates” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-housemates.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya doing separate things, back to back.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two people in the same flat doing separate things, one cooking, one on a laptop, back to back, pleasant but distant.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-alone` · Outcome

- **Where it appears:** Ending “Alone together” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-alone.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Sumayya alone at the window at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting alone at a window at night with a cup of tea, the reflection of her husband asleep on the sofa behind her.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-cake` · Outcome

- **Where it appears:** Ending “Cake at midnight” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-cake.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya sharing cake at midnight.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sharing a small cake at a kitchen table at midnight, one candle lit, holding forks, smiling softly.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-dates` · Outcome

- **Where it appears:** Ending “First Fridays” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-dates.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya at their monthly dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting across a small restaurant table by a window, talking happily, a modest meal between them.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-named` · Outcome

- **Where it appears:** Ending “She said it out loud” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-named.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya holding hands in a frank talk.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife sitting on the edge of a bed facing each other, holding hands, in a frank but gentle conversation.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-phase` · Outcome

- **Where it appears:** Ending “Just a phase?” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-phase.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya on their phones, close but apart.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on a sofa each on their own phone, sitting close but not touching, soft evening light, comfortable yet distant.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-noise-end-fine` · Outcome

- **Where it appears:** Ending “Fine, mostly” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-noise-end-fine.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Ibrahim and Sumayya washing up together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple washing up together at a sink, one washing, one drying, chatting casually.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Starting Over at Thirty-Four

### `concept-career-cover` · Cover

- **Where it appears:** Cover of “Starting Over at Thirty-Four”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-career-letter` · Scene

- **Where it appears:** Scene “The letter” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-letter.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Musa reading his resignation letter at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man at a desk at night reading a printed resignation letter, a stack of Arabic books beside him, a cup of tea, thoughtful.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-reaction` · Scene

- **Where it appears:** Scene “Khadija’s reaction” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-reaction.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Khadija reading the letter at the table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman in nurse scrubs sitting at a dining table holding a printed letter, her husband standing beside her, her face showing mixed pride and worry.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-numbers` · Scene

- **Where it appears:** Scene “The spreadsheet” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-numbers.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Musa and Khadija going through a budget.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a kitchen table with a laptop showing a simple budget chart, a calculator and a pile of bills, both leaning in seriously.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-parents` · Scene

- **Where it appears:** Scene “Her parents hear” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-parents.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Khadija’s parents reacting to the news.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An older couple sitting on a sofa in their living room, the father frowning with arms folded, the mother looking concerned, their daughter sitting opposite them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-surprise` · Turning point

- **Where it appears:** Turning-point scene “Two lines” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-surprise.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Khadija looking at a pregnancy test.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting on the edge of a bath holding a pregnancy test, a mix of shock and joy on her face, morning light.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-year` · Scene

- **Where it appears:** Scene “The first year” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-year.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Musa studying with the baby as Khadija leaves for a shift.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man studying at a small desk while holding a sleeping baby in one arm, a woman in scrubs leaving for a night shift, waving from the door.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-breaking` · Turning point

- **Where it appears:** Turning-point scene “A hard night” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-breaking.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Khadija exhausted on the kitchen floor.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting on a kitchen floor at night in scrubs, head against a cupboard, exhausted, her husband rushing in from the doorway.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-review` · Scene

- **Where it appears:** Scene “The review” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-career-review.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Musa and Khadija reviewing their plan.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a sofa with a notebook and a sleeping baby in a bassinet nearby, reviewing a plan together calmly, morning light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-shared` · Outcome

- **Where it appears:** Ending “A shared sacrifice” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-shared.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Musa graduating with Khadija and their child beside him.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in a graduation gown holding a scroll beside his wife and toddler, family members around them smiling, a mosque courtyard in the background.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-burnout` · Outcome

- **Where it appears:** Ending “Running on empty” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-burnout.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Khadija asleep in a hospital break room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman asleep sitting upright on a hospital break-room chair still in scrubs, a phone showing missed calls in her hand.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-slow` · Outcome

- **Where it appears:** Ending “The slow road” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-slow.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Musa studying on his commute.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man on a train with a laptop and an Arabic textbook open, commuting between work and study, looking content.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-deferred` · Outcome

- **Where it appears:** Ending “A dream deferred” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-deferred.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Musa at work, looking towards a distant minaret.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in an office looking out of the window at a mosque minaret in the distance, an Arabic book on his desk beside a laptop.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-alone` · Outcome

- **Where it appears:** Ending “Decided alone” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-alone.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Khadija paying bills alone at night.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman paying bills on a laptop at a kitchen table at night alone, her husband studying in another room behind a half-closed door.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-father` · Outcome

- **Where it appears:** Ending ““A man provides”” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-father.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A tense family dinner with Khadija’s father.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A tense family dinner, an older man speaking sternly, a young husband looking down at his plate, his wife looking between them unhappily.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-partners` · Outcome

- **Where it appears:** Ending “Partners” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-partners.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Musa studying and Khadija working, side by side.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting together at a kitchen table late at night, one studying, one doing paperwork, sharing a pot of tea, comfortable together.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-career-end-managing` · Outcome

- **Where it appears:** Ending “Managing” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-career-end-managing.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** An ordinary weekend at home for the family.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A family in a small living room on a weekend, a toddler playing on the rug, the father reading, the mother folding laundry, calm and ordinary.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Brother

### `concept-brother-cover` · Cover

- **Where it appears:** Cover of “The Brother”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-brother-request` · Scene

- **Where it appears:** Scene “The request” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-request.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Faisal asking Naila for help.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man on a sofa with his head in his hands, his sister kneeling beside him with a hand on his shoulder, her husband standing in a kitchen doorway holding a tea towel.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-doubts` · Scene

- **Where it appears:** Scene “Hamid’s doubts” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-doubts.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hamid sharing his doubts with Naila.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting at a kitchen table at night, the husband speaking carefully with open palms, the wife with arms crossed, worried and defensive.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-decide` · Turning point

- **Where it appears:** Turning-point scene “Deciding” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-decide.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Naila and Hamid deciding over their savings.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a bed with a laptop showing a savings account, a notebook with two options written, both thinking hard.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-family` · Scene

- **Where it appears:** Scene “The family hears” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-family.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Naila’s mother pleading on a video call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An older mother on a video call on a phone held by her daughter, the mother looking upset and pleading, the daughter torn.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-again` · Turning point

- **Where it appears:** Turning-point scene “Six months later” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-again.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Naila reading another message from her brother.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman reading a message on her phone in a supermarket aisle, a worried expression, her trolley half full.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-reply` · Scene

- **Where it appears:** Scene “The reply” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-reply.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Naila and Hamid replying to Faisal together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting side by side on a sofa typing a message together on one phone, calm and united.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-help` · Outcome

- **Where it appears:** Ending “Real help” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-help.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Faisal and Hamid going through his budget together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young man and his brother-in-law sitting at a table with a laptop and paperwork, the younger man smiling with relief, the sister bringing tea.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-united` · Outcome

- **Where it appears:** Ending “United front” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-united.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Naila and Hamid standing together at a family gathering.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife standing together at a family gathering, her arm through his, facing relatives calmly.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-well` · Outcome

- **Where it appears:** Ending “A bottomless well” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-well.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Naila and Hamid looking at an empty savings jar.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple at a kitchen table looking at an empty savings jar, bills spread out, tired and quiet.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-secret` · Outcome

- **Where it appears:** Ending “The secret transfer” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-secret.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamid holding a bank statement, hurt.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man holding a bank statement with one line highlighted, looking at his wife across a room, hurt.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-scapegoat` · Outcome

- **Where it appears:** Ending “The villain” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-scapegoat.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hamid sitting alone at a family gathering.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man sitting alone at the edge of a family gathering while relatives talk among themselves, glancing at him coldly.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-generous` · Outcome

- **Where it appears:** Ending “Generosity, with limits” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-generous.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Naila giving Faisal an envelope at the door.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A sister handing her brother an envelope at a doorway, both smiling, her husband beside her with a hand on her back.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-cold` · Outcome

- **Where it appears:** Ending “A colder family” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-cold.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Naila looking at a quiet family chat.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman looking at a family group chat on her phone with no new messages, sitting alone on a bench in a park in autumn.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-brother-end-working` · Outcome

- **Where it appears:** Ending “Still working it out” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-brother-end-working.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Naila and Hamid walking home from a family dinner.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking home from a family dinner at night, talking seriously but gently, streetlights.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — Whose Wedding Is It?

### `concept-wedding-cover` · Cover

- **Where it appears:** Cover of “Whose Wedding Is It?”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-wedding-deposit` · Scene

- **Where it appears:** Scene “The deposit” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-deposit.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Mariam seeing a hall booking confirmation.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young woman looking at her phone in shock showing a booking confirmation for a large wedding hall, her fiancé leaning over her shoulder looking guilty.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-mothers` · Scene

- **Where it appears:** Scene “Two mothers, one guest list” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-mothers.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Both mothers holding up long guest lists on a call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two mothers on a split video call on a laptop, each holding up a long handwritten guest list, the couple watching from the sofa looking overwhelmed.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-us` · Turning point

- **Where it appears:** Turning-point scene “What do we want?” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-us.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adam and Mariam writing privately, back to back.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple sitting on the floor of a living room among scattered wedding lists, each writing on their own small card privately, back to back.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-elder` · Scene

- **Where it appears:** Scene “An elder offers” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-elder.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** An elder listening to Adam and Mariam.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An elderly man with a white beard sitting in a masjid office with a young engaged couple, listening kindly, cups of tea on a low table.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-hear` · Turning point

- **Where it appears:** Turning-point scene “The mothers hear” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-hear.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Both mothers listening to the grandfather.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two mothers sitting side by side on a sofa listening to an elderly man speak, one with hands folded, one dabbing her eyes, the couple standing nearby.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-costs` · Scene

- **Where it appears:** Scene “The costs” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-costs.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adam and Mariam going over wedding costs.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

An engaged couple at a café table with a notebook of costs and a calculator, the woman pointing at a total, the man rubbing his forehead.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-theirs` · Outcome

- **Where it appears:** Ending “Their day” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-theirs.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A small nikah with close family.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small nikah in a bright masjid hall, a bride and groom sitting with an imam, around thirty family members smiling, simple flowers.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-two` · Outcome

- **Where it appears:** Ending “Two celebrations” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-two.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A family celebration a year after the nikah.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple a year after their wedding at a lively family party in a garden, fairy lights, both families mixing, the couple laughing.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-big` · Outcome

- **Where it appears:** Ending “Five hundred guests” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-big.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A huge wedding hall full of guests.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A huge wedding hall full of guests at round tables, a bride and groom on a small stage looking tired but smiling, bright lights.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-debt` · Outcome

- **Where it appears:** Ending “The wedding loan” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-debt.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adam and Mariam looking at a loan statement.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A young married couple at a kitchen table months later looking at a loan statement, wedding photo on the fridge behind them.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-wavered` · Outcome

- **Where it appears:** Ending ““Whatever you think”” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-wavered.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Mariam watching Adam with his mother at the wedding.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A bride at a large wedding standing slightly apart looking at her new husband speaking with his mother, a hint of hurt in her face.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-handed` · Outcome

- **Where it appears:** Ending “Handed over” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-handed.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** The mothers running the hall while the couple sit aside.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two mothers directing caterers and decorators in a hall while a young couple sit quietly at the side holding hands.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-tense` · Outcome

- **Where it appears:** Ending “A tense start” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-tense.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Two families sitting stiffly apart at the wedding.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

Two families seated on opposite sides of a small wedding room, stiff and formal, the couple in the middle looking uneasy.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-wedding-end-enough` · Outcome

- **Where it appears:** Ending “Good enough” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-wedding-end-enough.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A medium-sized wedding in a community hall.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A medium-sized wedding in a community hall, simple decorations, guests chatting, the couple sharing a relieved smile.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — A Long Way from the Masjid

### `concept-town-cover` · Cover

- **Where it appears:** Cover of “A Long Way from the Masjid”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-town-arrival` · Scene

- **Where it appears:** Scene “Three weeks in” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-arrival.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hafsa alone at the window of the cottage.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman in a hijab standing at the window of a small cottage looking out at a quiet grey high street, a laptop open on a table behind her, alone.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-truth` · Scene

- **Where it appears:** Scene “The truth” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-truth.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Hafsa telling Yusuf how lonely she is.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting at a small kitchen table in a cottage in the evening, the wife speaking quietly with tears, the husband listening with his hand on hers.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-eid` · Turning point

- **Where it appears:** Turning-point scene “The first Eid alone” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-eid.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Hafsa praying Eid alone, family on a video call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in Eid clothes in a small cottage living room praying Eid prayer on two mats with no one else, a phone propped up showing family on a video call.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-front-room` · Scene

- **Where it appears:** Scene “The front room” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-front-room.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** A small group praying in the couple’s front room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small cottage front room with a few people praying in rows on mismatched mats, a couple hosting, shoes by the door, warm light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-offer` · Turning point

- **Where it appears:** Turning-point scene “An offer to move back” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-offer.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf reading a job offer back in the city.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man reading an email on a laptop at a kitchen table showing a job offer, his wife reading over his shoulder, both thoughtful, a coastal view outside the window.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-decide` · Scene

- **Where it appears:** Scene “Deciding” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-town-decide.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Yusuf and Hafsa deciding on the sea wall.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a sea wall at sunset, talking seriously but gently, coats on, the town behind them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-built` · Outcome

- **Where it appears:** Ending “They built it” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-built.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** A small community gathering the couple built.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A small rented community hall with a handmade sign shape, families praying together, children playing at the back, the couple greeting people at the door.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-home` · Outcome

- **Where it appears:** Ending “Home, changed” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-home.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Hafsa arriving home to their families.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple arriving at a busy family home with boxes, relatives rushing out to hug them, a city street behind.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-lonely` · Outcome

- **Where it appears:** Ending “Staying for him” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-lonely.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Hafsa alone on a winter beach.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman alone on a beach in winter wrapped in a coat, looking out to sea, the small town distant behind her.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-two` · Outcome

- **Where it appears:** Ending “Two different lives” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-two.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf leaving as Hafsa stays on a family video call.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband leaving for work early in the morning while his wife sits on a video call with family at the kitchen table, not looking up.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-faith` · Outcome

- **Where it appears:** Ending “A quieter faith” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-faith.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Hafsa praying Fajr by the sea.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple praying Fajr together at dawn in a cottage with a window overlooking the sea, peaceful.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-regret` · Outcome

- **Where it appears:** Ending “Moving back, unhealed” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-regret.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Hafsa driving back to the city in silence.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in a city car with boxes stacked in the back, both looking out of different windows, silent.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-there` · Outcome

- **Where it appears:** Ending “Getting there” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-there.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Hafsa chatting with a neighbour on the seafront.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple walking along a seaside path with a dog belonging to a neighbour, chatting with an older local woman, small-town life.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-town-end-honest` · Outcome

- **Where it appears:** Ending “An honest return” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-town-end-honest.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Yusuf and Hafsa hanging a photo of the sea in their city flat.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple unpacking in a small city flat, laughing as they hang a framed photo of the sea on the wall.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

## Relationship Adventure — The Raised Voice

### `concept-anger-cover` · Cover

- **Where it appears:** Cover of “The Raised Voice”: its card on the Halal Cards home, the top of its adventure page and the invitation.
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

### `adv-anger-argument` · Scene

- **Where it appears:** Scene “The argument” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-argument.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adnan raising his voice as Huda goes still.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man in a kitchen raising his voice and gesturing broadly, his wife standing very still by the counter, arms close to her body, a broken plate on the floor between them.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-after` · Scene

- **Where it appears:** Scene “Afterwards” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-after.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Huda alone on the edge of the bed after the argument.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman sitting alone on the edge of a bed in a dim room, knees drawn up, shaking slightly, a door ajar with light from the hallway.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-apology` · Turning point

- **Where it appears:** Turning-point scene “The apology” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-apology.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adnan offering flowers that don’t quite land.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A man offering a bunch of flowers awkwardly to his wife in a hallway, she looks at the flowers but not at him, unconvinced.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-homes` · Scene

- **Where it appears:** Scene “The homes we came from” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-homes.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adnan and Huda looking at childhood photos together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting on a sofa looking at an old photo album together, pointing at pictures of their childhood homes and families, soft lamp light.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-second` · Turning point

- **Where it appears:** Turning-point scene “The second argument” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-second.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Adnan catching himself mid-argument.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in a living room mid-disagreement, the husband catching himself with one hand raised in a pause gesture, the wife watching, the tension easing.

Format: 1920 × 1200 px (16:10, landscape). A pivotal moment in the story; show it through posture and the space between the characters. Keep the lower quarter simple and uncluttered for the title.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-huda` · Scene

- **Where it appears:** Scene “Huda’s side” — the picture at the top of the scene card (and of the reveal that follows), with the scene title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-huda.webp`
- **Size:** 1920 × 1200 px (16:10, landscape)
- **Alt text:** Huda speaking firmly across the table.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman speaking calmly but firmly to her husband across a kitchen table, her hands flat on the table, his face attentive.

Format: 1920 × 1200 px (16:10, landscape). The app lays the scene title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-fair` · Outcome

- **Where it appears:** Ending “Fighting fair” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-fair.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda calling a pause with a smile.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple in a kitchen, one holding up a hand in a gentle “pause” gesture, the other smiling and nodding, two mugs of tea being made.

Emotional tone: renewed, relieved and joyful in a calm way

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-understood` · Outcome

- **Where it appears:** Ending “Understood” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-understood.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan listening closely to Huda.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A husband and wife sitting close on a sofa, he listening intently as she speaks, his hand over hers, a photo album open on the table.

Emotional tone: tender and warm

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-eggshells` · Outcome

- **Where it appears:** Ending “Walking on eggshells” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-eggshells.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Huda moving carefully around Adnan.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A woman carefully placing a cup down without a sound in a kitchen, glancing at her husband reading in the next room, tense posture.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-repeat` · Outcome

- **Where it appears:** Ending “It happens again” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-repeat.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda not speaking on opposite ends of the sofa.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple on opposite ends of a long sofa not speaking, a closed door and a broken mug in the background, cold evening light.

Emotional tone: strained, yet warm and human rather than bleak

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-counsel` · Outcome

- **Where it appears:** Ending “Asking for help” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-counsel.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda with a counsellor.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple sitting together on a sofa in a calm counsellor’s office, the counsellor in a chair opposite, the couple holding hands.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-papered` · Outcome

- **Where it appears:** Ending “Papered over” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-papered.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda smiling in a photo with a cracked frame.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple smiling for a selfie at a family event, a small crack drawn into the photo frame they hold.

Emotional tone: fragile — a little distance, but care is still there

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-learning` · Outcome

- **Where it appears:** Ending “Learning each other” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-learning.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda washing dishes together.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A couple washing dishes together in a kitchen, talking calmly, one smiling at the other, an ordinary evening.

Emotional tone: steady and quietly hopeful

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```

### `adv-anger-end-quiet` · Outcome

- **Where it appears:** Ending “A quiet house” — the large picture at the top of the ending, with the ending’s title laid over it.
- **Save as:** `assets/halal-cards/adv-anger-end-quiet.webp`
- **Size:** 1600 × 2000 px (4:5, portrait)
- **Alt text:** Adnan and Huda reading in a quiet living room.

**Scene design**

```text
SCENE DESIGN
Illustrate the following scenario:

A very tidy calm living room, a couple reading on separate chairs in silence, peaceful but a little distant.

Emotional tone: bittersweet — love alongside something lost

Format: 1600 × 2000 px (4:5, portrait). The app lays the ending title over the bottom — keep the lower quarter simple and uncluttered.
Create one single illustration of this scene — the reference image is a sheet of examples, so do not copy its grid or panels.
```
