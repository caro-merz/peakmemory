import { MAX_GPX_SIZE, MAX_POINTS, MAX_SEGMENTS, parseGpx, validateFile } from './gpx.js';

export const MAX_GPX_FILES = 10;
const encoder = new TextEncoder();
const escapeXml = value => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
  .replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);

export async function readGpxCollection(files) {
  if (!Array.isArray(files) || !files.length || files.length > MAX_GPX_FILES) {
    throw new Error('Bitte 1 bis 10 GPX-Dateien auswählen.');
  }
  let size = 0;
  for (const file of files) {
    try { validateFile(file); }
    catch (error) { throw new Error(`${file?.name || 'Datei'}: ${error.message}`); }
    size += file.size;
  }
  if (size > MAX_GPX_SIZE) throw new Error('Alle GPX-Dateien zusammen dürfen maximal 5 MB groß sein.');
  const sources = [], routes = [];
  let pointCount = 0, segmentCount = 0;
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length !== file.size) throw new Error('Die Dateigröße stimmt nicht mit dem Inhalt überein.');
      if (sources.some(source => source.bytes.length === bytes.length
        && source.bytes.every((byte, index) => byte === bytes[index]))) {
        throw new Error('Diese GPX-Datei ist bereits ausgewählt (identischer Inhalt).');
      }
      const parsed = parseGpx(new TextDecoder('utf-8', { fatal: true }).decode(bytes), { metadata: true });
      pointCount += parsed.pointCount;
      segmentCount += parsed.segmentCount;
      if (pointCount > MAX_POINTS) throw new Error('Alle GPX-Dateien zusammen dürfen maximal 100.000 Streckenpunkte enthalten.');
      if (segmentCount > MAX_SEGMENTS) throw new Error('Alle GPX-Dateien zusammen dürfen maximal 100 Streckenabschnitte enthalten.');
      sources.push({ name: file.name, type: file.type || '', bytes });
      routes.push(parsed);
    } catch (error) {
      throw new Error(`${file.name}: ${error instanceof TypeError ? 'Die GPX-Datei konnte nicht als UTF-8 gelesen werden.' : error.message}`);
    }
  }
  const route = { segments: routes.flatMap(parsed => parsed.segments), pointCount };
  if (sources.length === 1) return { sources, gpx: sources[0].bytes, filename: sources[0].name, route };
  const tracks = routes.map((parsed, index) => `<trk><name>${escapeXml(sources[index].name)}</name>${parsed.segments.map(segment =>
    `<trkseg>${segment.map(point => `<trkpt lat="${point.lat}" lon="${point.lon}">${point.ele === undefined ? '' : `<ele>${point.ele}</ele>`}${point.time === undefined ? '' : `<time>${escapeXml(point.time)}</time>`}</trkpt>`).join('')}</trkseg>`).join('')}</trk>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Peak Memory" xmlns="http://www.topografix.com/GPX/1/1">${tracks}</gpx>`;
  const gpx = encoder.encode(xml);
  if (gpx.length > MAX_GPX_SIZE) {
    throw new Error('Die kombinierte GPX-Datei ist größer als 5 MB. Bitte weniger oder kleinere Dateien auswählen.');
  }
  parseGpx(xml);
  return { sources, gpx, filename: 'peakmemory-routen.gpx', route };
}
