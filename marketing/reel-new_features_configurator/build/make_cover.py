"""Static cover (1080x1920) for the new configurator features, styled like ../../reel/out/cover-alt.jpg.

Run:  python marketing\\reel-new_features_configurator\\build\\make_cover.py
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BUILD = Path(__file__).resolve().parent
ROOT = BUILD.parents[2]
OUT = BUILD.parent / "out" / "cover-alt.jpg"
PHOTO = BUILD / "img" / "designer-41.png"  # copy of images/Designer (41).png, kept out of site deploy assets
MAP = BUILD / "capture" / "area" / "0101.jpg"

W, H = 1080, 1920
RED = (226, 35, 46)
WHITE = (255, 255, 255)
CARD = (24, 24, 23)
GREY = (160, 160, 155)
GREEN = (46, 82, 24)


def font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BUILD / "fonts" / f"Inter-{weight}.ttf"), size)


def background() -> Image.Image:
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W * 0.5) / (W * 0.9)) ** 2 + ((y - H * 0.55) / (H * 0.7)) ** 2)
    t = np.clip(d, 0, 1)[..., None] ** 1.3
    rgb = np.array([40, 66, 30], np.float32) * (1 - t) + np.array([14, 24, 14], np.float32) * t
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("RGBA")
    # Topographic contour lines from smoothed noise, like the reference cover.
    field = cv2.GaussianBlur(np.random.default_rng(11).normal(0, 1, (H // 4, W // 4)).astype(np.float32), (0, 0), 18)
    field = cv2.resize(field, (W, H), interpolation=cv2.INTER_CUBIC)
    field = (field - field.min()) / (field.max() - field.min())
    lines = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(lines)
    for level in np.linspace(0.06, 0.94, 22):
        mask = (field > level).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            pts = [tuple(p[0]) for p in c]
            if len(pts) > 8:
                d2.line(pts + [pts[0]], fill=(170, 200, 150, 34), width=2)
    return Image.alpha_composite(img, lines)


def shadowed(layer: Image.Image, blur: int = 26, offset=(0, 18), alpha: int = 150) -> Image.Image:
    pad = blur * 3
    out = Image.new("RGBA", (layer.width + 2 * pad, layer.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    a = layer.getchannel("A").point(lambda v: int(v * alpha / 255))
    sh.paste((0, 0, 0, 255), (pad + offset[0], pad + offset[1]), a)
    out = Image.alpha_composite(out, sh.filter(ImageFilter.GaussianBlur(blur)))
    out.alpha_composite(layer, (pad, pad))
    return out


def place(canvas: Image.Image, layer: Image.Image, center: tuple[int, int], angle: float = 0.0) -> None:
    if angle:
        layer = layer.rotate(angle, Image.BICUBIC, expand=True)
    canvas.alpha_composite(layer, (int(center[0] - layer.width / 2), int(center[1] - layer.height / 2)))


def rounded(img: Image.Image, radius: int) -> Image.Image:
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    img.putalpha(mask)
    return img


def photo_card() -> Image.Image:
    photo = Image.open(PHOTO).convert("RGB")
    w = 960
    photo = photo.resize((w, round(photo.height * w / photo.width)), Image.LANCZOS)
    border = 12
    card = Image.new("RGBA", (photo.width + 2 * border, photo.height + 2 * border), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=46, fill=(246, 245, 240, 255))
    card.alpha_composite(rounded(photo, 36), (border, border))
    return shadowed(card, 30, (0, 24), 170)


def gpx_card() -> Image.Image:
    w, h = 470, 390
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=34, fill=CARD + (255,))
    d.text((30, 26), "Mehrere GPX-Dateien", font=font(800, 33), fill=WHITE)
    d.text((30, 70), "als Etappen auf einem Relief", font=font(500, 23), fill=GREY)
    names = ["etappe-1.gpx", "etappe-2.gpx", "etappe-3.gpx"]
    for i, name in enumerate(names):
        y = 122 + i * 84
        d.rounded_rectangle((24, y, w - 24, y + 68), radius=16, fill=(38, 38, 36))
        ix, iy = 42, y + 14
        d.polygon([(ix, iy), (ix + 30, iy), (ix + 40, iy + 10), (ix + 40, iy + 40), (ix, iy + 40)], fill=GREEN)
        d.text((ix + 20 - font(800, 11).getlength("GPX") / 2, iy + 23), "GPX", font=font(800, 11), fill=WHITE)
        d.text((100, y + 18), name, font=font(600, 26), fill=WHITE)
        cx, cy = w - 56, y + 34
        d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=RED)
        d.line([(cx - 7, cy), (cx - 2, cy + 6), (cx + 7, cy - 6)], fill=WHITE, width=4)
    return shadowed(card)


def map_card() -> Image.Image:
    w, h = 470, 390
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=34, fill=CARD + (255,))
    d.text((30, 26), "Dein Lieblingsberg", font=font(800, 33), fill=WHITE)
    d.text((30, 70), "ohne Route – auf der Karte wählen", font=font(500, 23), fill=GREY)
    shot = Image.open(MAP).convert("RGB")
    # Live-configurator map with the "Dein Relief" square around the Matterhorn.
    mw, mh = w - 48, 250
    crop = shot.crop((134, 795, 1034, 795 + round(900 * mh / mw))).resize((mw, mh), Image.LANCZOS).convert("RGBA")
    cd = ImageDraw.Draw(crop, "RGBA")
    af = font(500, 14)
    label = "© OpenStreetMap"
    cd.rectangle((mw - af.getlength(label) - 14, mh - 24, mw, mh), fill=(255, 255, 255, 200))
    cd.text((mw - af.getlength(label) - 7, mh - 21), label, font=af, fill=(70, 70, 66))
    card.alpha_composite(rounded(crop, 18), (24, 116))
    return shadowed(card)


def badge() -> Image.Image:
    size = 210
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, size - 1, size - 1), fill=(246, 245, 240, 255))
    f1, f2 = font(800, 50), font(800, 58)
    d.text(((size - f1.getlength("Karte")) / 2, 44), "Karte", font=f1, fill=(24, 24, 22))
    d.text(((size - f2.getlength("→ 3D")) / 2, 100), "→ 3D", font=f2, fill=RED)
    return shadowed(img, 20, (0, 12), 130)


def headline(canvas: Image.Image) -> None:
    pill_font = font(700, 38)
    pill = "Neu im Konfigurator"
    pw = pill_font.getlength(pill) + 70
    x0 = (W - pw) / 2
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle((x0, 262, x0 + pw, 330), radius=34, fill=(255, 255, 255, 28), outline=(255, 255, 255, 80), width=2)
    ld.text((x0 + 35, 274), "Neu", font=pill_font, fill=(255, 120, 60))
    ld.text((x0 + 35 + pill_font.getlength("Neu "), 274), "im Konfigurator", font=pill_font, fill=WHITE)
    canvas.alpha_composite(layer)

    big = font(800, 150)
    text = "Mit Route."
    tl = Image.new("RGBA", (W, 220), (0, 0, 0, 0))
    ImageDraw.Draw(tl).text(((W - big.getlength(text)) / 2, 20), text, font=big, fill=WHITE)
    canvas.alpha_composite(shadowed(tl, 16, (0, 8), 120), (-48, 350 - 48))

    text2 = "Oder ohne."
    tw = big.getlength(text2)
    box = Image.new("RGBA", (int(tw) + 90, 196), (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle((0, 0, box.width - 1, box.height - 1), radius=30, fill=RED + (255,))
    bd.text((45, 6), text2, font=big, fill=WHITE)
    glow = shadowed(box, 30, (0, 14), 170)
    place(canvas, glow, (W // 2, 640), angle=-2)


def logo(canvas: Image.Image) -> None:
    img = Image.open(BUILD / "img" / "logo.png").convert("RGBA")
    img = img.resize((250, round(img.height * 250 / img.width)), Image.LANCZOS)
    white = Image.new("RGBA", img.size, (240, 240, 235, 255))
    white.putalpha(img.getchannel("A"))
    canvas.alpha_composite(white, ((W - img.width) // 2, 1760))


def main() -> None:
    canvas = background()
    headline(canvas)
    place(canvas, photo_card(), (W // 2 + 10, 1080), angle=2.5)
    place(canvas, gpx_card(), (285, 1520), angle=-3.5)
    place(canvas, map_card(), (800, 1530), angle=3.5)
    place(canvas, badge(), (930, 880), angle=10)
    logo(canvas)
    OUT.parent.mkdir(exist_ok=True)
    canvas.convert("RGB").save(OUT, quality=93)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
