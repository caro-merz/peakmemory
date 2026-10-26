import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import { MAX_GPX_SIZE } from '../src/shared/gpx.js';
import { stravaToGpx } from '../src/shared/strava-gpx.js';

const SESSION_COOKIE = 'pm_strava_session';
const STATE_COOKIE = 'pm_strava_state';
const HOUR = 60 * 60 * 1000;
const STATE_TTL = 10 * 60 * 1000;
const CAPACITY = 100;
const idOf = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value) ? value
  : typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
// This service is loopback HTTP only; Secure cookies require a future HTTPS server.
const cookie = (name, value, age) => `${name}=${value}; Path=/strava; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
class LocalError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createStravaLocal({
  env = process.env, fetch: fetchUpstream = globalThis.fetch, now = Date.now,
  randomBytes = cryptoRandomBytes, timeoutMs = 10000, port = 8000,
  setTimer = setTimeout, clearTimer = clearTimeout,
} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local server port.');
  const origin = `http://localhost:${port}`;
  const states = new Map();
  const sessions = new Map();
  let requests = [];
  let closed = false;
  const configured = () => typeof env.STRAVA_CLIENT_ID === 'string' && /^[1-9]\d*$/.test(env.STRAVA_CLIENT_ID)
    && typeof env.STRAVA_CLIENT_SECRET === 'string' && !!env.STRAVA_CLIENT_SECRET.trim();
  const random = () => randomBytes(32).toString('hex');
  const remove = (store, key) => {
    const entry = store.get(key);
    if (entry) {
      clearTimer(entry.timer);
      if ('token' in entry) entry.token = '';
    }
    store.delete(key);
  };
  const put = (store, key, entry) => {
    remove(store, key);
    entry.timer = setTimer(() => remove(store, key), Math.max(0, entry.expires - now()));
    entry.timer?.unref?.();
    store.set(key, entry);
  };
  const prune = () => {
    for (const store of [states, sessions]) for (const [key, entry] of store) if (entry.expires <= now()) remove(store, key);
  };
  const cookies = request => {
    const result = {};
    for (const part of (request.headers.get('cookie') || '').split(';')) {
      const [key, ...value] = part.trim().split('=');
      if ([SESSION_COOKIE, STATE_COOKIE].includes(key)) result[key] = value.join('=');
    }
    return result;
  };
  async function upstream(url, options = {}, limit = 1024 * 1024) {
    const controller = new AbortController();
    let timer;
    let reader;
    const operation = async () => {
      const response = await fetchUpstream(url, { ...options, redirect: 'manual', signal: controller.signal });
      if (response.status === 429) throw new LocalError(429, 'Strava rate limit reached. Try again later.');
      if (!response.ok && response.status !== 403) {
        const message = response.status === 401 ? 'Strava rejected the authorization (HTTP 401). Reconnect and grant activity access.'
          : response.status === 403 ? 'Strava denied access (HTTP 403). Check the granted activity permissions and the API app access restrictions.'
          : response.status === 404 ? 'Strava could not find the requested resource (HTTP 404). Check that the activity is accessible to your connected account.'
          : `Strava request failed (HTTP ${response.status}). Try again later.`;
        throw new LocalError(response.status === 401 ? 401 : response.status === 403 ? 403 : 502, message);
      }
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new LocalError(502, 'Strava response exceeds the size limit.');
      if (!response.body) throw new LocalError(502, 'Invalid Strava response.');
      reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw new LocalError(502, 'Strava response exceeds the size limit.');
        chunks.push(value);
      }
      let result;
      try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch {
        throw new LocalError(response.status === 403 ? 403 : 502, response.status === 403
          ? 'Strava blocked the API request (HTTP 403, non-JSON response). This is not a confirmed activity permission error.'
          : 'Invalid Strava response.');
      }
      if (response.status === 403) {
        console.error('[strava 403]', JSON.stringify(result));
        const missingScope = Array.isArray(result?.errors) && result.errors.some(error =>
          error?.resource === 'AccessToken' && error.code === 'missing'
          && ['activity:read_permission', 'activity:read_all_permission', 'read_permission'].includes(error.field));
        throw new LocalError(403, missingScope
          ? 'Strava reports a missing activity permission (HTTP 403). Remove the local connection, reconnect, and enable activity access on the Strava consent screen.'
          : 'Strava denied access (HTTP 403). Check the granted activity permissions and the API app access restrictions.');
      }
      return result;
    };
    try {
      return await Promise.race([operation(), new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new LocalError(504, 'Strava request timed out.'));
        }, timeoutMs);
      })]);
    } catch (error) {
      controller.abort();
      if (reader) void reader.cancel().catch(() => {});
      if (error instanceof LocalError) throw error;
      throw new LocalError(502, 'Strava is currently unavailable.');
    } finally { clearTimeout(timer); }
  }
  const callbackRedirect = (origin, status) => new Response(null, {
    status: 302, headers: {
      Location: `${origin}/?strava=${status}#konfigurator`, 'Cache-Control': 'no-store',
      'Set-Cookie': cookie(STATE_COOKIE, '', 0), 'Referrer-Policy': 'no-referrer',
    },
  });
  async function handle(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/strava/') && url.pathname !== '/strava') return null;
    if (closed) return json({ error: 'Local Strava service is closed.' }, 503);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)
      || Number(url.port || '80') !== port || url.username || url.password) {
      return json({ error: 'Use the local development server.' }, 400);
    }
    prune();
    const jar = cookies(request);
    const session = sessions.get(jar[SESSION_COOKIE]);
    requests = requests.filter(timestamp => timestamp > now() - 60000);
    if (requests.length >= 240) return json({ error: 'Too many local requests. Try again later.' }, 429);
    requests.push(now());
    const routes = {
      '/strava/status': 'GET', '/strava/connect': 'GET', '/strava/callback': 'GET',
      '/strava/activities': 'GET', '/strava/gpx': 'GET', '/strava/disconnect': 'POST',
    };
    if (!routes[url.pathname]) return json({ error: 'Not found.' }, 404);
    if (request.method !== routes[url.pathname]) return json({ error: 'Method not allowed.' }, 405);
    try {
      if (url.pathname === '/strava/status') return json({ available: true, configured: configured(), connected: !!session });
      if (url.pathname === '/strava/disconnect') {
        if (request.headers.get('origin') !== url.origin) throw new LocalError(403, 'Invalid local request origin.');
        remove(sessions, jar[SESSION_COOKIE]);
        remove(states, jar[STATE_COOKIE]);
        const response = json({ connected: false });
        response.headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
        response.headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0));
        return response;
      }
      if (url.pathname === '/strava/callback') {
        const state = url.searchParams.get('state');
        const pending = state && state === jar[STATE_COOKIE] ? states.get(state) : null;
        if (!pending) return callbackRedirect(origin, 'error');
        remove(states, state);
        if (url.searchParams.has('error')) return callbackRedirect(origin, url.searchParams.get('error') === 'access_denied' ? 'denied' : 'error');
        const code = url.searchParams.get('code');
        const scopes = (url.searchParams.get('scope') || '').split(',');
        if (!configured() || !code || code.length > 2048 || !pending.scopes.every(scope => scopes.includes(scope))) {
          return callbackRedirect(origin, 'error');
        }
        try {
          const token = await upstream('https://www.strava.com/oauth/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, code, grant_type: 'authorization_code' }).toString(),
          });
          const athlete = idOf(token?.athlete?.id);
          const expires = Math.min(now() + HOUR, token?.expires_at * 1000);
          if (!athlete || typeof token.access_token !== 'string' || !token.access_token
            || token.access_token.length > 4096 || /[\s\x00-\x1f\x7f]/.test(token.access_token)
            || !Number.isFinite(token.expires_at) || !Number.isFinite(expires) || expires <= now()) {
            return callbackRedirect(origin, 'error');
          }
          if (closed || sessions.size >= CAPACITY) return callbackRedirect(origin, 'error');
          remove(sessions, jar[SESSION_COOKIE]);
          const sessionId = random();
          put(sessions, sessionId, { token: token.access_token, athlete, expires, private: pending.private });
          const response = callbackRedirect(origin, 'connected');
          response.headers.append('Set-Cookie', cookie(SESSION_COOKIE, sessionId, Math.floor((expires - now()) / 1000)));
          return response;
        } catch { return callbackRedirect(origin, 'error'); }
      }
      if (url.pathname === '/strava/connect') {
        if (url.hostname !== 'localhost') throw new LocalError(400, 'Open this app at http://localhost with the same port before connecting Strava.');
        if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) throw new LocalError(403, 'Invalid local request origin.');
        if (!configured()) throw new LocalError(503, 'Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env.local and restart the local server.');
        if (!['true', 'false', null].includes(url.searchParams.get('private'))) throw new LocalError(400, 'Invalid private activity option.');
        remove(states, jar[STATE_COOKIE]);
        if (states.size >= CAPACITY) throw new LocalError(429, 'Too many pending connections. Try again later.');
        const state = random();
        const includePrivate = url.searchParams.get('private') === 'true';
        const scopes = ['activity:read', ...(includePrivate ? ['activity:read_all'] : [])];
        put(states, state, { expires: now() + STATE_TTL, scopes, private: includePrivate });
        const authorize = new URL('https://www.strava.com/oauth/authorize');
        authorize.search = new URLSearchParams({
          client_id: env.STRAVA_CLIENT_ID, redirect_uri: `${origin}/strava/callback`,
          response_type: 'code', approval_prompt: 'force', scope: scopes.join(','), state,
        }).toString();
        return new Response(null, { status: 302, headers: {
          Location: authorize.href, 'Set-Cookie': cookie(STATE_COOKIE, state, STATE_TTL / 1000), 'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        } });
      }
      if (!session) throw new LocalError(401, 'Connect Strava first.');
      const authorization = { headers: { Authorization: `Bearer ${session.token}` } };
      if (url.pathname === '/strava/activities') {
        const pageText = url.searchParams.get('page') || '1';
        if (!/^[1-9]\d{0,3}$/.test(pageText)) throw new LocalError(400, 'Invalid activity page.');
        const page = Number(pageText);
        const result = await upstream(`https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=10`, authorization);
        if (!Array.isArray(result) || result.length > 10) throw new LocalError(502, 'Invalid Strava activity list.');
        const activities = result.map(activity => {
          const id = idOf(activity?.id);
          if (!id || typeof activity.name !== 'string' || activity.name.length > 1000
            || typeof activity.start_date !== 'string' || !Number.isFinite(Date.parse(activity.start_date))
            || !Number.isFinite(activity.distance) || activity.distance < 0) throw new LocalError(502, 'Invalid Strava activity list.');
          return { id, name: activity.name, startDate: activity.start_date, distance: activity.distance };
        });
        return json({ activities, hasMore: result.length === 10, page });
      }
      const id = idOf(url.searchParams.get('id'));
      if (!id) throw new LocalError(400, 'Invalid activity id.');
      const activity = await upstream(`https://www.strava.com/api/v3/activities/${id}`, authorization);
      if (!activity || idOf(activity.id) !== id || idOf(activity.athlete?.id) !== session.athlete) throw new LocalError(403, 'This activity does not belong to the connected athlete.');
      if (activity.private === true && !session.private) throw new LocalError(403, 'Reconnect with private activity permission.');
      const streams = await upstream(`https://www.strava.com/api/v3/activities/${id}/streams?keys=latlng,altitude,time&key_by_type=true`, authorization, MAX_GPX_SIZE);
      let gpx;
      try { gpx = stravaToGpx(activity, streams); }
      catch { throw new LocalError(422, 'Activity has invalid, missing, or oversized GPS data.'); }
      return new Response(gpx, { headers: {
        'Content-Type': 'application/gpx+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="strava-${id}.gpx"`, 'Cache-Control': 'no-store',
      } });
    } catch (error) {
      if (error instanceof LocalError) {
        if (error.status === 401) remove(sessions, jar[SESSION_COOKIE]);
        return json({ error: error.message }, error.status);
      }
      return json({ error: 'Local Strava request failed.' }, 500);
    }
  }
  return { handle, close() {
    closed = true;
    for (const store of [states, sessions]) for (const key of store.keys()) remove(store, key);
    requests = [];
  } };
}
