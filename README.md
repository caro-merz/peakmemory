# Peak Memory – Website

![Peak Memory Logo](https://img.shields.io/badge/Made%20in-Baden--W%C3%BCrttemberg-2D5016?style=flat-square)
![Cloudflare](https://img.shields.io/badge/Hosted%20on-Cloudflare-F38020?style=flat-square&logo=cloudflare)

**Peak Memory** verwandelt GPS-Routen in handgefertigte 3D-Reliefmodelle. Ob Bike-Marathon, Bergwanderung oder Stadtlauf – deine Route wird zum greifbaren Erinnerungsstück.

---

## 🚀 Live-Website

Die Website wird über Cloudflare bereitgestellt:
- **URL:** `https://peak-memory.de`
- **Status:** Statische Seite mit Contact-Endpoint über Worker/Functions

---

## 📁 Projektstruktur

```
/
├── index.html              # Haupt-Website (All-in-One HTML)
└── README.md               # Diese Datei
```

---

## 🛠️ Lokale Entwicklung

Das Frontend ist statisch, der Kontaktversand läuft über Cloudflare Worker/Functions. Für Layout-Änderungen kannst du die Seite lokal direkt öffnen:

1. **Direkt im Browser:**
   ```
   Öffne: index.html
   ```

2. **Mit lokalem Server (empfohlen):**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (mit npx http-server)
   npx http-server -p 8000
   
   # Live Server VS Code Extension (Rechtsklick auf index.html)
   ```

3. **Öffne Browser:** `http://localhost:8000`

---

## 📦 Deployment

Deployment erfolgt automatisch via GitHub Pages:

1. **Push zu GitHub:**
   ```bash
   git add .
   git commit -m "Update website"
   git push origin main
   ```

2. **GitHub Pages verarbeitet:**
   - Stellt Website direkt aus dem main Branch bereit
   - Keine Build-Schritte nötig (statisches HTML)

3. **Website ist live!** (nach ca. 1-2 Minuten)

**GitHub Pages aktivieren:**
- Gehe zu: Repository Settings → Pages
- Source: Deploy from branch → main → / (root)
- Save

---

## 🎨 Design-Prinzipien

- **Farben:** Hauptakzent `#2D5016` (Dunkelgrün), Neutral `#FAFAF8` (Beige-Weiß)
- **Typografie:** Inter (Google Fonts), fette Headlines (800)
- **Stil:** Minimalistisch, Fokus auf Produktfotos, Konturlinien als Dekoration
- **Responsive:** Mobile-First Design, Breakpoints bei 768px und 1024px

---

## 🗺️ Roadmap

### Phase 1: Design-Enhancement ✅ (aktuell)
- Hero mit Produkt-Visualisierung
- Trust-Elemente (Testimonials)
- Verbesserte Typografie & Animationen

### Phase 2: Konfigurator 🔜 (geplant)
- Interaktive Konfiguration (Größe, Holz, Gravur)
- Live-Preis-Berechnung
- Separate Page: `configurator.html`

### Phase 3: GPX-Upload & Preview 🚧 (teilweise umgesetzt)
- GPX-File-Upload im Kontaktformular inkl. Mail-Anhang
- 3D-Vorschau der Route
- Integration mit Strava API
- Weiterer Backend-Ausbau für Vorschau/Import nötig

---

## 🤝 Team

**Peak Memory** – Gefertigt in Baden-Württemberg

- **Carolin Merz** – Mitgründerin (Albstadt)
- **Alexander Weimer** – Mitgründer (Leonberg)

📧 Kontakt: peak.memory@web.de  
📞 Telefon: +49 162 2701613

---

## 📄 Lizenz

© 2025-2026 Peak Memory. Alle Rechte vorbehalten.

---

## 🔧 Technische Details

- **Framework:** Vanilla HTML/CSS/JavaScript (kein Build-Prozess)
- **Hosting:** Cloudflare Worker + statische Assets
- **Performance:** Lighthouse-Score Ziel: >90
- **Browser-Support:** Chrome, Firefox, Safari, Edge (letzte 2 Versionen)

---

## 💡 Für Entwickler

### Custom Domain einrichten:
1. GitHub → Settings → Pages → Custom domain
2. DNS-Records bei deinem Provider setzen (A oder CNAME)
3. SSL-Zertifikat wird automatisch erstellt (Let's Encrypt)

### GitHub Actions (optional):
Für erweiterte Builds (z.B. CSS-Minification, Bild-Optimierung) kann `.github/workflows/deploy.yml` erstellt werden.

---

**Made with ❤️ in Baden-Württemberg**
