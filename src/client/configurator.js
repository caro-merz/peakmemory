import './configurator.css';
import { parseGpx } from '../shared/gpx.js';
import { readGpxCollection } from '../shared/gpx-collection.js';
import { parseConfiguration, validateEngraving } from '../shared/configuration.js';
import { terrainPlan, areaPlan } from '../shared/geometry.js';
import { describeArea } from '../shared/area.js';
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
let source = 'gpx', confirmedArea = null, candidateArea = null, mapError = '', areaPicker = null, mapLoading = null;
const routeExample = get('engraving').value;
const areaExample = 'Deine Landschaft';

function configuration() {
  if (source === 'area' && !confirmedArea) return null;
  return parseConfiguration({
    version: 6, source, product: get('product').value,
    wallMount: get('product').value !== 'frame' && get('wallMount').value === 'yes',
    engraving: getProduct(get('product').value).engraving ? get('engraving').value : '',
    elevationScale: Number(get('elevationScale').value),
    ...(source === 'area' ? { area: confirmedArea } : { margin: Number(get('margin').value) / 100 }),
    preview: preview === 'ready' ? 'ready' : 'unavailable',
  });
}
function summary() {
  const product = getProduct(get('product').value);
  get('engraving').disabled = sending || !product.engraving;
  get('engravingControls').hidden = !product.engraving;
  get('engravingUnavailable').hidden = product.engraving;
  if (product.engraving) {
    get('engraving').rows = product.engravingMaxLines;
    get('engravingHint').textContent = `Max. ${product.engravingMaxLines} Zeilen und insgesamt 120 Zeichen. Beispielwerte – bitte an deine ${source === 'area' ? 'Landschaft' : 'Tour'} anpassen.`;
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
    settings = configuration() ?? {
      engraving: validateEngraving(product.engraving ? get('engraving').value : '', product.id),
      elevationScale: Number(get('elevationScale').value), margin: Number(get('margin').value) / 100,
    };
    get('engraving').setCustomValidity('');
    get('configurationSummary').classList.remove('error');
  } catch (error) {
    get('engraving').setCustomValidity(error.message);
    get('configurationSummary').textContent = error.message;
    get('configurationSummary').classList.add('error');
    updateActions();
    return false;
  }
  get('configurationSummary').textContent = `${product.name} · ${product.dimensions} · ${source === 'area'
    ? confirmedArea ? describeArea(confirmedArea) : 'Bitte Kartenausschnitt bestätigen'
    : `Rand ${Math.round(settings.margin * 100)} %`} · Höhen ${settings.elevationScale}× · Gravur: ${settings.engraving || 'keine'}${product.id !== 'frame' ? ` · Wandaufhängung: ${get('wallMount').value === 'yes' ? 'ja (+1 €)' : 'nein'} · 4 transparente Schutzfüße` : ''}`;
  get('elevationValue').textContent = `${settings.elevationScale}×`;
  get('elevationNote').textContent = `${settings.elevationScale}-fach`;
  get('marginValue').textContent = `${Math.round(Number(get('margin').value))} %`;
  updateActions();
  return true;
}
function updateActions() {
  get('remove').disabled = sending || !route && !file;
  get('retry').hidden = !(source === 'area' ? confirmedArea : route) || preview !== 'unavailable';
  get('confirmArea').disabled = sending || source !== 'area' || !candidateArea || !!mapError;
  get('retryMap').disabled = sending || !!mapLoading;
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
  if (!(source === 'area' ? confirmedArea : route)) return;
  preview = 'loading';
  controller = new AbortController();
  const activeController = controller;
  const timeout = setTimeout(() => activeController.abort(new Error('Das Laden dauert zu lange. Bitte versuche es erneut.')), 30000);
  get('previewBadge').textContent = 'Wird geladen';
  get('viewer').setAttribute('aria-busy', 'true');
  status('Öffentliche Höhendaten werden geladen und deine Landschaft wird geformt …');
  updateActions();
  try {
    const settings = configuration();
    const plan = source === 'area' ? areaPlan(settings.area) : terrainPlan(route, settings.margin);
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
    const latest = configuration();
    viewer.show(grid, latest.elevationScale, latest.engraving, true, latest.product, latest.wallMount);
    get('placeholder').hidden = true;
    preview = 'ready';
    get('previewBadge').textContent = source === 'area' ? 'Ohne Route' : sample ? 'Beispielroute' : files.length > 1 ? 'Deine Routen' : 'Deine Route';
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
    terrainPlan(collection.route, Number(get('margin').value) / 100);
    files = next; route = collection.route; sample = false;
    file = next.length === 1 ? next[0] : new File([collection.gpx], collection.filename, { type: 'application/gpx+xml' });
    selecting = false;
    get('routeError').textContent = '';
    get('fileName').textContent = files.length === 1 ? files[0].name : `${files.length} von 10 GPX-Dateien ausgewählt.`;
    showFiles();
    if (restoreFocus) fileInput.focus();
    if (source === 'gpx') await renderPreview();
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
  if (source !== 'gpx' || !route) return;
  invalidate(); preview = 'loading'; updateActions();
  get('previewBadge').textContent = 'Wird angepasst';
  status('Der Geländeausschnitt wird angepasst …');
  marginTimer = setTimeout(renderPreview, 350);
});
get('resetView').addEventListener('click', () => viewer?.reset());
window.addEventListener('pagehide', () => { controller?.abort(); viewer?.dispose(); viewer = null; });
window.addEventListener('pageshow', event => { if (event.persisted && (source === 'area' ? confirmedArea : route)) renderPreview(); });
checkout = initializeCheckout({
  state: () => ({
    source, area: confirmedArea, file: source === 'gpx' ? file : null,
    files: source === 'gpx' ? files : [], sample: source === 'gpx' && sample,
    preview, busy: sending || selecting, valid: get('engraving').validity.valid,
    configuration: get('engraving').validity.valid ? configuration() : null,
    summary: get('configurationSummary').textContent,
  }),
  capture: () => {
    if (!viewer || preview !== 'ready') throw new Error('Die 3D-Vorschau ist nicht verfügbar. Bitte erneut laden.');
    return viewer.screenshot();
  },
  setBusy: busy => {
    sending = busy;
    for (const id of ['sourceControls', 'routeControls', 'productControls', 'selectionControls']) get(id).disabled = busy;
    areaPicker?.setBusy(busy);
    get('engraving').disabled = busy || !getProduct(get('product').value).engraving;
    for (const button of viewButtons) button.disabled = busy || preview !== 'ready';
    updateActions();
  },
});

function unconfirmArea() {
  if (source !== 'area' || !confirmedArea) return;
  confirmedArea = null;
  invalidate();
  get('previewBadge').textContent = 'Ausschnitt bestätigen';
  status('Die Karte wurde verändert. Bestätige deinen neuen Ausschnitt für die 3D-Vorschau.');
  summary();
}

async function openMap() {
  if (areaPicker) { areaPicker.refresh(); return; }
  if (mapLoading) return mapLoading;
  get('areaStatus').textContent = 'Karte wird geladen …';
  mapLoading = (async () => {
    try {
      const { createAreaPicker } = await import('./area-picker.js');
      if (source !== 'area') return;
      areaPicker = createAreaPicker({
        container: get('areaMap'), frame: get('areaFrame'),
        onMoving: () => {
          candidateArea = null;
          mapError = 'Die Karte wird verschoben …';
          get('areaStatus').textContent = mapError;
          unconfirmArea();
          updateActions();
        },
        onChange: (area, error, description) => {
          candidateArea = area; mapError = error;
          if (error && confirmedArea) unconfirmArea();
          get('areaDescription').textContent = description;
          get('areaStatus').textContent = error || (confirmedArea
            ? 'Dieser Ausschnitt wird für dein Relief ohne Route verwendet.'
            : 'Ausschnitt bereit. Bestätige das Quadrat, um dein Relief zu sehen.');
          get('areaStatus').className = error && !error.includes('geladen …') ? 'error' : 'hint';
          updateActions();
        },
      });
    } catch (error) {
      mapError = error.message || 'Die Karte konnte nicht geladen werden.';
      get('areaStatus').textContent = `${mapError} Bitte „Karte erneut laden“ wählen.`;
      get('areaStatus').className = 'error';
    } finally { mapLoading = null; updateActions(); }
  })();
  return mapLoading;
}

for (const input of document.querySelectorAll('input[name=terrainSource]')) {
  input.addEventListener('change', async () => {
    if (!input.checked || sending) return;
    source = input.value;
    invalidate();
    get('routeControls').hidden = source === 'area';
    get('areaControls').hidden = source !== 'area';
    get('marginControls').hidden = source === 'area';
    if (get('engraving').value === (source === 'area' ? routeExample : areaExample)) {
      get('engraving').value = source === 'area' ? areaExample : routeExample;
    }
    get('placeholder').querySelector('small').textContent = source === 'area'
      ? 'Wähle und bestätige einen Kartenausschnitt – ganz ohne Route.'
      : 'Lade eine Route hoch oder probiere die Beispielroute.';
    get('previewBadge').textContent = source === 'area' ? 'Ausschnitt bestätigen' : 'Noch keine Route';
    status(source === 'area' ? 'Wähle einen Kartenausschnitt für die 3D-Vorschau.' : 'Wähle eine Route, um die 3D-Vorschau zu starten.');
    summary();
    if (source === 'area') await openMap();
    if ((source === 'area' ? confirmedArea : route) && get('engraving').validity.valid) await renderPreview();
  });
}
get('confirmArea').addEventListener('click', () => {
  if (sending || source !== 'area' || !candidateArea || mapError) return;
  confirmedArea = { ...candidateArea };
  get('areaStatus').textContent = 'Dieser Ausschnitt wird für dein Relief ohne Route verwendet.';
  if (summary()) renderPreview();
});
get('retryMap').addEventListener('click', () => {
  if (sending) return;
  if (areaPicker) areaPicker.retry(); else openMap();
});
document.querySelector('.inquiry a').addEventListener('click', event => {
  if (source !== 'area') return;
  if (sending || !confirmedArea || !summary()) {
    event.preventDefault();
    status('Bitte zuerst einen Kartenausschnitt bestätigen und deine Einstellungen prüfen.', true);
    return;
  }
  const form = get('contactForm');
  if (!form) { event.preventDefault(); status('Bitte öffne das Kontaktformular auf der Startseite.', true); return; }
  document.dispatchEvent(new CustomEvent('peakmemory:area-inquiry', {
    detail: { configuration: configuration(), description: get('configurationSummary').textContent },
  }));
});
summary(); updateActions();
