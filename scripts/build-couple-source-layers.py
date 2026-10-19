"""Build the reviewable, padded source layers for the couple illustration.

This is intentionally a deterministic cut-out pipeline. The supplied master
illustration is the pixel source of truth; no image model redraws or re-styles
the visible artwork. The output is a set of 1936x1424 RGBA PNGs with the
1536x1024 master placed at (200, 200), plus a stack preview and a machine
readable manifest.

The masks are deliberately hand-authored for this one editorial illustration.
That is safer than a broad hue-key: blue walls, blue clothing, and the shadows
on the walls all share colours, but they belong to different depth planes.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "assets" / "couple-scene" / "reference.webp"
OUT_DIR = ROOT / "assets" / "couple-scene" / "source-layers"
DEBUG_DIR = OUT_DIR / "debug"
CLEAN_PLATE_DIR = OUT_DIR / "clean-plates"
EXPORT_2X_DIR = OUT_DIR / "2x"
GENERATED_DIR = ROOT / "assets" / "couple-scene" / "generated-rounds"
W, H = 1536, 1024
PAD = 200
OUT_W, OUT_H = W + PAD * 2, H + PAD * 2

# One-time feature alignment from the supplied source into the generated
# rounds. The values are kept with the build so reruns do not invent or
# redraw anything; they only warp, mask and composite the generated pixels.
# H maps source coordinates -> generated-image coordinates.
GENERATED_HOMOGRAPHIES = {
    "extended-scene-round-1.png": np.array(
        [[0.87292837, 0.01180800, 93.8254025],
         [0.03138575, 0.85678235, 126.0627273],
         [0.00002841, 0.00002378, 1.0]],
        dtype=np.float64,
    ),
    "extended-scene-round-2.png": np.array(
        [[0.81617600, 0.04145500, 57.9447740],
         [-0.00330300, 0.81387200, 130.3613280],
         [0.00004800, 0.00003500, 1.0]],
        dtype=np.float64,
    ),
    "sky-plate-round-1.png": np.array(
        [[1463 / 1536, 0.0, 0.0],
         [0.0, 1075 / 1024, 0.0],
         [0.0, 0.0, 1.0]],
        dtype=np.float64,
    ),
    "distant-city-plate-round-1.png": np.array(
        [[1462 / 1536, 0.0, 0.0],
         [0.0, 1076 / 1024, 0.0],
         [0.0, 0.0, 1.0]],
        dtype=np.float64,
    ),
    "midground-houses-plate-round-1.png": np.array(
        [[1462 / 1536, 0.0, 0.0],
         [0.0, 1076 / 1024, 0.0],
         [0.0, 0.0, 1.0]],
        dtype=np.float64,
    ),
    "walls-plate-round-1.png": np.array(
        [[0.9453, -0.0185, 3.7250],
         [0.0026, 0.9798, -3.2017],
         [0.0, 0.0, 1.0]],
        dtype=np.float64,
    ),
    "stairs-plate-round-1.png": np.array(
        [[0.9524, 0.0008, -0.5501],
         [0.0005, 0.9601, -0.3568],
         [0.0, -0.0, 1.0]],
        dtype=np.float64,
    ),
}

GENERATED_PLATE_FILES = {
    "sky": "sky-plate-round-1.png",
    "distantCity": "distant-city-plate-round-1.png",
    "midgroundHouses": "midground-houses-plate-round-1.png",
    "walls": "walls-plate-round-1.png",
    "stairs": "stairs-plate-round-1.png",
}


def generated_image(name: str) -> np.ndarray:
    """Load one generated round and align it to the supplied source canvas."""
    path = GENERATED_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Missing generated round: {path}")
    image = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)
    homography = GENERATED_HOMOGRAPHIES[name]
    inverse = np.linalg.inv(homography)
    aligned = cv2.warpPerspective(
        image,
        inverse.astype(np.float64),
        (W, H),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    return aligned


def generated_extended_canvas() -> np.ndarray:
    """Align the generated extension to the padded output canvas."""
    path = GENERATED_DIR / "extended-scene-round-2.png"
    image = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)
    homography = GENERATED_HOMOGRAPHIES[path.name]
    translate = np.array(
        [[1.0, 0.0, PAD], [0.0, 1.0, PAD], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    source_to_canvas = translate @ np.linalg.inv(homography)
    aligned = cv2.warpPerspective(
        image,
        source_to_canvas.astype(np.float64),
        (OUT_W, OUT_H),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    # The generated round is a finite image. Where the feature-aligned view
    # cannot reach the outermost safety pixels, use the same generated round
    # with a full-canvas fit. This is still generated artwork; the operation
    # only chooses between two alignments and never invents a colour.
    valid_source = np.ones(image.shape[:2], dtype=np.uint8) * 255
    valid = cv2.warpPerspective(
        valid_source,
        source_to_canvas.astype(np.float64),
        (OUT_W, OUT_H),
        flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )
    fitted = cv2.resize(image, (OUT_W, OUT_H), interpolation=cv2.INTER_LANCZOS4)
    aligned[valid == 0] = fitted[valid == 0]
    return aligned


def center_source(canvas: np.ndarray, source_rgb: np.ndarray) -> np.ndarray:
    """Return a canvas with the supplied source-space pixels pasted exactly."""
    result = canvas.copy()
    result[PAD : PAD + H, PAD : PAD + W] = source_rgb
    return result


def poly(points: list[tuple[int, int]]) -> np.ndarray:
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return np.asarray(mask, dtype=bool)


def rect(x0: int, y0: int, x1: int, y1: int) -> np.ndarray:
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def union(*masks: np.ndarray) -> np.ndarray:
    result = np.zeros((H, W), dtype=bool)
    for mask in masks:
        result |= mask
    return result


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    return ndimage.binary_dilation(mask, iterations=radius)


def erode(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    return ndimage.binary_erosion(mask, iterations=radius)


def hsv_masks(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return hue (degrees), saturation and value without another dependency."""
    values = rgb.astype(np.float32) / 255.0
    r, g, b = values[..., 0], values[..., 1], values[..., 2]
    vmax = values.max(axis=-1)
    vmin = values.min(axis=-1)
    delta = vmax - vmin
    hue = np.zeros_like(vmax)
    nonzero = delta > 1e-6
    rmax = nonzero & (vmax == r)
    gmax = nonzero & (vmax == g)
    bmax = nonzero & (vmax == b)
    hue[rmax] = (60 * ((g[rmax] - b[rmax]) / delta[rmax])) % 360
    hue[gmax] = 60 * (((b[gmax] - r[gmax]) / delta[gmax]) + 2)
    hue[bmax] = 60 * (((r[bmax] - g[bmax]) / delta[bmax]) + 4)
    saturation = np.divide(delta, vmax, out=np.zeros_like(delta), where=vmax > 1e-6)
    return hue, saturation, vmax


def pad_alpha(alpha: np.ndarray, extend_edges: bool = False) -> np.ndarray:
    padded = np.pad(alpha, ((PAD, PAD), (PAD, PAD)), mode="constant", constant_values=0)
    if not extend_edges:
        return padded
    # Continue only the portions that actually touch a frame edge. A plain
    # edge-pad would incorrectly make the entire border opaque when one plant
    # happens to touch the bottom edge.
    left = alpha[:, 0] > 0
    right = alpha[:, -1] > 0
    top = alpha[0, :] > 0
    bottom = alpha[-1, :] > 0
    padded[PAD : PAD + H, :PAD] = np.where(left[:, None], alpha[:, :1], 0)
    padded[PAD : PAD + H, PAD + W :] = np.where(right[:, None], alpha[:, -1:], 0)
    padded[:PAD, PAD : PAD + W] = np.where(top[None, :], alpha[:1, :], 0)
    padded[PAD + H :, PAD : PAD + W] = np.where(bottom[None, :], alpha[-1:, :], 0)
    # Fill corner buffer pixels only when both adjoining edges continue.
    padded[:PAD, :PAD] = np.where(top[:PAD][None, :] & left[:PAD, None], alpha[0, 0], 0)
    padded[:PAD, PAD + W :] = np.where(top[-PAD:][None, :] & right[-PAD:, None], alpha[0, -1], 0)
    padded[PAD + H :, :PAD] = np.where(bottom[:PAD][None, :] & left[-PAD:, None], alpha[-1, 0], 0)
    padded[PAD + H :, PAD + W :] = np.where(bottom[-PAD:][None, :] & right[-PAD:, None], alpha[-1, -1], 0)
    return padded


def source_rgba(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    return np.dstack((rgb, alpha.astype(np.uint8)))


def feather(alpha: np.ndarray, radius: float = 0.55) -> np.ndarray:
    if radius <= 0:
        return alpha.astype(np.uint8)
    blurred = Image.fromarray((alpha.astype(np.uint8) * 255), "L").filter(
        ImageFilter.GaussianBlur(radius)
    )
    # Keep opaque interiors opaque and only anti-alias the one-pixel boundary.
    result = np.asarray(blurred, dtype=np.uint8).copy()
    result[alpha] = 255
    return result


def crop_info(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(alpha > 0)
    if len(xs) == 0:
        return (0, 0, 0, 0)
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def overlay(base: np.ndarray, rgba: np.ndarray, x: int, y: int) -> None:
    """Alpha-composite a padded layer into a full-size RGB preview."""
    h, w = rgba.shape[:2]
    crop = base[y : y + h, x : x + w]
    a = rgba[..., 3:4].astype(np.float32) / 255
    crop[:] = np.round(rgba[..., :3] * a + crop * (1 - a)).astype(np.uint8)


def build_masks(rgb: np.ndarray) -> dict[str, np.ndarray]:
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    hue, sat, val = hsv_masks(rgb)

    blue = ((hue >= 190) & (hue <= 245) & (sat > 0.27) & (val > 0.16))
    blueish = (b > r * 1.06) & (b > g * 1.015) & (b > 92)
    red_pink = (((hue <= 22) | (hue >= 320)) & (sat > 0.32) & (val > 0.25))
    green = ((hue >= 55) & (hue <= 175) & (sat > 0.20) & (val > 0.16))
    foliage = green | red_pink
    warm_city = (
        (r > 148)
        & (g > 92)
        & (b > 52)
        & (r >= g * 0.86)
        & (g >= b * 0.92)
        & ~blue
    )
    cream = (r > 150) & (g > 118) & (b > 100) & (r - b < 125) & ~blue
    dark = (val < 0.48) & ~blue
    ink = (r < 120) & (g < 120) & (b < 120)
    skin = ((hue <= 30) | (hue >= 350)) & (sat > 0.18) & (r > 142) & (r > g * 1.05) & (g > b * 1.05)
    olive = (g > b * 1.20) & (r > 38) & (g < 178) & (sat > 0.18)
    orange = (r > 135) & (r > g * 1.13) & (g > b * 0.75)
    deep_blue = blue & (val < 0.70)

    # Exact foreground silhouettes. Each garment/limb has its own small shape
    # so a blue wall can never be mistaken for the woman's blue dress, and a
    # cream stair can never be mistaken for the man's shoes.
    man = union(
        poly([(962, 246), (980, 233), (1018, 229), (1045, 246), (1055, 276), (1046, 312),
              (1029, 340), (990, 332), (972, 305), (966, 279)] ) & (ink | skin),
        poly([(975, 315), (1031, 301), (1084, 313), (1138, 337), (1174, 378), (1175, 442),
              (1144, 474), (1089, 463), (1040, 432), (999, 414), (958, 394), (945, 351)]) & (olive | dark),
        poly([(950, 347), (982, 347), (1000, 368), (969, 400), (926, 420), (876, 438), (816, 432),
              (814, 414), (862, 397), (911, 374), (936, 350)]) & (skin | olive),
        poly([(1041, 363), (1085, 344), (1124, 362), (1130, 407), (1108, 432), (1067, 430),
              (1028, 407)]) & (skin | olive | dark),
        poly([(982, 411), (1045, 414), (1080, 444), (1062, 505), (1017, 506), (993, 474)]) & dark,
        poly([(1070, 414), (1142, 412), (1172, 448), (1155, 506), (1112, 522), (1076, 485)]) & dark,
        poly([(987, 531), (1001, 512), (1025, 501), (1057, 509), (1073, 533), (1060, 552),
              (1024, 558), (994, 550)]) & cream,
        poly([(1065, 512), (1085, 498), (1124, 503), (1152, 523), (1150, 550), (1118, 560),
              (1087, 548)]) & cream,
        poly([(935, 367), (967, 347), (985, 361), (962, 393), (927, 416), (887, 432), (819, 432),
              (814, 414)]) & skin,
    )
    # Do not dilate a person mask: the source already contains the original
    # anti-aliased edge and dilation would bring a one-pixel wall halo with it.

    woman = union(
        # Head and the long trailing end of the hijab.
        poly([(474, 557), (488, 523), (512, 500), (552, 494), (590, 510), (611, 543), (611, 588),
              (594, 620), (560, 636), (514, 625), (488, 596)]) & (cream | skin | dark),
        poly([(469, 592), (500, 612), (493, 690), (458, 756), (420, 804), (389, 837), (365, 818),
              (383, 770), (409, 719), (432, 658)]) & cream,
        # Dress body: this is intentionally a close outline rather than a
        # colour key because the blue wall and the blue dress share a hue.
        poly([(438, 681), (492, 669), (550, 695), (598, 746), (599, 829), (570, 916), (529, 983),
              (474, 1024), (371, 1024), (366, 970), (380, 888), (400, 820)]) & (deep_blue | dark),
        poly([(453, 705), (499, 685), (544, 707), (590, 750), (595, 842), (562, 917), (520, 984),
              (468, 1024), (382, 1024), (380, 962), (396, 886), (415, 815)]) & deep_blue,
        # Raised sleeve/arm and hand.
        poly([(568, 609), (610, 578), (661, 547), (704, 508), (742, 481), (773, 478), (779, 498),
              (752, 536), (718, 565), (701, 619), (654, 649), (605, 666)]) & (deep_blue | skin),
        poly([(734, 480), (753, 463), (778, 464), (789, 483), (773, 506), (750, 511)]) & skin,
        # Resting arm, bag, skirt and shoes.
        poly([(548, 657), (616, 663), (674, 676), (716, 699), (702, 730), (655, 725), (608, 709)]) & (deep_blue | skin | dark),
        poly([(665, 691), (710, 690), (754, 710), (756, 733), (727, 747), (687, 729)]) & skin,
        poly([(425, 724), (485, 704), (542, 718), (567, 779), (536, 824), (478, 819), (438, 786)]) & orange,
        poly([(600, 756), (690, 751), (756, 792), (791, 860), (778, 925), (728, 956), (649, 950),
              (598, 901), (568, 822)]) & deep_blue,
        poly([(641, 861), (687, 850), (728, 858), (752, 879), (740, 897), (694, 900), (652, 891)]) & cream,
    )

    heart_zone = rect(742, 397, 822, 472)
    heart = heart_zone & red_pink & (r > 190) & (g < 100)
    heart = dilate(heart, 1)

    # Hanging and potted foliage. Blue wall pixels are intentionally excluded;
    # all of these masks also include the pot/flower colours in their small
    # hand-authored regions.
    overhead_zone = poly([(0, 0), (815, 0), (815, 145), (758, 180), (730, 315), (692, 410),
                          (610, 520), (522, 610), (420, 560), (285, 548), (154, 620), (0, 620)])
    overhead = overhead_zone & foliage & ~blue & ~blueish
    overhead &= ~man & ~woman & ~heart

    left_plant_zone = poly([(0, 580), (260, 580), (260, 1024), (0, 1024)])
    right_plant_zone = poly([(1128, 388), (1536, 388), (1536, 1024), (1140, 1024)])
    left_plant = left_plant_zone & ((foliage & ~blue & ~blueish) | orange | cream)
    right_plant = right_plant_zone & ((foliage & ~blue & ~blueish) | orange | cream)
    # The bottom-right pot and stems are warm and can be low saturation.
    right_plant |= rect(1358, 834, 1536, 1024) & orange
    left_plant |= rect(38, 850, 178, 1024) & orange
    left_plant &= ~heart & ~woman
    right_plant &= ~heart & ~man

    pot_zones = {
        "potLeftLedge": rect(262, 700, 405, 884),
        "potStairs": rect(820, 464, 943, 621),
        "potRightLedge": rect(1248, 255, 1391, 455),
        "potRightRoof": rect(1433, 78, 1536, 389),
    }
    pots: dict[str, np.ndarray] = {}
    for key, zone in pot_zones.items():
        pots[key] = zone & ((foliage & ~blue & ~blueish) | orange | cream | dark)
        pots[key] &= ~overhead & ~left_plant & ~right_plant & ~man & ~woman & ~heart

    foreground = union(man, woman, heart, overhead, left_plant, right_plant, *pots.values())

    # Stairs: a geometric wedge plus a cream/stone colour gate. The broad
    # wedge carries every step edge, including the stair side ledges.
    stair_zone = poly([(302, 1024), (302, 857), (431, 819), (666, 734), (720, 635), (814, 570),
                       (974, 518), (1140, 461), (1340, 390), (1536, 348), (1536, 1024)])
    stair_colours = cream | ((r > 115) & (g > 100) & (b > 100) & (r - b < 85) & ~blue)
    stairs = stair_zone & stair_colours & ~foreground

    # The far city is kept separate from the mid blue houses. The colour gate
    # deliberately accepts cypress/palm greens and minaret sand.
    city_zone = poly([(657, 20), (1377, 20), (1377, 415), (1215, 416), (1045, 365), (870, 365), (700, 315)])
    distant_city = city_zone & (warm_city | green | dark) & ~blue & ~overhead & ~foreground & ~stairs

    mid_zone = poly([(670, 190), (1275, 190), (1280, 650), (860, 710), (700, 610)])
    midground = mid_zone & blue & ~foreground & ~stairs

    # Near architecture: blue walls/buildings, plus the wall shadows which
    # are darker and less saturated than the blue key. The zones keep the
    # distant city and staircase from being swallowed by this plane.
    near_wall_zone = union(
        poly([(0, 130), (690, 174), (815, 300), (826, 625), (713, 820), (0, 900)]),
        poly([(1230, 0), (1536, 0), (1536, 1024), (1134, 1024), (1172, 720), (1265, 602), (1268, 395), (1196, 351)]),
        poly([(675, 260), (890, 295), (945, 454), (900, 630), (760, 702), (690, 585)]),
    )
    wall_colours = blue | ((b > r * 1.06) & (b > g * 1.02) & (val < 0.70))
    walls = near_wall_zone & wall_colours & ~distant_city & ~midground & ~stairs & ~foreground

    # A small, explicit dark region keeps the right-hand lamp with the wall;
    # broad fallback assignment is intentionally avoided because it would make
    # this plane opaque over the sky/city and reintroduce the old ghosting.
    walls |= rect(1320, 53, 1440, 210) & dark

    return {
        "sky": np.ones((H, W), dtype=bool),
        "distantCity": distant_city,
        "midgroundHouses": midground,
        "walls": walls,
        "stairs": stairs,
        "woman": woman,
        "man": man,
        "heart": heart,
        "bougainvillea": overhead,
        **pots,
        "plantLeft": left_plant,
        "plantRight": right_plant,
    }


LAYER_ORDER = [
    ("01-sky", "sky", -0.55, "opaque"),
    ("02-distant-city", "distantCity", -0.38, "transparent"),
    ("03-midground-houses", "midgroundHouses", -0.18, "transparent"),
    ("04-walls", "walls", 0.0, "transparent"),
    ("05-stairs", "stairs", 0.08, "transparent"),
    ("06-woman", "woman", 0.22, "transparent"),
    ("07-man", "man", 0.30, "transparent"),
    ("08-heart", "heart", 0.34, "transparent"),
    ("09-bougainvillea", "bougainvillea", 0.55, "transparent"),
    ("10a-pot-left-ledge", "potLeftLedge", 0.60, "transparent"),
    ("10b-pot-stairs", "potStairs", 0.64, "transparent"),
    ("10c-pot-right-ledge", "potRightLedge", 0.68, "transparent"),
    ("10d-pot-right-roof", "potRightRoof", 0.72, "transparent"),
    ("11-plant-left", "plantLeft", 0.88, "transparent"),
    ("12-plant-right", "plantRight", 0.96, "transparent"),
]


def clean_plate(
    rgb: np.ndarray,
    mask: np.ndarray,
    front: np.ndarray,
    full: bool,
    generated: np.ndarray | None = None,
) -> np.ndarray:
    # Repaint the entire nearer-object silhouette, plus a generous underlap
    # around it. The full plate is what prevents a hole when Claude shifts a
    # cut-out in parallax; the visible master pixels are restored below.
    hole = dilate(front, 40)
    if full:
        # Sky is the only full-bleed plate. Generated pixels are permitted only
        # where a nearer layer hides the supplied source. The source remains
        # untouched everywhere else, including the original frame edges.
        hole = front
    if generated is not None:
        result = rgb.copy()
        result[hole] = generated[hole]
        return result
    raise RuntimeError(f"No generated plate supplied for {full=}")


def composite_padded(base: np.ndarray, rgba: np.ndarray) -> np.ndarray:
    alpha = rgba[..., 3:4].astype(np.float32) / 255
    return np.round(rgba[..., :3] * alpha + base * (1 - alpha)).astype(np.uint8)


def upscale_rgba(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Upscale without creating dark RGB fringes around transparent edges."""
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3:4] / 255
    premultiplied = rgba[..., :3] * alpha
    rgb_image = Image.fromarray(np.clip(premultiplied, 0, 255).astype(np.uint8), "RGB")
    alpha_image = Image.fromarray(np.clip(alpha[..., 0] * 255, 0, 255).astype(np.uint8), "L")
    rgb_up = np.asarray(rgb_image.resize(size, Image.Resampling.LANCZOS), dtype=np.float32)
    alpha_up = np.asarray(alpha_image.resize(size, Image.Resampling.LANCZOS), dtype=np.float32)[..., None] / 255
    rgb_up = np.divide(rgb_up, np.maximum(alpha_up, 1 / 255), out=np.zeros_like(rgb_up), where=alpha_up > 1 / 255)
    out = np.dstack((np.clip(rgb_up, 0, 255), alpha_up * 255)).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def save_layer(
    name: str,
    rgb: np.ndarray,
    mask: np.ndarray,
    front: np.ndarray,
    kind: str,
    background: np.ndarray | None = None,
    extended_canvas: np.ndarray | None = None,
    generated: np.ndarray | None = None,
) -> tuple[Path, dict]:
    if kind == "opaque":
        plate = clean_plate(rgb, mask, front, full=True, generated=generated)
        alpha = np.full((H, W), 255, dtype=np.uint8)
        canvas = np.dstack((plate, alpha))
        extend = True
    else:
        # The source RGB is the cut-out. Clean underlays are generated from
        # the already separated lower planes below, rather than smearing every
        # nearer object into each transparent PNG.
        if background is None:
            plate = rgb.copy()
            alpha = mask.astype(np.uint8) * 255
        else:
            # Derive a straight-alpha foreground against the lower stack so a
            # soft one-pixel boundary still composites back to the exact
            # source pixel instead of carrying a wall/stair fringe.
            alpha = feather(mask, radius=1.0)
            alpha_f = alpha.astype(np.float32) / 255.0
            background_f = background.astype(np.float32)
            source_f = rgb.astype(np.float32)
            plate = np.zeros_like(rgb)
            covered = alpha_f > (1 / 255.0)
            alpha_values = alpha_f[covered][:, None]
            plate[covered] = np.clip(
                (source_f[covered] - background_f[covered] * (1 - alpha_values))
                / alpha_values,
                0,
                255,
            ).astype(np.uint8)
        # Give an object touching an edge enough continuation for the 200px
        # review buffer, while preserving transparency elsewhere.
        extend = name in {"09-bougainvillea", "11-plant-left", "12-plant-right", "04-walls", "05-stairs"}
        canvas = np.dstack((plate, alpha))
    padded = np.zeros((OUT_H, OUT_W, 4), dtype=np.uint8)
    padded[..., 3] = pad_alpha(canvas[..., 3], extend_edges=extend)
    # For transparent layers, edge-padding the alpha would fill the whole
    # border. Limit it to the actual footprint's boundary extension instead.
    if kind != "opaque" and not extend:
        padded[..., 3] = pad_alpha(canvas[..., 3], extend_edges=False)
    # RGB is undefined where alpha is zero. Clearing it makes the transparent
    # PNGs substantially smaller without changing what any renderer sees.
    if extended_canvas is None:
        raise RuntimeError("The generated extended scene is required for padded output")
    padded_rgb = extended_canvas.copy()
    padded_rgb[PAD : PAD + H, PAD : PAD + W] = canvas[..., :3]
    padded[..., :3] = padded_rgb
    padded[padded[..., 3] == 0, :3] = 0
    path = OUT_DIR / f"{name}.png"
    Image.fromarray(padded, "RGBA").save(path, "PNG", optimize=True)
    x0, y0, x1, y1 = crop_info(padded[..., 3])
    entry = {
        "file": path.name,
        "key": name,
        "width": OUT_W,
        "height": OUT_H,
        "sourceOffset": {"x": PAD, "y": PAD},
        "depth": dict((n, d) for n, _, d, _ in LAYER_ORDER)[name],
        "alphaBBox": {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0},
        "bytes": path.stat().st_size,
        "opaque": kind == "opaque",
        "cleanPlate": None,
        "cleanPlateBytes": None,
    }
    return path, entry


def composite_preview(rgb: np.ndarray, layers: list[tuple[str, np.ndarray]]) -> tuple[Image.Image, float, int]:
    result = np.zeros((H, W, 3), dtype=np.uint8)
    # The sky is already opaque; start with it and alpha composite the rest.
    result[:] = rgb
    for name, rgba in layers:
        if name == "01-sky":
            result[:] = rgba[PAD : PAD + H, PAD : PAD + W, :3]
            continue
        crop = rgba[PAD : PAD + H, PAD : PAD + W]
        a = crop[..., 3:4].astype(np.float32) / 255
        result[:] = np.round(crop[..., :3] * a + result * (1 - a)).astype(np.uint8)
    diff = np.abs(result.astype(np.int16) - rgb.astype(np.int16))
    return Image.fromarray(result, "RGB"), float(diff.mean()), int((diff.max(axis=-1) > 2).sum())


def patch_hidden_with_generated(
    plane: np.ndarray,
    generated: np.ndarray,
    hidden: np.ndarray,
    feather_px: int = 6,
) -> np.ndarray:
    """Use generated artwork only inside a grown, hidden source mask."""
    distance = ndimage.distance_transform_edt(hidden)
    weight = np.clip(distance / max(1, feather_px), 0.0, 1.0).astype(np.float32)
    result = plane.astype(np.float32)
    result = result * (1.0 - weight[..., None]) + generated.astype(np.float32) * weight[..., None]
    return np.clip(result, 0, 255).astype(np.uint8)


def write_clean_plates(
    layers: list[tuple[str, np.ndarray]],
    manifest: list[dict],
    masks: dict[str, np.ndarray],
    generated_plates: dict[str, np.ndarray],
) -> None:
    """Write generated, aligned underlays for the five architectural planes.

    Each plate is the already-composited scene through that plane, with the
    generated version used only in the six-pixel-grown areas hidden by nearer
    layers. The rest of the plate is the supplied source stack.
    """
    base = layers[0][1][..., :3].copy()
    for index, (name, rgba) in enumerate(layers[:5]):
        if index == 0:
            plane = base.copy()
        else:
            plane = composite_padded(base, rgba)

        _, key, _, _ = LAYER_ORDER[index]
        front = union(*(masks[next_key] for _, next_key, _, _ in LAYER_ORDER[index + 1 :]))
        # A slightly wider safety grow removes missed one-off petals, shoe
        # highlights and leaf fragments while the six-pixel blend remains the
        # only transition zone.
        hidden = dilate(front, 18)
        source_plane = plane[PAD : PAD + H, PAD : PAD + W].copy()
        source_plane = patch_hidden_with_generated(
            source_plane,
            generated_plates[key],
            hidden,
            feather_px=6,
        )
        clean_plate = plane.copy()
        clean_plate[PAD : PAD + H, PAD : PAD + W] = source_plane

        clean_path = CLEAN_PLATE_DIR / f"{name}-clean-plate.png"
        Image.fromarray(clean_plate, "RGB").save(clean_path, "PNG", optimize=True)
        Image.fromarray(clean_plate, "RGB").save(DEBUG_DIR / f"{name}-clean-plate.jpg", quality=88, optimize=True)
        manifest[index]["cleanPlate"] = clean_path.relative_to(OUT_DIR).as_posix()
        manifest[index]["cleanPlateBytes"] = clean_path.stat().st_size
        base = plane


def shifted_rgba(rgba: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """Translate a cut-out without wrapping pixels around the opposite edge."""
    matrix = np.array([[1.0, 0.0, dx], [0.0, 1.0, dy]], dtype=np.float32)
    return cv2.warpAffine(
        rgba,
        matrix,
        (OUT_W, OUT_H),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )


def render_stack(rgb: np.ndarray, layers: list[tuple[str, np.ndarray]], shift_near: tuple[int, int] = (0, 0)) -> np.ndarray:
    result = layers[0][1][..., :3].copy()
    for index, (_, rgba) in enumerate(layers[1:], start=1):
        shifted = shifted_rgba(rgba, *shift_near) if index >= 5 else rgba
        alpha = shifted[..., 3:4].astype(np.float32) / 255.0
        result = np.round(shifted[..., :3] * alpha + result * (1.0 - alpha)).astype(np.uint8)
    return result[PAD : PAD + H, PAD : PAD + W]


def write_movement_contact_sheet(rgb: np.ndarray, layers: list[tuple[str, np.ndarray]]) -> None:
    """Review the near-layer ±20px movement against the generated plates."""
    panels = [
        render_stack(rgb, layers, (-20, 0)),
        render_stack(rgb, layers, (0, 0)),
        render_stack(rgb, layers, (20, 0)),
    ]
    contact = np.concatenate(panels, axis=1)
    Image.fromarray(contact, "RGB").save(DEBUG_DIR / "movement-near-minus20-center-plus20.png", "PNG", optimize=True)


def write_2x_exports(layers: list[tuple[str, np.ndarray]]) -> None:
    """Write a complete 2× authoring export without alpha-edge darkening."""
    for name, rgba in layers:
        source_path = OUT_DIR / f"{name}.png"
        upscale_rgba(Image.open(source_path), (OUT_W * 2, OUT_H * 2)).save(
            EXPORT_2X_DIR / source_path.name, "PNG", optimize=True
        )
    for name in ("stacked-preview.png", "reference-cropped.png"):
        source_path = OUT_DIR / name
        source_image = Image.open(source_path).convert("RGBA")
        upscale_rgba(source_image, (source_image.width * 2, source_image.height * 2)).convert("RGB").save(
            EXPORT_2X_DIR / name, "PNG", optimize=True
        )
    for source_path in CLEAN_PLATE_DIR.glob("*.png"):
        upscale_rgba(Image.open(source_path).convert("RGBA"), (OUT_W * 2, OUT_H * 2)).convert("RGB").save(
            EXPORT_2X_DIR / "clean-plates" / source_path.name, "PNG", optimize=True
        )


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGB")
    if source.size != (W, H):
        raise SystemExit(f"Expected {W}x{H}, got {source.size}")
    rgb = np.asarray(source, dtype=np.uint8)
    masks = build_masks(rgb)
    extended_canvas = generated_extended_canvas()
    generated_plates = {
        key: generated_image(filename)
        for key, filename in GENERATED_PLATE_FILES.items()
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    CLEAN_PLATE_DIR.mkdir(parents=True, exist_ok=True)
    EXPORT_2X_DIR.mkdir(parents=True, exist_ok=True)
    (EXPORT_2X_DIR / "clean-plates").mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.png"):
        old.unlink()
    for old in (*DEBUG_DIR.glob("*.png"), *DEBUG_DIR.glob("*.jpg")):
        old.unlink()
    for old in CLEAN_PLATE_DIR.glob("*.png"):
        old.unlink()
    for old in EXPORT_2X_DIR.glob("*.png"):
        old.unlink()
    for old in (EXPORT_2X_DIR / "clean-plates").glob("*.png"):
        old.unlink()

    layers: list[tuple[str, np.ndarray]] = []
    manifest: list[dict] = []
    lower_base: np.ndarray | None = None
    for index, (name, key, _depth, kind) in enumerate(LAYER_ORDER):
        front = union(*(masks[next_key] for _, next_key, _, _ in LAYER_ORDER[index + 1 :]))
        background = None
        if lower_base is not None and kind != "opaque":
            background = lower_base[PAD : PAD + H, PAD : PAD + W]
        path, entry = save_layer(
            name,
            rgb,
            masks[key],
            front,
            kind,
            background=background,
            extended_canvas=extended_canvas,
            generated=generated_plates.get(key),
        )
        rgba = np.asarray(Image.open(path).convert("RGBA"))
        layers.append((name, rgba))
        manifest.append(entry)
        debug = Image.new("RGB", (OUT_W, OUT_H), (128, 128, 128))
        debug_rgba = Image.fromarray(rgba, "RGBA")
        debug.paste(debug_rgba, mask=debug_rgba.getchannel("A"))
        debug.save(DEBUG_DIR / f"{name}.jpg", quality=88, optimize=True)
        if lower_base is None:
            lower_base = rgba[..., :3].copy()
        else:
            lower_base = composite_padded(lower_base, rgba)
        print(f"{name:24s} {entry['bytes'] / 1024:8.1f} KB  alpha={entry['alphaBBox']}")

    write_clean_plates(layers, manifest, masks, generated_plates)
    write_movement_contact_sheet(rgb, layers)
    preview, mean_diff, changed = composite_preview(rgb, layers)
    preview.save(OUT_DIR / "stacked-preview.png", "PNG", optimize=True)
    source.save(OUT_DIR / "reference-cropped.png", "PNG", optimize=True)
    diff = np.abs(np.asarray(preview).astype(np.int16) - rgb.astype(np.int16)).astype(np.uint8)
    Image.fromarray(np.clip(diff * 8, 0, 255).astype(np.uint8), "RGB").save(DEBUG_DIR / "stack-diff-x8.png")
    write_2x_exports(layers)

    manifest_path = OUT_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "source": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
                "sourceSize": {"width": W, "height": H},
                "canvasSize": {"width": OUT_W, "height": OUT_H},
                "sourceOffset": {"x": PAD, "y": PAD},
                "highResolution": {
                    "directory": "2x",
                    "canvasSize": {"width": OUT_W * 2, "height": OUT_H * 2},
                    "sourceOffset": {"x": PAD * 2, "y": PAD * 2},
                },
                "stackOrder": [entry["file"] for entry in manifest],
                "layers": manifest,
                "stackValidation": {"meanRgbDifference": mean_diff, "pixelsOver2": changed},
                "notes": [
                    "Visible master pixels are copied from the supplied reference; no redraw is performed.",
                    "Transparent cut-outs include a 200px review/parallax buffer.",
                    "01-sky.png is the opaque source-derived sky for the pixel-exact resting stack.",
                    "The first five planes also have semantic opaque clean plates in clean-plates/; each plate is the composite of the planes behind it.",
                    "RGBA cut-outs keep RGB outside alpha zeroed for smaller files; use the matching clean plate underneath when shifting a plane.",
                    "The 2x/ directory contains the complete 3872x2848 export, including clean plates and review previews.",
                    "The optional breeze-part layers are intentionally omitted until the base stack is approved.",
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
        newline="\n",
    )
    print(f"stack mean RGB diff: {mean_diff:.3f}; pixels over 2: {changed}")
    print(f"wrote {len(manifest)} layers to {OUT_DIR}")


if __name__ == "__main__":
    main()
