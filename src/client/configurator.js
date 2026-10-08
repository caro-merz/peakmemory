import './configurator.css';
import { parseGpx, validateFile } from '../shared/gpx.js';
import { parseConfiguration } from '../shared/configuration.js';
import { terrainPlan } from '../shared/geometry.js';
import { loadTerrain } from './terrain.js';
import sampleXml from './sample.gpx';

const get = id => document.getElementById(id);
const fileInput = get('gpxFile'), dropzone = get('dropzone'), form = get('inquiryForm');
const viewButtons = ['rotate', 'zoomIn', 'zoomOut', 'resetView'].map(get);
let file = null, route = null, sample = false, preview = 'unavailable', viewer = null;
let generation = 0, controller = null, marginTimer = null, sending = false;

function configuration() {
  return parseConfiguration({
    version: 2, product: 'base', engraving: get('engraving').value,
    elevationScale: Number(get('elevationScale').value),
    margin: Number(get('margin').value) / 100, preview: preview === 'ready' ? 'ready' : 'unavailable',
  });
}
function summary() {
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
  get('configurationSummary').textContent = `Eiche-Holzsockel · Rand ${Math.round(settings.margin * 100)} % · Höhen ${settings.elevationScale}× · Gravur: ${settings.engraving || 'keine'}`;
  get('elevationValue').textContent = `${settings.elevationScale}×`;
  get('elevationNote').textContent = `${settings.elevationScale}-fach`;
  get('marginValue').textContent = `${Math.round(settings.margin * 100)} %`;
  updateActions();
  return true;
}
function updateActions() {
  get('submitInquiry').disabled = sending || !file || !route || sample || preview === 'loading' || !get('engraving').validity.valid;
  get('remove').disabled = sending || !route && !file;
  get('retry').hidden = !route || preview !== 'unavailable';
  for (const button of viewButtons) button.disabled = preview !== 'ready';
  get('inquiryHint').textContent = !route || sample
    ? 'Bitte lade deine eigene GPX-Datei hoch. Die Beispielroute kann nicht angefragt werden.'
    : preview === 'loading' ? 'Deine Vorschau wird geladen.'
      : preview === 'ready' ? 'Deine Originaldatei und Gestaltungswünsche werden mit der Anfrage gesendet.'
        : 'Die Vorschau ist nicht verfügbar. Du kannst deine gültige GPX-Datei trotzdem unverbindlich anfragen.';
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
  invalidate();
  file = route = null; sample = false;
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
    viewer.show(grid, configuration().elevationScale, get('engraving').value);
    get('placeholder').hidden = true;
    preview = 'ready';
    get('previewBadge').textContent = sample ? 'Beispielroute' : 'Deine Route';
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
async function selectFile(selected, keepPicker = false) {
  clearRoute(!keepPicker);
  const current = generation;
  get('inquiryStatus').textContent = '';
  if (!selected) return;
  try {
    validateFile(selected);
    status('Deine GPX-Datei wird geprüft …');
    const parsed = parseGpx(await selected.text());
    if (generation !== current) return;
    file = selected; route = parsed;
    get('fileName').textContent = selected.name;
    await renderPreview();
  } catch (error) {
    if (generation !== current) return;
    fileInput.value = '';
    status(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.', true);
    updateActions();
  }
}
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 1) { clearRoute(); status('Bitte nur eine GPX-Datei auswählen.', true); return; }
  selectFile(fileInput.files[0], true);
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
  const files = e.dataTransfer?.files;
  if (!files || files.length !== 1) {
    clearRoute(); status('Bitte genau eine GPX-Datei hineinziehen.', true); return;
  }
  selectFile(files[0]);
});
get('sample').addEventListener('click', async () => {
  clearRoute(); sample = true; route = parseGpx(sampleXml);
  get('fileName').textContent = 'Allgäu Panorama Marathon – Marathon (Beispielroute)';
  get('inquiryStatus').textContent = '';
  await renderPreview();
});
get('remove').addEventListener('click', clearRoute);
get('retry').addEventListener('click', renderPreview);
get('engraving').addEventListener('input', () => {
  if (summary() && preview === 'ready') viewer?.personalize(get('engraving').value);
});
get('elevationScale').addEventListener('input', () => {
  if (summary() && preview === 'ready') {
    viewer?.setElevationScale(configuration().elevationScale, get('engraving').value);
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
get('rotate').addEventListener('click', () => viewer?.rotate());
get('zoomIn').addEventListener('click', () => viewer?.zoom(0.85));
get('zoomOut').addEventListener('click', () => viewer?.zoom(1.15));
get('resetView').addEventListener('click', () => viewer?.reset());
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (!file || !route || sample || preview === 'loading' || !summary()) {
    get('inquiryStatus').textContent = 'Bitte lade zuerst deine eigene GPX-Datei hoch und warte auf die Prüfung.';
    get('inquiryStatus').className = 'error';
    return;
  }
  const body = new FormData(form);
  body.set('type', 'individual'); body.set('gpxFile', file);
  body.set('configuration', JSON.stringify(configuration()));
  sending = true;
  for (const id of ['routeControls', 'productControls', 'inquiryFields']) get(id).disabled = true;
  get('submitInquiry').textContent = 'Wird gesendet …';
  get('inquiryStatus').textContent = '';
  updateActions();
  try {
    const response = await fetch('/contact', { method: 'POST', body, signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'Die Anfrage konnte nicht gesendet werden.');
    get('inquiryStatus').textContent = 'Deine Anfrage wurde gesendet. Wir melden uns persönlich mit den nächsten Schritten!';
    get('inquiryStatus').className = 'success';
    form.reset(); clearRoute();
  } catch (error) {
    get('inquiryStatus').textContent = error.name === 'TimeoutError'
      ? 'Keine Versandbestätigung erhalten. Bitte prüfe vor erneutem Senden bei uns, ob deine Anfrage angekommen ist.'
      : `Versand fehlgeschlagen: ${error.message || 'Verbindungsfehler'}. Deine Eingaben bleiben erhalten. Alternativ: peak.memory@web.de`;
    get('inquiryStatus').className = 'error';
  } finally {
    sending = false;
    for (const id of ['routeControls', 'productControls', 'inquiryFields']) get(id).disabled = false;
    get('submitInquiry').textContent = 'Unverbindlich anfragen';
    updateActions();
  }
});
window.addEventListener('pagehide', () => { controller?.abort(); viewer?.dispose(); viewer = null; });
window.addEventListener('pageshow', event => { if (event.persisted && route) renderPreview(); });
summary(); updateActions();
