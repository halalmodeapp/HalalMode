"""
Builds the couple cover from its separately painted layers, for the web
landing page and the Expo auth/join hero.

The artwork is a set of ImageGen-painted layers (assets/couple-scene/layers):
sky, distant city, walls, stairs, the woman, the man, the heart, the hanging
bougainvillea and the two potted plants. Each is placed into the composition
of the reference illustration (assets/couple-scene/reference.webp) by the
PLACEMENT table below, and gets its own parallax depth.

The stairs, the couple and the heart share one depth: the man and the woman
are separate layers, but they must move exactly with the steps they sit on.

For each layer the build:
1. Places the painting at its scale and position in the reference's
   1536x1024 world pixels, and drops the faint haze ImageGen leaves around
   cut-outs (alpha below a few percent).
2. Extends the layers that reach the frame edge into the bleed around it, so
   parallax never shows an edge. Nothing is extended underneath the objects
   in front: every layer already has the full sky and the layers between
   behind it, and an extension shaped like the object in front would show up
   as a cavity the moment that object moves.
3. Crops to the painted area and writes a WebP.

Outputs (positions in world pixels):
- site/img/scene/<layer>.<hash>.webp         one file per layer
- src/components/auth/coupleSceneLayers.ts    generated layer manifest
- src/components/auth/coupleLayerAssets.ts    generated Metro require map
- site/index.html                             the scene markup between the
                                              couple-scene markers

Usage: python scripts/build-couple-scene.py [--debug DIR]
"""
import hashlib
import os
import sys
from io import BytesIO

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAYERS_DIR = os.path.join(ROOT, 'assets', 'couple-scene', 'layers')
OUT_DIR = os.path.join(ROOT, 'site', 'img', 'scene')
MANIFEST = os.path.join(ROOT, 'src', 'components', 'auth', 'coupleSceneLayers.ts')
ASSETS_TS = os.path.join(ROOT, 'src', 'components', 'auth', 'coupleLayerAssets.ts')
SITE_HTML = os.path.join(ROOT, 'site', 'index.html')

W, H = 1536, 1024
# Layers reaching the frame continue this far beyond it.
BLEED = 48
# Working margin around the frame while building.
PAD = 128
QUALITY = 82
# Dense foliage and rooftops hide compression well; they carry most of the bytes.
QUALITY_FOR = {'bougainvillea': 74, 'city': 74}
SUN = (1108, 98)
CRITICAL = ('sky', 'walls', 'stairs')

# key: (file, scale, x, y, depth, extend)
#   x, y: top-left of the scaled painting in world pixels
#   extend: 'all' fills the whole frame and bleed (the sky); 'frame' extends
#   into the bleed where the layer meets the frame edge; None leaves the
#   painting exactly as supplied.
PLACEMENT = [
    ('sky', 'sky.png', 1.12, -133, -45, -0.6, 'all'),
    ('city', 'city.png', 0.5, 532, 70, -0.42, None),  # wide enough to meet the right-hand building; minaret tip in view
    ('walls', 'walls.png', 1.02, -10, -4, -0.2, 'frame'),
    ('stairs', 'stairs.png', 1.03, 25, 14, 0.0, 'frame'),
    ('woman', 'woman.png', 0.35, 360, 461, 0.0, None),  # seated on the tread, hand as close to the heart as his
    ('man', 'man.png', 0.313, 768, 238, 0.0, None),
    ('heart', 'heart.png', 0.0774, 734, 418, 0.0, None),
    ('bougainvillea', 'bougainvillea.png', 0.55, -10, -10, 0.6, None),
    ('plantLeft', 'plant-left.png', 0.36, -127, 618, 1.1, None),
    ('plantRight', 'plant-right.png', 0.59, 1031, 364, 1.3, None),
]
# Optional rotation (degrees, counter-clockwise) about a world-pixel pivot,
# applied after scaling. The man tips slightly about his rear heel so both
# soles rest on the descending treads. scene-warp.js pins match this pose.
ROTATION = {'man': (6.0, (1120, 546))}
# Cut-outs exported whole, at this many times their on-screen size: the figures
# and the heart at 2x so they stay crisp in the scroll zoom, the hanging flowers
# and plants at 1x but never clipped to the frame, so zooming out shows more of
# each painting instead of a cut edge.
DENSITY = {'woman': 2, 'man': 2, 'heart': 2, 'bougainvillea': 1, 'plantLeft': 1, 'plantRight': 1}
# Speech bubbles: world point each bubble's tail touches, just above each head.
BUBBLES = {'him': (988, 250), 'her': (559, 498)}
# Recolours a painting to a brand colour, keeping its brushwork and shading:
# every pixel takes the target hue, with saturation scaled to match.
HALAL_PINK = '#FC3C6C'  # Halal Pink, the pink of the cover's bougainvillea
TINT = {'heart': HALAL_PINK}
# Dust motes drifting through the god rays, just behind the man's head.
MOTES = 18


def place(file, scale, x, y, rotation=None):
    """The painting scaled and positioned on the padded world canvas (float RGBA)."""
    art = Image.open(os.path.join(LAYERS_DIR, file)).convert('RGBA')
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
    if rotation:
        angle, (px, py) = rotation
        margin = 80
        padded = Image.new('RGBA', (art.width + 2 * margin, art.height + 2 * margin), (0, 0, 0, 0))
        padded.paste(art, (margin, margin))
        art = padded.rotate(angle, resample=Image.BICUBIC, center=(px - x + margin, py - y + margin))
        x, y = x - margin, y - margin
    src = np.asarray(art, dtype=np.float32)
    rgba = np.zeros((H + 2 * PAD, W + 2 * PAD, 4), np.float32)
    ox, oy = round(x) + PAD, round(y) + PAD
    x0, y0 = max(0, ox), max(0, oy)
    x1, y1 = min(rgba.shape[1], ox + src.shape[1]), min(rgba.shape[0], oy + src.shape[0])
    rgba[y0:y1, x0:x1] = src[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    alpha = rgba[..., 3] / 255
    alpha[alpha < 0.05] = 0  # ImageGen leaves a faint haze around cut-outs
    return rgba[..., :3], alpha


def tint(image, hex_colour):
    """`image` recoloured to `hex_colour`'s hue, saturation scaled to match."""
    rgba = np.asarray(image.convert('RGBA'))
    hsv = np.asarray(Image.fromarray(rgba[..., :3]).convert('HSV')).astype(np.float32)
    target = np.asarray(Image.new('RGB', (1, 1), hex_colour).convert('HSV')).astype(np.float32)[0, 0]
    solid = rgba[..., 3] > 200
    source_sat = np.median(hsv[..., 1][solid]) if solid.any() else 1
    hsv[..., 0] = target[0]
    hsv[..., 1] = np.clip(hsv[..., 1] * (target[1] / max(source_sat, 1)), 0, 255)
    rgb = np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))
    return Image.fromarray(np.dstack([rgb, rgba[..., 3]]), 'RGBA')


def cutout(file, scale, x, y, density, rotation=None):
    """A cut-out rendered at `density` times its world size, cropped to its
    painted area. Returns the image and its world-pixel box."""
    art = Image.open(os.path.join(LAYERS_DIR, file)).convert('RGBA')
    key = next((k for k, f, *_ in PLACEMENT if f == file), None)
    if key in TINT:
        art = tint(art, TINT[key])
    art = art.resize((max(1, round(art.width * scale * density)), max(1, round(art.height * scale * density))), Image.LANCZOS)
    left, top = x * density, y * density
    if rotation:
        angle, (px, py) = rotation
        margin = 80 * density
        padded = Image.new('RGBA', (art.width + 2 * margin, art.height + 2 * margin), (0, 0, 0, 0))
        padded.paste(art, (margin, margin))
        art = padded.rotate(angle, resample=Image.BICUBIC, center=(px * density - left + margin, py * density - top + margin))
        left, top = left - margin, top - margin
    rgba = np.asarray(art).copy()
    rgba[..., 3][rgba[..., 3] < 13] = 0  # ImageGen leaves a faint haze around cut-outs
    ys, xs = np.nonzero(rgba[..., 3])
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    image = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    world = (round((left + x0) / density), round((top + y0) / density),
             round((x1 - x0) / density), round((y1 - y0) / density))
    return image, world


def dilate(mask, radius):
    if not mask.any():
        return mask.copy()
    return ndimage.distance_transform_edt(~mask) <= radius


def extend(rgb, known):
    """Unknown pixels take the nearest known colour, softened away from the edge."""
    distance, (iy, ix) = ndimage.distance_transform_edt(~known, return_indices=True)
    out = rgb[iy, ix]
    smooth = ndimage.gaussian_filter(out, sigma=(3, 3, 0), mode='nearest')
    weight = np.clip((distance - 2) / 6, 0, 1)[..., None]
    return np.where(known[..., None], rgb, out * (1 - weight) + smooth * weight)


def main():
    debug = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    yy, xx = np.mgrid[0:H + 2 * PAD, 0:W + 2 * PAD]
    world_x, world_y = xx - PAD, yy - PAD
    in_bleed = (world_x >= -BLEED) & (world_x < W + BLEED) & (world_y >= -BLEED) & (world_y < H + BLEED)
    in_frame = (world_x >= 0) & (world_x < W) & (world_y >= 0) & (world_y < H)

    placed = {key: place(file, s, x, y, ROTATION.get(key)) for key, file, s, x, y, _, _ in PLACEMENT
              if key not in DENSITY}
    depth = {key: d for key, _, _, _, _, d, _ in PLACEMENT}

    os.makedirs(OUT_DIR, exist_ok=True)
    for name in os.listdir(OUT_DIR):
        if name.endswith('.webp'):
            os.remove(os.path.join(OUT_DIR, name))

    manifest, total = [], 0
    for key, file, s, x, y, _, mode in PLACEMENT:
        if key in DENSITY:
            image, (wx, wy, ww, wh) = cutout(file, s, x, y, DENSITY[key], ROTATION.get(key))
            data = encode(image, key)
            filename = f'{kebab(key)}.{hashlib.sha256(data).hexdigest()[:10]}.webp'
            with open(os.path.join(OUT_DIR, filename), 'wb') as handle:
                handle.write(data)
            total += len(data)
            manifest.append({'key': key, 'file': filename, 'depth': depth[key], 'x': wx, 'y': wy, 'width': ww, 'height': wh,
                             'pixels': image.size})
            print(f'{key:14s} {image.width:5d}x{image.height:<5d} {len(data) / 1024:7.1f} KB  {filename}  (x{DENSITY[key]})')
            continue
        rgb, alpha = placed[key]
        solid = alpha > 0.8
        if mode:
            if mode == 'all':
                cover = in_bleed.copy()
            else:  # 'frame': continue past the frame edge only
                cover = in_bleed & ~in_frame & dilate(solid & in_frame, PAD)
            cover &= ~solid
            if cover.any():
                rgb = extend(rgb, solid)
                alpha = np.where(cover, 1.0, alpha)

        a8 = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
        a8[~in_bleed] = 0
        ys, xs = np.nonzero(a8)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), a8])[y0:y1, x0:x1]
        image = Image.fromarray(rgba, 'RGBA')
        if (rgba[..., 3] == 255).all():
            image = image.convert('RGB')
        data = encode(image, key)
        digest = hashlib.sha256(data).hexdigest()[:10]
        filename = f'{kebab(key)}.{digest}.webp'
        with open(os.path.join(OUT_DIR, filename), 'wb') as handle:
            handle.write(data)
        total += len(data)
        manifest.append({
            'key': key, 'file': filename, 'depth': depth[key],
            'x': int(x0) - PAD, 'y': int(y0) - PAD, 'width': int(x1 - x0), 'height': int(y1 - y0),
            'pixels': (int(x1 - x0), int(y1 - y0)),
        })
        print(f'{key:14s} {x1 - x0:5d}x{y1 - y0:<5d} {len(data) / 1024:7.1f} KB  {filename}')
        if debug:
            os.makedirs(debug, exist_ok=True)
            grey = Image.new('RGBA', image.size, (128, 128, 128, 255))
            grey.alpha_composite(image.convert('RGBA'))
            grey.convert('RGB').save(os.path.join(debug, f'{key}.png'))

    heart = next(entry for entry in manifest if entry['key'] == 'heart')
    print(f'total {total / 1024:.1f} KB in {len(manifest)} layers')
    write_manifest(manifest, heart)
    write_site(manifest)


def encode(image, key=None):
    out = BytesIO()
    image.save(out, 'WEBP', quality=QUALITY_FOR.get(key, QUALITY), alpha_quality=90, method=6)
    return out.getvalue()


def kebab(key):
    return ''.join('-' + c.lower() if c.isupper() else c for c in key)


def write_manifest(manifest, heart):
    lines = [
        '// Generated by scripts/build-couple-scene.py. Do not edit by hand.',
        '',
        "/** Every position is in the reference illustration's 1536x1024 world pixels. */",
        f'export const COUPLE_WORLD = {{ width: {W}, height: {H}, bleed: {BLEED} }} as const;',
        f"export const COUPLE_HEART_BOX = {{ x: {heart['x']}, y: {heart['y']}, width: {heart['width']}, height: {heart['height']} }} as const;",
        f'export const COUPLE_SUN = {{ x: {SUN[0]}, y: {SUN[1]} }} as const;',
        '',
        'export type CoupleSceneLayerKey =',
        *[f"  | '{entry['key']}'" + (';' if i == len(manifest) - 1 else '') for i, entry in enumerate(manifest)],
        '',
        'export type CoupleSceneLayer = {',
        '  key: CoupleSceneLayerKey;',
        '  file: string;',
        '  /** Parallax depth: 0 is the stairs plane (with the couple), negative is farther, positive nearer. */',
        '  depth: number;',
        '  x: number;',
        '  y: number;',
        '  width: number;',
        '  height: number;',
        '};',
        '',
        'export const COUPLE_SCENE_LAYERS: readonly CoupleSceneLayer[] = [',
    ]
    for entry in manifest:
        lines.append(f"  {{ key: '{entry['key']}', file: '{entry['file']}', depth: {entry['depth']}, "
                     f"x: {entry['x']}, y: {entry['y']}, width: {entry['width']}, height: {entry['height']} }},")
    lines += ['];', '']
    with open(MANIFEST, 'w', newline='\n') as handle:
        handle.write('\n'.join(lines))

    assets = [
        '// Generated by scripts/build-couple-scene.py. Do not edit by hand.',
        "import type { CoupleSceneLayerKey } from './coupleSceneLayers';",
        '',
        '/** Metro needs static requires; the web landing page uses the same files. */',
        'export const COUPLE_SCENE_ASSETS: Record<CoupleSceneLayerKey, number> = {',
        *[f"  {entry['key']}: require('../../../site/img/scene/{entry['file']}')," for entry in manifest],
        '};',
        '',
    ]
    with open(ASSETS_TS, 'w', newline='\n') as handle:
        handle.write('\n'.join(assets))


def write_site(manifest):
    def layer(entry):
        style = f"--d:{entry['depth']};--x:{entry['x']};--y:{entry['y']};--w:{entry['width']};--h:{entry['height']}"
        loading = ' fetchpriority="high"' if entry['key'] in CRITICAL else ' decoding="async"'
        pw, ph = entry['pixels']
        img = f'<img src="/img/scene/{entry["file"]}" alt="" width="{pw}" height="{ph}"{loading}>'
        if entry['key'] == 'heart':
            return (f'<div class="scene-layer scene-heart" data-layer="heart" data-heart-drag style="{style}">'
                    f'<div class="scene-heart-offset"><div class="scene-heart-float">{img}</div></div></div>')
        return f'<div class="scene-layer" data-layer="{entry["key"]}" style="{style}">{img}</div>'

    def bubble(who):
        bx, by = BUBBLES[who]
        key = 'bubbleHim' if who == 'him' else 'bubbleHer'
        text = 'Nice to meet you.' if who == 'him' else 'Nice to meet you too.'
        # The text is translated; the emoji (his lines only) stays the same in
        # every language and is swapped per line by the page script.
        emoji = '<i class="scene-bubble-emoji">👋</i>' if who == 'him' else ''
        return (f'<div class="scene-bubble scene-bubble-{who}" data-bubble="{who}" style="--d:0.0;--bx:{bx};--by:{by}" aria-hidden="true">'
                f'<span><b data-i18n="{key}">{text}</b>{emoji}</span></div>')

    by_key = {entry['key']: entry for entry in manifest}
    sx, sy = SUN
    lines = []
    for entry in manifest:
        lines.append('    ' + layer(entry))
        if entry['key'] == 'heart':
            lines.append('    ' + bubble('him'))
            lines.append('    ' + bubble('her'))
        if entry['key'] == 'walls':
            # Sunlight falls across the sky, city and walls, but stays behind
            # the stairs and the couple, so it never crosses a face or the copy.
            # It moves with the sky's depth: the sun is the farthest thing.
            lines.append(f'    <div class="scene-light" style="--d:{by_key["sky"]["depth"]};--sunx:{sx};--suny:{sy}">'
                         '<div class="scene-glow"></div><div class="scene-rays scene-rays-a"></div>'
                         '<div class="scene-rays scene-rays-b"></div>'
                         '<div class="scene-motes">' + motes() + '</div></div>')
    block = '\n'.join(lines)
    preload = '\n'.join(
        f'<link rel="preload" as="image" href="/img/scene/{by_key[key]["file"]}" fetchpriority="high">'
        for key in CRITICAL)
    with open(SITE_HTML, encoding='utf-8') as handle:
        html = handle.read()
    html = replace_between(html, '<!-- couple-scene:layers -->', '<!-- /couple-scene:layers -->', '\n' + block + '\n    ')
    html = replace_between(html, '<!-- couple-scene:preload -->', '<!-- /couple-scene:preload -->', '\n' + preload + '\n')
    with open(SITE_HTML, 'w', encoding='utf-8', newline='') as handle:
        handle.write(html)


def motes():
    """Dust motes seeded along the light shafts between the sun and the man's
    head. Each drifts slowly and is only visible while it crosses the light.
    Positions are relative to the light layer, which starts at (-48, -48)."""
    rng = np.random.default_rng(7)
    out = []
    for _ in range(MOTES):
        angle = np.radians(rng.uniform(12, 62))      # clockwise from straight down
        reach = rng.uniform(150, 420)                # distance from the sun
        x = SUN[0] - np.sin(angle) * reach + 48
        y = SUN[1] + np.cos(angle) * reach + 48
        size = rng.uniform(2.2, 5.5)
        style = (f'--mx:{x:.0f};--my:{y:.0f};--ms:{size:.1f};--mdx:{rng.uniform(-34, 14):.0f};'
                 f'--mdy:{rng.uniform(-18, 46):.0f};--mo:{rng.uniform(.45, .95):.2f};'
                 f'animation-duration:{rng.uniform(11, 19):.1f}s;animation-delay:{-rng.uniform(0, 19):.1f}s')
        out.append(f'<i style="{style}"></i>')
    return ''.join(out)


def replace_between(text, start, end, body):
    head, found, rest = text.partition(start)
    if not found:
        raise SystemExit(f'{start} marker missing from site/index.html')
    _, found, tail = rest.partition(end)
    if not found:
        raise SystemExit(f'{end} marker missing from site/index.html')
    return head + start + body + end + tail


if __name__ == '__main__':
    main()
