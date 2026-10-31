"""Draws the tiny repeating dot tile behind the phone's still halftone.

The texture is one small tile (cyan dots and magenta dots, offset from each
other) that the phone repeats across the cover. A tile is a few hundred bytes,
where a picture of the whole scene was 700 KB, and it costs nothing while the app
runs. One file per screen density, so the dots stay crisp.

Run:  python scripts/build-couple-halftone.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets/couple-scene"
SIZE = 14           # points: the tile repeats every 14 points, each ink every 14, the two offset
ALPHA = 70          # of 255: a texture over the picture, never a veil
CYAN = (0, 179, 255)
MAGENTA = (252, 79, 157)
SUPER = 8           # drawn 8x as large, then shrunk, for smooth dot edges


def tile(scale: int) -> Image.Image:
    px = SIZE * scale
    big = Image.new("RGBA", (px * SUPER, px * SUPER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)

    def dot(cx: float, cy: float, radius: float, color: tuple[int, int, int]) -> None:
        # Drawn wrapped around each edge so the tile joins up when it repeats.
        for ox in (-px, 0, px):
            for oy in (-px, 0, px):
                x, y, r = (cx + ox) * SUPER, (cy + oy) * SUPER, radius * SUPER
                draw.ellipse([x - r, y - r, x + r, y + r], fill=color + (ALPHA,))

    dot(px * 0.25, px * 0.25, px * 0.16, CYAN)
    dot(px * 0.75, px * 0.75, px * 0.13, MAGENTA)
    return big.resize((px, px), Image.LANCZOS)


for scale, name in ((1, "halftone-tile.png"), (2, "halftone-tile@2x.png"), (3, "halftone-tile@3x.png")):
    path = OUT / name
    tile(scale).save(path, optimize=True)
    print(name, path.stat().st_size, "bytes")
