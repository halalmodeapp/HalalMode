"""Draws the still halftone laid over the couple cover on phones.

The scene is many painted layers, so this puts them together where they sit at
rest, then draws cyan and magenta dots over the picture: each dot's size follows
how much of its ink the colour underneath holds, as in the site's halftone. The
result is one transparent PNG the size of the scene, placed over it with no
animation, so it costs the phone nothing while it runs.

Run after the layers change:  python scripts/build-couple-halftone.py
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LAYERS = ROOT / "src/components/auth/coupleSceneLayers.ts"
OUT = ROOT / "assets/couple-scene/halftone.png"

CELL = 14          # world pixels between dots
SUPER = 2          # drawn twice as large, then shrunk, for smooth edges
ALPHA = 80         # of 255: a texture over the picture, never a veil
CYAN = (0, 179, 255)
MAGENTA = (252, 79, 157)

text = LAYERS.read_text(encoding="utf-8")
world = re.search(r"COUPLE_WORLD = \{ width: (\d+), height: (\d+)", text)
W, H = int(world.group(1)), int(world.group(2))
layers = re.findall(r"\{ key: '(\w+)', file: '([^']+)', depth: [-\d.]+, x: (-?\d+), y: (-?\d+), width: (\d+), height: (\d+) \}", text)

canvas = Image.new("RGBA", (W, H), (47, 107, 216, 255))
for _key, file, x, y, w, h in layers:
    image = Image.open(ROOT / "site/img/scene" / file).convert("RGBA").resize((int(w), int(h)), Image.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(image, (int(x), int(y)))
    canvas = Image.alpha_composite(canvas, layer)
scene = canvas.convert("RGB")

dots = Image.new("RGBA", (W * SUPER, H * SUPER), (0, 0, 0, 0))
draw = ImageDraw.Draw(dots)
count = 0
for ink, (color, shift) in enumerate(((CYAN, 0.0), (MAGENTA, 0.5))):
    j = 0
    while (j + 0.5 + shift) * CELL < H:
        i = 0
        while (i + 0.5 + shift) * CELL < W:
            x = (i + 0.5 + shift) * CELL
            y = (j + 0.5 + shift) * CELL
            r, g, _b = scene.getpixel((int(x), int(y)))
            # Cyan ink absorbs red, magenta absorbs green; a little of each is always there.
            amount = 1 - (r if ink == 0 else g) / 255
            radius = CELL * 0.5 * min(0.85, 0.22 + 0.7 * amount)
            if radius >= 0.6:
                box = [(x - radius) * SUPER, (y - radius) * SUPER, (x + radius) * SUPER, (y + radius) * SUPER]
                draw.ellipse(box, fill=color + (ALPHA,))
                count += 1
            i += 1
        j += 1

dots.resize((W, H), Image.LANCZOS).save(OUT, optimize=True)
print("wrote", OUT, count, "dots,", OUT.stat().st_size // 1024, "KB")
