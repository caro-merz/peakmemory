"""Split the website's sample route into three stage files for the multi-GPX demo."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "src" / "client" / "sample.gpx"
OUT = Path(__file__).resolve().parent / "gpx"
STAGES = ["etappe-1-sonthofen.gpx", "etappe-2-gruenten.gpx", "etappe-3-ziel.gpx"]

text = SOURCE.read_text(encoding="utf-8")
points = re.findall(r"<trkpt .*?</trkpt>", text, flags=re.S)
OUT.mkdir(exist_ok=True)
size = len(points) // len(STAGES)
for index, name in enumerate(STAGES):
    start = index * size
    end = len(points) if index == len(STAGES) - 1 else (index + 1) * size + 1
    title = f"Etappe {index + 1}"
    body = "\n".join(points[start:end])
    (OUT / name).write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Peak Memory Reel" xmlns="http://www.topografix.com/GPX/1/1">\n'
        f"<metadata><name>{title}</name></metadata>\n"
        f"<trk><name>{title}</name><trkseg>\n{body}\n</trkseg></trk>\n</gpx>\n",
        encoding="utf-8",
    )
    print(name, end - start, "points")
