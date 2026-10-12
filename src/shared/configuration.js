import { getProduct } from './product.js';

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
    || ![1, 2, 3, 4].includes(configuration.version)
    || !(configuration.version >= 3 ? ['base', 'compact', 'frame'] : ['base', 'frame']).includes(configuration.product)
    || (configuration.version === 2 && (configuration.product !== 'base'
      || typeof configuration.elevationScale !== 'number' || !Number.isFinite(configuration.elevationScale)
      || configuration.elevationScale < 1 || configuration.elevationScale > 8))
    || (configuration.version >= 3 && (typeof configuration.elevationScale !== 'number'
      || !Number.isFinite(configuration.elevationScale)
      || configuration.elevationScale < 1 || configuration.elevationScale > 8))
    || typeof configuration.margin !== 'number' || !Number.isFinite(configuration.margin)
    || configuration.margin < 0.05 || configuration.margin > 0.5
    || !['ready', 'unavailable'].includes(configuration.preview)) {
    throw new Error('Ungültige Produktkonfiguration.');
  }
  if ((configuration.version >= 4 && (typeof configuration.wallMount !== 'boolean'
    || (configuration.product === 'frame' && configuration.wallMount)))
    || (configuration.version < 4 && Object.hasOwn(configuration, 'wallMount'))) {
    throw new Error('Ungültige Auswahl der Wandaufhängung.');
  }
  const engraving = validateEngraving(configuration.engraving, configuration.product);
  if (configuration.version >= 3 && !getProduct(configuration.product).engraving && engraving) {
    throw new Error('Der kompakte Holzsockel wird ohne Gravur gefertigt.');
  }
  return {
    version: configuration.version, product: configuration.product, engraving,
    margin: configuration.margin, preview: configuration.preview,
    ...(configuration.version >= 2 ? { elevationScale: configuration.elevationScale } : {}),
    ...(configuration.version >= 4 ? { wallMount: configuration.wallMount } : {}),
  };
}
