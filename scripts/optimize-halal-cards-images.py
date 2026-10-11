"""
Keeps the Halal Cards illustrations light enough to ship inside the app.

- Every image in assets/halal-cards is re-encoded at most 1200 px wide (sharp
  on a 3x phone at the app's widest column) as WebP quality 74.
- Covers also get a 520 px thumbnail in assets/halal-cards/thumbs, which the
  list tiles use instead of decoding a full picture into a 170 pt box.
- src/halalCards/illustrations.ts is regenerated to register both.

Safe to run again: images already at the target size are left as they are.
Usage: python scripts/optimize-halal-cards-images.py
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets', 'halal-cards')
THUMBS = os.path.join(ASSETS, 'thumbs')
BRIEF = os.path.join(ROOT, 'docs', 'halal-cards-illustrations.json')
OUT = os.path.join(ROOT, 'src', 'halalCards', 'illustrations.ts')

FULL_WIDTH = 1200
THUMB_WIDTH = 520


def resize(src, dest, width, quality):
    with Image.open(src) as image:
        image = image.convert('RGB')
        if image.width > width:
            height = round(image.height * width / image.width)
            image = image.resize((width, height), Image.LANCZOS)
        elif src == dest:
            return
        image.save(dest, 'WEBP', quality=quality, method=6)


def main():
    os.makedirs(THUMBS, exist_ok=True)
    with open(BRIEF, encoding='utf8') as handle:
        roles = {slot['id']: slot['role'] for slot in json.load(handle)['slots']}

    ids = sorted(name[:-5] for name in os.listdir(ASSETS) if name.endswith('.webp'))
    thumbs = []
    for slot_id in ids:
        path = os.path.join(ASSETS, f'{slot_id}.webp')
        resize(path, path, FULL_WIDTH, 74)
        if roles.get(slot_id) == 'cover':
            resize(path, os.path.join(THUMBS, f'{slot_id}.webp'), THUMB_WIDTH, 70)
            thumbs.append(slot_id)

    full = '\n'.join(f"  '{i}': require('../../assets/halal-cards/{i}.webp')," for i in ids)
    small = '\n'.join(f"  '{i}': require('../../assets/halal-cards/thumbs/{i}.webp')," for i in thumbs)
    source = f"""import type {{ ImageSourcePropType }} from 'react-native';

/**
 * Generated illustrations, by image slot id. Written by
 * scripts/optimize-halal-cards-images.py — run it after adding a picture to
 * assets/halal-cards (named by its slot id, see docs/HALAL_CARDS_ILLUSTRATIONS.md)
 * rather than editing this file by hand.
 *
 * A slot with no picture shows the drawn placeholder; nothing is fetched from
 * the network.
 */
export const ILLUSTRATIONS: Partial<Record<string, ImageSourcePropType>> = {{
{full}
}};

/** Small versions of the covers, for list tiles. */
export const THUMBNAILS: Partial<Record<string, ImageSourcePropType>> = {{
{small}
}};
"""
    with open(OUT, 'w', encoding='utf8', newline='\n') as handle:
        handle.write(source)
    print(f'{len(ids)} illustrations, {len(thumbs)} thumbnails')


if __name__ == '__main__':
    sys.exit(main())
