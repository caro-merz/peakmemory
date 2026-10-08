# Peak Memory - Website

PeakMemory verwandelt GPS-Routen in handgefertigte 3D-Reliefs. Die Website unter
https://peak-memory.de bleibt eine statische HTML-Seite mit Cloudflare-Endpunkten.
Der Konfigurator liefert eine **illustrative Online-Vorschau**, keine druckfertige
Datei und keine verbindliche Produktionsfreigabe.

## Funktionen

- Eigene GPX-Datei oder unverbindliche Beispielroute in interaktivem 3D-Gelände.
  `gpx-hilfe.html` erklärt den GPX-Export aus Komoot, Strava und Garmin Connect
  sowie Alternativen ohne Aufzeichnung. Die Hilfe ist neben den Uploads verlinkt,
  öffnet sich ohne Verlust der Konfiguration in einem neuen Tab und funktioniert
  auch ohne JavaScript. Anbieter-Hilfelinks bei Änderungen der Export-Menüs prüfen.
  „Beispielroute testen“ verwendet die bereitgestellte Marathon-Strecke des
  Allgäu Panorama Marathons aus `src/client/sample.gpx`, beim Build lokal gebündelt.
- Vollständiger Konfigurator direkt nach dem Hero auf der Startseite, zusätzlich
  weiterhin separat unter `configurator.html`. Der Build übernimmt die gemeinsame
  Oberfläche aus dieser Datei in den Platzhalter von `index.html`; keine zweite
  Kopie pflegen. Konfigurator-CSS ist auf `.configurator` begrenzt.
  Auf dem Smartphone folgen Route, Erinnerungsstück und Live-Vorschau
  untereinander; am Desktop bleiben die Einstellungen links neben der Vorschau.
- Relief auf Eiche-Holzsockel (ohne Produktvariantenauswahl), Gravurwunsch und Geländerand.
- Höhenüberhöhung von 1× bis 8×, Standard 2×. Änderungen skalieren Gelände
  und Route gemeinsam ohne erneuten Geländeabruf.
- Gravur mit maximal 3 Zeilen und insgesamt 120 Zeichen. Die Vorschau übernimmt
  die eingegebenen Zeilenumbrüche ohne automatischen Umbruch und zeigt die
  Schrift direkt auf dem Holz, ohne separates Schild oder farbigen Hintergrund.
  Ohne Gravurwunsch bleibt das Holz unbeschriftet.
  Der editierbare Standardtext ist `Deine Route`, `100 km | 1000 hm | 10 h`
  und `01.01.2026` in drei Zeilen; diese Beispielwerte werden nicht aus der GPX ermittelt.
- Gravurschrift: original Quicksand Book, lokal aus `fonts/Quicksand_Book.otf`
  geladen, mit SIL Open Font License unter `fonts/OFL.txt`.
  Die Standardschriftgröße beträgt 5 mm, unabhängig von der Zeilenzahl.
  Überschreitet die längste Zeile 8 cm, werden alle Zeilen proportional
  verkleinert. Kürzere Texte werden nicht künstlich auf volle Breite gestreckt.
- Unverbindliche Anfrage mit Original-GPX und Konfiguration per E-Mail.
  Bei verfügbarer Vorschau wird die aktuelle 3D-Ansicht als PNG angehängt
  (maximal 1 MB und 2048 Pixel je Seite). Screenshot-Fehler werden vor dem Versand
  angezeigt; ohne verfügbare Vorschau bleibt die Anfrage ohne Bild möglich.
- Etsy bleibt der Bestellkanal; keine Bezahlung oder automatische Preisberechnung.
- Die finale Produktionsvorschau wird persönlich erstellt und vor Fertigung freigegeben.

## Projektstruktur

```text
index.html                 Bestehende Website und allgemeines Kontaktformular
configurator.html          GPX-Konfigurator
src/client/                Oberfläche, Geländeabruf und Three.js-Renderer
src/shared/                GPX-, Konfigurations- und Geometrie-Logik
src/server/                Gemeinsame Kontakt- und Gelände-Endpunkte
worker.js                  Cloudflare Worker-Einstieg
functions/                 Cloudflare Pages Functions
scripts/                   Build, lokale Entwicklung und Browserprüfung
tests/                     Parser-, Geometrie- und Backend-Tests
deploy/pages.toml          Pages-Konfiguration für das Staging
licenses/                  Lizenzhinweise, die im npm-Paket fehlen
assets/                    Generierte lokale JS/CSS/Lizenz-Dateien (ignoriert)
dist/                      Ausschließlich veröffentlichbare Dateien (ignoriert)
```

## Entwicklung

Node.js 22 oder neuer:

```powershell
npm ci
npm run build
npm run dev
```

Danach http://127.0.0.1:8000/configurator.html öffnen. `PORT` kann einen anderen
Port vorgeben. Der lokale Node-Server versendet **keine echten E-Mails**.
Die Vorschau benötigt Netzwerkzugriff auf öffentliche Geländedaten. Nur
`index.html` direkt zu öffnen reicht für den Konfigurator nicht.

Nach Änderungen `npm run build` erneut ausführen. Three.js wird erst beim Start
einer Vorschau geladen. Bibliotheken und Styles werden lokal gebündelt; es gibt
keinen Laufzeit-CDN für den Konfigurator und keine Framework-Migration.

Der Entwicklungsserver muss während der gesamten Vorschau laufen, auch wenn
die Seite bereits im Browser geöffnet ist. Bei einem Verbindungsfehler den
Server unter derselben Adresse neu starten und im Konfigurator „Erneut laden“
wählen. Ein offener Browser-Tab allein kann keine Geländekacheln bereitstellen.

```powershell
npm test
npx playwright install chromium
npm run test:browser
```

Die Browserprüfung verwendet synthetische Geländekacheln und simulierten
E-Mail-Versand. Sie sendet keine echten Anfragen. `SCREENSHOT_PATH` kann einen
Dateipfad für einen Screenshot außerhalb des Repositorys vorgeben.
`npm audit` prüft die Abhängigkeiten. Der `sharp`-Override hält Wranglers
transitive Miniflare-Abhängigkeit auf der korrigierten Patchversion 0.35.5;
entfernen, sobald Wrangler diese Version selbst mitliefert.

## Cloudflare Worker (primärer Betrieb)

```powershell
npm ci
npm run build
npx wrangler dev
```

Für die Veröffentlichung:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

Den Secret-Wert niemals in Dateien eintragen. Die Resend-Absenderdomain
`peak-memory.de` muss verifiziert sein. Anfragen gehen von
`kontakt@peak-memory.de` an `peak.memory@web.de`, mit der Besucheradresse als
Reply-To. Den existierenden Secret nicht unnötig ersetzen.

`wrangler.toml` veröffentlicht nur `dist/` und stellt `ASSETS` bereit.
Die dort konfigurierte Build-Anweisung `npm run build` erzeugt vor
`wrangler dev` und `wrangler deploy` automatisch die Website und ihre Assets.
Für Cloudflare Workers Builds kann die Build command leer bleiben; als
Deploy command genügt `npx wrangler deploy` (Root directory: `/`).
Der Worker übernimmt `/contact`, `/terrain/...` und den www-Redirect.
Unbekannte Dateien liefern 404 statt eines vermeintlich erfolgreichen
Homepage-Fallbacks. Keine Quellen, GPX-Testdateien, Python-Umgebung oder
`node_modules` veröffentlichen.

Der Gelände-Limiter `TERRAIN_RATE_LIMITER` erlaubt bis zu 120 **ungecachte**
Anfragen je IP und Minute. Die Namespace-ID `1001` muss innerhalb des
Cloudflare-Kontos für diesen Zweck reserviert sein; bei Kollision vor dem
Deployment ändern. Der Cache wird vor dem Limiter geprüft.

## Alternative: Cloudflare Pages

Worker und Pages verwenden dieselbe Serverlogik. Da ihre Wrangler-Konfigurationen
unterschiedlich sind, erstellt der Pages-Build ein isoliertes Staging:

```powershell
npm run build:pages
npx wrangler pages dev --cwd .wrangler\pages-project
```

Für ein bestehendes Pages-Projekt:

```powershell
npx wrangler pages deploy --cwd .wrangler\pages-project --project-name peakmemory
```

Den tatsächlichen Pages-Projektnamen verwenden. `RESEND_API_KEY` in den
Pages-Einstellungen für die benötigten Umgebungen konfigurieren. Bei einem
Git-basierten Pages-Build `npm run build:pages` ausführen und aus dem
gestagten Projekt veröffentlichen; nicht einfach nur das Repository als
statische Dateien hochladen. GitHub Pages allein kann die Server-Endpunkte
nicht bereitstellen.

Pages bietet nicht alle Worker-Bindings. Vor einem öffentlichen Pages-Deployment
eine Cloudflare-WAF-Ratenbegrenzungsregel für `/terrain/*` auf der Custom Domain
einrichten, z.B. 120 Anfragen/IP/Minute. Die WAF-Regel zählt auch Cache-Treffer.
Auch den `/contact`-Endpunkt mit einer angemessenen WAF-Regel gegen Spam schützen.
Nicht davon ausgehen, dass der Worker-Limiter automatisch für Pages gilt.
Die `pages.dev`-Domain und öffentliche Preview-URLs ebenfalls deaktivieren
oder mit Cloudflare Access schützen: Die WAF-Regel auf der Custom Domain
schützt diese alternativen Zugänge nicht.

## GPX und Vorschaulimits

- GPX 1.0/1.1, Trackpunkte und Routenpunkte, auch mit XML-Namespace.
- Maximal 5 MB (5 × 1024 × 1024 Bytes), 100.000 Punkte und 100 Abschnitte.
- Mindestens zwei unterschiedliche Punkte in einem Abschnitt.
- Keine DTD/XML-Entitätsdefinitionen; fehlerhafte Koordinaten werden abgelehnt.
- Disjunkte Abschnitte werden nicht durch falsche Linien verbunden.
- Höhendaten in GPX sind optional: Das umgebende Gelände kommt aus DEM-Kacheln.
- Polare Routen ab ±85,0511287798° sowie Ausschnitte außerhalb der
  Web-Mercator-Abdeckung werden ausdrücklich abgelehnt.
- Antimeridian-Routen verwenden gewrappte Kacheln.
- Pro Vorschau maximal 16 Kacheln, vier parallele Downloads, Zoom 0-14,
  ein 129 × 129 Geländeraster und maximal 12.000 dargestellte Routenpunkte.
- Sehr komplexe Routen werden nur für die Darstellung vereinfacht. Die
  Originaldatei wird unverändert angehängt. Zu komplexe Darstellungen oder
  fehlende Geländedaten werden als nicht verfügbar angezeigt.
- Maße: Relief 10 × 10 cm, Eiche-Holzsockel 11 × 13,5 cm mit 2 cm Stärke. Das Relief
  liegt oben mit 0,5 cm Rand oben und an beiden Seiten; unten bleiben 3 cm
  Holz für die mittig platzierte Gravur.
- Die Produktvorschau verwendet eine perspektivische Kamera. Die Holzmaße werden
  am gerenderten Mesh getestet.
- Die Eiche-Vorschau verwendet lokal erzeugte, deterministische Maserung mit
  feinen Poren und dezenter Bump-Struktur. Flächen und Stirnholz haben getrennte
  Texturen; die Maserung ist exemplarisch, nicht die eines konkreten Holzstücks.
- Auf der vorderen Stirnseite links erscheint das PeakMemory-Logo als
  dunkle Lasergravur ohne Hintergrundfläche, auch ohne persönlichen Gravurtext.
  Nach der Produktfoto-Referenz ist es ca. 2,2 cm breit und 1 cm hoch,
  vertikal mittig und mit 0,6 cm Abstand zum linken Rand; das Originalseitenverhältnis bleibt erhalten.
- Höhen sind von 1× bis 8× einstellbar (Standard 2×). Material und
  endgültige Gravurposition sind exemplarisch; Preise werden nicht erfunden.
- Neue Konfigurator-Anfragen verwenden Konfiguration Version 2 mit Pflichtfeld
  `elevationScale` und festem Produkt `base`. Bereits geöffnete alte Clients
  mit Version 1 bleiben serverseitig kompatibel (damalige Höhenüberhöhung 1,5×).

Bei fehlendem WebGL oder nicht verfügbarem Gelände kann eine gültige eigene
Route weiterhin angefragt werden; der Vorschauzustand steht in der E-Mail.
Eine Beispielroute kann nicht als persönliche Anfrage abgeschickt werden.
Fehlgeschlagener Versand bewahrt die Eingaben. Bei fehlender Versandbestätigung
nach einem Timeout vor erneutem Senden nachfragen, um Duplikate zu vermeiden.

## Öffentliche Höhendaten, Lizenzen und Datenschutz

Der Browser liest GPX lokal. Erst das Absenden einer Anfrage überträgt
Original-GPX, Kontaktdaten, Konfiguration und bei verfügbarer Vorschau das PNG-Bild an Cloudflare und über Resend an
PeakMemory. Es gibt keine Route-Konten, öffentlich teilbaren Routen oder
persistente Speicherung der GPX-Datei im Browser.

Geländekacheln werden über `/terrain/{z}/{x}/{y}.png` von einem fest vorgegebenen
AWS-Endpunkt abgerufen und gecacht. Die Kacheladressen geben die ungefähre
Region preis; weder die vollständige GPX-Datei noch die Besucher-IP wird
gezielt an den Geländeprovider weitergereicht. Cloudflare sieht die
Besucher-IP und nutzt sie für den kurzlebigen Limiter. Route-Inhalte nicht
in Logs schreiben.

- [Terrain Tiles im AWS Open Data Programm](https://registry.opendata.aws/terrain-tiles/)
- [Terrarium-Format](https://github.com/tilezen/joerd/blob/master/docs/formats.md)
- [Quellen und erforderliche Attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)

Die aktuelle Quelle ist
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/...`.
Die im Register genannte EU-Replik lieferte beim Prüfen 403 und wird nicht
als Standard verwendet. Auflösung und Verfügbarkeit variieren; keine
Verfügbarkeitsgarantie oder LiDAR-/Produktionsgenauigkeit behaupten.
Die vollständigen Terrain-Credits stehen im Konfigurator; lokal gebündelte
Software-Lizenzen werden nach `assets/licenses.txt` geschrieben.

Vor Veröffentlichung die Datenlizenzen, Cache-Regeln, produktive
Ratenbegrenzung und die aktualisierten Datenschutzhinweise durch die
Verantwortlichen prüfen lassen. Ein automatisierter lokaler Test ersetzt
weder diese Prüfung noch eine produktive Resend-Konfiguration.

## Kontakt

PeakMemory - handgefertigt in Baden-Württemberg.

- Carolin Merz und Alexander Weimer
- peak.memory@web.de
- +49 162 2701613

Copyright 2025-2026 Peak Memory. Alle Rechte an eigenen Inhalten vorbehalten.
