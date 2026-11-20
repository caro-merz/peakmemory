import { geographicPoint, parseArea } from './area.js';

export function areaBoundaryGpx(value) {
  const { left, top, size } = parseArea(value);
  const points = [
    geographicPoint(left, top),
    geographicPoint(left + size, top),
    geographicPoint(left + size, top + size),
    geographicPoint(left, top + size),
    geographicPoint(left, top),
  ];
  const track = points.map(({ lat, lon }) =>
    `<trkpt lat="${lat.toFixed(14)}" lon="${lon.toFixed(14)}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Peak Memory" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Kartenausschnitt Grenze</name><trkseg>${track}</trkseg></trk></gpx>`;
}
