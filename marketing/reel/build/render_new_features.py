from __future__ import annotations

import math
from fractions import Fraction
from pathlib import Path

import av
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "marketing" / "video material"
SOUNDTRACK = ROOT / "marketing" / "reel" / "build" / "sfx.wav"
OUTPUT = ROOT / "marketing" / "reel" / "out" / "new-features-reel.mp4"
WIDTH, HEIGHT, FPS = 1080, 1920, 30
CREAM = (246, 245, 236, 255)
FOREST = (15, 30, 17, 255)
FOREST_LIGHT = (35, 57, 32, 255)
RED = (226, 31, 48, 255)
WHITE = (255, 255, 252, 255)
MUTED = (190, 200, 184, 255)
BODY = (20, 25, 20, 255)
FONT_REGULAR = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 42)
FONT_SMALL = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 30)
FONT_BOLD = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 52)
FONT_TITLE = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 92)
FONT_HERO = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 112)


class ClipSegment:
    def __init__(self, filename: str, start: float, end: float):
        self.path = SOURCE / filename
        self.start = start
        self.end = end
        self.capture = cv2.VideoCapture(str(self.path))
        if not self.capture.isOpened():
            raise RuntimeError(f"Could not open source video: {self.path}")
        self.source_fps = self.capture.get(cv2.CAP_PROP_FPS)
        self.start_frame = round(start * self.source_fps)
        self.end_frame = round(end * self.source_fps)
        self.next_frame = self.start_frame
        self.last_image: Image.Image | None = None
        self.capture.set(cv2.CAP_PROP_POS_FRAMES, self.start_frame)
        if self.end_frame <= self.start_frame:
            raise ValueError(f"Empty source range in {self.path.name}: {start}-{end}")

    def frame(self, elapsed: float) -> Image.Image:
        target = min(
            self.end_frame - 1,
            self.start_frame + round(max(0, elapsed) * self.source_fps),
        )
        while self.next_frame <= target:
            ok, bgr = self.capture.read()
            if not ok:
                raise RuntimeError(
                    f"Could not decode frame {self.next_frame} from {self.path}"
                )
            bgr = cv2.resize(bgr, (WIDTH, HEIGHT), interpolation=cv2.INTER_AREA)
            self.last_image = Image.fromarray(
                cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            ).convert("RGBA")
            self.next_frame += 1
        if self.last_image is None:
            raise RuntimeError(f"No frames decoded from {self.path}")
        return self.last_image.copy()

    def close(self) -> None:
        self.capture.release()


def ease_out(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 3


def measure(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
    x_center: int = WIDTH // 2,
) -> None:
    box = draw.multiline_textbbox((0, 0), text, font=font, spacing=12, align="center")
    draw.multiline_text(
        (x_center - (box[2] - box[0]) // 2, y),
        text,
        font=font,
        fill=fill,
        spacing=12,
        align="center",
    )


def capsule(
    draw: ImageDraw.ImageDraw,
    text: str,
    center_x: int,
    y: int,
    font: ImageFont.FreeTypeFont = FONT_SMALL,
    fill: tuple[int, ...] = RED,
    text_fill: tuple[int, ...] = WHITE,
    pad_x: int = 26,
    pad_y: int = 12,
) -> tuple[int, int, int, int]:
    text_w, text_h = measure(draw, text, font)
    bounds = (
        center_x - text_w // 2 - pad_x,
        y,
        center_x + (text_w + 1) // 2 + pad_x,
        y + text_h + 2 * pad_y,
    )
    draw.rounded_rectangle(bounds, radius=18, fill=fill)
    draw.text(
        (center_x - text_w // 2, y + pad_y - 4),
        text,
        font=font,
        fill=text_fill,
    )
    return bounds


def draw_topo(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    # Soft, nested ridgelines echo the original reel's dark topo background.
    for group, (cx, cy, rx, ry) in enumerate(
        ((160, 420, 470, 560), (1040, 870, 470, 630), (360, 1570, 610, 380))
    ):
        for level in range(13):
            scale = 1 - level * 0.058
            points = []
            for step in range(145):
                angle = math.tau * step / 144
                irregular = (
                    1
                    + 0.09 * math.sin(angle * (3 + group % 2) + group)
                    + 0.045 * math.sin(angle * 7 + level * 0.23)
                )
                points.append(
                    (
                        round(cx + rx * scale * irregular * math.cos(angle)),
                        round(cy + ry * scale * irregular * math.sin(angle)),
                    )
                )
            shade = 46 + group * 4
            draw.line(points, fill=(93, shade, 53, 78), width=2, joint="curve")


def topo_background() -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), FOREST)
    draw_topo(image)
    return image


def scenic_background(frame: Image.Image) -> Image.Image:
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (5, 14, 7, 75))
    frame.alpha_composite(tint)
    gradient = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)
    draw.rectangle((0, 0, WIDTH, 510), fill=(0, 0, 0, 72))
    draw.rectangle((0, 1480, WIDTH, HEIGHT), fill=(0, 0, 0, 75))
    frame.alpha_composite(gradient)
    return frame


def rounded_card(
    image: Image.Image,
    bounds: tuple[int, int, int, int],
    radius: int = 42,
    fill: tuple[int, ...] = WHITE,
    outline: tuple[int, ...] = (255, 255, 255, 220),
    width: int = 3,
) -> None:
    ImageDraw.Draw(image).rounded_rectangle(
        bounds, radius=radius, fill=fill, outline=outline, width=width
    )


def compose_title(
    image: Image.Image,
    first: str,
    highlight: str,
    subtitle: str,
    top: int = 110,
) -> None:
    draw = ImageDraw.Draw(image)
    centered(draw, first, top, FONT_TITLE, WHITE)
    capsule(draw, highlight, WIDTH // 2, top + 110, FONT_BOLD, pad_x=30, pad_y=11)
    centered(draw, subtitle, top + 206, FONT_REGULAR, WHITE)


def draw_phone_shell(image: Image.Image, top: int, reveal: float) -> tuple[int, int, int, int]:
    progress = ease_out(reveal / 0.45)
    phone_w = 842
    phone_h = 1190
    x = (WIDTH - phone_w) // 2
    y = int(top + (1 - progress) * 90)
    rounded_card(
        image,
        (x, y, x + phone_w, y + phone_h),
        radius=70,
        fill=(10, 12, 11, 255),
        outline=(255, 255, 255, 210),
        width=4,
    )
    inner = (x + 20, y + 20, x + phone_w - 20, y + phone_h - 20)
    rounded_card(
        image,
        inner,
        radius=52,
        fill=(248, 248, 243, 255),
        outline=(248, 248, 243, 255),
        width=1,
    )
    # A quiet status bar and site header make the graphic read like the
    # actual configurator shown on a phone in the reference reel.
    draw = ImageDraw.Draw(image)
    draw.text((x + 58, y + 45), "9:41", font=FONT_SMALL, fill=BODY)
    draw.rounded_rectangle(
        (x + phone_w // 2 - 70, y + 38, x + phone_w // 2 + 70, y + 72),
        radius=18,
        fill=(10, 12, 11, 255),
    )
    draw.text((x + 56, y + 102), "PEAK MEMORY", font=FONT_BOLD, fill=BODY)
    menu_x, menu_y = x + phone_w - 103, y + 125
    for offset in (0, 12, 24):
        draw.line(
            (menu_x, menu_y + offset, menu_x + 42, menu_y + offset),
            fill=BODY,
            width=4,
        )
    draw.line(
        (x + 40, y + 174, x + phone_w - 40, y + 174),
        fill=(215, 216, 207, 255),
        width=2,
    )
    return x, y, phone_w, phone_h


def draw_gpx_screen(
    image: Image.Image,
    top: int,
    elapsed: float,
    route_relief: Image.Image,
) -> None:
    x, y, phone_w, _ = draw_phone_shell(image, top, elapsed)
    draw = ImageDraw.Draw(image)
    left = x + 64
    draw.text((left, y + 206), "KONFIGURATOR", font=FONT_SMALL, fill=(81, 93, 79, 255))
    draw.text((left, y + 250), "Deine Routen", font=FONT_BOLD, fill=BODY)
    draw.text(
        (left, y + 322),
        "Lade eine oder mehrere GPX-Dateien hoch.",
        font=FONT_SMALL,
        fill=(78, 82, 77, 255),
    )
    draw.rounded_rectangle(
        (left, y + 380, x + phone_w - 64, y + 458),
        radius=20,
        fill=RED,
    )
    centered(draw, "+  GPX-Dateien auswählen", y + 397, FONT_SMALL, WHITE)

    names = ("Alpenrunde.gpx", "Etappe-zwei.gpx", "Lieblingstour.gpx")
    row_y = y + 486
    shown = min(3, max(0, int(elapsed * 1.0) + 1))
    for index, name in enumerate(names[:shown]):
        bounds = (left, row_y + index * 94, x + phone_w - 64, row_y + index * 94 + 78)
        draw.rounded_rectangle(bounds, radius=17, fill=(255, 255, 252, 255))
        draw.rounded_rectangle(
            (bounds[0] + 15, bounds[1] + 17, bounds[0] + 55, bounds[1] + 57),
            radius=12,
            fill=(225, 238, 219, 255),
        )
        draw.text((bounds[0] + 75, bounds[1] + 17), name, font=FONT_SMALL, fill=BODY)
        tick_x, tick_y = bounds[2] - 47, bounds[1] + 38
        draw.line(
            (tick_x - 8, tick_y, tick_x - 1, tick_y + 7, tick_x + 12, tick_y - 9),
            fill=(41, 106, 52, 255),
            width=5,
        )
    preview_y = y + 800
    draw.text((left, preview_y), "DEINE 3D-VORSCHAU", font=FONT_SMALL, fill=(81, 93, 79, 255))
    relief = route_relief.resize((565, 305), Image.Resampling.LANCZOS)
    image.alpha_composite(relief, (x + (phone_w - relief.width) // 2, preview_y + 45))


def draw_map_ui(image: Image.Image, bounds: tuple[int, int, int, int], elapsed: float) -> None:
    x1, y1, x2, y2 = bounds
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(bounds, radius=20, fill=(229, 232, 214, 255))
    # Stylized streets and terrain lines inside the selected map area.
    draw.ellipse(
        (x1 + 35, y1 + 40, x2 - 50, y2 - 30),
        fill=(209, 224, 193, 255),
    )
    draw.ellipse(
        (x1 + 220, y1 + 160, x2 + 40, y2 + 150),
        fill=(194, 215, 180, 255),
    )
    draw.line(
        [
            (x1 - 20, y1 + 180),
            (x1 + 100, y1 + 130),
            (x1 + 250, y1 + 205),
            (x1 + 380, y1 + 95),
            (x2 + 30, y1 + 140),
        ],
        fill=(252, 251, 237, 255),
        width=28,
    )
    draw.line(
        [
            (x1 + 150, y1 - 15),
            (x1 + 195, y1 + 100),
            (x1 + 120, y1 + 235),
            (x1 + 230, y2 + 15),
        ],
        fill=(196, 211, 222, 255),
        width=16,
    )
    for offset in range(5):
        points = []
        for step in range(65):
            px = x1 + step * (x2 - x1) / 64
            py = y1 + 55 + offset * 40 + 19 * math.sin(step / 8 + offset)
            points.append((round(px), round(py)))
        draw.line(points, fill=(130, 157, 111, 130), width=3)

    move = round(14 * math.sin(min(1.0, elapsed / 3.8) * math.pi))
    inset_x, inset_y = x1 + 98 + move, y1 + 50
    selection = (inset_x, inset_y, inset_x + 396, inset_y + 396)
    draw.rectangle(selection, outline=RED, width=8)
    for cx, cy in (
        (selection[0], selection[1]),
        (selection[2], selection[1]),
        (selection[0], selection[3]),
        (selection[2], selection[3]),
    ):
        draw.rounded_rectangle(
            (cx - 15, cy - 15, cx + 15, cy + 15),
            radius=6,
            fill=WHITE,
            outline=RED,
            width=5,
        )


def draw_map_screen(
    image: Image.Image,
    top: int,
    elapsed: float,
    area_relief: Image.Image,
) -> None:
    x, y, phone_w, _ = draw_phone_shell(image, top, elapsed)
    draw = ImageDraw.Draw(image)
    left = x + 64
    draw.text((left, y + 206), "KONFIGURATOR", font=FONT_SMALL, fill=(81, 93, 79, 255))
    draw.text((left, y + 250), "Kartenausschnitt", font=FONT_BOLD, fill=BODY)
    draw.text(
        (left, y + 322),
        "Wähle deine Fläche – ganz ohne GPX.",
        font=FONT_SMALL,
        fill=(78, 82, 77, 255),
    )
    map_bounds = (left, y + 385, x + phone_w - 64, y + 790)
    draw_map_ui(image, map_bounds, elapsed)
    draw.rounded_rectangle(
        (left, y + 814, x + phone_w - 64, y + 883),
        radius=18,
        fill=RED,
    )
    centered(draw, "Diesen Ausschnitt verwenden", y + 832, FONT_SMALL, WHITE)
    draw.text((left, y + 918), "VORSCHAU OHNE ROUTE", font=FONT_SMALL, fill=(81, 93, 79, 255))
    preview = area_relief.resize((390, 220), Image.Resampling.LANCZOS)
    image.alpha_composite(preview, (x + (phone_w - preview.width) // 2, y + 956))


def add_reveal_phone(
    frame: Image.Image,
    draw_phone,
    elapsed: float,
    top: int = 570,
) -> Image.Image:
    graphic = frame.copy()
    compose_title(graphic, "Lade mehrere", "GPX-Dateien", "Gemeinsam auf einem Relief")
    draw_phone(graphic, top, elapsed)
    return graphic


def render_opening(frame: Image.Image, elapsed: float) -> Image.Image:
    frame = scenic_background(frame)
    draw = ImageDraw.Draw(frame)
    if elapsed < 0.85:
        centered(draw, "NEU IM", 170, FONT_TITLE, WHITE)
        capsule(draw, "KONFIGURATOR", WIDTH // 2, 285, FONT_BOLD)
    else:
        centered(draw, "Deine Route.", 180, FONT_TITLE, WHITE)
        capsule(draw, "Deine Wahl.", WIDTH // 2, 295, FONT_TITLE, pad_x=35, pad_y=10)
    centered(draw, "Zwei neue Wege zu deinem Relief.", 485, FONT_REGULAR, WHITE)
    return frame


def render_scenic_transition(frame: Image.Image, elapsed: float) -> Image.Image:
    frame = scenic_background(frame)
    draw = ImageDraw.Draw(frame)
    centered(draw, "Oder ganz ohne", 260, FONT_TITLE, WHITE)
    capsule(draw, "GPX-Datei?", WIDTH // 2, 375, FONT_TITLE, pad_x=35, pad_y=10)
    return frame


def render_end_card(
    route_relief: Image.Image, area_relief: Image.Image, logo: Image.Image, elapsed: float
) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(image)
    logo = logo.resize((168, 168), Image.Resampling.LANCZOS)
    image.alpha_composite(logo, (WIDTH // 2 - logo.width // 2, 70))
    centered(draw, "Zwei neue Wege", 290, FONT_TITLE, BODY)
    capsule(draw, "zu deinem Relief", WIDTH // 2, 405, FONT_BOLD, pad_x=28, pad_y=10)

    card_y, card_w, card_h = 615, 424, 600
    for x, asset, title in (
        (84, route_relief, "MIT GPX-ROUTEN"),
        (572, area_relief, "KARTENAUSSCHNITT"),
    ):
        rounded_card(
            image,
            (x, card_y, x + card_w, card_y + card_h),
            radius=32,
            fill=WHITE,
            outline=(255, 255, 255, 255),
            width=2,
        )
        visual = asset.resize((card_w - 28, card_h - 95), Image.Resampling.LANCZOS)
        image.alpha_composite(visual, (x + 14, card_y + 14))
        label = ImageDraw.Draw(image)
        text_w, _ = measure(label, title, FONT_SMALL)
        label.text(
            (x + (card_w - text_w) // 2, card_y + card_h - 65),
            title,
            font=FONT_SMALL,
            fill=BODY,
        )

    centered(draw, "peak-memory.de", 1325, FONT_TITLE, BODY)
    button_bounds = (180, 1485, 900, 1620)
    draw.rounded_rectangle(button_bounds, radius=28, fill=FOREST_LIGHT)
    centered(draw, "JETZT AUSPROBIEREN", 1520, FONT_BOLD, WHITE)
    centered(draw, "Handgefertigte 3D-Reliefs. Persönlich für deine Route.", 1715, FONT_SMALL, BODY)
    return image


def build_segments() -> list[tuple[float, float, ClipSegment]]:
    specs = [
        (0.0, 1.5, "12321884_2160_3840_60fps.mp4", 2.2, 3.7),
        (6.0, 7.5, "13611904_2160_3840_60fps.mp4", 6.0, 7.5),
    ]
    return [
        (timeline_start, timeline_end, ClipSegment(filename, source_start, source_end))
        for timeline_start, timeline_end, filename, source_start, source_end in specs
    ]


def encode_audio(stream: av.audio.stream.AudioStream) -> list[av.Packet]:
    with av.open(str(SOUNDTRACK)) as sound:
        input_stream = sound.streams.audio[0]
        pieces = [frame.to_ndarray() for frame in sound.decode(input_stream)]
        interleaved = np.concatenate(pieces, axis=1).reshape(-1, 2)

    sample_count = 15 * 48_000
    samples = interleaved[:sample_count].astype(np.float32) / 32768.0
    fade_samples = 24_000
    samples[-fade_samples:] *= np.linspace(1.0, 0.0, fade_samples, dtype=np.float32)[:, None]
    frame_size = 1024
    packets: list[av.Packet] = []
    for start in range(0, sample_count, frame_size):
        block = samples[start : start + frame_size]
        planar = np.ascontiguousarray(block.T)
        audio_frame = av.AudioFrame.from_ndarray(planar, format="fltp", layout="stereo")
        audio_frame.sample_rate = 48_000
        audio_frame.pts = start
        audio_frame.time_base = Fraction(1, 48_000)
        for packet in stream.encode(audio_frame):
            packets.append(packet)
    packets.extend(stream.encode())
    return packets


def main() -> None:
    route_relief = Image.open(ROOT / "images" / "GPX_Route.png").convert("RGBA")
    area_relief = Image.open(ROOT / "images" / "Kartenausschnitt.png").convert("RGBA")
    logo = Image.open(ROOT / "images" / "logo_simple.png").convert("RGBA")
    gpx_background = topo_background()
    map_background = topo_background()
    segments = build_segments()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    container = av.open(str(OUTPUT), mode="w", options={"movflags": "+faststart"})
    video_stream = container.add_stream("libx264", rate=FPS)
    video_stream.width = WIDTH
    video_stream.height = HEIGHT
    video_stream.pix_fmt = "yuv420p"
    video_stream.bit_rate = 7_000_000
    video_stream.options = {"preset": "fast", "crf": "18"}
    audio_stream = container.add_stream("aac", rate=48_000)
    audio_stream.layout = "stereo"
    audio_packets = encode_audio(audio_stream)
    encoded_packets: list[av.Packet] = []

    def scenic_at(time: float) -> ClipSegment | None:
        for start, end, clip in segments:
            if start <= time < end:
                return clip
        return None

    try:
        total_frames = 15 * FPS
        for index in range(total_frames):
            time = index / FPS
            scene = scenic_at(time)
            if scene is not None:
                if time < 1.5:
                    frame = render_opening(scene.frame(time), time)
                else:
                    frame = render_scenic_transition(
                        scene.frame(time - 6.0), time - 6.0
                    )
            elif time < 6.0:
                local = time - 1.5
                frame = add_reveal_phone(
                    gpx_background,
                    lambda canvas, top, elapsed: draw_gpx_screen(
                        canvas, top, elapsed, route_relief
                    ),
                    local,
                )
            elif time < 7.5:
                frame = render_scenic_transition(
                    scene.frame(time - 6.0) if scene else gpx_background.copy(),
                    time - 6.0,
                )
            elif time < 12.5:
                local = time - 7.5
                frame = map_background.copy()
                compose_title(frame, "Wähle deinen", "Kartenausschnitt", "Auch ohne GPX-Datei")
                draw_map_screen(frame, 570, local, area_relief)
            else:
                frame = render_end_card(route_relief, area_relief, logo, time - 12.5)

            video_frame = av.VideoFrame.from_ndarray(
                np.asarray(frame.convert("RGB")), format="rgb24"
            )
            video_frame.pts = index
            for packet in video_stream.encode(video_frame):
                encoded_packets.append(packet)
            if index % FPS == 0:
                print(f"Rendered {index // FPS:02d}/15 seconds")

        for packet in video_stream.encode():
            encoded_packets.append(packet)
        all_packets = encoded_packets + audio_packets
        all_packets.sort(
            key=lambda packet: (
                float((packet.dts if packet.dts is not None else packet.pts or 0) * packet.time_base),
                packet.stream.index,
            )
        )
        for packet in all_packets:
            container.mux(packet)
    finally:
        container.close()
        for _, _, clip in segments:
            clip.close()

    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
