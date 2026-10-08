import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const MAX_GPX_SIZE = 5 * 1024 * 1024;
export const MAX_POINTS = 100000;
export const MAX_SEGMENTS = 100;
export const MAX_LATITUDE = 85.0511287798;

export function validateFile(file) {
  if (!file || typeof file.name !== 'string' || !/\.gpx$/i.test(file.name)) {
    throw new Error('Bitte eine Datei mit der Endung .gpx auswählen.');
  }
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_GPX_SIZE) {
    throw new Error('Bitte eine nicht leere GPX-Datei mit maximal 5 MB auswählen.');
  }
}

const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseGpx(xml) {
  if (typeof xml !== 'string' || !xml.trim() || new TextEncoder().encode(xml).length > MAX_GPX_SIZE) {
    throw new Error('Die GPX-Datei ist leer oder größer als 5 MB.');
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    throw new Error('GPX-Dateien mit DTD oder XML-Entitäten werden nicht unterstützt.');
  }
  if (XMLValidator.validate(xml) !== true) {
    throw new Error('Die Datei enthält kein gültiges XML.');
  }
  const parser = new XMLParser({
    ignoreAttributes: false, removeNSPrefix: true, parseAttributeValue: false,
    parseTagValue: false, processEntities: false,
  });
  const document = parser.parse(xml);
  const roots = Object.keys(document).filter(key => !key.startsWith('?'));
  const gpx = document.gpx;
  if (roots.length !== 1 || roots[0] !== 'gpx' || !gpx || typeof gpx !== 'object'
    || !['1.0', '1.1'].includes(gpx['@_version'])) {
    throw new Error('Bitte eine gültige GPX-Datei (Version 1.0 oder 1.1) hochladen.');
  }
  const rawSegments = array(gpx.trk).flatMap(track => array(track.trkseg).map(segment => array(segment.trkpt)))
    .concat(array(gpx.rte).map(route => array(route.rtept)));
  if (rawSegments.length > MAX_SEGMENTS) {
    throw new Error('Die Vorschau unterstützt maximal 100 Streckenabschnitte.');
  }
  let count = 0;
  const segments = rawSegments.map(points => points.map(point => {
    count += 1;
    if (count > MAX_POINTS) throw new Error('Die GPX-Datei darf maximal 100.000 Streckenpunkte enthalten.');
    const latText = point['@_lat'];
    const lonText = point['@_lon'];
    if (typeof latText !== 'string' || typeof lonText !== 'string'
      || !numberPattern.test(latText) || !numberPattern.test(lonText)) {
      throw new Error('Ein Streckenpunkt enthält ungültige Koordinaten.');
    }
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error('Ein Streckenpunkt liegt außerhalb des gültigen Koordinatenbereichs.');
    }
    if (Math.abs(lat) >= MAX_LATITUDE) {
      throw new Error('Polare Routen außerhalb von ±85,05° werden in der Gelände-Vorschau nicht unterstützt.');
    }
    return { lat, lon };
  }).filter((point, index, points) => !index || point.lat !== points[index - 1].lat || point.lon !== points[index - 1].lon))
    .filter(segment => segment.length >= 2);
  if (!segments.length) {
    throw new Error('Die GPX-Datei braucht mindestens zwei unterschiedliche Punkte in einem Track oder einer Route.');
  }
  return { segments, pointCount: count };
}
