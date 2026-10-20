# Couple-on-the-stairs ImageGen handoff

These are the approved ImageGen assets for Claude. `reference.webp` is the pixel authority: keep its visible 1536×1024 composition aligned at rest.

Layer from back to front:

1. `01-sky-gradient-and-sun.png` — the only full-frame opaque plate.
2. `02-distant-city-broad-slab.png` — broad warm city depth; transparent only above/outside the city mass.
3. `03-blue-houses-broad-slab.png` — broad blue-house depth slab; do not tighten the roof shapes.
4. `04-blue-walls-broad-slab.png` — broad wall plate. The lower blue backing is intentionally filled to the bottom under the stairs so movement cannot expose a gap.
5. `05-stairs-broad-slab.png` — continuous stair/ledge plate, with the stair material retained behind foreground objects.
6. `06-woman-transparent.png`
7. `07-man-transparent.png`
8. `08-heart-transparent.png`
9. `09-bougainvillea-transparent.png`
10. `10a`–`10d` — individual potted flower assets.
11. `11-left-plant-approved-transparent.png`
12. `12-right-plant-transparent.png`

The broad plates are deliberately not tight cut-outs. Their interiors are filled behind nearer layers; only genuine outside areas are transparent. That is the anti-leak rule for parallax. The man and woman remain separate objects, but should be positioned from the supplied reference so the man's feet and seat stay planted on the stairs.

The artwork was generated with ImageGen. The only mechanical cleanup performed afterward was removing the ImageGen viewer's baked checkerboard from the corrected wall plate's transparent upper area; no scene artwork was procedurally redrawn.
