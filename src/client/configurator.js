import './configurator.css';
import { parseGpx } from '../shared/gpx.js';
import { readGpxCollection } from '../shared/gpx-collection.js';
import { parseConfiguration } from '../shared/configuration.js';
import { terrainPlan } from '../shared/geometry.js';
import { loadTerrain } from './terrain.js';
import sampleXml from './sample.gpx';
import { getProduct, formatPrice, configurationPrice } from '../shared/product.js';
import { initializeCheckout } from './checkout.js';

const get = id => document.getElementById(id);
const fileInput = get('gpxFile'), dropzone = get('dropzone');
const viewButtons = ['resetView'].map(get);
let file = null, route = null, sample = false, preview = 'unavailable', viewer = null;
let generation = 0, controller = null, marginTimer = null, sending = false;
let files = [], selectionRevision = 0, selecting = false;
let checkout;

function configuration() {
  return parseConfiguration({
    version: 5, product: get('product').value,
    wallMount: get('product').value !== 'frame' && get('wallMount').value === 'yes',
    engraving: getProduct(get('product').value).engraving ? get('engraving').value : '',
    elevationScale: Number(get('elevationScale').value),
    margin: Number(get('margin').value) / 100, preview: preview === 'ready' ? 'ready' : 'unavailable',
  });
}
function summary() {
  const product = getProduct(get('product').value);
  get('engraving').disabled = sending || !product.engraving;
  get('engravingControls').hidden = !product.engraving;
  get('engravingUnavailable').hidden = product.engraving;
  if (product.engraving) {
    get('engraving').rows = product.engravingMaxLines;
    get('engravingHint').textContent = `Max. ${product.engravingMaxLines} Zeilen und insgesamt 120 Zeichen. Beispielwerte – bitte an deine Tour anpassen.`;
  }
  get('wallMountControls').hidden = product.id === 'frame';
  get('wallMount').disabled = sending || product.id === 'frame';
  get('modelPrice').textContent = formatPrice(configurationPrice({
    version: 5, product: product.id, wallMount: product.id !== 'frame' && get('wallMount').value === 'yes',
  }));
  get('orderProduct').textContent = product.name;
  get('orderSupport').textContent = product.support;
  get('orderDimensions').textContent = product.dimensions;
  get('productDescription').textContent = `${product.description} ${product.support}: ${product.dimensions}.`;
  get('productDimensionsNote').textContent = `10 × 10 cm Relief · ${product.support}: ${product.dimensions}.`;
  let settings;
  try {
    settings = configuration();
    get('engraving').setCustomValidity('');
    get('configurationSummary').classList.remove('error');
  } catch (error) {
    get('engraving').setCustomValidity(error.message);
    get('configurationSummary').textContent = error.message;
    get('configurationSummary').classList.add('error');
    updateActions();
    return false;
  }
  get('configurationSummary').textContent = `${product.name} · ${product.dimensions} · Rand ${Math.round(settings.margin * 100)} % · Höhen ${settings.elevationScale}× · Gravur: ${settings.engraving || 'keine'}${product.id !== 'frame' ? ` · Wandaufhängung: ${settings.wallMount ? 'ja (+1 €)' : 'nein'} · 4 transparente Schutzfüße` : ''}`;
  get('elevationValue').textContent = `${settings.elevationScale}×`;
  get('elevationNote').textContent = `${settings.elevationScale}-fach`;
  get('marginValue').textContent = `${Math.round(settings.margin * 100)} %`;
  updateActions();
  return true;
}
function updateActions() {
  get('remove').disabled = sending || !route && !file;
  get('retry').hidden = !route || preview !== 'unavailable';
  for (const button of viewButtons) button.disabled = sending || preview !== 'ready';
  for (const button of get('routeFiles').querySelectorAll('button')) button.disabled = sending;
  checkout?.update();
}
function status(message, error = false) {
  get('previewStatus').textContent = message;
  get('previewStatus').className = error ? 'error' : '';
}
function invalidate() {
  generation += 1;
  controller?.abort();
  clearTimeout(marginTimer);
  viewer?.clear();
  preview = 'unavailable';
  get('placeholder').hidden = false;
  get('viewer').setAttribute('aria-busy', 'false');
  return generation;
}
function clearRoute(resetPicker = true) {
  selectionRevision += 1; selecting = false;
  invalidate();
  file = route = null; files = []; sample = false;
  get('routeError').textContent = '';
  showFiles();
  if (resetPicker) fileInput.value = '';
  get('fileName').textContent = 'Noch keine Route ausgewählt.';
  get('previewBadge').textContent = 'Noch keine Route';
  status('Wähle eine Route, um die 3D-Vorschau zu starten.');
  updateActions();
}
function unavailable(message) {
  preview = 'unavailable';
  viewer?.dispose(); viewer = null;
  get('placeholder').hidden = false;
  get('previewBadge').textContent = 'Nicht verfügbar';
  get('viewer').setAttribute('aria-busy', 'false');
  status(message, true);
  updateActions();
}
async function renderPreview() {
  const current = invalidate();
  if (!route) return;
  preview = 'loading';
  controller = new AbortController();
  const activeController = controller;
  const timeout = setTimeout(() => activeController.abort(new Error('Das Laden dauert zu lange. Bitte versuche es erneut.')), 30000);
  get('previewBadge').textContent = 'Wird geladen';
  get('viewer').setAttribute('aria-busy', 'true');
  status('Öffentliche Höhendaten werden geladen und deine Landschaft wird geformt …');
  updateActions();
  try {
    const plan = terrainPlan(route, configuration().margin);
    const [{ createViewer }, grid] = await Promise.all([
      import('./renderer.js'), loadTerrain(plan, activeController.signal),
    ]);
    if (generation !== current) return;
    activeController.signal.throwIfAborted();
    if (!viewer) {
      const nextViewer = await createViewer(get('viewer'), unavailable);
      if (generation !== current) { nextViewer.dispose(); return; }
      viewer = nextViewer;
    }
    activeController.signal.throwIfAborted();
    const settings = configuration();
    viewer.show(grid, settings.elevationScale, settings.engraving, true, settings.product, settings.wallMount);
    get('placeholder').hidden = true;
    preview = 'ready';
    get('previewBadge').textContent = sample ? 'Beispielroute' : files.length > 1 ? 'Deine Routen' : 'Deine Route';
    status('Deine Gelände-Vorschau ist bereit. Drehe das Relief und gestalte deine Erinnerung.');
  } catch (error) {
    if (generation !== current) return;
    activeController.abort();
    unavailable(error instanceof Error ? error.message : 'Die 3D-Vorschau konnte nicht erstellt werden.');
  } finally {
    clearTimeout(timeout);
    if (generation === current) { get('viewer').setAttribute('aria-busy', 'false'); updateActions(); }
  }
}
function showFiles() {
  const list = get('routeFiles');
  list.replaceChildren();
  list.hidden = !files.length;
  for (const [index, source] of files.entries()) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = source.name;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-button';
    remove.textContent = 'Entfernen';
    remove.setAttribute('aria-label', `${source.name} entfernen`);
    remove.addEventListener('click', () => {
      const remaining = files.filter((_, position) => position !== index);
      if (!remaining.length) {
        clearRoute();
        fileInput.focus();
      } else {
        selectFiles(remaining, false, true);
      }
    });
    item.append(name, remove); list.append(item);
  }
}
async function selectFiles(selected, append = true, restoreFocus = false) {
  if (sending || !selected.length) return;
  const current = ++selectionRevision;
  selecting = true;
  get('routeError').textContent = 'Deine GPX-Dateien werden geprüft …';
  updateActions();
  try {
    const next = append ? [...files, ...selected] : selected;
    const collection = await readGpxCollection(next);
    if (selectionRevision !== current) return;
    terrainPlan(collection.route, configuration().margin);
    files = next; route = collection.route; sample = false;
    file = next.length === 1 ? next[0] : new File([collection.gpx], collection.filename, { type: 'application/gpx+xml' });
    selecting = false;
    get('routeError').textContent = '';
    get('fileName').textContent = files.length === 1 ? files[0].name : `${files.length} von 10 GPX-Dateien ausgewählt.`;
    showFiles();
    if (restoreFocus) fileInput.focus();
    await renderPreview();
  } catch (error) {
    if (selectionRevision !== current) return;
    get('routeError').textContent = `${error instanceof Error ? error.message : 'Die Dateien konnten nicht gelesen werden.'} Deine bisherige Auswahl bleibt erhalten.`;
  } finally {
    if (selectionRevision === current) selecting = false;
    updateActions();
  }
}
fileInput.addEventListener('change', () => {
  const selected = Array.from(fileInput.files);
  fileInput.value = '';
  selectFiles(selected);
});
for (const event of ['dragenter', 'dragover']) dropzone.addEventListener(event, e => {
  e.preventDefault();
  if (!sending) dropzone.classList.add('is-dragover');
});
for (const event of ['dragleave', 'drop']) dropzone.addEventListener(event, e => {
  e.preventDefault(); dropzone.classList.remove('is-dragover');
});
dropzone.addEventListener('drop', e => {
  if (sending) return;
  const dropped = Array.from(e.dataTransfer?.files || []);
  if (!dropped.length) {
    get('routeError').textContent = 'Bitte GPX-Dateien hineinziehen.'; return;
  }
  selectFiles(dropped);
});
get('sample').addEventListener('click', async () => {
  clearRoute(); sample = true; route = parseGpx(sampleXml);
  get('fileName').textContent = 'Allgäu Panorama Marathon – Marathon (Beispielroute)';
  await renderPreview();
});
get('remove').addEventListener('click', clearRoute);
get('retry').addEventListener('click', renderPreview);
get('engraving').addEventListener('input', () => {
  if (summary() && preview === 'ready') viewer?.personalize(configuration().engraving);
});
get('product').addEventListener('change', () => {
  get('engraving').disabled = sending || !getProduct(get('product').value).engraving;
  if (summary() && preview === 'ready') {
    const settings = configuration();
    viewer?.personalize(settings.engraving, settings.product, settings.wallMount);
  }
});
get('wallMount').addEventListener('change', () => {
  if (summary() && preview === 'ready') {
    const settings = configuration();
    viewer?.personalize(settings.engraving, settings.product, settings.wallMount);
  }
});
for (const link of document.querySelectorAll('[data-configurator-product]')) {
  link.addEventListener('click', event => {
    if (sending) { event.preventDefault(); return; }
    get('product').value = link.dataset.configuratorProduct;
    get('product').dispatchEvent(new Event('change'));
  });
}
get('elevationScale').addEventListener('input', () => {
  if (summary() && preview === 'ready') {
    viewer?.setElevationScale(configuration().elevationScale, configuration().engraving);
  }
});
get('margin').addEventListener('input', () => {
  if (!summary()) return;
  if (!route) return;
  invalidate(); preview = 'loading'; updateActions();
  get('previewBadge').textContent = 'Wird angepasst';
  status('Der Geländeausschnitt wird angepasst …');
  marginTimer = setTimeout(renderPreview, 350);
});
get('resetView').addEventListener('click', () => viewer?.reset());
window.addEventListener('pagehide', () => { controller?.abort(); viewer?.dispose(); viewer = null; });
window.addEventListener('pageshow', event => { if (event.persisted && route) renderPreview(); });
checkout = initializeCheckout({
  state: () => ({
    file, files, sample, preview, busy: sending || selecting, valid: get('engraving').validity.valid,
    configuration: get('engraving').validity.valid ? configuration() : null,
    summary: get('configurationSummary').textContent,
  }),
  capture: () => {
    if (!viewer || preview !== 'ready') throw new Error('Die 3D-Vorschau ist nicht verfügbar. Bitte erneut laden.');
    return viewer.screenshot();
  },
  setBusy: busy => {
    sending = busy;
    for (const id of ['routeControls', 'productControls', 'selectionControls']) get(id).disabled = busy;
    get('engraving').disabled = busy || !getProduct(get('product').value).engraving;
    for (const button of viewButtons) button.disabled = busy || preview !== 'ready';
    updateActions();
  },
});
summary(); updateActions();
