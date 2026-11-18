#!/usr/bin/env python3
"""Generate the PWA / Apple touch icons without external tooling.

The game icon is the PiuPiu four-point spark: a cyan-to-violet light on a
deep navy field. Run `python3 tools/make-icons.py` after changing the art.
Requires Pillow and NumPy (development only; the game itself is static).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
S = 2048
OUT = 512


def colorize_gradient(size: int) -> np.ndarray:
    y = np.linspace(0.0, 1.0, size, dtype=np.float32)[:, None]
    x = np.linspace(0.0, 1.0, size, dtype=np.float32)[None, :]
    top = np.array([126, 255, 221], dtype=np.float32)
    mid = np.array([41, 231, 199], dtype=np.float32)
    bottom = np.array([139, 92, 255], dtype=np.float32)
    left = np.clip(y * 2.0, 0.0, 1.0)
    right = np.clip(y * 2.0 - 1.0, 0.0, 1.0)
    grad = top * (1 - left)[..., None] + mid * left[..., None]
    grad = grad * (1 - right)[..., None] + bottom * right[..., None]
    # A small warm highlight keeps the sparkle from looking flat.
    glow = np.exp(-(((x - 0.38) / 0.24) ** 2 + ((y - 0.30) / 0.24) ** 2))
    grad = grad * (1 - glow[..., None] * 0.42) + 255 * glow[..., None] * 0.42
    return np.clip(grad, 0, 255).astype(np.uint8)


def star_points(cx: float, cy: float, radius: float, inner: float = 0.215):
    r = radius
    i = radius * inner
    return [
        (cx, cy - r),
        (cx + i, cy - i),
        (cx + r, cy),
        (cx + i, cy + i),
        (cx, cy + r),
        (cx - i, cy + i),
        (cx - r, cy),
        (cx - i, cy - i),
    ]


def star_mask(cx: float, cy: float, radius: float, inner: float = 0.215) -> Image.Image:
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).polygon(star_points(cx, cy, radius, inner), fill=255)
    return mask


def make_icon(*, maskable: bool) -> Image.Image:
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / (S - 1)
    cx, cy = 0.5, 0.46
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    field = np.clip(dist / 0.9, 0.0, 1.0)
    top = np.array([20, 14, 52], dtype=np.float32)
    bottom = np.array([3, 5, 13], dtype=np.float32)
    bg = top * (1 - field)[..., None] + bottom * field[..., None]

    halo = np.exp(-(((xx - cx) / 0.46) ** 2 + ((yy - cy) / 0.46) ** 2))
    bg = np.clip(bg + np.array([47, 28, 105], dtype=np.float32) * halo[..., None] * 0.9, 0, 255)

    radius = S * (0.255 if maskable else 0.305)
    star = star_mask(cx * S, cy * S, radius)
    glow = star.filter(ImageFilter.GaussianBlur(S * 0.035))
    glow_alpha = np.asarray(glow, dtype=np.float32) / 255.0 * 0.72
    bg = np.clip(
        bg
        + np.array([32, 198, 190], dtype=np.float32) * glow_alpha[..., None] * 0.55
        + np.array([96, 58, 210], dtype=np.float32) * glow_alpha[..., None] * 0.55,
        0,
        255,
    )

    grad = colorize_gradient(S)
    mask = np.asarray(star, dtype=np.float32) / 255.0
    art = bg * (1 - mask[..., None]) + grad.astype(np.float32) * mask[..., None]

    # A bright rim makes the spark read at 48 px.
    rim = star.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.4))
    rim_alpha = np.clip(
        np.asarray(rim, dtype=np.float32) - np.asarray(star, dtype=np.float32), 0, 255
    ) / 255.0
    art = art * (1 - rim_alpha[..., None] * 0.85) + np.array(
        [225, 255, 249], dtype=np.float32
    ) * rim_alpha[..., None] * 0.85

    image = Image.fromarray(np.clip(art, 0, 255).astype(np.uint8))

    def sparkle(sx: float, sy: float, sr: float, color: tuple[int, int, int], opacity: float):
        dot = star_mask(sx * S, sy * S, sr * S, inner=0.16)
        halo2 = dot.filter(ImageFilter.GaussianBlur(S * 0.012))
        alpha = np.asarray(halo2, dtype=np.float32) / 255.0 * opacity
        nonlocal image
        arr = np.asarray(image, dtype=np.float32)
        arr = np.clip(arr + np.array(color, dtype=np.float32) * alpha[..., None], 0, 255)
        a2 = np.asarray(dot, dtype=np.float32) / 255.0 * opacity
        arr = arr * (1 - a2[..., None]) + np.array(color, dtype=np.float32) * a2[..., None]
        image = Image.fromarray(arr.astype(np.uint8))

    if maskable:
        sparkle(0.69, 0.73, 0.050, (170, 255, 239), 0.95)
        sparkle(0.28, 0.28, 0.032, (205, 190, 255), 0.9)
    else:
        sparkle(0.745, 0.235, 0.062, (170, 255, 239), 1.0)
        sparkle(0.235, 0.715, 0.040, (205, 190, 255), 0.95)

    # Very subtle corner shading, then a crisp LANCZOS downsample.
    vignette = np.clip(np.sqrt((xx - 0.5) ** 2 + (yy - 0.5) ** 2) / 0.78, 0, 1)
    arr = np.asarray(image, dtype=np.float32) * (1 - vignette[..., None] * 0.16)
    image = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return image.resize((OUT, OUT), Image.LANCZOS)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    standard = make_icon(maskable=False)
    standard.save(ICONS / "icon-512.png", optimize=True)
    standard.resize((192, 192), Image.LANCZOS).save(ICONS / "icon-192.png", optimize=True)
    standard.resize((180, 180), Image.LANCZOS).save(
        ICONS / "apple-touch-icon-180.png", optimize=True
    )
    make_icon(maskable=True).save(ICONS / "maskable-512.png", optimize=True)
    print("wrote icons:", ", ".join(sorted(p.name for p in ICONS.glob("*.png"))))


if __name__ == "__main__":
    main()
