# Neue Konfigurator-Funktionen – Instagram Reel / Story

## Konzept

- **Länge:** 15 Sekunden
- **Format:** 9:16, ein Schnitt für Reel und Story
- **Stil:** am bestehenden Reel `peakmemory-reel.mp4` orientiert: dunkles Waldgrün mit feinen Höhenlinien, Smartphone-/Konfigurator-Ansichten, kurze Outdoor-Clips, fette weiße Schrift mit roten Hervorhebungen und heller Produkt-Abschluss.
- **Kernbotschaft:** Im Konfigurator kannst du mehrere eigene GPX-Dateien gemeinsam nutzen oder einen Kartenausschnitt ganz ohne Route auswählen.
- **CTA:** peak-memory.de – „Jetzt ausprobieren“
- **Gerenderter Export:** [new-features-reel.mp4](./out/new-features-reel.mp4), 1080 × 1920, 30 fps, H.264 + AAC, 15 Sekunden
- **Ton:** kurzer Ausschnitt des vorhandenen Reel-Soundtracks; kein Voice-over.

## Getaktetes Storyboard

| Zeit | Bild und Schnitt | Texteinblendung |
|---|---|---|
| 0–1,5 s | Bergwanderer als schneller Einstieg. Vollflächiges Bild mit leichter Abdunklung und dem groß gesetzten, rot markierten Text – wie der schnelle Text-Einstieg im Referenz-Reel. | **NEU IM KONFIGURATOR**<br>Deine Route. **Deine Wahl.** |
| 1,5–6 s | Wechsel auf dunkles Waldgrün mit dezenten, animierten Höhenlinien. Eine Smartphone-Ansicht fährt ein: Konfigurator, Auswahl mehrerer GPX-Dateien und fertige Reliefvorschau. Die Dateieinträge erscheinen nacheinander. | Lade mehrere<br>**GPX-Dateien**<br>Gemeinsam auf einem Relief |
| 6–7,5 s | Kurzer Top-down-Outdoor-Cut mit rotem Titelmarker als Übergang zum zweiten Feature. | Oder ganz ohne<br>**GPX-Datei?** |
| 7,5–12,5 s | Zweite Smartphone-Ansicht vor dem Höhenlinien-Hintergrund: Kartenausschnitt auf einer stilisierten Karte wählen, bestätigen und eine routenlose Reliefvorschau sehen. | Wähle deinen<br>**Kartenausschnitt**<br>Auch ohne GPX-Datei |
| 12,5–15 s | Heller cremefarbener Abschluss wie die Produkt-/CTA-Karte des Referenz-Reels: beide Reliefvarianten nebeneinander, Logo und klare Website-Handlungsaufforderung. | Zwei neue Wege<br>**zu deinem Relief**<br>peak-memory.de<br>**JETZT AUSPROBIEREN** |

## Verwendete Video-Sequenzen

Timecodes sind In-/Out-Punkte in der jeweiligen Quelldatei, in Sekunden ab Clipbeginn:

- `../video material/12321884_2160_3840_60fps.mp4` — 2,2–3,7 s; Bergwanderer zum Einstieg
- `../video material/13611904_2160_3840_60fps.mp4` — 6,0–7,5 s; Trail-Läufer aus der Luft als Übergang

## Weitere Assets

- `../../images/GPX_Route.png` — Relief mit eingezeichneter GPX-Route
- `../../images/Kartenausschnitt.png` — Relief ohne Route
- `../../images/logo_simple.png` — Logo
- `./build/sfx.wav` — vorhandener Reel-Soundtrack, für den Schnitt gekürzt und am Ende ausgeblendet

Der Renderer bildet die beiden Konfigurator-Schritte als illustrative Smartphone-Ansichten ab. Die Ansichten sind keine direkte Bildschirmaufnahme der Live-Website.

## Renderer und Export

Der Render wurde mit [`render_new_features.py`](./build/render_new_features.py) erzeugt. Vom Repository-Hauptverzeichnis aus erneut rendern:

```powershell
python marketing\reel\build\render_new_features.py
```
