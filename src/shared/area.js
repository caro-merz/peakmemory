export const EARTH_CIRCUMFERENCE = 40075016.686;
export const MIN_AREA_WIDTH = 300;
export const MAX_AREA_WIDTH = 150000;

export function geographicPoint(x, y) {
  return {
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI,
    lon: ((x * 360) % 360 + 360) % 360 - 180,
  };
}

export function areaWidth(area) {
  const { lat } = geographicPoint(area.left + area.size / 2, area.top + area.size / 2);
  return area.size * EARTH_CIRCUMFERENCE * Math.cos(lat * Math.PI / 180);
}

export function parseArea(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !['left', 'top', 'size'].includes(key))
    || ![value.left, value.top, value.size].every(Number.isFinite)
    || value.left < 0 || value.left >= 1 || value.top < 0 || value.size <= 0
    || value.size >= 1 || value.top + value.size > 1) {
    throw new Error('Ungültiger Kartenausschnitt. Bitte einen kleineren Ausschnitt außerhalb der Polarregion wählen.');
  }
  const area = { left: value.left, top: value.top, size: value.size };
  const width = areaWidth(area);
  if (width < MIN_AREA_WIDTH || width > MAX_AREA_WIDTH) {
    throw new Error('Bitte einen Kartenausschnitt zwischen 300 m und 150 km Breite wählen.');
  }
  return area;
}

export function describeArea(area) {
  const selected = parseArea(area);
  const northwest = geographicPoint(selected.left, selected.top);
  const southeast = geographicPoint(selected.left + selected.size, selected.top + selected.size);
  const width = areaWidth(selected);
  return `Kartenausschnitt ohne Route · Nord oben · ca. ${width < 1000
    ? `${Math.round(width)} m` : `${(width / 1000).toFixed(2)} km`} breit · `
    + `Nordwest: ${northwest.lat.toFixed(6)}, ${northwest.lon.toFixed(6)} · `
    + `Südost: ${southeast.lat.toFixed(6)}, ${southeast.lon.toFixed(6)}`;
}
