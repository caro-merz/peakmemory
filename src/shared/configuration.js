export function validateEngraving(value) {
  if (typeof value !== 'string' || value.length > 120
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new Error('Bitte höchstens 120 Zeichen ohne Steuerzeichen als Gravur eingeben.');
  }
  const text = value.replace(/\r\n?/g, '\n');
  if (text.split('\n').length > 3) {
    throw new Error('Die Gravur darf maximal 3 Zeilen enthalten.');
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
    || ![1, 2].includes(configuration.version) || !['base', 'frame'].includes(configuration.product)
    || (configuration.version === 2 && (configuration.product !== 'base'
      || typeof configuration.elevationScale !== 'number' || !Number.isFinite(configuration.elevationScale)
      || configuration.elevationScale < 1 || configuration.elevationScale > 8))
    || typeof configuration.margin !== 'number' || !Number.isFinite(configuration.margin)
    || configuration.margin < 0.05 || configuration.margin > 0.5
    || !['ready', 'unavailable'].includes(configuration.preview)) {
    throw new Error('Ungültige Produktkonfiguration.');
  }
  return {
    version: configuration.version, product: configuration.product, engraving: validateEngraving(configuration.engraving),
    margin: configuration.margin, preview: configuration.preview,
    ...(configuration.version === 2 ? { elevationScale: configuration.elevationScale } : {}),
  };
}
