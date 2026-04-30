# Peak Memory – Website

![Peak Memory Logo](https://img.shields.io/badge/Made%20in-Baden--W%C3%BCrttemberg-2D5016?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-181717?style=flat-square&logo=github)

**Peak Memory** verwandelt GPS-Routen in handgefertigte 3D-Reliefmodelle. Ob Bike-Marathon, Bergwanderung oder Stadtlauf – deine Route wird zum greifbaren Erinnerungsstück.

---

## 🚀 Live-Website

Die Website wird automatisch über GitHub Pages bereitgestellt:
- **URL:** `https://caro-merz.github.io/peakmemory`
- **Branch:** `main`
- **Status:** Automatisches Deployment bei jedem Push

---

## 📁 Projektstruktur

```
/
├── index.html              # Haupt-Website (All-in-One HTML)
└── README.md               # Diese Datei
```

---

## 🛠️ Lokale Entwicklung

Da es sich um eine statische HTML-Website handelt, kannst du sie lokal öffnen:

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

### Phase 3: GPX-Upload & Preview 🔮 (Vision)
- GPX-File-Upload
- 3D-Vorschau der Route
- Integration mit Strava API
- **Achtung:** Braucht Backend (GitHub Pages = nur statisch)

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
- **Hosting:** GitHub Pages (kostenlos, SSL inklusive)
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
