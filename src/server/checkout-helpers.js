import { MAX_GPX_SIZE, parseGpx, validateFile } from '../shared/gpx.js';
import { parseConfiguration } from '../shared/configuration.js';
import { MAX_PREVIEW_SIZE, MAX_PREVIEW_DIMENSION } from '../shared/preview.js';

export const MAX_CHECKOUT_SIZE = MAX_GPX_SIZE + MAX_PREVIEW_SIZE + 64 * 1024;
export const MAX_WEBHOOK_SIZE = 256 * 1024;
export const TIMEOUT_MS = 10000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}
export async function guarded(operation, abort) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
      timer = setTimeout(() => {
        abort?.();
        reject(new CheckoutError('Dienst vorübergehend nicht erreichbar. Mit demselben Schlüssel erneut versuchen.', 503));
      }, TIMEOUT_MS);
    })]);
  } finally { clearTimeout(timer); }
}
export async function bytes(request, limit) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) {
    throw new CheckoutError('Anfrage zu groß.', 413);
  }
  if (!request.body) throw new CheckoutError('Leere Anfrage.');
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    await guarded(async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) throw new CheckoutError('Anfrage zu groß.', 413);
        chunks.push(value);
      }
    }, () => { void reader.cancel().catch(() => {}); });
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
  } finally {
    if (size > limit) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function sha256(value) {
  const input = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), b => b.toString(16).padStart(2, '0')).join('');
}
export function base64(value) {
  let text = '';
  for (let offset = 0; offset < value.length; offset += 0x8000) {
    text += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  return btoa(text);
}
export function configured(env) {
  try {
    trustedOrigin(env);
    const live = env.CHECKOUT_MODE === 'live';
    const key = live ? /^(sk|rk)_live_[A-Za-z0-9]+$/ : /^(sk|rk)_test_[A-Za-z0-9]+$/;
    return !!(env.CHECKOUT_DB && env.CHECKOUT_FILES && key.test(env.STRIPE_SECRET_KEY || '')
      && /^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET || '') && env.RESEND_API_KEY
      && (!live || (env.CHECKOUT_LIVE_LEGAL_REVIEWED === 'true' && env.CHECKOUT_LIVE_WAF_REVIEWED === 'true')));
  } catch { return false; }
}
export function modeEnvironment(env, mode) {
  if (mode !== 'test' && mode !== 'live') throw new CheckoutError('Ungültiger Checkout-Modus.');
  if (mode === 'test') {
    return { ...env, CHECKOUT_MODE: 'test', CHECKOUT_DB: env.CHECKOUT_DB, CHECKOUT_FILES: env.CHECKOUT_FILES,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
      CHECKOUT_ENABLED: env.CHECKOUT_ENABLED };
  }
  return { ...env, CHECKOUT_MODE: 'live', CHECKOUT_DB: env.CHECKOUT_LIVE_DB, CHECKOUT_FILES: env.CHECKOUT_LIVE_FILES,
    STRIPE_SECRET_KEY: env.STRIPE_LIVE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: env.STRIPE_LIVE_WEBHOOK_SECRET,
    CHECKOUT_ENABLED: env.CHECKOUT_LIVE_ENABLED };
}
export function trustedOrigin(env) {
  const url = new URL(env.CHECKOUT_ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/'
    || url.search || url.hash) throw new CheckoutError('Checkout nicht konfiguriert.', 503);
  return url.origin;
}
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
function validatePng(preview) {
  const header = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82];
  if (preview.length < 57 || !header.every((b, i) => preview[i] === b)) throw new CheckoutError('Ungültiges PNG.');
  const view = new DataView(preview.buffer, preview.byteOffset, preview.byteLength);
  if (!view.getUint32(16) || !view.getUint32(20) || view.getUint32(16) > MAX_PREVIEW_DIMENSION
    || view.getUint32(20) > MAX_PREVIEW_DIMENSION) throw new CheckoutError('Ungültige PNG-Abmessungen.');
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  if (!depths[preview[25]]?.includes(preview[24]) || preview[26] !== 0 || preview[27] !== 0 || preview[28] > 1) {
    throw new CheckoutError('Ungültiges PNG-Format.');
  }
  let offset = 8, chunks = 0, hasImage = false, hasPalette = false;
  while (offset + 12 <= preview.length && ++chunks <= 4096) {
    const length = view.getUint32(offset);
    if (offset + 12 + length > preview.length) break;
    const type = String.fromCharCode(...preview.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type) || (type === 'IHDR' && offset !== 8)
      || (type[0] === type[0].toUpperCase() && !['IHDR', 'IDAT', 'PLTE', 'IEND'].includes(type))) break;
    let crc = 0xffffffff;
    for (let index = offset + 4; index < offset + 8 + length; index++) crc = (crc >>> 8) ^ crcTable[(crc ^ preview[index]) & 255];
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(offset + 8 + length)) break;
    if (type === 'PLTE') {
      if (hasPalette || hasImage || !length || length > 768 || length % 3) break;
      hasPalette = true;
    }
    if (type === 'IDAT' && length) hasImage = true;
    offset += length + 12;
    if (type === 'IEND') {
      if (!length && hasImage && offset === preview.length && (preview[25] !== 3 || hasPalette)) return;
      break;
    }
  }
  throw new CheckoutError('Unvollständiges oder beschädigtes PNG.');
}
export async function validateCheckout(request) {
  if (!/^multipart\/form-data\s*;/i.test(request.headers.get('content-type') || '')) {
    throw new CheckoutError('Multipart-Formular erforderlich.');
  }
  const raw = await bytes(request, MAX_CHECKOUT_SIZE);
  let form;
  try {
    form = await new Response(raw, { headers: { 'Content-Type': request.headers.get('content-type') } }).formData();
  } catch { throw new CheckoutError('Ungültiges Formular.'); }
  for (const key of new Set(form.keys())) {
    if (form.getAll(key).length !== 1) throw new CheckoutError('Doppelte Formularfelder.');
    if (!['name', 'email', 'configuration', 'gpxFile', 'previewImage', 'submissionKey', 'acceptance', 'price', 'currency'].includes(key)) {
      throw new CheckoutError('Unbekanntes Formularfeld.');
    }
  }
  const text = key => {
    const value = form.get(key);
    if (typeof value !== 'string') throw new CheckoutError('Fehlendes Formularfeld.');
    return value;
  };
  const name = text('name'), email = text('email'), key = text('submissionKey');
  if (!name.trim() || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)
    || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !UUID.test(key)
    || text('acceptance') !== 'true') throw new CheckoutError('Name, E-Mail, UUID oder ausdrückliche Zustimmung ungültig.');
  const rawConfiguration = text('configuration');
  if (rawConfiguration.length > 4096) throw new CheckoutError('Konfiguration zu groß.');
  const configuration = parseConfiguration(rawConfiguration);
  if (![2, 3, 4].includes(configuration?.version) || configuration.preview !== 'ready') {
    throw new CheckoutError('Konfiguration Version 2, 3 oder 4 mit fertiger Vorschau erforderlich.');
  }
  const file = form.get('gpxFile'), image = form.get('previewImage');
  validateFile(file);
  if (typeof file.arrayBuffer !== 'function') throw new CheckoutError('GPX-Datei erforderlich.');
  const gpx = new Uint8Array(await file.arrayBuffer());
  parseGpx(new TextDecoder('utf-8', { fatal: true }).decode(gpx));
  if (!image || typeof image.arrayBuffer !== 'function' || image.type !== 'image/png'
    || !image.size || image.size > MAX_PREVIEW_SIZE) throw new CheckoutError('PNG-Vorschau erforderlich (maximal 1 MB).');
  const preview = new Uint8Array(await image.arrayBuffer());
  validatePng(preview);
  const filename = file.name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200);
  // Hash the exact submitted fields and original bytes, not just normalized manufacturing settings.
  const ignoredPrice = form.has('price') ? text('price') : null;
  const ignoredCurrency = form.has('currency') ? text('currency') : null;
  const digest = await sha256(JSON.stringify([name, email, rawConfiguration, file.name, file.type,
    image.name, image.type, 'true', ignoredPrice, ignoredCurrency, await sha256(gpx), await sha256(preview)]));
  return { name: name.trim(), email, key: key.toLowerCase(), configuration: JSON.stringify(configuration),
    filename, digest, gpx, preview };
}
export async function remote(url, options) {
  const controller = new AbortController();
  return guarded(async () => {
    const response = await fetch(url, { ...options, redirect: 'manual', signal: controller.signal });
    if (!response.ok) throw new CheckoutError('Externer Dienst hat die Anfrage nicht bestätigt.', 502);
    const raw = await bytes(response, MAX_WEBHOOK_SIZE);
    let value;
    try { value = JSON.parse(new TextDecoder().decode(raw)); }
    catch { throw new CheckoutError('Ungültige Dienstantwort.', 502); }
    return value;
  }, () => controller.abort());
}
export async function verifyEvent(request, secret, now = Math.floor(Date.now() / 1000), liveMode = false) {
  if (!/^whsec_[A-Za-z0-9]+$/.test(secret || '')) throw new CheckoutError('Webhook nicht konfiguriert.', 503);
  const raw = await bytes(request, MAX_WEBHOOK_SIZE);
  const header = request.headers.get('stripe-signature') || '';
  if (header.length > 2048) throw new CheckoutError('Ungültige Signatur.', 400);
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([k]) => k === 't').map(([, v]) => v);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v).filter(v => /^[0-9a-f]{64}$/.test(v));
  if (timestamps.length !== 1 || !/^\d{1,12}$/.test(timestamps[0]) || !signatures.length
    || Math.abs(now - Number(timestamps[0])) > 300) throw new CheckoutError('Ungültige oder veraltete Signatur.');
  const prefix = new TextEncoder().encode(`${timestamps[0]}.`);
  const signed = new Uint8Array(prefix.length + raw.length);
  signed.set(prefix); signed.set(raw, prefix.length);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let valid = false;
  for (const signature of signatures) {
    const signatureBytes = new Uint8Array(signature.match(/../g).map(v => parseInt(v, 16)));
    if (await crypto.subtle.verify('HMAC', key, signatureBytes, signed)) valid = true;
  }
  if (!valid) throw new CheckoutError('Ungültige Signatur.');
  let event;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
  catch { throw new CheckoutError('Ungültiges Ereignis.'); }
  if (event?.livemode !== liveMode || event.data?.object?.livemode !== liveMode || !/^evt_[A-Za-z0-9_]+$/.test(event.id || '')) {
    throw new CheckoutError('Ereignis stammt aus dem falschen Stripe-Modus.');
  }
  return { event, digest: await sha256(raw) };
}
