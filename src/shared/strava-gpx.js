import { MAX_GPX_SIZE, MAX_POINTS, MAX_LATITUDE, parseGpx } from './gpx.js';

const xmlEscape = value => String(value).replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function stravaToGpx(activity, streams) {
  if (!streams || typeof streams !== 'object' || Array.isArray(streams)) throw new Error('Invalid activity streams.');
  const coordinates = streams.latlng?.data;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > MAX_POINTS) {
    throw new Error('Activity needs 2–100,000 GPS points.');
  }
  const optional = name => {
    if (streams[name] === undefined) return undefined;
    const data = streams[name]?.data;
    if (!Array.isArray(data) || data.length !== coordinates.length) throw new Error('Misaligned activity streams.');
    return data;
  };
  const altitude = optional('altitude');
  const time = optional('time');
  const start = typeof activity?.start_date === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(activity.start_date)
    ? Date.parse(activity.start_date) : NaN;
  const points = coordinates.map((coordinate, index) => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2
      || !coordinate.every(Number.isFinite) || Math.abs(coordinate[0]) >= MAX_LATITUDE
      || Math.abs(coordinate[1]) > 180) throw new Error('Invalid activity coordinates.');
    let metadata = '';
    if (altitude) {
      if (!Number.isFinite(altitude[index])) throw new Error('Invalid activity altitude.');
      metadata += `<ele>${altitude[index]}</ele>`;
    }
    if (time) {
      const offset = time[index];
      if (!Number.isFinite(offset) || offset < 0 || (index && offset < time[index - 1])) {
        throw new Error('Invalid activity time.');
      }
      if (Number.isFinite(start)) {
        const timestamp = start + offset * 1000;
        if (!Number.isFinite(timestamp) || Math.abs(timestamp) > 8640000000000000) throw new Error('Invalid activity time.');
        const iso = new Date(timestamp).toISOString();
        if (!/^\d{4}-/.test(iso)) throw new Error('Invalid activity time.');
        metadata += `<time>${iso}</time>`;
      }
    }
    return `<trkpt lat="${coordinate[0]}" lon="${coordinate[1]}">${metadata}</trkpt>`;
  });
  const name = xmlEscape(typeof activity?.name === 'string' ? activity.name.slice(0, 500) : 'Strava activity');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="PeakMemory" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>${points.join('')}</trkseg></trk></gpx>`;
  if (new TextEncoder().encode(gpx).length > MAX_GPX_SIZE) throw new Error('Activity GPX exceeds 5 MiB.');
  parseGpx(gpx);
  return gpx;
}
