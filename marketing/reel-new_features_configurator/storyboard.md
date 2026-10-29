# Neue Konfigurator-Features – Instagram Reel / Story

- **Export:** [peakmemory-reel-configurator.mp4](./out/peakmemory-reel-configurator.mp4) – 1080 × 1920, 30 fps, 20 s, H.264 + AAC mit Soundeffekten (Musik wird in Instagram ergänzt)
- **Cover:** [cover.jpg](./out/cover.jpg) (Endkarte) und [cover-alt.jpg](./out/cover-alt.jpg) – Feature-Cover im Stil von `../reel/out/cover-alt.jpg`: „Neu im Konfigurator“, „Mit Route. **Oder ohne.**“, Foto `images/Designer (41).png` (Kopie in `build/img/designer-41.png`), Karten „Mehrere GPX-Dateien als Etappen“ und „Dein Lieblingsberg ohne Route“ (Kartenausschnitt aus der Live-Aufnahme), Badge „Karte → 3D“ – erzeugt mit `python make_cover.py`
- **Stil:** wie `../reel/out/peakmemory-reel.mp4` – dunkelgrüner Vignetten-Hintergrund, Inter ExtraBold mit roten Highlight-Boxen und Blur-Reveal, Smartphone mit echter Website, B-Roll, cremefarbene Endkarte „Link in Bio 👆“
- **Kernbotschaft:** Der Konfigurator kann jetzt mehrere GPX-Dateien auf einem Relief kombinieren – und vor allem einen Kartenausschnitt als Bergrelief **ohne Route** erzeugen.

## Storyboard

| Zeit | Bild | Text |
|---|---|---|
| 0–2,0 s | B-Roll: Wanderer am Gipfel, Push-out | Neu im **Konfigurator** |
| 2,0–3,3 s | B-Roll-Cuts: Bachquerung, Radler in den Dolomiten | Mehrere **Etappen?** |
| 3,3–8,2 s | Phone (Live-Website): 3 GPX-Dateien werden per Drag & Drop von außen in die Dropzone gezogen (echter Dragover-Zustand der Website, Badge „3“), Drop, Dateiliste, 3D-Vorschau „Deine Routen“ mit Gravur „Allgäu in 3 Etappen“, Orbit + Push-in | Lade mehrere **GPX-Dateien** hoch → Alle Etappen. **Ein Relief.** (ab 6,4 s) |
| 8,2–9,9 s | B-Roll: Bergweg mit Hochgebirge | **Dein Lieblingsberg.** Ohne Route. |
| 9,9–15,6 s | Phone: Tap „Kartenausschnitt“, Kartenflug Allgäu → Matterhorn, Tap „Diesen Ausschnitt verwenden“, 3D-Matterhorn „Ohne Route“ (Gravur „Matterhorn / 4.478 m“), Orbit + Push-in | Wähle deinen **Kartenausschnitt** → Dein Berg. **In 3D.** |
| 15,6–17,4 s | Produkt-Freisteller nebeneinander: „Mit GPX-Route“ / „Kartenausschnitt“ | Mit Route. **Oder ohne.** |
| 17,3–20 s | Endkarte: Logo, Produktfoto `main.png`, Tag „NEU: Mehrere GPX & Kartenausschnitt“, „Gestalte dein Relief kostenlos in 3D.“, „Link in Bio 👆“ | |

## Verwendete Video-Sequenzen (In-Punkt in der Quelldatei)

- `../video material/12321884_2160_3840_60fps.mp4` – ab 2,0 s, 2,0 s lang
- `../video material/16692280_1080_1920_60fps.mp4` – ab 1,0 s, 0,7 s lang
- `../video material/15110783_1080_1920_30fps.mp4` – ab 1,5 s, 0,6 s lang
- `../video material/16984638_1080_1920_60fps.mp4` – ab 0,6 s, 1,7 s lang

## Weitere Assets

- `../../images/GPX_Route.png`, `../../images/Kartenausschnitt.png` – Produkt-Freisteller
- `../../images/main.png` – Endkarten-Foto
- `./build/img/logo.png` – Logo (aus dem bestehenden Reel)
- `../../fonts/InterVariable.woff2` – Schrift der Website, als statische TTFs instanziiert
- `../../src/client/sample.gpx` – in drei Etappen-Dateien aufgeteilt

## Soundeffekte

Prozedural erzeugt in [sfx.py](./build/sfx.py) (keine Musik): Whoosh bei Schnitten und Phone-Einfahrten, Pops bei Texteinblendungen, Swishes für die drei Dateien, Klick beim Dragover, Thump beim Drop, Pops für die Dateiliste, Klicks bei Taps, langer Whoosh beim Kartenflug, Chimes bei fertiger 3D-Vorschau und Endkarte. Kontrollkopie: `build/sfx.wav` (`python render.py --audio`).

## Neu rendern

Aus `marketing\reel-new_features_configurator\build` (benötigt Node-Abhängigkeiten des Repos inkl. Playwright-Chromium sowie Python mit `av`, `opencv-python`, `pillow`, `fonttools`, `brotli`):

```powershell
python make_gpx.py      # GPX-Etappen erzeugen
python make_fonts.py    # Inter-TTFs erzeugen
node capture.js         # Live-Website https://peak-memory.de aufnehmen (gpx | area einzeln möglich)
python make_cover.py    # Feature-Cover out\cover-alt.jpg
python render.py        # Video + Cover rendern (--preview: Kontaktbogen, --frames 5.0 12.5: Einzelbilder)
```

`capture.js` nimmt die echte Live-Website im iPhone-Viewport (390 × 844 @3x) auf. Für ruckelfreie Kartenfahrten und Orbit-Drehungen werden Leaflet-Karte und Three.js-OrbitControls beim Laden der Bundles als `window.__map` / `window.__controls` freigelegt; jedes Bild wird erst nach vollständig geladenen Kartenkacheln aufgenommen.

## Caption

```text
NEU im Konfigurator 🏔️

Mehrtägige Tour, Hüttentrek oder Triathlon? Lade jetzt bis zu 10 GPX-Dateien gleichzeitig hoch – alle Etappen landen gemeinsam auf einem Relief.

Und du hast gar keine GPX-Datei? Kein Problem: Wähle deinen Lieblingsberg einfach als Kartenausschnitt – ganz ohne Route. 🗺️ → 3D

Gestalte dein Relief kostenlos in 3D – ohne Anmeldung, direkt im Browser. 👉 Link in Bio

Handgefertigt aus Eiche in Baden-Württemberg 🌲

#peakmemory #3drelief #gpx #wandern #bergliebe #alpen #trailrunning #etappenwanderung #matterhorn #geschenkidee #outdoor #hiking
```