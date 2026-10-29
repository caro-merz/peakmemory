// Captures the live peak-memory.de configurator in an iPhone-sized viewport as JPEG sequences.
// Usage: node capture.js [gpx|area]   (default: both)
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, SITE } from './site.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'capture');
const GPX = ['etappe-1-sonthofen.gpx', 'etappe-2-gruenten.gpx', 'etappe-3-ziel.gpx'].map(name => path.join(here, 'gpx', name));
const MATTERHORN = { lat: 45.9785, lng: 7.6586, zoom: 12.1 };
const only = process.argv[2];

const ease = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

class Sequence {
  constructor(page, name) { this.page = page; this.name = name; this.count = 0; this.marks = {}; this.taps = []; }
  async init() { this.dir = path.join(OUT, this.name); await rm(this.dir, { recursive: true, force: true }); await mkdir(this.dir, { recursive: true }); }
  async shot() {
    await this.page.screenshot({ path: path.join(this.dir, `${String(this.count).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92, animations: 'disabled', caret: 'hide' });
    return this.count++;
  }
  mark(label) { this.marks[label] = this.count; }
  async tap(locator) {
    const box = await locator.boundingBox();
    this.taps.push({ frame: this.count, x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  async save() { await writeFile(path.join(this.dir, 'meta.json'), JSON.stringify({ frames: this.count, marks: this.marks, taps: this.taps, dropzone: this.dropzone }, null, 1)); }
}

async function scrollTo(seq, target, frames) {
  const start = await seq.page.evaluate(() => scrollY);
  for (let i = 1; i <= frames; i++) {
    await seq.page.evaluate(y => window.scrollTo(0, y), start + (target - start) * ease(i / frames));
    await seq.shot();
  }
}

const topOf = (page, selector, offset = 0) => page.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY - o, [selector, offset]);

async function orbit(seq, frames, degrees) {
  const page = seq.page;
  await page.waitForFunction(() => window.__controls);
  const step = (degrees * Math.PI / 180) / frames;
  for (let i = 0; i < frames; i++) {
    await page.evaluate(angle => {
      const c = window.__controls, cam = c.object, t = c.target;
      const x = cam.position.x - t.x, z = cam.position.z - t.z;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      cam.position.x = t.x + x * cos - z * sin;
      cam.position.z = t.z + x * sin + z * cos;
      c.update();
      c.dispatchEvent({ type: 'change' });
    }, step);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await seq.shot();
  }
}

// Sets the engraving without focusing the field, so the page does not scroll away.
const setEngraving = (page, text) => page.evaluate(value => {
  const input = document.getElementById('engraving');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, text);

async function preparePage() {
  const ctx = await openPage();
  await ctx.page.goto(SITE + '/configurator.html', { waitUntil: 'networkidle' });
  await ctx.page.addStyleTag({ content: '*{scroll-behavior:auto!important} ::-webkit-scrollbar{display:none}' });
  return ctx;
}

async function waitPreview(page, badge) {
  await page.waitForFunction(text => document.getElementById('previewBadge').textContent === text, badge, { timeout: 120000 });
  await page.waitForTimeout(1500);
}

async function captureGpx() {
  const { browser, page } = await preparePage();
  const seq = new Sequence(page, 'gpx');
  await seq.init();
  await page.evaluate(y => window.scrollTo(0, y), await topOf(page, '#sourceControls', 90));
  seq.mark('cards');
  for (let i = 0; i < 4; i++) await seq.shot();
  await scrollTo(seq, await topOf(page, '#routeControls', 80), 24);
  seq.mark('dropzone');
  for (let i = 0; i < 3; i++) await seq.shot();
  const zone = await page.locator('#dropzone').boundingBox();
  seq.dropzone = zone;
  const files = await Promise.all(GPX.map(async file => ({ name: path.basename(file), text: await readFile(file, 'utf8') })));
  // Real drag & drop: the site highlights the dropzone on dragenter and reads the files on drop.
  await page.evaluate(list => {
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(new File([f.text], f.name, { type: 'application/gpx+xml' }));
    window.__dt = dt;
    document.getElementById('dropzone').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, files);
  seq.mark('dragover');
  for (let i = 0; i < 3; i++) await seq.shot();
  await page.evaluate(() => document.getElementById('dropzone').dispatchEvent(new DragEvent('drop', { dataTransfer: window.__dt, bubbles: true, cancelable: true })));
  seq.mark('uploaded');
  await page.waitForFunction(() => !document.getElementById('routeFiles').hidden);
  await setEngraving(page, 'Allgäu in 3 Etappen');
  for (let i = 0; i < 6; i++) { await seq.shot(); await page.waitForTimeout(120); }
  await scrollTo(seq, await topOf(page, '.preview, #preview, #previewBadge', 110), 26);
  await waitPreview(page, 'Deine Routen');
  seq.mark('preview');
  await orbit(seq, 90, 70);
  await seq.save();
  await browser.close();
}

async function captureArea() {
  const { browser, page } = await preparePage();
  const seq = new Sequence(page, 'area');
  await seq.init();
  await page.evaluate(y => window.scrollTo(0, y), await topOf(page, '#sourceControls', 90));
  seq.mark('cards');
  for (let i = 0; i < 5; i++) await seq.shot();
  const areaCard = page.locator('#sourceControls .source-option').last();
  await seq.tap(areaCard);
  await page.locator('input[name=terrainSource][value=area]').check({ force: true });
  await page.waitForFunction(() => window.__map && !document.getElementById('confirmArea').disabled, null, { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await setEngraving(page, 'Matterhorn\n4.478 m');
  for (let i = 0; i < 4; i++) await seq.shot();
  await scrollTo(seq, await topOf(page, '#areaControls', 70), 22);
  seq.mark('map');
  await page.evaluate(() => { const a = document.querySelector('.leaflet-control-attribution'); if (a) a.style.fontSize = '9px'; });
  const start = await page.evaluate(() => { const c = window.__map.getCenter(); return { lat: c.lat, lng: c.lng, zoom: window.__map.getZoom() }; });
  const frames = 70;
  for (let i = 1; i <= frames; i++) {
    const t = ease(i / frames);
    const zoom = start.zoom + (MATTERHORN.zoom - start.zoom) * t - 3.6 * Math.sin(Math.PI * t);
    await page.evaluate(([a, b, t, zoom]) => {
      const m = window.__map;
      const pa = m.project([a.lat, a.lng], 0), pb = m.project([b.lat, b.lng], 0);
      const center = m.unproject(pa.add(pb.subtract(pa).multiplyBy(t)), 0);
      m.setView(center, zoom, { animate: false });
    }, [start, MATTERHORN, t, zoom]);
    await page.waitForFunction(() => {
      const tiles = [...document.querySelectorAll('#areaMap img.leaflet-tile')];
      return tiles.length && tiles.every(img => img.classList.contains('leaflet-tile-loaded'));
    }, null, { timeout: 30000 }).catch(() => console.warn('tiles timeout at', i));
    await seq.shot();
  }
  seq.mark('arrived');
  await page.waitForFunction(() => !document.getElementById('confirmArea').disabled, null, { timeout: 30000 });
  for (let i = 0; i < 4; i++) await seq.shot();
  await scrollTo(seq, await topOf(page, '#confirmArea', 520), 10);
  const confirm = page.locator('#confirmArea');
  await seq.tap(confirm);
  for (let i = 0; i < 3; i++) await seq.shot();
  seq.mark('confirm');
  await confirm.click();
  await scrollTo(seq, await topOf(page, '#previewBadge', 110), 26);
  await waitPreview(page, 'Ohne Route');
  seq.mark('preview');
  await orbit(seq, 110, 90);
  await seq.save();
  await browser.close();
}

if (!only || only === 'gpx') await captureGpx();
if (!only || only === 'area') await captureArea();
console.log('done');
