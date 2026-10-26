import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createStravaLocal } from '../scripts/strava-local.js';
import { startDevServer } from '../scripts/dev.js';
import { stravaToGpx } from '../src/shared/strava-gpx.js';
import { MAX_GPX_SIZE, MAX_POINTS, parseGpx } from '../src/shared/gpx.js';

const BASE = 'http://localhost:8123';
const activity = { id: 123, athlete: { id: 7 }, name: 'Hill & <forest>', start_date: '2026-10-01T08:00:00Z', distance: 2345 };
const streams = {
  latlng: { data: [[48, 11], [48.1, 11.1], [48.2, 11.2]] },
  altitude: { data: [500, 520, 510] }, time: { data: [0, 10, 30] },
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const cookieValue = (result, name) => result.headers.getSetCookie().find(value => value.startsWith(`${name}=`))?.split(';')[0];
const instances = [];
afterEach(() => { for (const instance of instances.splice(0)) instance.close(); });
function harness(options = {}) {
  let clock = Date.parse('2026-10-01T08:00:00Z');
  let sequence = 0;
  const calls = [];
  const replies = [];
  const local = createStravaLocal({
    env: { STRAVA_CLIENT_ID: '1234', STRAVA_CLIENT_SECRET: 'test-secret' },
    now: () => clock, randomBytes: () => Buffer.alloc(32, ++sequence), timeoutMs: 50, port: 8123,
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (new URL(url).pathname === '/oauth/token') {
        assert.equal(url, 'https://www.strava.com/oauth/token');
      } else {
        assert.equal(new URL(url).origin, 'https://www.strava.com');
        assert.ok(new URL(url).pathname.startsWith('/api/v3/'));
      }
      assert.equal(init.redirect, 'manual');
      assert.ok(init.signal instanceof AbortSignal);
      const next = replies.shift();
      if (next === undefined) throw new Error('Unexpected upstream call.');
      return typeof next === 'function' ? next(url, init) : next;
    },
    ...options,
  });
  instances.push(local);
  const request = (pathname, { cookie, headers, method = 'GET', host = BASE } = {}) => local.handle(new Request(`${host}${pathname}`, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...headers },
  }));
  const begin = async (query = '') => {
    const result = await request(`/strava/connect${query}`);
    assert.equal(result.status, 302);
    const authorization = new URL(result.headers.get('location'));
    return { result, authorization, state: authorization.searchParams.get('state'), cookie: cookieValue(result, 'pm_strava_state') };
  };
  const complete = (start, query = 'code=test-code&scope=activity:read') => request(`/strava/callback?state=${start.state}&${query}`, { cookie: start.cookie });
  const token = (extra = {}) => response({
    access_token: 'test-access-token', refresh_token: 'must-not-be-retained',
    expires_at: Math.floor(clock / 1000) + 7200, athlete: { id: 7 }, ...extra,
  });
  const login = async (query = '', grant = 'activity:read') => {
    const start = await begin(query);
    replies.push(token());
    const result = await complete(start, `code=test-code&scope=${encodeURIComponent(grant)}`);
    assert.equal(new URL(result.headers.get('location')).searchParams.get('strava'), 'connected');
    return cookieValue(result, 'pm_strava_session');
  };
  return { local, request, begin, complete, token, login, calls, replies, advance(ms) { clock += ms; } };
}

test('local status is actionable without credentials and does not call Strava', async () => {
  const h = harness({ env: {} });
  assert.deepEqual(await (await h.request('/strava/status')).json(), { available: true, configured: false, connected: false });
  const result = await h.request('/strava/connect');
  assert.equal(result.status, 503);
  assert.match((await result.json()).error, /STRAVA_CLIENT_ID.*STRAVA_CLIENT_SECRET/);
  assert.equal(h.calls.length, 0);
  assert.equal(await h.request('/contact'), null);
});

test('OAuth requests explicit consent, localhost callback and bounded HttpOnly state cookie', async () => {
  const h = harness();
  const start = await h.begin();
  assert.equal(start.authorization.origin, 'https://www.strava.com');
  assert.equal(start.authorization.pathname, '/oauth/authorize');
  assert.equal(start.authorization.searchParams.get('redirect_uri'), `${BASE}/strava/callback`);
  assert.equal(start.authorization.searchParams.get('scope'), 'activity:read');
  assert.equal(start.authorization.searchParams.get('approval_prompt'), 'force');
  assert.match(start.result.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=600/);
  assert.doesNotMatch(start.result.headers.get('set-cookie'), /Secure/);
  assert.doesNotMatch(start.authorization.href, /test-secret/);
  const privateStart = await h.begin('?private=true');
  assert.equal(privateStart.authorization.searchParams.get('scope'), 'activity:read,activity:read_all');
});

test('successful OAuth keeps only a local cookie and redirects to fixed homepage status', async () => {
  const h = harness();
  const start = await h.begin();
  h.replies.push(h.token());
  const result = await h.complete(start);
  assert.equal(result.headers.get('location'), `${BASE}/?strava=connected#konfigurator`);
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  const session = cookieValue(result, 'pm_strava_session');
  assert.ok(session);
  assert.match(result.headers.getSetCookie().find(value => value.startsWith(session)), /Max-Age=3600/);
  assert.doesNotMatch(JSON.stringify([...result.headers]), /test-access-token|must-not-be-retained|test-code|test-secret/);
  assert.deepEqual(await (await h.request('/strava/status', { cookie: session })).json(), { available: true, configured: true, connected: true });
  assert.equal(h.calls[0].url, 'https://www.strava.com/oauth/token');
  const form = new URLSearchParams(h.calls[0].init.body);
  assert.equal(form.get('grant_type'), 'authorization_code');
  assert.equal(form.get('client_secret'), 'test-secret');
});

test('OAuth cancellation and provider failures never echo provider fields', async () => {
  for (const [query, status] of [['error=access_denied&error_description=provider-secret', 'denied'], ['error=provider-secret', 'error']]) {
    const h = harness();
    const result = await h.complete(await h.begin(), query);
    assert.equal(result.headers.get('location'), `${BASE}/?strava=${status}#konfigurator`);
    assert.equal(await result.text(), '');
    assert.equal(h.calls.length, 0);
  }
});

test('state requires matching cookie, expires after ten minutes, and cannot be replayed', async () => {
  const h = harness();
  const start = await h.begin();
  let result = await h.request(`/strava/callback?state=${start.state}&code=test-code&scope=activity:read`);
  assert.match(result.headers.get('location'), /strava=error/);
  h.replies.push(h.token());
  result = await h.complete(start);
  assert.match(result.headers.get('location'), /strava=connected/);
  result = await h.complete(start);
  assert.match(result.headers.get('location'), /strava=error/);
  const expired = await h.begin();
  h.advance(600000);
  result = await h.complete(expired);
  assert.match(result.headers.get('location'), /strava=error/);
  assert.equal(h.calls.length, 1);
});

test('missing granted scopes reject before exchanging code, including optional private permission', async () => {
  for (const [query, granted] of [['', 'read'], ['?private=true', 'activity:read']]) {
    const h = harness();
    const result = await h.complete(await h.begin(query), `code=test-code&scope=${granted}`);
    assert.match(result.headers.get('location'), /strava=error/);
    assert.equal(h.calls.length, 0);
  }
});

test('token exchange failures and malformed tokens return only fixed error redirects', async () => {
  for (const make of [
    h => response({ error: 'provider-sensitive-body' }, 429),
    h => h.token({ athlete: { id: 8.2 } }),
    h => h.token({ expires_at: 0 }),
    h => h.token({ access_token: 'invalid\nheader' }),
    h => () => { throw new Error('provider-sensitive-body'); },
  ]) {
    const h = harness();
    h.replies.push(make(h));
    const result = await h.complete(await h.begin());
    assert.equal(result.headers.get('location'), `${BASE}/?strava=error#konfigurator`);
    assert.equal((await (await h.request('/strava/status')).json()).connected, false);
  }
});

test('activity list is paginated at ten and exposes only the contracted fields', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response(Array.from({ length: 10 }, (_, index) => ({ ...activity, id: 123 + index, secret: 'not-client-data' }))));
  const result = await h.request('/strava/activities?page=2', { cookie: session });
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.page, 2);
  assert.equal(body.hasMore, true);
  assert.equal(body.activities.length, 10);
  assert.deepEqual(body.activities[0], { id: '123', name: activity.name, startDate: activity.start_date, distance: 2345 });
  assert.match(h.calls.at(-1).url, /page=2&per_page=10$/);
  assert.equal(h.calls.at(-1).init.headers.Authorization, 'Bearer test-access-token');
  h.replies.push(response([]));
  assert.deepEqual(await (await h.request('/strava/activities', { cookie: session })).json(), { activities: [], hasMore: false, page: 1 });
  for (const page of ['0', '-1', '1.5', '10000', '1e3']) {
    assert.equal((await h.request(`/strava/activities?page=${page}`, { cookie: session })).status, 400);
  }
});

test('activity list rejects malformed responses instead of leaking provider data', async () => {
  const h = harness();
  const session = await h.login();
  for (const value of [{ data: [activity] }, Array(11).fill(activity), [{ ...activity, distance: -1 }], [{ ...activity, id: 1.2 }]]) {
    h.replies.push(response(value));
    const result = await h.request('/strava/activities', { cookie: session });
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { error: 'Invalid Strava activity list.' });
  }
});

test('ownership is verified server-side before fetching GPS streams', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response({ ...activity, athlete: { id: 8 } }));
  assert.equal((await h.request('/strava/gpx?id=123', { cookie: session })).status, 403);
  assert.equal(h.calls.length, 2);
  h.replies.push(response({ ...activity, id: 124 }));
  assert.equal((await h.request('/strava/gpx?id=123', { cookie: session })).status, 403);
  assert.equal(h.calls.length, 3);
  for (const id of ['-1', '1%2Fstreams', '1.1', '0']) {
    assert.equal((await h.request(`/strava/gpx?id=${id}`, { cookie: session })).status, 400);
  }
});

test('GPX attachment has a safe filename, parsed coordinates and aligned optional metadata', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response(activity), response(streams));
  const result = await h.request('/strava/gpx?id=123', { cookie: session });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('content-type'), 'application/gpx+xml; charset=utf-8');
  assert.equal(result.headers.get('content-disposition'), 'attachment; filename="strava-123.gpx"');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const gpx = await result.text();
  assert.match(gpx, /Hill &amp; &lt;forest&gt;/);
  const parsed = parseGpx(gpx, { metadata: true });
  assert.equal(parsed.pointCount, 3);
  assert.equal(parsed.segments[0][1].ele, 520);
  assert.equal(parsed.segments[0][1].time, '2026-10-01T08:00:10.000Z');
  assert.match(h.calls.at(-1).url, /streams\?keys=latlng,altitude,time&key_by_type=true$/);
});

test('private activities require explicit private consent', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response({ ...activity, private: true }));
  assert.equal((await h.request('/strava/gpx?id=123', { cookie: session })).status, 403);
  const privateSession = await h.login('?private=true', 'activity:read,activity:read_all');
  h.replies.push(response({ ...activity, private: true }), response(streams));
  assert.equal((await h.request('/strava/gpx?id=123', { cookie: privateSession })).status, 200);
});

test('absent optional streams and invalid or absent start dates do not fabricate metadata', () => {
  const minimal = { latlng: streams.latlng };
  const parsed = parseGpx(stravaToGpx({}, minimal), { metadata: true });
  assert.deepEqual(parsed.segments[0][0], { lat: 48, lon: 11 });
  for (const start_date of [undefined, 'not-a-date']) {
    const gpx = stravaToGpx({ start_date }, streams);
    assert.doesNotMatch(gpx, /<time>/);
    assert.match(gpx, /<ele>500<\/ele>/);
  }
  const escaped = stravaToGpx({ name: `"'<>&\u0000` }, minimal);
  assert.match(escaped, /&quot;&apos;&lt;&gt;&amp;/);
  assert.doesNotMatch(escaped, /\u0000/);
});

test('malformed streams reject without bridging gaps or coercing coordinates and metadata', () => {
  const bad = [
    null, [], {}, { latlng: { data: [] } },
    { latlng: { data: [[48, 11]] } },
    { latlng: { data: [[48, 11], null, [48.2, 11.2]] } },
    { latlng: { data: [[48, 11], ['48.1', 11.1]] } },
    { latlng: { data: [[48, 11], [90, 11.1]] } },
    { latlng: { data: [[48, 11], [48.1, 181]] } },
    { latlng: { data: [[48, 11], [NaN, 11.1]] } },
    { latlng: { data: [[48, 11], [48, 11]] } },
    { ...streams, altitude: { data: [1, 2] } },
    { ...streams, altitude: { data: [1, null, 3] } },
    { ...streams, time: { data: [0, 1] } },
    { ...streams, time: { data: [0, -1, 2] } },
    { ...streams, time: { data: [0, 10, 9] } },
    { ...streams, time: { data: [0, '10', 30] } },
    { ...streams, time: { data: [0, 10, Infinity] } },
    { ...streams, time: { data: [0, 10, 86400000000000] } },
  ];
  for (const value of bad) assert.throws(() => stravaToGpx(activity, value));
});

test('point and generated byte limits are enforced before delivery', () => {
  assert.throws(() => stravaToGpx(activity, { latlng: { data: Array(MAX_POINTS + 1).fill([48, 11]) } }), /100,000/);
  const data = Array.from({ length: MAX_POINTS }, (_, index) => [48 + index % 2, 11]);
  const gpx = stravaToGpx({}, { latlng: { data } });
  assert.equal(parseGpx(gpx).pointCount, MAX_POINTS);
  assert.ok(Buffer.byteLength(gpx) <= MAX_GPX_SIZE);
  assert.throws(() => stravaToGpx(activity, {
    latlng: { data }, altitude: { data: Array(MAX_POINTS).fill(1234567890.1234567) },
    time: { data: Array(MAX_POINTS).fill(0) },
  }), /5 MiB/);
});

test('malformed provider GPS is a sanitized 422', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response(activity), response({ ...streams, latlng: { data: [[48, 11], null, [48.2, 11.2]] } }));
  const result = await h.request('/strava/gpx?id=123', { cookie: session });
  assert.equal(result.status, 422);
  assert.deepEqual(await result.json(), { error: 'Activity has invalid, missing, or oversized GPS data.' });
});

test('upstream errors, 429, redirects, invalid JSON and oversized responses stay bounded and sanitized', async () => {
  const h = harness();
  const session = await h.login();
  for (const [reply, status] of [
    [response({ error: 'provider-sensitive-body' }, 429), 429],
    [response({ error: 'provider-sensitive-body' }, 500), 502],
    [new Response(null, { status: 302, headers: { Location: 'https://untrusted.invalid' } }), 502],
    [new Response('not-json'), 502],
    [new Response('[]', { headers: { 'Content-Length': String(1024 * 1024 + 1) } }), 502],
    [new Response('x'.repeat(1024 * 1024 + 1)), 502],
  ]) {
    h.replies.push(reply);
    const result = await h.request('/strava/activities', { cookie: session });
    assert.equal(result.status, status);
    assert.doesNotMatch(await result.text(), /provider-sensitive-body|test-access-token|untrusted/);
  }
});

test('upstream HTTP failures expose actionable status without provider data', async () => {
  for (const [upstreamStatus, localStatus, hint] of [
    [401, 401, /Reconnect and grant activity access/],
    [403, 403, /permissions.*restrictions/],
    [404, 502, /activity is accessible/],
    [500, 502, /Try again later/],
  ]) {
    const h = harness();
    const session = await h.login();
    h.replies.push(response({ message: 'provider-sensitive-body' }, upstreamStatus));
    const result = await h.request('/strava/activities', { cookie: session });
    assert.equal(result.status, localStatus);
    const { error } = await result.json();
    assert.ok(error.includes(`HTTP ${upstreamStatus}`));
    assert.match(error, hint);
    assert.doesNotMatch(error, /provider-sensitive-body|test-access-token|test-secret/);
    assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, upstreamStatus !== 401);
  }
});

test('403 distinguishes missing token scopes from non-JSON request blocking', async () => {
  const h = harness();
  const session = await h.login();
  for (const [reply, hint] of [
    [response({ errors: [{ resource: 'AccessToken', field: 'activity:read_permission', code: 'missing' }], message: 'provider-sensitive-body' }, 403), /missing activity permission.*Remove the local connection/],
    [new Response('<html>provider-sensitive-body</html>', { status: 403 }), /non-JSON response.*not a confirmed activity permission error/],
    [response({ errors: [{ resource: 'provider-sensitive-body', field: 'activity:read_permission', code: 'missing' }] }, 403), /app access restrictions/],
  ]) {
    h.replies.push(reply);
    const result = await h.request('/strava/activities', { cookie: session });
    assert.equal(result.status, 403);
    const { error } = await result.json();
    assert.match(error, hint);
    assert.doesNotMatch(error, /provider-sensitive-body|test-access-token|test-secret/);
  }
});

test('fetch and response-body timeouts abort and return sanitized 504', async () => {
  const h = harness({ timeoutMs: 5 });
  const session = await h.login();
  let fetchSignal;
  h.replies.push((url, init) => { fetchSignal = init.signal; return new Promise(() => {}); });
  assert.equal((await h.request('/strava/activities', { cookie: session })).status, 504);
  assert.equal(fetchSignal.aborted, true);
  let cancelled = false;
  h.replies.push(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  const result = await h.request('/strava/activities', { cookie: session });
  assert.equal(result.status, 504);
  assert.equal(cancelled, true);
});

test('sessions expire after one hour or access-token expiry, whichever comes first', async () => {
  for (const tokenSeconds of [7200, 60]) {
    const h = harness();
    const start = await h.begin();
    h.replies.push(h.token({ expires_at: Math.floor(Date.parse(activity.start_date) / 1000) + tokenSeconds }));
    const completed = await h.complete(start);
    const session = cookieValue(completed, 'pm_strava_session');
    assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, true);
    h.advance(Math.min(tokenSeconds, 3600) * 1000);
    assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, false);
    assert.equal((await h.request('/strava/activities', { cookie: session })).status, 401);
  }
});

test('disconnect requires same-origin POST and clears session plus pending state', async () => {
  const h = harness();
  const session = await h.login();
  const pending = await h.begin();
  const jar = `${session}; ${pending.cookie}`;
  assert.equal((await h.request('/strava/disconnect', { cookie: jar })).status, 405);
  for (const origin of [undefined, 'http://evil.invalid', 'http://localhost:9000', 'null']) {
    assert.equal((await h.request('/strava/disconnect', {
      cookie: jar, method: 'POST', headers: origin ? { Origin: origin } : {},
    })).status, 403);
  }
  const result = await h.request('/strava/disconnect', { cookie: jar, method: 'POST', headers: { Origin: BASE } });
  assert.equal(result.status, 200);
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.ok(result.headers.getSetCookie().every(value => value.endsWith('Max-Age=0')));
  assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, false);
  assert.match((await h.complete(pending)).headers.get('location'), /strava=error/);
});

test('a rejected upstream token invalidates the local session', async () => {
  const h = harness();
  const session = await h.login();
  h.replies.push(response({ message: 'sensitive' }, 401));
  assert.equal((await h.request('/strava/activities', { cookie: session })).status, 401);
  assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, false);
});

test('loopback host and origin guards prevent alternate-host OAuth', async () => {
  const h = harness();
  const ip = await h.request('/strava/connect', { host: 'http://127.0.0.1:8123' });
  assert.equal(ip.status, 400);
  assert.match((await ip.json()).error, /localhost/);
  assert.equal((await h.request('/strava/status', { host: 'http://evil.invalid:8123' })).status, 400);
  assert.equal((await h.request('/strava/status', { host: 'https://localhost:8123' })).status, 400);
  assert.equal((await h.request('/strava/status', { host: 'http://localhost:9000' })).status, 400);
  assert.equal((await h.local.handle({
    url: 'http://user@localhost:8123/strava/status', method: 'GET', headers: new Headers(),
  })).status, 400);
  assert.equal((await h.request('/strava/connect', { headers: { Origin: 'http://evil.invalid' } })).status, 403);
});

test('endpoint rate limits, pending-state cap, and close cleanup are bounded', async () => {
  const h = harness();
  for (let index = 0; index < 100; index++) await h.begin();
  assert.equal((await h.request('/strava/connect')).status, 429);
  h.advance(600000);
  await h.begin();
  for (let index = 0; index < 239; index++) assert.equal((await h.request('/strava/status')).status, 200);
  assert.equal((await h.request('/strava/status')).status, 429);
  h.advance(60000);
  assert.equal((await h.request('/strava/status')).status, 200);
  const session = await h.login();
  h.local.close();
  assert.equal((await h.request('/strava/status', { cookie: session })).status, 503);
});

test('session capacity refuses additional OAuth sessions', async () => {
  const full = harness();
  for (let index = 0; index < 100; index++) {
    if (index === 60) full.advance(60000);
    await full.login();
  }
  const start = await full.begin();
  full.replies.push(full.token());
  assert.match((await full.complete(start)).headers.get('location'), /strava=error/);
});

test('provider stream bodies are bounded to five MiB before GPX generation', async () => {
  const h = harness();
  const session = await h.login();
  for (const oversized of [
    new Response('{}', { headers: { 'Content-Length': String(MAX_GPX_SIZE + 1) } }),
    new Response('x'.repeat(MAX_GPX_SIZE + 1)),
  ]) {
    h.replies.push(response(activity), oversized);
    const result = await h.request('/strava/gpx?id=123', { cookie: session });
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { error: 'Strava response exceeds the size limit.' });
  }
});

test('idle sessions are actively purged on expiry and cleanup cancels remaining timers', async () => {
  const timers = new Map();
  let sequence = 0;
  const h = harness({
    setTimer(callback, delay) {
      const id = ++sequence;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) { timers.delete(id); },
  });
  const session = await h.login();
  assert.equal(timers.size, 1);
  const expiry = [...timers.values()][0];
  assert.equal(expiry.delay, 3600000);
  // Trigger expiry without another request or advancing the injected clock.
  expiry.callback();
  assert.equal(timers.size, 0);
  assert.equal((await (await h.request('/strava/status', { cookie: session })).json()).connected, false);
  await h.login();
  await h.begin();
  assert.equal(timers.size, 2);
  h.local.close();
  assert.equal(timers.size, 0);
});

test('local HTTP server leaves Strava disabled and rejects untrusted Host', async () => {
  const server = await startDevServer(0);
  const port = server.address().port;
  const send = (host, pathname, extraHeaders = {}) => new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1', port, path: pathname, headers: { Host: host, ...extraHeaders },
    }, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('end', () => resolve({ status: incoming.statusCode, headers: incoming.headers, body: Buffer.concat(chunks).toString() }));
    });
    request.on('error', reject);
    request.end();
  });
  try {
    assert.equal(server.address().address, '127.0.0.1');
    for (const pathname of ['/strava/status', '/strava/connect', '/strava/callback', '/strava/activities', '/strava/gpx']) {
      const result = await send(`localhost:${port}`, pathname);
      assert.equal(result.status, 404);
      assert.equal(result.headers.location, undefined);
      assert.equal(result.headers['set-cookie'], undefined);
    }
    for (const host of [`evil.invalid:${port}`, `localhost:${port + 1}`, `localhost.evil.invalid:${port}`, 'localhost']) {
      assert.equal((await send(host, '/strava/status')).status, 400);
    }
    assert.equal((await send(`127.0.0.1:${port}`, '/strava/connect')).status, 404);
    assert.equal((await send(`localhost:${port}`, '/\\evil.invalid/strava/status')).status, 400);
  } finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('OAuth denial consumes the matching state before redirect', async () => {
  const h = harness();
  const pending = await h.begin();
  assert.match((await h.complete(pending, 'error=access_denied')).headers.get('location'), /strava=denied/);
  assert.match((await h.complete(pending)).headers.get('location'), /strava=error/);
  assert.equal(h.calls.length, 0);
});
