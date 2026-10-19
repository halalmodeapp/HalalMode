"""Create a transparent, launcher-safe single-heart asset from the hero sprite."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "branding" / "chrome-heart.png"
TARGET = ROOT / "assets" / "icons" / "chrome-heart-icon.png"
CANVAS_SIZE = 1024
MAX_HEART_SIZE = 620


def main() -> None:
    with Image.open(SOURCE).convert("RGBA") as sprite:
        # The hero asset is a 4x3 animation sheet. Use its first complete
        # chrome-heart frame rather than shipping all twelve frames as an icon.
        frame_width = sprite.width // 4
        frame_height = sprite.height // 3
        frame = sprite.crop((0, 0, frame_width, frame_height))
        bounds = frame.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError("chrome-heart sprite frame has no visible pixels")
        heart = frame.crop(bounds)

    scale = min(MAX_HEART_SIZE / heart.width, MAX_HEART_SIZE / heart.height)
    resized = heart.resize(
        (round(heart.width * scale), round(heart.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((CANVAS_SIZE - resized.width) // 2, (CANVAS_SIZE - resized.height) // 2),
    )
    canvas.save(TARGET, format="PNG", optimize=True)
    print(f"wrote {TARGET} ({CANVAS_SIZE}x{CANVAS_SIZE}, transparent)")


if __name__ == "__main__":
    main()
