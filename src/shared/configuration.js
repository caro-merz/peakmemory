import { getProduct } from './product.js';
import { parseArea } from './area.js';

export function validateEngraving(value, productId = 'base') {
  if (typeof value !== 'string' || value.length > 120
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error('Bitte höchstens 120 Zeichen ohne Steuerzeichen als Gravur eingeben.');
  }
  const text = value.replace(/\r\n?/g, '\n');
  const maxLines = getProduct(productId).engravingMaxLines || 3;
  if (text.split('\n').length > maxLines) {
    throw new Error(`Die Gravur darf maximal ${maxLines} Zeilen enthalten.`);
  }
  return text.trim() ? text : '';
}

export function parseConfiguration(value) {
  if (value == null || value === '') return null;
  let configuration;
  try {
    configuration = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new Error('Die Konfiguration ist kein gültiges JSON.');
  }
  if (!configuration || Array.isArray(configuration) || typeof configuration !== 'object'
    || ![1, 2, 3, 4, 5, 6].includes(configuration.version)
    || !(configuration.version >= 3 ? ['base', 'compact', 'frame'] : ['base', 'frame']).includes(configuration.product)
    || (configuration.version === 2 && (configuration.product !== 'base'
      || typeof configuration.elevationScale !== 'number' || !Number.isFinite(configuration.elevationScale)
      || configuration.elevationScale < 1 || configuration.elevationScale > 8))
    || (configuration.version >= 3 && (typeof configuration.elevationScale !== 'number'
      || !Number.isFinite(configuration.elevationScale)
      || configuration.elevationScale < 1 || configuration.elevationScale > 8))
    || (!(configuration.version === 6 && configuration.source === 'area')
      && (typeof configuration.margin !== 'number' || !Number.isFinite(configuration.margin)
        || configuration.margin < 0.05 || configuration.margin > 0.5))
    || !['ready', 'unavailable'].includes(configuration.preview)) {
    throw new Error('Ungültige Produktkonfiguration.');
  }
  if ((configuration.version >= 4 && (typeof configuration.wallMount !== 'boolean'
    || (configuration.product === 'frame' && configuration.wallMount)))
    || (configuration.version < 4 && Object.hasOwn(configuration, 'wallMount'))) {
    throw new Error('Ungültige Auswahl der Wandaufhängung.');
  }
  const engraving = validateEngraving(configuration.engraving, configuration.product);
  if (configuration.version === 6 && (!['gpx', 'area'].includes(configuration.source)
    || (configuration.source === 'area' && Object.hasOwn(configuration, 'margin'))
    || (configuration.source === 'gpx' && Object.hasOwn(configuration, 'area')))) {
    throw new Error('Ungültige Geländequelle oder widersprüchliche Ausschnittseinstellungen.');
  }
  if (configuration.version < 6 && (Object.hasOwn(configuration, 'source') || Object.hasOwn(configuration, 'area'))) {
    throw new Error('Kartenausschnitte benötigen Konfiguration Version 6.');
  }
  if (configuration.version >= 3 && !getProduct(configuration.product).engraving && engraving) {
    throw new Error('Der kompakte Holzsockel wird ohne Gravur gefertigt.');
  }
  return {
    version: configuration.version, product: configuration.product, engraving,
    ...(configuration.version === 6 && configuration.source === 'area'
      ? { source: 'area', area: parseArea(configuration.area) }
      : { margin: configuration.margin, ...(configuration.version === 6 ? { source: 'gpx' } : {}) }),
    preview: configuration.preview,
    ...(configuration.version >= 2 ? { elevationScale: configuration.elevationScale } : {}),
    ...(configuration.version >= 4 ? { wallMount: configuration.wallMount } : {}),
  };
}
