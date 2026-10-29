# Peak Memory – Leitfaden für Instagram Reels & Stories

Vorlage für künftige Reels. Referenzprojekte:

- [reel/](./reel/) – erstes Reel `peakmemory-reel.mp4` (Strava → GPX → 3D → Produkt)
- [reel-new_features_configurator/](./reel-new_features_configurator/) – Feature-Reel „Mehrere GPX & Kartenausschnitt“ (vollständig skriptbasiert, **beste Vorlage zum Kopieren**)

## KI-Setup

- **Modell:** Claude Opus 5.5 (KI-Assistent über Copilot SDK in VS Code), Autopilot-Modus
- **Bewährter Ablauf mit der KI:**
  1. Referenz-Reel + Material nennen, Ziel und Länge angeben
  2. KI erstellt Kontaktbögen von Referenz und B-Roll, schlägt Storyboard vor (Plan-Modus)
  3. Rückfragen klären (Musik ja/nein, Orte, GPX-Dateien, CTA)
  4. Aufnahme der Live-Website → Komposition → Einzelframes prüfen → finaler Render
- **Gute Prompt-Bausteine:** „gleicher Stil wie `marketing\reel\out\peakmemory-reel.mp4`“, „Szenen in `marketing\<neuer-ordner>` bauen und komplett rendern“, „B-Roll aus `marketing\video material`“, „Soundeffekte, Musik füge ich in Instagram hinzu“.

## Format & Technik

| Eigenschaft | Wert |
|---|---|
| Auflösung | 1080 × 1920 (9:16), ein Schnitt für Reel **und** Story |
| Länge | 15–20 s |
| Bildrate | 30 fps |
| Video | H.264 High, yuv420p, CRF 17, `+faststart` |
| Audio | AAC 48 kHz Stereo – nur Soundeffekte, Musik kommt in Instagram dazu |
| Safe Zones | Headline zwischen y ≈ 230–470 px; wichtige Inhalte zwischen y ≈ 260–1660 px (Profil-Raster schneidet auf 3:4); unten ≥ 250 px frei lassen (Caption/Buttons) |

## Visueller Stil

**Farben**

| Rolle | Wert |
|---|---|
| Hintergrund Waldgrün (radialer Verlauf, Zentrum unten) | innen `rgb(38,66,26)` → außen `rgb(7,12,7)`, leichtes Korn gegen Banding |
| Highlight-Rot (Textboxen, Badges) | `rgb(226,35,46)` |
| Text | Weiß mit weichem Schatten |
| Endkarte Creme | `rgb(247,246,240)` |
| Akzent-Grün (Button, „kostenlos in 3D.“) | `rgb(46,82,24)` |
| Neben-Text | `rgb(96,96,90)` |

**Typografie:** Inter (Website-Font `fonts/InterVariable.woff2`, als statische TTFs via `make_fonts.py`)

- Headline: Inter 800, 84 px, 2 Zeilen, zentriert, Zeilenabstand 104 px
- Hervorhebung: einzelne Wörter in roter abgerundeter Box (Radius 14), z. B. „Neu im / **[Konfigurator]**“, „**[Dein Lieblingsberg.]** / Ohne Route.“
- Texte kurz und rhythmisch: Frage → Antwort, z. B. „Mehrere **Etappen?**“ → „Alle Etappen. **Ein Relief.**“
- Emoji (👆) über Segoe UI Emoji in Farbe

**Animationen**

- Text: zeilenweise Reveal (0,32 s, 0,12 s versetzt) aus Blur + 26 px von unten; Ausblenden per Blur in 0,2 s
- B-Roll: harter Schnitt mit kurzem „Punch“ (Zoom 1,06 → 1,0 in 0,25 s), langsamer Push-in/-out über die Szene, oben dunkler Verlauf für Lesbarkeit
- Smartphone: fährt in 0,55 s von unten ein (Ease-out), schwebt leicht, Push-in bis 1,2× an Schlüsselmomenten (Anker oben, damit die Headline frei bleibt)
- Taps: weißer Touch-Kreis mit grauem Ring, Ripple 0,32 s
- Endkarte: Creme-Blende, Elemente gestaffelt von unten (Logo → Foto → Tag → Titel → Button → Footer)

**Smartphone-Mockup:** iPhone-artiger Rahmen, Dynamic Island, Statusleiste „9:41“, Safari-Pille „🔒 peak-memory.de“ unten. Inhalt = **echte Aufnahmen der Live-Website** (kein Mock-up).

**Szenenmuster (bewährt, ~20 s)**

1. Hook-B-Roll mit Headline (0–2 s)
2. Schnelle B-Roll-Cuts mit Frage (≈1,3 s)
3. Phone-Szene Feature 1 (≈5 s)
4. B-Roll-Übergang (≈1,7 s)
5. Phone-Szene Feature 2 (≈5,5 s)
6. Produktvergleich / Produktbild (≈1,8 s)
7. Creme-Endkarte: Logo, Produktfoto, roter „NEU“-Tag, „Gestalte dein Relief / **kostenlos in 3D.**“, grüner Button „Link in Bio 👆“, Footer „peak-memory.de · Handgefertigt in Baden-Württemberg“

**Cover:** Endkarten-Frame (`cover.jpg`) plus ein eigenes Feature-Cover im Stil von `reel/out/cover-alt.jpg`: grüner Höhenlinien-Hintergrund, Pille oben, große Headline mit roter Box, gedrehtes Produktfoto mit hellem Rand, dunkle Info-Karten, runder Badge, weißes Logo unten (`make_cover.py`).

## Soundeffekte

Prozedural erzeugt in [`sfx.py`](./reel-new_features_configurator/build/sfx.py) (numpy + scipy), keine Lizenzfragen. Mix: Spitze ≈ −2,5 dBFS, RMS ≈ −23 dB (Platz für Instagram-Musik).

| Ereignis | Effekt |
|---|---|
| Start | tiefer Thump + Whoosh |
| Headline-Reveal | zwei kurze Pops (760/980 Hz) |
| B-Roll-Schnitt, Phone fährt ein, Szenenwechsel | Whoosh (gefiltertes Rauschen, Sweep) |
| Dateien fliegen ein | Swish je Datei, leicht gepannt |
| Dragover / Tap | kurzer Klick |
| Drop / Produkt erscheint | tiefer Thump |
| Listeneinträge | helle Mini-Pops |
| Kartenflug | langer, luftiger Whoosh |
| 3D-Vorschau fertig | Glocken-Arpeggio (Chime) |
| Endkarte / Button | 4-Ton-Chime (C–E–G–C) |

Kontrolle ohne Video: `python render.py --audio` → `build/sfx.wav`.

## Website-Aufnahmen (Playwright)

[`capture.js`](./reel-new_features_configurator/build/capture.js) + [`site.js`](./reel-new_features_configurator/build/site.js):

- Live-Site `https://peak-memory.de/configurator.html`, iPhone-Viewport 390 × 844 @3x, `reducedMotion: reduce`, SwiftShader für WebGL
- Bundles werden beim Laden gepatcht: `window.__map` (Leaflet) und `window.__controls` (Three.js OrbitControls) → ruckelfreie Kartenflüge (`setView` pro Frame, wartet auf geladene Kacheln) und Orbit-Drehungen
- Scrollen in Schritten mit Screenshot pro Schritt (keine Full-Page-Screenshots – Sticky-Header stört)
- Eingaben **ohne Fokus** setzen (z. B. Gravur per `evaluate` + `input`-Event), sonst springt die Seite
- Echtes Drag & Drop per `DataTransfer` + `DragEvent` (Dropzone zeigt echten Dragover-Zustand)
- Marken (`marks`), Taps und Element-Boxen landen in `meta.json` und steuern Timing und Overlays im Renderer
- Gravur sinnvoll setzen („Allgäu in 3 Etappen“, „Matterhorn / 4.478 m“)

## Quellvideos – `marketing/video material`

| Datei | Format | Länge | Inhalt | Eignung | Genutzt |
|---|---|---|---|---|---|
| `10672015-hd_1920_1080_30fps.mp4` | 1920×1080 quer, 30 fps | 1,6 s | Person mit ausgebreiteten Armen auf Fels, Froschperspektive, blauer Himmel | Freiheit/Gipfelmoment, nur mit Crop | – |
| `12239218_2160_3840_60fps.mp4` | 4K hoch, 60 fps | 5,5 s | Wanderer mit Rucksack im Nadelwald | Einstieg „Wandern“ | – |
| `12321884_2160_3840_60fps.mp4` | 4K hoch, 60 fps | 6,9 s | Wanderer breitet auf Gipfel die Arme aus, dunstiges Bergpanorama | **Hook**, sehr stark | Reel 1 (2,2–3,7 s), Feature-Reel (ab 2,0 s) |
| `12836462_1080_1920_30fps.mp4` | 1080×1920, 30 fps | 31,6 s | Kletterer am Felsgrat/Klettersteig mit Schnee | Alpin/Klettern | – |
| `13494091_2160_3840_25fps.mp4` | 4K hoch, 25 fps | 16,2 s | Trailrunner im grünen Frühlingswald (Mütze) | Laufen/Trail | – |
| `13611904_2160_3840_60fps.mp4` | 4K hoch, 60 fps | 12,6 s | Drohne top-down: Trailrunner auf Erdpfad | Übergang, „Route von oben“ | Storyboard-Entwurf (6,0–7,5 s) |
| `14322896_2160_3840_30fps.mp4` | 4K hoch, 30 fps | 12,2 s | Drohne: Forststraße durch Nadelwald, Berge | Landschaft/Karte | – |
| `15059932_1080_1920_30fps.mp4` | 1080×1920, 30 fps | 13,4 s | Motorrad-POV, Bergstraße, Gebetsfahnen | Motorrad-/Pass-Touren | – |
| `15110783_1080_1920_30fps.mp4` | 1080×1920, 30 fps | 14,0 s | Rennradfahrer auf Dolomitenstraße, Almwiese | Rad/Etappen | Feature-Reel (ab 1,5 s) |
| `15508753_2160_3840_60fps.mp4` | 4K hoch, 60 fps | 5,1 s | Trailrunner im kahlen Herbstwald | Laufen | – |
| `16692280_1080_1920_60fps.mp4` | 1080×1920, 60 fps | 8,6 s | Wanderer queren Gletscherbach, Hochgebirge | Etappen/Abenteuer | Feature-Reel (ab 1,0 s) |
| `16984638_1080_1920_60fps.mp4` | 1080×1920, 60 fps | 6,7 s | Wanderer mit Stöcken auf Bergweg, markanter Gipfel im Hintergrund | „Dein Lieblingsberg“ | Feature-Reel (ab 0,6 s) |
| `5677385-uhd_3840_2160_24fps.mp4` | 4K quer, 24 fps | 27,3 s | Trailrunner auf Holzbrücke im Wald | nur mit 9:16-Crop | – |
| `5677450-uhd_3840_2160_24fps.mp4` | 4K quer, 24 fps | 16,5 s | Nahaufnahme Trailschuhe auf Waldpfad | Detail/Energie, Crop | – |

Weiteres Eigenmaterial: `reel/in/sequences.mp4` (Produkt-Sequenzen), `reel/in/WhatsApp Video 2026-10-13 at 13.27.59.mp4` und `… 13.28.36.mp4` (Event-/Zieleinlauf-Clips).

Hinweise: 4K-Clips beim Lesen direkt auf 1080 skalieren (OpenCV, sequenziell lesen statt springen). Quer-Clips nur mit Fokuspunkt croppen.

## Produktbilder – `images/`

Hinweis: `images/` wird komplett in die Website deployt – reine Marketing-Bilder deshalb ins jeweilige `build/img` des Reels kopieren statt dort einchecken.

| Datei | Inhalt | Einsatz |
|---|---|---|
| `main.png` | Relief mit Route in der Hand, Sonnenuntergang | Endkarte (Feature-Reel) |
| `Designer (41).png` | Zwei Reliefs auf grünem Grund: mit Route / Drei Zinnen ohne Route | Feature-Cover (Kopie in `reel-new_features_configurator/build/img/designer-41.png`) |
| `GPX_Route.png`, `Kartenausschnitt.png` | Freisteller (transparent): mit / ohne Route | Vergleichsszene |
| `XXL_Fuji.jpeg`, `XXL_E5.jpeg` | Große Reliefs ohne Route | „ohne Route“-Beispiele |
| `insights1–7.jpeg`, `APM*.jpeg`, `ABM*.jpeg` | Produkt-/Eventfotos | B-Roll-Ersatz, Endkarte |
| `compact.jpeg`, `custom.jpeg`, `rahmen*.jpeg` | Produktvarianten | Varianten-Szenen |
| `reel/build/img/logo.png` | Logo dunkel, transparent (für Weiß einfärben) | Endkarte, Cover |

## Workflow für ein neues Reel

```powershell
# 1. Vorlage kopieren
Copy-Item marketing\reel-new_features_configurator\build marketing\<neues-reel>\build -Recurse -Exclude capture
# 2. Inhalte vorbereiten (in build\)
python make_fonts.py            # einmalig: Inter-TTFs (benötigt fonttools + brotli)
python make_gpx.py              # optional: GPX-Testdateien
node capture.js                 # Live-Website aufnehmen (gpx | area einzeln möglich)
# 3. Szenen/Texte/Timings in render.py anpassen, iterieren:
python render.py --preview      # Kontaktbogen alle 0,5 s → build\preview-sheet.jpg
python render.py --frames 5.0 12.5   # Einzelbilder in voller Auflösung
python render.py --audio        # nur SFX-Spur
# 4. Final
python render.py                # out\*.mp4 + out\cover.jpg
python make_cover.py            # out\cover-alt.jpg
```

Python-Pakete: `av`, `opencv-python`, `pillow`, `numpy`, `scipy`, `fonttools`, `brotli`. Node: Repo-Abhängigkeiten inkl. Playwright-Chromium.

**Qualitäts-Check vor dem Posten:** Kontaktbogen ansehen, Einzelframes prüfen (Lesbarkeit, Safe Zones, Tap-Positionen, keine abgeschnittenen Elemente), Dauer/Frames/Audio-Stream verifizieren, Endkarte-Button-Schatten etc.

## Caption-Vorlage

Aufbau: Hook-Zeile mit „NEU“ → Nutzen in 2–3 kurzen Absätzen → CTA „Link in Bio“ → Herkunft → Hashtags (8–12).

Beispiel (Feature-Reel):

```text
NEU im Konfigurator 🏔️

Mehrtägige Tour, Hüttentrek oder Triathlon? Lade jetzt bis zu 10 GPX-Dateien gleichzeitig hoch – alle Etappen landen gemeinsam auf einem Relief.

Und du hast gar keine GPX-Datei? Kein Problem: Wähle deinen Lieblingsberg einfach als Kartenausschnitt – ganz ohne Route. 🗺️ → 3D

Gestalte dein Relief kostenlos in 3D – ohne Anmeldung, direkt im Browser. 👉 Link in Bio

Handgefertigt aus Eiche in Baden-Württemberg 🌲

#peakmemory #3drelief #gpx #wandern #bergliebe #alpen #trailrunning #etappenwanderung #matterhorn #geschenkidee #outdoor #hiking
```
