"""Instantiate static TTF weights from the site's Inter variable font for PIL."""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "fonts"
OUT.mkdir(exist_ok=True)
for weight in (500, 600, 700, 800):
    font = TTFont(ROOT / "fonts" / "InterVariable.woff2")
    static = instantiateVariableFont(font, {"wght": weight, "opsz": 32} if "opsz" in [a.axisTag for a in font["fvar"].axes] else {"wght": weight})
    static.flavor = None
    static.save(OUT / f"Inter-{weight}.ttf")
    print("Inter", weight)
