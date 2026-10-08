import { MAX_GPX_SIZE, parseGpx, validateFile } from '../shared/gpx.js';
import { parseConfiguration } from '../shared/configuration.js';
import { MAX_PREVIEW_SIZE, MAX_PREVIEW_DIMENSION } from '../shared/preview.js';

export const CONTACT_TIMEOUT_MS = 10000;
export const MAX_CONTACT_SIZE = MAX_GPX_SIZE + MAX_PREVIEW_SIZE + 64 * 1024;
const RECIPIENT = 'peak.memory@web.de';
const SENDER = 'kontakt@peak-memory.de';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPE_LABELS = {
  individual: 'Individuelle Bestellung (Einzelstück)',
  event: 'Event-Anfrage (ab 30 Stück)',
  other: 'Sonstiges',
};
const DELIVERY_ERROR = 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.';

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

async function readBody(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_CONTACT_SIZE)) {
    throw new RangeError('Die Anfrage ist zu groß.');
  }
  if (!request.body) throw new Error('Ungültige Anfrage.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CONTACT_SIZE) {
        await reader.cancel();
        throw new RangeError('Die Anfrage ist zu groß.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(new Blob(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } });
}

function base64(bytes) {
  const chunks = [];
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
  }
  return btoa(chunks.join(''));
}

async function createAttachment(file) {
  if (file == null || file === '' || (typeof file === 'object' && file.name === '' && file.size === 0)) return null;
  if (typeof file !== 'object' || typeof file.arrayBuffer !== 'function' || typeof file.name !== 'string') {
    throw new Error('Ungültiger Dateiupload.');
  }
  validateFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size || bytes.byteLength > MAX_GPX_SIZE) {
    throw new Error('Ungültiger Dateiupload.');
  }
  parseGpx(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  return { filename: file.name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200), content: base64(bytes) };
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') return json({ error: 'Methode nicht erlaubt.' }, 405, { Allow: 'POST' });
  if (!env.RESEND_API_KEY) return json({ error: 'Serverkonfigurationsfehler' }, 500);

  let data;
  try {
    const body = await readBody(request);
    const contentType = request.headers.get('content-type') || '';
    if (contentType.toLowerCase().startsWith('application/json')) {
      data = await body.json();
    } else {
      const form = await body.formData();
      for (const key of ['name', 'email', 'type', 'message', 'gpxFile', 'configuration', 'previewImage']) {
        if (form.getAll(key).length > 1) throw new Error('Doppelte Formularfelder.');
      }
      data = Object.fromEntries(form);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Ungültige Anfrage.');
  } catch (error) {
    return json({ error: error instanceof RangeError ? 'Die Anfrage ist zu groß.' : 'Ungültige Anfrage.' },
      error instanceof RangeError ? 413 : 400);
  }
  const { name, email, type, message, gpxFile } = data;
  if (typeof name !== 'string' || !name.trim()) return json({ error: 'Name ist ein Pflichtfeld.' }, 400);
  if (typeof email !== 'string' || email.trim().length > 200 || !EMAIL_RE.test(email.trim())) {
    return json({ error: 'Ungültige E-Mail-Adresse.' }, 400);
  }
  if (typeof message !== 'string' || message.trim().length < 5) return json({ error: 'Nachricht ist zu kurz.' }, 400);
  if (name.length > 10000 || message.length > 20000) return json({ error: 'Die Formularfelder sind zu lang.' }, 400);

  let configuration;
  let attachment;
  let previewAttachment;
  try {
    configuration = parseConfiguration(data.configuration);
    attachment = await createAttachment(gpxFile);
    if (configuration && !attachment) {
      throw new Error('Bitte deine persönliche GPX-Datei für die Konfigurator-Anfrage hochladen.');
    }
    if (data.previewImage != null) {
      const image = data.previewImage;
      if (!configuration || configuration.preview !== 'ready' || typeof image !== 'object'
        || typeof image.arrayBuffer !== 'function' || image.type !== 'image/png'
        || !image.size || image.size > MAX_PREVIEW_SIZE) {
        throw new Error('Ungültiges Vorschaubild (PNG, maximal 1 MB).');
      }
      const bytes = new Uint8Array(await image.arrayBuffer());
      const header = [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82];
      if (bytes.length !== image.size || bytes.length < 33 || !header.every((value, index) => bytes[index] === value)) {
        throw new Error('Ungültiges PNG-Vorschaubild.');
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16), height = view.getUint32(20);
      if (!width || !height || width > MAX_PREVIEW_DIMENSION || height > MAX_PREVIEW_DIMENSION) {
        throw new Error('Das Vorschaubild hat ungültige Abmessungen.');
      }
      previewAttachment = { filename: 'peakmemory-vorschau.png', content: base64(bytes), content_type: 'image/png' };
    }
  } catch (error) {
    return json({ error: error instanceof TypeError ? 'Ungültiger Dateiupload.' : error.message }, 400);
  }

  const safeName = name.trim().replace(/[\r\n]/g, ' ').slice(0, 200);
  const safeEmail = email.trim();
  const safeType = typeof type === 'string' && Object.hasOwn(TYPE_LABELS, type) ? TYPE_LABELS[type] : 'Nicht angegeben';
  const lines = [
    `Name:    ${safeName}`, `E-Mail:  ${safeEmail}`, `Art:     ${safeType}`, '', 'Nachricht:', message.trim().slice(0, 4000),
  ];
  if (configuration) {
    lines.push('', `Konfiguration (Version ${configuration.version}):`,
      `Produkt: ${configuration.product === 'base' ? 'Relief auf Eichenholzsockel' : 'Gerahmtes Relief'}`,
      `Gravur: ${configuration.engraving || '(keine)'}`,
      `Geländerand: ${Math.round(configuration.margin * 100)} %`,
      `Höhenüberhöhung: ${configuration.version === 2 ? configuration.elevationScale : 1.5}×`,
      `Online-Vorschau: ${configuration.preview === 'ready' ? 'bereit (illustrativ)' : 'nicht verfügbar'}`,
      'Die endgültige Produktionsvorschau wird separat abgestimmt.');
    lines.push(previewAttachment ? 'Vorschaubild: als PNG angehängt (illustrative Online-Konfiguration).'
      : 'Vorschaubild: nicht angehängt.');
  }
  const payload = {
    from: SENDER, to: RECIPIENT, reply_to: safeEmail,
    subject: `Anfrage von ${safeName} – ${safeType}`, text: lines.join('\n'),
    ...(attachment ? { attachments: [attachment, ...(previewAttachment ? [previewAttachment] : [])] } : {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'manual', signal: controller.signal,
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return json({ error: DELIVERY_ERROR }, 502);
    }
    await response.body?.cancel();
    return json({ ok: true });
  } catch (error) {
    console.error('Contact delivery failure', error?.name || 'Error');
    return json({ error: DELIVERY_ERROR }, controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
}
