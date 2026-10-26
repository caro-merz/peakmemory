export const TERRAIN_TIMEOUT_MS = 8000;
export const TERRAIN_CACHE_TTL = 86400;
export const MAX_TILE_SIZE = 1024 * 1024;
const UPSTREAM = 'https://tiles.mapterhorn.com';

function errorResponse(message, status, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

async function readTile(response) {
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const length = response.headers.get('content-length');
  if (contentType !== 'image/webp' || (length !== null && (!/^\d+$/.test(length)
    || Number(length) < 26 || Number(length) > MAX_TILE_SIZE)) || !response.body) {
    await response.body?.cancel();
    throw new Error('Ungültige Geländedaten.');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TILE_SIZE) {
        await reader.cancel();
        throw new Error('Geländedaten sind zu groß.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (size < 26 || (length !== null && Number(length) !== size)) throw new Error('Ungültige Geländedaten.');
  const view = new DataView(bytes.buffer);
  const chunkSize = view.getUint32(16, true);
  const dimensions = view.getUint32(21, true);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF'
    || view.getUint32(4, true) !== size - 8
    || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP'
    || String.fromCharCode(...bytes.subarray(12, 16)) !== 'VP8L'
    || bytes[20] !== 0x2f
    || 20 + chunkSize + (chunkSize % 2) !== size
    || (dimensions & 0x3fff) + 1 !== 512
    || ((dimensions >>> 14) & 0x3fff) + 1 !== 512) {
    throw new Error('Ungültige Geländedaten.');
  }
  return bytes;
}

export async function handleTerrain(request, env = {}, context) {
  if (request.method !== 'GET') return errorResponse('Methode nicht erlaubt.', 405, { Allow: 'GET' });
  const url = new URL(request.url);
  const match = /^\/terrain\/(0|[1-9]\d?)\/(0|[1-9]\d{0,4})\/(0|[1-9]\d{0,4})\.webp$/.exec(url.pathname);
  if (!match || url.search) return errorResponse('Ungültige Geländekachel.', 400);
  const [z, x, y] = match.slice(1).map(Number);
  if (z > 14 || x >= 2 ** z || y >= 2 ** z) return errorResponse('Ungültige Geländekachel.', 400);

  const cache = globalThis.caches?.default;
  const cacheKey = new Request(`${url.origin}/terrain/${z}/${x}/${y}.webp`, { method: 'GET' });
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch (error) {
      // A cache outage must not turn a valid tile into an unavailable preview.
      console.error('Terrain cache read failure', error?.name || 'Error');
    }
  }
  if (env.TERRAIN_RATE_LIMITER) {
    try {
      const result = await env.TERRAIN_RATE_LIMITER.limit({
        key: `terrain:${request.headers.get('CF-Connecting-IP') || 'unknown'}`,
      });
      if (!result.success) {
        return errorResponse('Zu viele Geländeanfragen. Bitte warte kurz und versuche es erneut.', 429, { 'Retry-After': '60' });
      }
    } catch (error) {
      console.error('Terrain limiter failure', error?.name || 'Error');
      return errorResponse('Geländedienst vorübergehend nicht verfügbar.', 503);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TERRAIN_TIMEOUT_MS);
  let bytes;
  try {
    const response = await fetch(`${UPSTREAM}/${z}/${x}/${y}.webp`, {
      signal: controller.signal, redirect: 'manual', headers: { Accept: 'image/webp' },
    });
    if (!response.ok) {
      await response.body?.cancel();
      return errorResponse('Geländedaten konnten nicht geladen werden.', response.status === 429 ? 503 : 502,
        response.status === 429 ? { 'Retry-After': '60' } : {});
    }
    bytes = await readTile(response);
  } catch (error) {
    console.error('Terrain upstream failure', error?.name || 'Error');
    return errorResponse('Geländedaten konnten nicht geladen werden.', controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
  const response = new Response(bytes, {
    headers: {
      'Content-Type': 'image/webp', 'Content-Length': String(bytes.length),
      'Cache-Control': `public, max-age=${TERRAIN_CACHE_TTL}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
  if (cache) {
    const saving = Promise.resolve().then(() => cache.put(cacheKey, response.clone())).catch(error => {
      console.error('Terrain cache write failure', error?.name || 'Error');
    });
    if (context?.waitUntil) context.waitUntil(saving);
    else await saving;
  }
  return response;
}
