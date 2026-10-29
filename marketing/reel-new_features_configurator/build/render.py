"""Composite the 'neue Konfigurator-Features' reel (1080x1920, 30 fps).

Inputs: Playwright captures in build/capture (node capture.js), Inter TTFs (python make_fonts.py),
b-roll from marketing/video material and product images from /images.
Run from anywhere:  python marketing\\reel-new_features_configurator\\build\\render.py [--preview]
"""
from __future__ import annotations

import json
import math
import sys
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import av
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BUILD = Path(__file__).resolve().parent
PROJECT = BUILD.parent
ROOT = BUILD.parents[2]
BROLL = ROOT / "marketing" / "video material"
IMAGES = ROOT / "images"
CAPTURE = BUILD / "capture"
OUT = PROJECT / "out"
OUTPUT = OUT / "peakmemory-reel-configurator.mp4"
COVER = OUT / "cover.jpg"

W, H, FPS = 1080, 1920, 30
DURATION = 20.0
TOTAL = int(DURATION * FPS)

RED = (226, 35, 46)
WHITE = (255, 255, 255)
CREAM = (247, 246, 240)
INK = (24, 24, 22)
GREEN = (46, 82, 24)
MUTED = (96, 96, 90)


def font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BUILD / "fonts" / f"Inter-{weight}.ttf"), size)


EMOJI = ImageFont.truetype(r"C:\Windows\Fonts\seguiemj.ttf", 109)
HEADLINE = font(800, 84)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def ease_out(v: float) -> float:
    return 1 - (1 - clamp(v)) ** 3


def ease_in_out(v: float) -> float:
    v = clamp(v)
    return 4 * v ** 3 if v < 0.5 else 1 - (-2 * v + 2) ** 3 / 2


def back_out(v: float) -> float:
    v = clamp(v)
    c1, c3 = 1.4, 2.4
    return 1 + c3 * (v - 1) ** 3 + c1 * (v - 1) ** 2


def cover_resize(img: Image.Image, w: int, h: int, focus=(0.5, 0.5)) -> Image.Image:
    scale = max(w / img.width, h / img.height)
    nw, nh = math.ceil(img.width * scale), math.ceil(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = int((nw - w) * focus[0])
    top = int((nh - h) * focus[1])
    return img.crop((left, top, left + w, top + h))


def zoomed(img: Image.Image, scale: float, focus=(0.5, 0.5)) -> Image.Image:
    if abs(scale - 1) < 1e-3:
        return img
    cw, ch = img.width / scale, img.height / scale
    left = (img.width - cw) * focus[0]
    top = (img.height - ch) * focus[1]
    return img.resize(img.size, Image.BICUBIC, box=(left, top, left + cw, top + ch))


# ---------------------------------------------------------------- backgrounds
def make_green_bg() -> Image.Image:
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W * 0.5) / (W * 0.85)) ** 2 + ((y - H * 0.72) / (H * 0.62)) ** 2)
    t = np.clip(d, 0, 1)[..., None] ** 1.25
    inner = np.array([38, 66, 26], np.float32)
    outer = np.array([7, 12, 7], np.float32)
    rgb = inner * (1 - t) + outer * t
    rgb += np.random.default_rng(3).normal(0, 1.6, rgb.shape)  # light grain against banding
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("RGBA")


GREEN_BG = make_green_bg()


def top_shade(strength: int = 150, height: int = 760) -> Image.Image:
    a = np.zeros((H, W), np.uint8)
    ramp = (np.linspace(1, 0, height) ** 1.6 * strength).astype(np.uint8)
    a[:height] = ramp[:, None]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(Image.fromarray(a))
    return layer


TOP_SHADE = top_shade()


# ---------------------------------------------------------------- headline text
def headline_layer(lines: list[list[tuple[str, bool]]]) -> list[tuple[Image.Image, int]]:
    """Render each line as its own RGBA image; segments flagged True get a red highlight box."""
    rendered = []
    line_h = 104
    for index, segments in enumerate(lines):
        widths = [HEADLINE.getlength(text) for text, _ in segments]
        pad_x = 18
        total = sum(widths) + sum(2 * pad_x for _, hl in segments if hl)
        img = Image.new("RGBA", (int(total) + 80, line_h + 40), (0, 0, 0, 0))
        shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d, sd = ImageDraw.Draw(img), ImageDraw.Draw(shadow)
        x = 40
        for (text, hl), w in zip(segments, widths):
            if hl:
                d.rounded_rectangle((x, 24, x + w + 2 * pad_x, 24 + line_h - 4), radius=14, fill=RED + (255,))
                sd.rounded_rectangle((x, 30, x + w + 2 * pad_x, 30 + line_h - 4), radius=14, fill=(0, 0, 0, 90))
                x += pad_x
            sd.text((x, 22 + 6), text, font=HEADLINE, fill=(0, 0, 0, 140))
            d.text((x, 22), text, font=HEADLINE, fill=WHITE + (255,))
            x += w + (pad_x if hl else 0)
        shadow = shadow.filter(ImageFilter.GaussianBlur(9))
        rendered.append((Image.alpha_composite(shadow, img), index))
    return rendered


class Headline:
    def __init__(self, start: float, end: float, lines, y: int = 238, out: bool = True):
        self.start, self.end, self.y, self.fade_out = start, end, y, out
        self.layers = headline_layer(lines)

    def draw(self, frame: Image.Image, t: float) -> None:
        if not (self.start <= t < self.end):
            return
        for layer, index in self.layers:
            appear = clamp((t - self.start - index * 0.12) / 0.32)
            vanish = clamp((self.end - t) / 0.2) if self.fade_out else 1.0
            alpha = ease_out(appear) * vanish
            if alpha <= 0.01:
                continue
            blur = (1 - ease_out(appear)) * 14 + (1 - vanish) * 12
            img = layer.filter(ImageFilter.GaussianBlur(blur)) if blur > 0.4 else layer.copy()
            if alpha < 1:
                img.putalpha(img.getchannel("A").point(lambda a: int(a * alpha)))
            dy = int((1 - ease_out(appear)) * 26)
            frame.alpha_composite(img, ((W - img.width) // 2, self.y + index * 104 - 24 + dy))


# ---------------------------------------------------------------- b-roll
class Clip:
    def __init__(self, filename: str, start: float, focus=(0.5, 0.5), zoom=(1.0, 1.07)):
        self.capture = cv2.VideoCapture(str(BROLL / filename))
        if not self.capture.isOpened():
            raise RuntimeError(filename)
        self.fps = self.capture.get(cv2.CAP_PROP_FPS)
        self.start_frame = round(start * self.fps)
        self.capture.set(cv2.CAP_PROP_POS_FRAMES, self.start_frame)
        self.next = self.start_frame
        self.last: Image.Image | None = None
        self.focus, self.zoom = focus, zoom

    def frame(self, elapsed: float, progress: float) -> Image.Image:
        target = self.start_frame + round(elapsed * self.fps)
        while self.next <= target:
            ok, bgr = self.capture.read()
            if not ok:
                break
            h, w = bgr.shape[:2]
            scale = max(W / w, H / h)
            bgr = cv2.resize(bgr, (math.ceil(w * scale), math.ceil(h * scale)), interpolation=cv2.INTER_AREA)
            img = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            self.last = cover_resize(img, W, H, self.focus)
            self.next += 1
        assert self.last is not None
        z = self.zoom[0] + (self.zoom[1] - self.zoom[0]) * progress
        return zoomed(self.last, z, self.focus).convert("RGBA")


# ---------------------------------------------------------------- phone
SCREEN_W = 600
CSS = SCREEN_W / 390
STATUS_H = 72
SCREEN_H = 1290
BEZEL = 17
PHONE_W, PHONE_H = SCREEN_W + 2 * BEZEL, SCREEN_H + 2 * BEZEL
PHONE_TOP = 530


def rounded_mask(size, radius) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


SCREEN_MASK = rounded_mask((SCREEN_W, SCREEN_H), 78)


def make_phone_frame() -> Image.Image:
    pad = 80
    img = Image.new("RGBA", (PHONE_W + 2 * pad, PHONE_H + 2 * pad), (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad + 10, pad + 40, pad + PHONE_W - 10, pad + PHONE_H + 20), radius=96, fill=(0, 0, 0, 170))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(38)))
    body = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle((pad, pad, pad + PHONE_W - 1, pad + PHONE_H - 1), radius=96, fill=(62, 64, 62, 255))
    d.rounded_rectangle((pad + 3, pad + 3, pad + PHONE_W - 4, pad + PHONE_H - 4), radius=93, fill=(10, 10, 10, 255))
    hole = Image.new("L", img.size, 0)
    hole.paste(SCREEN_MASK, (pad + BEZEL, pad + BEZEL))
    body.putalpha(Image.fromarray(np.minimum(np.array(body.getchannel("A")), 255 - np.array(hole))))
    for y in (300, 420, 560):  # side buttons
        d2 = ImageDraw.Draw(img)
        d2.rounded_rectangle((pad - 5, pad + y, pad + 2, pad + y + (70 if y > 300 else 44)), radius=3, fill=(48, 50, 48, 255))
    d2.rounded_rectangle((pad + PHONE_W - 2, pad + 400, pad + PHONE_W + 5, pad + 520), radius=3, fill=(48, 50, 48, 255))
    return Image.alpha_composite(img, body)


PHONE_FRAME = make_phone_frame()
PHONE_PAD = 80


def make_status_bar() -> Image.Image:
    bar = Image.new("RGBA", (SCREEN_W, STATUS_H), (249, 249, 247, 255))
    d = ImageDraw.Draw(bar)
    d.text((70, 20), "9:41", font=font(600, 29), fill=INK)
    d.rounded_rectangle((SCREEN_W // 2 - 92, 14, SCREEN_W // 2 + 92, 64), radius=25, fill=(0, 0, 0))
    x = SCREEN_W - 150
    for i, h in enumerate((9, 13, 17, 21)):
        d.rounded_rectangle((x + i * 9, 46 - h, x + i * 9 + 5, 46), radius=2, fill=INK)
    cx, cy = x + 58, 46
    for r in (18, 12, 6):
        d.pieslice((cx - r, cy - r, cx + r, cy + r), 225, 315, fill=INK)
        if r > 6:
            d.pieslice((cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3), 225, 315, fill=(249, 249, 247))
    d.rounded_rectangle((x + 82, 27, x + 120, 46), radius=6, outline=INK, width=2)
    d.rounded_rectangle((x + 85, 30, x + 112, 43), radius=3, fill=INK)
    d.rounded_rectangle((x + 122, 33, x + 125, 40), radius=1, fill=INK)
    return bar


STATUS_BAR = make_status_bar()


def make_url_pill() -> Image.Image:
    w, h = 470, 66
    pad = 30
    img = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((pad, pad + 6, pad + w, pad + h + 6), radius=33, fill=(0, 0, 0, 60))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((pad, pad, pad + w, pad + h), radius=33, fill=(250, 250, 248, 245))
    f = font(500, 28)
    text = "peak-memory.de"
    tw = f.getlength(text) + 34
    x = pad + (w - tw) / 2
    # padlock
    d.rounded_rectangle((x, pad + 29, x + 20, pad + 47), radius=3, fill=(205, 145, 30))
    d.arc((x + 3, pad + 17, x + 17, pad + 37), 180, 360, fill=(205, 145, 30), width=3)
    d.text((x + 34, pad + 17), text, font=f, fill=INK)
    return img


URL_PILL = make_url_pill()


@lru_cache(maxsize=48)
def screen_capture(sequence: str, index: int) -> Image.Image:
    img = Image.open(CAPTURE / sequence / f"{index:04d}.jpg").convert("RGB")
    h = round(img.height * SCREEN_W / img.width)
    return img.resize((SCREEN_W, h), Image.LANCZOS)


def load_meta(sequence: str) -> dict:
    return json.loads((CAPTURE / sequence / "meta.json").read_text())


class PhoneScene:
    """Plays a capture sequence inside the phone, driven by (time, capture frame) keyframes."""

    def __init__(self, sequence: str, start: float, end: float, keys: list[tuple[float, float]], taps: list[tuple[float, float, float]],
                 zooms: list[tuple[float, float]] | None = None):
        self.sequence, self.start, self.end = sequence, start, end
        self.keys, self.taps = keys, taps
        self.zooms = zooms or [(0.0, 1.0)]
        self.overlay = None

    def zoom(self, local: float) -> float:
        z = self.zooms
        if local <= z[0][0]:
            return z[0][1]
        for (t0, s0), (t1, s1) in zip(z, z[1:]):
            if local <= t1:
                return s0 + (s1 - s0) * ease_in_out((local - t0) / max(t1 - t0, 1e-6))
        return z[-1][1]

    def capture_index(self, local: float) -> int:
        keys = self.keys
        if local <= keys[0][0]:
            return int(keys[0][1])
        for (t0, f0), (t1, f1) in zip(keys, keys[1:]):
            if local <= t1:
                return int(round(f0 + (f1 - f0) * (local - t0) / max(t1 - t0, 1e-6)))
        return int(keys[-1][1])

    def screen(self, local: float) -> Image.Image:
        scr = Image.new("RGBA", (SCREEN_W, SCREEN_H), (249, 249, 247, 255))
        shot = screen_capture(self.sequence, self.capture_index(local))
        scr.paste(shot, (0, STATUS_H))
        scr.paste(STATUS_BAR, (0, 0))
        d = ImageDraw.Draw(scr, "RGBA")
        for tap_t, x, y in self.taps:
            p = (local - tap_t) / 0.32
            if -0.35 <= p < 1:
                cx, cy = x * CSS, STATUS_H + y * CSS
                if p < 0:  # finger approaching
                    a = 1 + p / 0.35
                    r = 30 + 8 * (-p / 0.35)
                    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, int(110 * a)), outline=(120, 120, 120, int(140 * a)), width=3)
                else:
                    a = 1 - p
                    r = 30 + 50 * ease_out(p)
                    d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=(255, 255, 255, int(110 * a)))
                    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(120, 120, 120, int(170 * a)), width=4)
        scr.alpha_composite(URL_PILL, ((SCREEN_W - URL_PILL.width) // 2, SCREEN_H - URL_PILL.height + 6))
        scr.putalpha(SCREEN_MASK)
        return scr

    def draw(self, frame: Image.Image, t: float) -> None:
        local = t - self.start
        enter = ease_out(local / 0.55)
        leave = ease_in_out((t - (self.end - 0.3)) / 0.3) if t > self.end - 0.3 else 0
        phone = PHONE_FRAME.copy()
        phone.alpha_composite(self.screen(local), (PHONE_PAD + BEZEL, PHONE_PAD + BEZEL))
        # Push-in is anchored at the phone's top edge so it never collides with the headline.
        scale = (0.9 + 0.1 * enter + 0.04 * leave) * self.zoom(local)
        float_y = math.sin(local * 1.6) * 5
        if abs(scale - 1) > 1e-3:
            phone = phone.resize((round(phone.width * scale), round(phone.height * scale)), Image.BICUBIC)
        x = (W - phone.width) // 2
        y = int(PHONE_TOP - PHONE_PAD * scale + (1 - enter) * 520 + float_y + leave * 40)
        if leave > 0:
            phone.putalpha(phone.getchannel("A").point(lambda a: int(a * (1 - leave))))
        frame.alpha_composite(phone, (x, y))
        if self.overlay:
            inset = (PHONE_PAD + BEZEL) * scale
            to_frame = lambda cx, cy: (x + inset + cx * CSS * scale, y + inset + (STATUS_H + cy * CSS) * scale)
            self.overlay.draw(frame, local, to_frame)


# ---------------------------------------------------------------- drag & drop of GPX files
def file_card(name: str) -> Image.Image:
    w, h, m = 360, 96, 30
    img = Image.new("RGBA", (w + 2 * m, h + 2 * m), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((m, m + 10, m + w, m + h + 10), radius=22, fill=(0, 0, 0, 120))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((m, m, m + w, m + h), radius=22, fill=(255, 255, 255, 250))
    ix, iy = m + 20, m + 16
    d.polygon([(ix, iy), (ix + 36, iy), (ix + 50, iy + 14), (ix + 50, iy + 64), (ix, iy + 64)], fill=GREEN)
    d.polygon([(ix + 36, iy), (ix + 50, iy + 14), (ix + 36, iy + 14)], fill=(120, 160, 90))
    gf = font(800, 14)
    d.text((ix + 25 - gf.getlength("GPX") / 2, iy + 38), "GPX", font=gf, fill=WHITE)
    d.text((ix + 70, m + 20), name, font=font(600, 25), fill=INK)
    d.text((ix + 70, m + 54), "GPX-Datei", font=font(500, 20), fill=MUTED)
    return img


class FileDrag:
    """Three GPX files dragged from outside the phone onto the real dropzone, then dropped."""

    def __init__(self, names: list[str], zone: dict, starts=(0.68, 0.8, 0.92), travel: float = 0.6, drop: float = 1.85):
        self.cards = [file_card(n) for n in names]
        self.zone, self.starts, self.travel, self.drop = zone, starts, travel, drop
        self.offsets = [(-16, -18), (0, 0), (16, 18)]
        self.rot_from, self.rot_to = [16, -12, 8], [-6, 2, 7]
        self.y_from = [-300, -110, 90]
        b = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        bd.ellipse((2, 2, 62, 62), fill=RED, outline=WHITE, width=4)
        f = font(800, 32)
        bd.text((32 - f.getlength("3") / 2, 11), "3", font=f, fill=WHITE)
        self.badge = b

    def draw(self, frame: Image.Image, local: float, to_frame) -> None:
        if local < self.starts[0] or local > self.drop + 0.3:
            return
        zx, zy = to_frame(self.zone["x"] + self.zone["width"] / 2, self.zone["y"] + self.zone["height"] / 2)
        dropping = clamp((local - self.drop) / 0.15)
        lead = None
        for i, card in enumerate(self.cards):
            p = ease_in_out((local - self.starts[i]) / self.travel)
            if local < self.starts[i]:
                continue
            tx, ty = zx + self.offsets[i][0], zy + self.offsets[i][1]
            sx, sy = W + 260, zy + self.y_from[i]
            cx, cy = W * 0.92, zy + self.y_from[i] * 0.4 - 140
            px = (1 - p) ** 2 * sx + 2 * (1 - p) * p * cx + p ** 2 * tx
            py = (1 - p) ** 2 * sy + 2 * (1 - p) * p * cy + p ** 2 * ty
            rot = self.rot_from[i] + (self.rot_to[i] - self.rot_from[i]) * p
            scale = (1.08 - 0.08 * p) * (1 - 0.5 * dropping)
            img = card.resize((round(card.width * scale), round(card.height * scale)), Image.BICUBIC).rotate(rot, Image.BICUBIC, expand=True)
            if dropping > 0:
                img.putalpha(img.getchannel("A").point(lambda v: int(v * (1 - dropping))))
            frame.alpha_composite(img, (int(px - img.width / 2), int(py - img.height / 2 + dropping * 30)))
            lead = (px, py)
        if lead and dropping < 1:
            fx, fy = lead[0] + 120, lead[1] + 40
            a = 1 - dropping
            ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            rd = ImageDraw.Draw(ring)
            r = 34 - 6 * clamp((local - self.drop + 0.1) / 0.1)
            rd.ellipse((fx - r, fy - r, fx + r, fy + r), fill=(255, 255, 255, int(150 * a)), outline=(110, 110, 110, int(170 * a)), width=3)
            frame.alpha_composite(ring)
            if local > self.starts[-1] + self.travel * 0.8:
                ba = ease_out((local - self.starts[-1] - self.travel * 0.8) / 0.15) * a
                badge = self.badge.copy()
                badge.putalpha(badge.getchannel("A").point(lambda v: int(v * ba)))
                frame.alpha_composite(badge, (int(zx + 150 + self.offsets[2][0]), int(zy - 80)))


# ---------------------------------------------------------------- product compare
def load_cutout(name: str, width: int) -> Image.Image:
    img = Image.open(IMAGES / name).convert("RGBA")
    img = img.crop(img.getbbox())
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def pill(text: str, fill, text_fill, size: int = 34, weight: int = 700) -> Image.Image:
    f = font(weight, size)
    w = int(f.getlength(text)) + 56
    h = size + 34
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=fill)
    d.text((28, 14), text, font=f, fill=text_fill)
    return img


class CompareScene:
    def __init__(self, start: float, end: float):
        self.start, self.end = start, end
        self.left = load_cutout("GPX_Route.png", 470)
        self.right = load_cutout("Kartenausschnitt.png", 560)
        self.left_tag = pill("Mit GPX-Route", (255, 255, 255, 235), INK)
        self.right_tag = pill("Kartenausschnitt", RED + (255,), WHITE)
        glow = Image.new("RGBA", (900, 900), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((150, 150, 750, 750), fill=(160, 210, 120, 70))
        self.glow = glow.filter(ImageFilter.GaussianBlur(110))

    def draw(self, frame: Image.Image, t: float) -> None:
        local = t - self.start
        frame.alpha_composite(self.glow, (W - 900 + 120, 640))
        a = ease_out(local / 0.5)
        b = back_out(clamp((local - 0.45) / 0.6))
        dim = 1 - 0.45 * clamp((local - 0.45) / 0.5)
        left = self.left.copy()
        left.putalpha(left.getchannel("A").point(lambda v: int(v * a)))
        if dim < 1:
            left = Image.alpha_composite(left, Image.new("RGBA", left.size, (0, 0, 0, 0)))
            arr = np.array(left).astype(np.float32)
            arr[..., :3] *= dim
            left = Image.fromarray(arr.astype(np.uint8))
        frame.alpha_composite(left, (int(40 - (1 - a) * 200), 760))
        if local > 0.2:
            frame.alpha_composite(self.left_tag, (int(275 - self.left_tag.width / 2 - (1 - a) * 200), 1260))
        if local > 0.45:
            s = 0.6 + 0.4 * b
            right = self.right.resize((max(1, round(self.right.width * s)), max(1, round(self.right.height * s))), Image.BICUBIC)
            ra = clamp((local - 0.45) / 0.25)
            right.putalpha(right.getchannel("A").point(lambda v: int(v * ra)))
            cx, cy = 720, 1080
            frame.alpha_composite(right, (int(cx - right.width / 2), int(cy - right.height / 2)))
            if local > 0.75:
                tag = self.right_tag.copy()
                ta = ease_out((local - 0.75) / 0.3)
                tag.putalpha(tag.getchannel("A").point(lambda v: int(v * ta)))
                frame.alpha_composite(tag, (int(cx - tag.width / 2), int(1395 + (1 - ta) * 30)))


# ---------------------------------------------------------------- end card
class EndCard:
    def __init__(self, start: float):
        self.start = start
        logo = Image.open(BUILD / "img" / "logo.png").convert("RGBA")
        self.logo = logo.resize((330, round(logo.height * 330 / logo.width)), Image.LANCZOS)
        photo = Image.open(IMAGES / "main.png").convert("RGB")
        photo = cover_resize(photo, 700, 700).convert("RGBA")
        photo.putalpha(rounded_mask(photo.size, 44))
        sh = Image.new("RGBA", (860, 860), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((80, 110, 780, 810), radius=44, fill=(0, 0, 0, 80))
        self.photo_shadow = sh.filter(ImageFilter.GaussianBlur(30))
        self.photo = photo
        self.tag = pill("NEU: Mehrere GPX & Kartenausschnitt", RED + (255,), WHITE, size=30)
        t1, t2 = font(800, 78), font(800, 78)
        self.title = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        d = ImageDraw.Draw(self.title)
        for i, (text, f, col) in enumerate((("Gestalte dein Relief", t1, INK), ("kostenlos in 3D.", t2, GREEN))):
            d.text(((W - f.getlength(text)) / 2, i * 92), text, font=f, fill=col)
        bf = font(700, 44)
        label = "Link in Bio "
        bw = int(bf.getlength(label)) + 70 + 64
        m = 50  # margin so the soft shadow is not clipped by the layer bounds
        self.button = Image.new("RGBA", (bw + 2 * m, 100 + 2 * m), (0, 0, 0, 0))
        shb = Image.new("RGBA", self.button.size, (0, 0, 0, 0))
        ImageDraw.Draw(shb).rounded_rectangle((m, m + 12, m + bw, m + 112), radius=50, fill=(20, 40, 10, 90))
        self.button = Image.alpha_composite(self.button, shb.filter(ImageFilter.GaussianBlur(12)))
        bd = ImageDraw.Draw(self.button)
        bd.rounded_rectangle((m, m, m + bw, m + 100), radius=50, fill=GREEN)
        bd.text((m + 35, m + 23), label, font=bf, fill=WHITE)
        emoji = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
        ImageDraw.Draw(emoji).text((0, 0), "\U0001F446", font=EMOJI, embedded_color=True)
        emoji = emoji.crop(emoji.getbbox()).resize((46, 48), Image.LANCZOS)
        self.button.alpha_composite(emoji, (m + 35 + int(bf.getlength(label)) + 4, m + 24))
        ff = font(500, 31)
        foot = "peak-memory.de · Handgefertigt in Baden-Württemberg"
        self.footer = Image.new("RGBA", (W, 60), (0, 0, 0, 0))
        ImageDraw.Draw(self.footer).text(((W - ff.getlength(foot)) / 2, 8), foot, font=ff, fill=MUTED)

    @staticmethod
    def _fade(img: Image.Image, a: float) -> Image.Image:
        if a >= 1:
            return img
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda v: int(v * a)))
        return img

    def draw(self, frame: Image.Image, t: float) -> None:
        local = t - self.start
        bg = Image.new("RGBA", (W, H), CREAM + (255,))
        frame.alpha_composite(self._fade(bg, ease_out(local / 0.3)))
        items = [
            (self.logo, (W - self.logo.width) // 2, 175, 0.1),
            (self.photo_shadow, (W - 860) // 2, 340, 0.2),
            (self.photo, (W - 700) // 2, 420, 0.2),
            (self.tag, (W - self.tag.width) // 2, 1165, 0.45),
            (self.title, 0, 1262, 0.55),
            (self.button, (W - self.button.width) // 2, 1434, 0.75),
            (self.footer, 0, 1630, 0.9),
        ]
        for img, x, y, delay in items:
            p = ease_out((local - delay) / 0.45)
            if p <= 0:
                continue
            frame.alpha_composite(self._fade(img, p), (x, int(y + (1 - p) * 40)))


# ---------------------------------------------------------------- timeline
# Scene timings (seconds, local to each phone scene) – shared by picture and sound.
GPX_START, GPX_END = 3.3, 8.2
AREA_START, AREA_END = 9.9, 15.6
DRAG_STARTS, DRAG_TRAVEL, DRAG_OVER, DROP = (0.68, 0.8, 0.92), 0.6, 1.4, 1.85
GPX_PREVIEW = 3.2
AREA_TAPS, AREA_FLIGHT, AREA_PREVIEW = (0.45, 3.6), (1.35, 3.15), 4.3


def gpx_scene(start: float, end: float) -> PhoneScene:
    m = load_meta("gpx")
    mk, n = m["marks"], m["frames"]
    keys = [
        (0.0, mk["cards"]), (0.2, mk["cards"]),
        (0.65, mk["dropzone"]), (DRAG_OVER - 0.02, mk["dragover"] - 1),
        (DRAG_OVER, mk["dragover"]), (DROP - 0.02, mk["uploaded"] - 1),
        (DROP, mk["uploaded"]), (2.5, mk["uploaded"] + 5),
        (GPX_PREVIEW, mk["preview"]), (end - start, n - 1),
    ]
    zooms = [(0.0, 1.0), (2.9, 1.0), (3.5, 1.17)]
    scene = PhoneScene("gpx", start, end, keys, [], zooms)
    names = ["etappe-1-sonthofen.gpx", "etappe-2-gruenten.gpx", "etappe-3-ziel.gpx"]
    scene.overlay = FileDrag(names, m["dropzone"], DRAG_STARTS, DRAG_TRAVEL, DROP)
    return scene


def area_scene(start: float, end: float) -> PhoneScene:
    m = load_meta("area")
    mk, n, taps = m["marks"], m["frames"], m["taps"]
    card_tap, confirm_tap = taps[0], taps[1]
    keys = [
        (0.0, 0), (AREA_TAPS[0], card_tap["frame"] - 1),
        (AREA_TAPS[0] + 0.05, card_tap["frame"]), (0.8, mk["map"] - 22),
        (AREA_FLIGHT[0], mk["map"]), (AREA_FLIGHT[1], mk["arrived"]),
        (3.45, confirm_tap["frame"]), (3.75, mk["confirm"]),
        (AREA_PREVIEW, mk["preview"]), (end - start, n - 1),
    ]
    tap_times = [(AREA_TAPS[0], card_tap["x"], card_tap["y"]), (AREA_TAPS[1], confirm_tap["x"], confirm_tap["y"])]
    zooms = [(0.0, 1.0), (0.95, 1.0), (1.45, 1.13), (4.2, 1.13), (4.7, 1.2)]
    return PhoneScene("area", start, end, keys, tap_times, zooms)


def L(*segments):
    return [(s[1:-1], True) if s.startswith("[") else (s, False) for s in segments]


def build():
    broll = [
        (0.0, 2.0, Clip("12321884_2160_3840_60fps.mp4", 2.0, focus=(0.5, 0.55), zoom=(1.12, 1.0))),
        (2.0, 2.7, Clip("16692280_1080_1920_60fps.mp4", 1.0, zoom=(1.0, 1.08))),
        (2.7, 3.3, Clip("15110783_1080_1920_30fps.mp4", 1.5, zoom=(1.06, 1.0))),
        (8.2, 9.9, Clip("16984638_1080_1920_60fps.mp4", 0.6, focus=(0.5, 0.35), zoom=(1.0, 1.1))),
    ]
    phones = [gpx_scene(GPX_START, GPX_END), area_scene(AREA_START, AREA_END)]
    compare = CompareScene(15.6, 17.45)
    end = EndCard(17.3)
    texts = [
        Headline(0.15, 2.0, [L("Neu im"), L("[Konfigurator]")]),
        Headline(2.0, 3.3, [L("Mehrere"), L("[Etappen?]")]),
        Headline(3.45, 6.4, [L("Lade mehrere"), L("[GPX-Dateien]", " hoch")]),
        Headline(6.4, 8.2, [L("Alle Etappen."), L("[Ein Relief.]")]),
        Headline(8.25, 9.9, [L("[Dein Lieblingsberg.]"), L("Ohne Route.")]),
        Headline(10.0, 13.85, [L("Wähle deinen"), L("[Kartenausschnitt]")]),
        Headline(13.85, 15.6, [L("Dein Berg."), L("[In 3D.]")]),
        Headline(15.65, 17.35, [L("Mit Route."), L("[Oder ohne.]")]),
    ]
    return broll, phones, compare, end, texts


def sound_events() -> list:
    from sfx import chime, click, mix, pop, swish, thump, whoosh  # noqa: F401  (mix used by caller)

    ev = []
    ev += [(0.0, whoosh(0.7, 120, 2200, rise=0.15, gain=0.45), 0.0), (0.02, thump(0.55), 0.0)]
    for t in (0.15, 2.0, 6.4, 8.25, 10.0, 13.85, 15.65):  # headline reveals
        ev.append((t + 0.04, pop(760, gain=0.22), 0.0))
        ev.append((t + 0.16, pop(980, gain=0.18), 0.0))
    ev.append((3.49, pop(760, gain=0.22), 0.0))
    ev.append((3.61, pop(980, gain=0.18), 0.0))
    for t in (1.97, 2.67, 8.17):  # b-roll cuts
        ev.append((t - 0.15, whoosh(0.4, 400, 6000, gain=0.42), 0.0))
    for t in (GPX_START, AREA_START):  # phone slides in
        ev.append((t - 0.12, whoosh(0.6, 200, 3000, rise=0.4, gain=0.48), 0.0))
    g = GPX_START
    for i, s in enumerate(DRAG_STARTS):
        ev.append((g + s, swish(0.32, 1 + 0.12 * i), 0.6 - 0.2 * i))
    ev.append((g + DRAG_OVER, click(0.18), 0.0))
    ev.append((g + DROP, thump(0.65), 0.0))
    for i in range(3):  # file list items appear
        ev.append((g + DROP + 0.12 + 0.08 * i, pop(1100 + 140 * i, 0.06, 0.16), 0.0))
    ev.append((g + GPX_PREVIEW, chime(gain=0.2), 0.0))
    a = AREA_START
    for tap in AREA_TAPS:
        ev.append((a + tap, click(0.35), 0.0))
    f0, f1 = AREA_FLIGHT
    ev.append((a + f0, whoosh(f1 - f0 + 0.2, 150, 2600, rise=0.5, gain=0.4), 0.0))
    ev.append((a + AREA_PREVIEW, chime((1174.7, 1568.0, 2349.3), gain=0.22), 0.0))
    ev.append((15.48, whoosh(0.5, 250, 4000, gain=0.42), 0.0))
    ev.append((15.62, swish(0.25, 0.9), -0.4))
    ev.append((16.05, thump(0.45), 0.3))
    ev.append((17.2, whoosh(0.6, 300, 5000, gain=0.4), 0.0))
    ev.append((18.05, chime((1046.5, 1318.5, 1568.0, 2093.0), spacing=0.09, duration=1.4, gain=0.26), 0.0))
    return ev


def render_frame(t: float, broll, phones, compare, end, texts) -> Image.Image:
    frame = None
    for start, stop, clip in broll:
        if start <= t < stop:
            local = t - start
            img = clip.frame(local, local / (stop - start))
            punch = 1 + 0.06 * (1 - ease_out(local / 0.25))
            frame = zoomed(img, punch)
            frame.alpha_composite(TOP_SHADE)
            break
    if frame is None:
        frame = GREEN_BG.copy()
    for phone in phones:
        if phone.start <= t < phone.end:
            phone.draw(frame, t)
    if compare.start <= t < compare.end:
        compare.draw(frame, t)
    if t >= end.start:
        end.draw(frame, t)
    for text in texts:
        text.draw(frame, t)
    return frame.convert("RGB")


def make_audio() -> np.ndarray:
    """Mix the SFX track and keep a copy as build/sfx.wav for listening/checking."""
    import wave

    from sfx import mix

    audio = mix(sound_events(), DURATION)
    with wave.open(str(BUILD / "sfx.wav"), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(48000)
        wav.writeframes(np.ascontiguousarray(audio.T).tobytes())
    return audio


def main() -> None:
    preview = "--preview" in sys.argv
    OUT.mkdir(exist_ok=True)
    if "--audio" in sys.argv:
        make_audio()
        return
    parts = build()
    if "--frames" in sys.argv:
        for value in sys.argv[sys.argv.index("--frames") + 1:]:
            render_frame(float(value), *parts).save(BUILD / f"frame-{value}.jpg", quality=90)
        return
    if preview:
        sheet_times = [i * 0.5 for i in range(int(DURATION * 2))]
        thumbs = []
        for i in range(TOTAL):
            t = i / FPS
            if any(abs(t - s) < 1e-6 for s in sheet_times):
                thumbs.append(render_frame(t, *parts).resize((270, 480)))
        cols = 10
        sheet = Image.new("RGB", (cols * 270, math.ceil(len(thumbs) / cols) * 480))
        for i, th in enumerate(thumbs):
            sheet.paste(th, ((i % cols) * 270, (i // cols) * 480))
        sheet.save(BUILD / "preview-sheet.jpg", quality=85)
        return

    container = av.open(str(OUTPUT), "w", options={"movflags": "+faststart"})
    v = container.add_stream("libx264", rate=FPS)
    v.width, v.height, v.pix_fmt = W, H, "yuv420p"
    v.options = {"crf": "17", "preset": "slow", "profile": "high", "level": "4.1"}
    a = container.add_stream("aac", rate=48000)
    a.layout = "stereo"
    for i in range(TOTAL):
        t = i / FPS
        img = render_frame(t, *parts)
        if abs(t - 18.8) < 1e-6:
            img.save(COVER, quality=92)
        for packet in v.encode(av.VideoFrame.from_image(img)):
            container.mux(packet)
        if i % 30 == 0:
            print(f"{t:5.1f}s", flush=True)
    for packet in v.encode():
        container.mux(packet)
    audio = make_audio()
    samples = audio.shape[1]
    chunk = 1024
    pts = 0
    while pts < samples:
        n = min(chunk, samples - pts)
        interleaved = np.ascontiguousarray(audio[:, pts:pts + n].T).reshape(1, -1)
        frame = av.AudioFrame.from_ndarray(interleaved, format="s16", layout="stereo")
        frame.sample_rate = 48000
        frame.pts = pts
        frame.time_base = Fraction(1, 48000)
        for packet in a.encode(frame):
            container.mux(packet)
        pts += n
    for packet in a.encode():
        container.mux(packet)
    container.close()
    print("wrote", OUTPUT)


if __name__ == "__main__":
    main()
