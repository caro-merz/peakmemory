import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { File } from 'node:buffer';
import worker from '../worker.js';
import {
  STRIPE_API_VERSION, STRIPE_WEBHOOK_API_VERSION, handleCheckout, handleOrderStatus, handleShopStatus,
  handleStripeWebhook, checkoutMaintenance,
} from '../src/server/checkout.js';
import { MAX_CHECKOUT_SIZE, MAX_WEBHOOK_SIZE } from '../src/server/checkout-helpers.js';
import { MAX_GPX_SIZE } from '../src/shared/gpx.js';
import { MAX_PREVIEW_SIZE } from '../src/shared/preview.js';
import { PURCHASE_INFORMATION_TEXT } from '../src/shared/purchase.js';
import { orderEmail } from '../src/server/order-email.js';
import { PRODUCTS, configurationPrice } from '../src/shared/product.js';
import { onRequest as pagesCheckout } from '../functions/checkout.js';
import { onRequest as pagesStatus } from '../functions/order-status.js';
import { onRequest as pagesWebhook } from '../functions/stripe-webhook.js';
import { onRequest as pagesShop } from '../functions/shop-status.js';

const originalFetch = globalThis.fetch, originalTimeout = globalThis.setTimeout, originalNow = Date.now;
const databases = [];
afterEach(() => {
  globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; Date.now = originalNow;
  for (const database of databases.splice(0)) database.close();
});
const gpx = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="47" lon="11"/><trkpt lat="47.1" lon="11.1"/></trkseg></trk></gpx>';
const config = { version: 2, product: 'base', engraving: 'Mein Gipfel', margin: 0.15, elevationScale: 1.5, preview: 'ready' };
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const origin = 'https://peak-memory.de';
test('order emails escape personal content and distinguish test, live, buyer and owner details', () => {
  const order = { id: 'order-example', name: '<img src=x>', email: 'ada@example.com',
    filename: 'route.gpx', session_id: 'cs_test_example',
    configuration: JSON.stringify({ ...config, engraving: '<script>alert(1)</script>\nA & B' }), mode: 'test' };
  const details = { shipping: { name: '<Ada>', address: { line1: 'Street 1', postal_code: '10115', city: 'Berlin', country: 'DE' } } };
  const buyer = orderEmail(order, details, 'buyer');
  assert.match(buyer.html, /&lt;script&gt;/);
  assert.doesNotMatch(buyer.html, /<script>|<img src=x>/);
  assert.match(buyer.html, /A &amp; B/);
  assert.match(buyer.text, /Kein Geld wurde abgebucht/);
  assert.doesNotMatch(buyer.html, /cs_test_example|route\.gpx/);
  assert.match(orderEmail(order, details, 'owner').html, /route\.gpx|cs_test_example/);
  const live = orderEmail({ ...order, mode: 'live' }, details, 'buyer');
  assert.ok(live.text.includes(PURCHASE_INFORMATION_TEXT));
  assert.match(live.html, /Kaufhinweise &amp; Widerruf/);
  assert.doesNotMatch(live.subject, /TEST/);
});
const req = (route, options) => new Request(origin + route, options);
const key = () => crypto.randomUUID();
function environment() {
  const db = new DatabaseSync(':memory:');
  databases.push(db);
  db.exec(readFileSync(new URL('../migrations/0001_checkout.sql', import.meta.url), 'utf8'));
  const d1 = {
    prepare(sql) {
      let args = [];
      const result = {
        bind(...values) { args = values; return result; },
        async first() { return db.prepare(sql).get(...args) || null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() { const change = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(change.changes) } }; },
      };
      return result;
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        db.exec('COMMIT'); return result;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  const objects = new Map();
  const env = {
    CHECKOUT_ENABLED: 'true', CHECKOUT_ORIGIN: origin,
    STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_mock', RESEND_API_KEY: 're_mock',
    CHECKOUT_DB: d1,
    CHECKOUT_FILES: {
      async put(path, bytes) { objects.set(path, new Uint8Array(bytes)); },
      async get(path) {
        const bytes = objects.get(path);
        return bytes ? { async arrayBuffer() { return bytes.slice().buffer; } } : null;
      },
      async delete(paths) { for (const path of [].concat(paths)) objects.delete(path); },
    },
  };
  return { env, db, objects };
}
function configureLive(context) {
  const live = environment();
  context.env.CHECKOUT_ENABLED = 'false';
  Object.assign(context.env, {
    CHECKOUT_LIVE_DB: live.env.CHECKOUT_DB,
    CHECKOUT_LIVE_FILES: live.env.CHECKOUT_FILES,
    STRIPE_LIVE_SECRET_KEY: 'sk_live_mock',
    STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_livemock',
    CHECKOUT_LIVE_ENABLED: 'true',
    CHECKOUT_LIVE_LEGAL_REVIEWED: 'true',
    CHECKOUT_LIVE_WAF_REVIEWED: 'true',
  });
  context.live = live;
  return context;
}
function checkout(submissionKey = key(), fields = {}, configureForm) {
  const form = new FormData();
  const values = {
    name: 'Ada', email: 'ada@example.com', submissionKey, acceptance: 'true',
    configuration: JSON.stringify(config), gpxFile: new File([gpx], 'Original.GPX', { type: 'application/gpx+xml' }),
    previewImage: new File([image], 'preview.png', { type: 'image/png' }), ...fields,
  };
  for (const [name, value] of Object.entries(values)) if (value !== undefined) form.append(name, value);
  configureForm?.(form);
  return req('/checkout', { method: 'POST', body: form });
}
function mockServices({ stripe, mail } = {}) {
  const sessions = new Map(), calls = [], emails = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    if (url === 'https://api.stripe.com/v1/checkout/sessions') {
      assert.equal(options.headers['Stripe-Version'], '2026-09-30.endive');
      const params = new URLSearchParams(options.body);
      calls.push({ params, options });
      const id = params.get('client_reference_id');
      const response = sessions.get(id) || {
        id: `cs_${params.has('metadata[live_order]') ? 'live' : 'test'}_${id.replaceAll('-', '')}`,
        livemode: params.has('metadata[live_order]'), mode: 'payment',
        url: `https://checkout.stripe.com/c/pay/cs_${params.has('metadata[live_order]') ? 'live' : 'test'}_${id.replaceAll('-', '')}`,
        client_reference_id: id, metadata: {
          order_id: id, ...(params.has('metadata[live_order]') ? { live_order: 'true' } : { test_only: 'true' }),
        }, amount_total: Number(params.get('line_items[0][price_data][unit_amount]')), currency: 'eur',
      };
      sessions.set(id, response);
      return stripe ? stripe(response, options, calls.length) : Response.json(response);
    }
    assert.equal(url, 'https://api.resend.com/emails', 'No real network calls are permitted');
    const payload = JSON.parse(options.body); emails.push({ payload, options });
    return mail ? mail(payload, options, emails.length) : Response.json({ id: `email-${emails.length}` });
  };
  return { sessions, calls, emails };
}
async function started(context, submissionKey = key()) {
  const response = await handleCheckout(checkout(submissionKey), context.env);
  assert.equal(response.status, 200, await response.clone().text());
  const data = await response.json();
  const order = context.db.prepare('SELECT * FROM checkout_orders WHERE id=?').get(data.orderId);
  return { data, order, submissionKey };
}
function eventFor(order, overrides = {}, type = 'checkout.session.completed', live = false) {
  const shipping = { name: 'Ada Lovelace', address: { country: 'DE', line1: 'Teststraße 1', postal_code: '10115', city: 'Berlin' } };
  const normalizedOverrides = { ...overrides };
  if (Object.hasOwn(overrides, 'shipping_details')) {
    if (!Object.hasOwn(overrides, 'collected_information')) normalizedOverrides.collected_information = { shipping_details: overrides.shipping_details };
    delete normalizedOverrides.shipping_details;
  }
  return { id: `evt_${key().replaceAll('-', '')}`, type, livemode: live,
    api_version: live ? '2026-08-26.dahlia' : STRIPE_WEBHOOK_API_VERSION,
    data: { object: { object: 'checkout.session', id: order.session_id, livemode: live, mode: 'payment',
      client_reference_id: order.id, metadata: { order_id: order.id, [live ? 'live_order' : 'test_only']: 'true' },
      amount_total: configurationPrice(JSON.parse(order.configuration)) * 100,
      currency: 'eur', payment_status: 'paid', total_details: { amount_shipping: 0, amount_tax: 0 },
      collected_information: { shipping_details: shipping },
      customer_details: { email: 'ada@example.com', name: 'Ada Lovelace' }, ...normalizedOverrides } } };
}
async function webhook(event, { timestamp = Math.floor(Date.now() / 1000), secret = 'whsec_mock', raw, signature, mode = 'test' } = {}) {
  const body = raw ?? JSON.stringify(event);
  const signingKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(`${timestamp}.${body}`)));
  const hash = Array.from(signed, b => b.toString(16).padStart(2, '0')).join('');
  return req(`/stripe-webhook${mode === 'live' ? '/live' : ''}`, { method: 'POST', body, headers: { 'stripe-signature': signature ?? `t=${timestamp},v1=${hash}` } });
}
function state(context, id) { return context.db.prepare('SELECT * FROM checkout_orders WHERE id=?').get(id); }

for (const mode of ['test', 'live']) for (const product of Object.values(PRODUCTS)) {
  test(`${mode} ${product.id}: server price, verified payment and product-specific emails`, async () => {
    const context = environment();
    if (mode === 'live') configureLive(context);
    const storage = mode === 'live' ? context.live : context;
    const services = mockServices();
    const configuration = { ...config, version: 3, product: product.id, engraving: product.engraving ? 'Meine Tour' : '' };
    const response = await handleCheckout(checkout(key(), {
      configuration: JSON.stringify(configuration), price: '1', currency: 'usd',
    }), context.env, mode);
    assert.equal(response.status, 200, await response.clone().text());
    const { orderId } = await response.json();
    const order = state(storage, orderId);
    const params = services.calls[0].params;
    assert.equal(params.get('line_items[0][price_data][unit_amount]'), String(product.priceEur * 100));
    assert.ok(params.get('line_items[0][price_data][product_data][name]').includes(product.name));
    assert.deepEqual(JSON.parse(order.configuration), configuration);
    const event = eventFor(order, {}, 'checkout.session.completed', mode === 'live');
    const options = { mode, secret: mode === 'live' ? 'whsec_livemock' : 'whsec_mock' };
    const wrongAmount = { ...event, id: `evt_${key().replaceAll('-', '')}`,
      data: { object: { ...event.data.object, amount_total: product.priceEur * 100 + 100 } } };
    assert.equal((await handleStripeWebhook(await webhook(wrongAmount, options), context.env, mode)).status, 400);
    assert.equal(state(storage, orderId).status, 'pending');
    assert.equal(services.emails.length, 0);
    assert.equal((await handleStripeWebhook(await webhook(event, options), context.env, mode)).status, 200);
    assert.equal(state(storage, orderId).status, 'paid');
    assert.equal(services.emails.length, 2);
    for (const { payload } of services.emails) {
      assert.ok(payload.text.includes(product.name));
      assert.ok(payload.text.includes(`${product.priceEur} EUR`));
      assert.ok(payload.text.includes(product.dimensions));
      assert.ok(payload.text.includes(product.engraving ? 'Meine Tour' : 'Ohne Gravur'));
    }
  });
}

for (const mode of ['test', 'live']) for (const product of ['base', 'compact']) {
  for (const wallMount of [false, true]) test(`${mode} ${product}: wall mount ${wallMount} price and notifications`, async () => {
    const context = environment();
    if (mode === 'live') configureLive(context);
    const storage = mode === 'live' ? context.live : context;
    const services = mockServices();
    const configuration = { ...config, version: 4, product, wallMount, engraving: product === 'compact' ? '' : 'Meine Tour' };
    const expected = PRODUCTS[product].priceEur + (wallMount ? 1 : 0);
    const response = await handleCheckout(checkout(key(), { configuration: JSON.stringify(configuration), price: '1' }), context.env, mode);
    assert.equal(response.status, 200, await response.clone().text());
    const order = state(storage, (await response.json()).orderId);
    assert.deepEqual(JSON.parse(order.configuration), configuration);
    assert.equal(services.calls[0].params.get('line_items[0][price_data][unit_amount]'), String(expected * 100));
    const options = { mode, secret: mode === 'live' ? 'whsec_livemock' : 'whsec_mock' };
    const wrong = eventFor(order, { amount_total: (expected + (wallMount ? -1 : 1)) * 100 },
      'checkout.session.completed', mode === 'live');
    assert.equal((await handleStripeWebhook(await webhook(wrong, options), context.env, mode)).status, 400);
    assert.equal(state(storage, order.id).status, 'pending');
    const event = eventFor(order, {}, 'checkout.session.completed', mode === 'live');
    assert.equal((await handleStripeWebhook(await webhook(event, options), context.env, mode)).status, 200);
    assert.equal(services.emails.length, 2);
    for (const { payload } of services.emails) {
      assert.ok(payload.text.includes(`${expected} EUR`));
      assert.ok(payload.text.includes(`Wandaufhängung: ${wallMount ? 'Ja' : 'Nein'}`));
      assert.ok(payload.text.includes('4 transparente Schutzfüße'));
    }
  });
}

test('default disabled status is public, secret-free; missing bindings do not break Worker preview or scheduled handler', async () => {
  const request = req('/shop-status');
  assert.deepEqual(await (await handleShopStatus(request, {})).json(), { enabled: false, testMode: true, mode: 'test' });
  assert.deepEqual(await (await pagesShop({ request, env: {} })).json(), { enabled: false, testMode: true, mode: 'test' });
  assert.equal((await handleCheckout(checkout(), {})).status, 503);
  assert.equal((await handleOrderStatus(req('/order-status'), {})).status, 503);
  const assetEnv = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal(await (await worker.fetch(req('/'), assetEnv, {})).text(), 'asset');
  await new Promise(resolve => worker.scheduled({}, {}, { waitUntil: promise => promise.then(resolve) }));
});

test('live/invalid keys, untrusted origins and incomplete config cannot enable checkout or make API calls', async () => {
  const context = environment();
  globalThis.fetch = () => assert.fail('No external calls');
  for (const env of [
    { ...context.env, STRIPE_SECRET_KEY: 'sk_live_forbidden' },
    { ...context.env, STRIPE_SECRET_KEY: 'rk_live_forbidden' },
    { ...context.env, STRIPE_SECRET_KEY: 'sk_test_mock sk_live_bad' },
    { ...context.env, STRIPE_SECRET_KEY: '' },
    { ...context.env, CHECKOUT_ORIGIN: 'https://evil.example/path' },
    { ...context.env, CHECKOUT_ORIGIN: 'http://peak-memory.de' },
    { ...context.env, CHECKOUT_FILES: undefined },
    { ...context.env, CHECKOUT_ENABLED: 'TRUE' },
  ]) {
    assert.equal((await handleCheckout(checkout(), env)).status, 503);
    assert.deepEqual(await (await handleShopStatus(req('/shop-status'), env)).json(), { enabled: false, testMode: true, mode: 'test' });
  }
  const request = checkout(); request.headers.set('Origin', 'https://evil.example');
  assert.equal((await handleCheckout(request, context.env)).status, 403);
});

test('server fixes 5000 EUR, DE-only free shipping and trusted hosted return URLs, persists originals before Stripe', async () => {
  const context = environment();
  const services = mockServices({ stripe: (session) => {
    const order = state(context, session.client_reference_id);
    assert.equal(order.stage, 'ready');
    assert.equal(order.acceptance, 1);
    assert.deepEqual(JSON.parse(order.configuration), config);
    assert.deepEqual(Buffer.from(context.objects.get(order.gpx_key)), Buffer.from(gpx));
    assert.deepEqual(Buffer.from(context.objects.get(order.preview_key)), image);
    return Response.json(session);
  } });
  const response = await handleCheckout(checkout(key(), { price: '1', currency: 'usd' }), context.env);
  assert.equal(response.status, 200);
  const data = await response.json(), params = services.calls[0].params;
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '5000');
  assert.equal(params.get('line_items[0][price_data][currency]'), 'eur');
  assert.equal(params.get('shipping_address_collection[allowed_countries][0]'), 'DE');
  assert.equal(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
  assert.equal(params.get('submit_type'), 'pay'); assert.equal(params.get('ui_mode'), 'hosted_page');
  assert.match(params.get('integration_identifier'), /^peakmemory_test_[a-z]{8}$/);
  assert.equal(params.has('payment_method_types'), false);
  assert.equal(params.get('adaptive_pricing[enabled]'), 'false');
  assert.match(params.get('line_items[0][price_data][product_data][description]'), /§19.*5–10.*Illustrative/);
  assert.equal(params.get('cancel_url'), origin + '/?checkout=cancelled');
  assert.match(params.get('success_url'), new RegExp(`^${origin}/\\?checkout=success&mode=test&order=${data.orderId}&token=[a-f0-9]{64}$`));
  assert.match(data.statusUrl, /\/order-status\?mode=test&order=.*&token=[a-f0-9]{64}$/);
  assert.notEqual(state(context, data.orderId).status_token, data.orderId);
  assert.equal(services.emails.length, 0);
});

test('strict fields, GPX, v2 base ready configuration, PNG, affirmative boolean and multipart are mandatory', async () => {
  const context = environment(); globalThis.fetch = () => assert.fail('Invalid input must never reach Stripe');
  const failures = [
    { name: '' }, { name: 'x\ninjection' }, { name: 'a'.repeat(201) }, { email: 'invalid' }, { email: 'x'.repeat(201) + '@x.de' },
    { submissionKey: 'predictable' }, { acceptance: 'false' }, { acceptance: '1' }, { acceptance: undefined },
    { configuration: '{}' }, { configuration: JSON.stringify({ ...config, version: 1 }) },
    { configuration: JSON.stringify({ ...config, product: 'frame' }) },
    { configuration: JSON.stringify({ ...config, version: 3, product: 'compact' }) },
    { configuration: JSON.stringify({ ...config, version: 3, product: 'unknown' }) },
    { configuration: JSON.stringify({ ...config, version: 3, elevationScale: undefined }) },
    { configuration: JSON.stringify({ ...config, version: 4 }) },
    { configuration: JSON.stringify({ ...config, version: 4, wallMount: 'true' }) },
    { configuration: JSON.stringify({ ...config, version: 4, wallMount: 1 }) },
    { configuration: JSON.stringify({ ...config, version: 4, product: 'frame', wallMount: true }) },
    { configuration: JSON.stringify({ ...config, wallMount: true }) },
    { configuration: JSON.stringify({ ...config, preview: 'unavailable' }) },
    { configuration: JSON.stringify({ ...config, elevationScale: 9 }) },
    { configuration: JSON.stringify({ ...config, margin: 0 }) },
    { configuration: JSON.stringify({ ...config, engraving: 'a'.repeat(121) }) },
    { configuration: 'bad' }, { gpxFile: undefined }, { gpxFile: 'not a file' },
    { gpxFile: new File(['bad'], 'route.gpx') }, { gpxFile: new File([gpx], 'route.txt') },
    { gpxFile: new File([new Uint8Array(MAX_GPX_SIZE + 1)], 'route.gpx') },
    { previewImage: undefined }, { previewImage: new File([image], 'a.png', { type: 'image/jpeg' }) },
    { previewImage: new File(['wrong'], 'a.png', { type: 'image/png' }) },
    { previewImage: new File([new Uint8Array(MAX_PREVIEW_SIZE + 1)], 'a.png', { type: 'image/png' }) },
  ];
  for (const failure of failures) {
    assert.equal((await handleCheckout(checkout(key(), failure), context.env)).status, 400, Object.keys(failure).join());
  }
  for (const field of ['name', 'email', 'gpxFile', 'previewImage', 'acceptance', 'configuration', 'submissionKey', 'price']) {
    assert.equal((await handleCheckout(checkout(key(), { price: '5' }, form => form.append(field, 'duplicate')), context.env)).status, 400);
  }
  assert.equal((await handleCheckout(checkout(key(), { unknown: 'no' }), context.env)).status, 400);
  assert.equal((await handleCheckout(req('/checkout', { method: 'POST', body: '{}' }), context.env)).status, 400);
  assert.equal(context.db.prepare('SELECT count(*) AS n FROM checkout_orders').get().n, 0);
});

test('declared and streamed request limits and webhook limits are enforced', async () => {
  const context = environment(); globalThis.fetch = () => assert.fail('Too large');
  const oversized = checkout(); oversized.headers.set('content-length', String(MAX_CHECKOUT_SIZE + 1));
  assert.equal((await handleCheckout(oversized, context.env)).status, 413);
  const actual = req('/checkout', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' },
    body: new Uint8Array(MAX_CHECKOUT_SIZE + 1) });
  assert.equal((await handleCheckout(actual, context.env)).status, 413);
  const event = req('/stripe-webhook', { method: 'POST', body: 'a'.repeat(MAX_WEBHOOK_SIZE + 1) });
  assert.equal((await handleStripeWebhook(event, context.env)).status, 413);
});

test('same payload retries return exactly the same session; exact original-byte/config/person/file changes conflict', async () => {
  const context = environment(), services = mockServices(), start = await started(context);
  const repeat = await handleCheckout(checkout(start.submissionKey), context.env);
  assert.deepEqual(await repeat.json(), start.data);
  for (const fields of [
    { email: 'other@example.com' }, { name: 'Ada ' },
    { configuration: JSON.stringify({ ...config, engraving: 'anderer Gipfel' }) },
    { configuration: JSON.stringify(config, null, 1) },
    { gpxFile: new File([gpx + ' '], 'Original.GPX', { type: 'application/gpx+xml' }) },
    { gpxFile: new File([gpx], 'renamed.gpx', { type: 'application/gpx+xml' }) },
    { previewImage: new File([image], 'renamed.png', { type: 'image/png' }) },
  ]) assert.equal((await handleCheckout(checkout(start.submissionKey, fields), context.env)).status, 409);
  assert.equal(services.calls.length, 1);
  assert.equal(context.db.prepare('SELECT count(*) AS n FROM checkout_orders').get().n, 1);
});

test('concurrent identical submissions acquire only one creation lease', async () => {
  const context = environment(), submission = key();
  let release, reached;
  const gate = new Promise(resolve => release = resolve), atStripe = new Promise(resolve => reached = resolve);
  const services = mockServices({ stripe: async session => { reached(); await gate; return Response.json(session); } });
  const first = handleCheckout(checkout(submission), context.env);
  await atStripe;
  const second = await handleCheckout(checkout(submission), context.env);
  assert.equal(second.status, 503); release();
  assert.equal((await first).status, 200);
  assert.equal(services.calls.length, 1);
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 200);
});

test('partial R2 upload and DB/session failures leave recoverable orders; no session until both snapshots durable', async () => {
  const context = environment(), services = mockServices(), submission = key();
  const put = context.env.CHECKOUT_FILES.put; let fail = true;
  context.env.CHECKOUT_FILES.put = async (path, value) => {
    if (path.endsWith('preview.png') && fail) { fail = false; throw new Error('storage failed'); }
    return put(path, value);
  };
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 503);
  assert.equal(services.calls.length, 0); assert.equal(context.objects.size, 1);
  assert.equal(context.db.prepare('SELECT stage FROM checkout_orders').get().stage, 'staging');
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 200);
  assert.equal(context.objects.size, 2); assert.equal(services.calls.length, 1);
});

test('ambiguous Stripe timeout retries with identical idempotency key/body and never deletes snapshots', async () => {
  const context = environment(), submission = key();
  globalThis.setTimeout = (callback, delay, ...args) => originalTimeout(callback, delay === 10000 ? 30 : delay, ...args);
  const services = mockServices({ stripe: (session, options, count) => count === 1
    ? new Promise(() => {}) : Response.json(session) });
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 503);
  const before = context.db.prepare('SELECT * FROM checkout_orders').get();
  assert.equal(before.stage, 'ready'); assert.equal(before.status, 'pending'); assert.equal(context.objects.size, 2);
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 200);
  assert.equal(services.calls[0].options.headers['Idempotency-Key'], services.calls[1].options.headers['Idempotency-Key']);
  assert.equal(services.calls[0].options.body, services.calls[1].options.body);
  assert.equal(context.objects.size, 2);
});

test('test session responses are guarded against live mode, wrong amounts, associations and unsafe hosted URLs', async () => {
  for (const overrides of [
    { livemode: true }, { id: 'cs_live_bad' }, { amount_total: 1 }, { currency: 'usd' },
    { client_reference_id: key() }, { metadata: {} },
    { url: 'https://evil.example/' }, { url: 'https://checkout.stripe.com.evil.example/' },
    { url: 'https://user@checkout.stripe.com/' }, { url: 'http://checkout.stripe.com/' },
  ]) {
    const context = environment();
    mockServices({ stripe: session => Response.json({ ...session, ...overrides }) });
    assert.equal((await handleCheckout(checkout(), context.env)).status, 502);
    assert.equal(context.objects.size, 2); assert.equal(context.db.prepare('SELECT status FROM checkout_orders').get().status, 'pending');
  }
});

test('status is token protected, minimal, no PII and redirects never mark paid', async () => {
  const context = environment(); mockServices(); const { data, order } = await started(context);
  const response = await handleOrderStatus(new Request(data.statusUrl), context.env);
  assert.deepEqual(await response.json(), { orderId: order.id, status: 'pending' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  for (const path of ['/order-status', `/order-status?order=${order.id}`,
    `/order-status?order=${order.id}&token=${'0'.repeat(64)}`,
    `/order-status?order=${key()}&token=${order.status_token}`,
    `/order-status?order=${order.id}&order=${order.id}&token=${order.status_token}`]) {
    assert.equal((await handleOrderStatus(req(path), context.env)).status, 404);
  }
  await worker.fetch(req(`/?checkout=success&order=${order.id}&token=${order.status_token}`),
    { ...context.env, ASSETS: { fetch: async () => new Response('preview') } }, {});
  assert.equal(state(context, order.id).status, 'pending');
});

test('webhook verifies raw HMAC, timestamp ±5 min, test event and test session before accepting payment', async () => {
  const context = environment(); const services = mockServices(); const { order } = await started(context);
  const event = eventFor(order);
  for (const options of [
    { secret: 'whsec_wrong' }, { timestamp: Math.floor(Date.now() / 1000) - 301 },
    { timestamp: Math.floor(Date.now() / 1000) + 301 }, { signature: 't=1,v1=invalid' },
    { raw: '{not-json' },
  ]) assert.equal((await handleStripeWebhook(await webhook(event, options), context.env)).status, 400);
  for (const bad of [
    { ...event, livemode: true }, { ...event, livemode: undefined },
    eventFor(order, { livemode: true }), eventFor(order, { id: 'cs_live_bad' }),
    { ...event, type: 'unknown', data: { object: { livemode: true } } },
  ]) assert.equal((await handleStripeWebhook(await webhook(bad), context.env)).status, 400);
  const altered = await webhook(event); const body = await altered.text();
  assert.equal((await handleStripeWebhook(req('/stripe-webhook', { method: 'POST', headers: altered.headers, body: body + ' ' }), context.env)).status, 400);
  assert.equal(state(context, order.id).status, 'pending'); assert.equal(services.emails.length, 0);
});

test('paid events require exact amount/currency, DE shipping, zero tax/shipping and durable order/session association', async () => {
  const context = environment(), services = mockServices(); const { order } = await started(context);
  const overrides = [
    { amount_total: 4999 }, { amount_total: 5001 }, { currency: 'EUR' }, { currency: 'usd' },
    { mode: 'subscription' }, { total_details: { amount_shipping: 500, amount_tax: 0 } },
    { total_details: { amount_shipping: 0, amount_tax: 100 } },
    { shipping_details: { name: 'Ada', address: { country: 'AT', line1: 'x', postal_code: '1', city: 'x' } } },
    { shipping_details: null }, { client_reference_id: key() }, { metadata: { order_id: key(), test_only: 'true' } },
    { id: 'cs_test_other' },
  ];
  for (const changes of overrides) assert.equal((await handleStripeWebhook(await webhook(eventFor(order, changes)), context.env)).status, 400);
  assert.equal(state(context, order.id).status, 'pending'); assert.equal(services.emails.length, 0);
});

test('verified paid transition is transactional and idempotent, notifications contain original attachments and stable Resend keys', async () => {
  const context = environment(), services = mockServices(); const { order } = await started(context);
  const event = eventFor(order);
  const response = await handleStripeWebhook(await webhook(event), context.env);
  assert.equal(response.status, 200);
  assert.equal(state(context, order.id).status, 'paid');
  assert.equal(state(context, order.id).owner_sent, 1); assert.equal(state(context, order.id).buyer_sent, 1);
  assert.equal(services.emails.length, 2);
  const owner = services.emails[0], buyer = services.emails[1];
  assert.equal(owner.payload.from, 'kontakt@peak-memory.de'); assert.equal(owner.payload.to, 'peak.memory@web.de');
  assert.equal(owner.payload.reply_to, 'ada@example.com'); assert.equal(buyer.payload.to, 'ada@example.com');
  assert.equal(owner.payload.attachments.length, 3);
  assert.equal(Buffer.from(owner.payload.attachments[0].content, 'base64').toString(), gpx);
  assert.deepEqual(Buffer.from(owner.payload.attachments[1].content, 'base64'), image);
  assert.deepEqual(JSON.parse(Buffer.from(owner.payload.attachments[2].content, 'base64').toString()), config);
  assert.match(owner.payload.text, /10115.*Berlin/); assert.match(owner.payload.text, /keine manuelle Produktionsfreigabe/);
  assert.equal(owner.options.headers['Idempotency-Key'], `checkout-${order.id}-owner`);
  assert.equal(buyer.options.headers['Idempotency-Key'], `checkout-${order.id}-buyer`);
  assert.equal(buyer.payload.attachments, undefined);
  assert.match(buyer.payload.html, /PeakMemory/);
  assert.match(buyer.payload.html, /Testzahlung bestätigt/);
  assert.equal(buyer.payload.reply_to, 'peak.memory@web.de');
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 200);
  assert.equal(services.emails.length, 2); assert.equal(context.db.prepare('SELECT count(*) AS n FROM checkout_events').get().n, 1);
  assert.equal((await handleStripeWebhook(await webhook({ ...event, type: 'checkout.session.async_payment_succeeded' }), context.env)).status, 409);
});

test('Resend failures never roll back paid state and duplicate webhook retries only undelivered notifications', async () => {
  const context = environment(); let fail = true;
  const services = mockServices({ mail: (payload, options, count) => {
    if (payload.to === 'ada@example.com' && fail) { fail = false; return new Response('{}', { status: 503 }); }
    return Response.json({ id: `mail-${count}` });
  } });
  const { order } = await started(context), event = eventFor(order);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 502);
  assert.equal(state(context, order.id).status, 'paid'); assert.equal(state(context, order.id).owner_sent, 1);
  assert.equal(state(context, order.id).buyer_sent, 0);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 200);
  assert.equal(services.emails.length, 3);
  assert.equal(services.emails[1].options.headers['Idempotency-Key'], services.emails[2].options.headers['Idempotency-Key']);
  assert.equal(services.emails[1].options.body, services.emails[2].options.body);
  assert.equal(state(context, order.id).buyer_sent, 1);
});

test('concurrent duplicate paid webhooks use durable notification lease and deliver each notification once', async () => {
  const context = environment(); let reached, release;
  const atMail = new Promise(resolve => reached = resolve), gate = new Promise(resolve => release = resolve);
  const services = mockServices({ mail: async (_payload, _options, count) => {
    if (count === 1) { reached(); await gate; } return Response.json({ id: `mail-${count}` });
  } });
  const { order } = await started(context), event = eventFor(order);
  const initial = handleStripeWebhook(await webhook(event), context.env);
  await atMail;
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 503);
  assert.equal(state(context, order.id).status, 'paid'); release();
  assert.equal((await initial).status, 200);
  assert.equal(services.emails.length, 2);
});

test('delayed async completion waits for paid webhook; failure/expiry do not send mail or downgrade paid', async () => {
  const context = environment(), services = mockServices(); const { order } = await started(context);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order, { payment_status: 'unpaid' })), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'pending'); assert.equal(services.emails.length, 0);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order, { payment_status: 'unpaid' }, 'checkout.session.async_payment_succeeded')), context.env)).status, 400);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order, { payment_status: 'unpaid' }, 'checkout.session.async_payment_failed')), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'failed');
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order, { payment_status: 'unpaid' })), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'failed');
  const collected = eventFor(order, { shipping_details: undefined,
    collected_information: { shipping_details: eventFor(order).data.object.collected_information.shipping_details } }, 'checkout.session.async_payment_succeeded');
  assert.equal((await handleStripeWebhook(await webhook(collected), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'paid');
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order, { payment_status: 'unpaid' }, 'checkout.session.expired')), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'paid'); assert.equal(services.emails.length, 2);
  const second = await started(context);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(second.order,
    { payment_status: 'unpaid', shipping_details: undefined }, 'checkout.session.expired')), context.env)).status, 200);
  assert.equal(state(context, second.order.id).status, 'expired');
});

test('paid webhook can associate a recoverable order after Stripe created session but response was lost', async () => {
  const context = environment(), services = mockServices({ stripe: () => new Response('{}', { status: 503 }) });
  const submission = key();
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 502);
  const order = context.db.prepare('SELECT * FROM checkout_orders').get();
  const session = services.sessions.get(order.id);
  assert.equal((await handleStripeWebhook(await webhook(eventFor({ ...order, session_id: session.id })), context.env)).status, 200);
  assert.equal(state(context, order.id).status, 'paid');
});

test('scheduled retries recover ambiguous sessions and failed mail even when new checkout disabled', async () => {
  const context = environment(); let stripeFail = true, mailFail = true;
  const services = mockServices({
    stripe: session => { if (stripeFail) { stripeFail = false; return new Response('{}', { status: 500 }); } return Response.json(session); },
    mail: () => mailFail ? new Response('{}', { status: 500 }) : Response.json({ id: 'mail-id' }),
  });
  assert.equal((await handleCheckout(checkout(), context.env)).status, 502);
  await checkoutMaintenance(context.env);
  let order = context.db.prepare('SELECT * FROM checkout_orders').get();
  assert.equal(order.stage, 'session'); assert.equal(services.calls.length, 2);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order)), context.env)).status, 502);
  context.env.CHECKOUT_ENABLED = 'false'; mailFail = false;
  Date.now = () => originalNow() + 901000;
  await checkoutMaintenance(context.env);
  order = state(context, order.id); assert.equal(order.status, 'paid'); assert.equal(order.owner_sent, 1); assert.equal(order.buyer_sent, 1);
});

test('private retention cleanup claims leases, retries deletion failures, preserves idempotency tombstones and delivered paid files for 90d', async () => {
  const context = environment(); mockServices(); const unpaid = await started(context);
  const paid = await started(context);
  assert.equal((await handleStripeWebhook(await webhook(eventFor(paid.order)), context.env)).status, 200);
  Date.now = () => originalNow() + 8 * 86400000;
  context.db.prepare('UPDATE checkout_orders SET lease_until=? WHERE id=?').run(Math.floor(Date.now() / 1000) + 60, unpaid.order.id);
  await checkoutMaintenance(context.env);
  assert.equal(context.objects.size, 4, 'Active lease excludes cleanup');
  context.db.prepare('UPDATE checkout_orders SET lease_until=0 WHERE id=?').run(unpaid.order.id);
  const remove = context.env.CHECKOUT_FILES.delete; let fail = true;
  context.env.CHECKOUT_FILES.delete = async paths => { if (fail) { fail = false; throw new Error('R2 failed'); } return remove(paths); };
  await checkoutMaintenance(context.env);
  assert.equal(state(context, unpaid.order.id).stage, 'deleting');
  assert.equal((await handleStripeWebhook(await webhook(eventFor(unpaid.order)), context.env)).status, 400);
  Date.now = () => originalNow() + 8 * 86400000 + 121000;
  await checkoutMaintenance(context.env);
  assert.equal(context.objects.size, 2); assert.equal(state(context, unpaid.order.id).stage, 'purged');
  assert.equal(state(context, unpaid.order.id).email, ''); assert.equal(state(context, unpaid.order.id).status_token, '');
  assert.equal((await handleCheckout(checkout(unpaid.submissionKey), context.env)).status, 410);
  assert.equal((await handleCheckout(checkout(unpaid.submissionKey, { name: 'other' }), context.env)).status, 409);
  assert.equal((await handleOrderStatus(new Request(unpaid.data.statusUrl), context.env)).status, 404);
  Date.now = () => originalNow() + 91 * 86400000;
  await checkoutMaintenance(context.env);
  assert.equal(context.objects.size, 0); assert.equal(state(context, paid.order.id).stage, 'purged');
});

test('session creation stops beyond 23h idempotency window; paid notification failures retain snapshots for recovery', async () => {
  const context = environment(), services = mockServices({ stripe: () => new Response('{}', { status: 503 }) });
  const submission = key();
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 502);
  Date.now = () => originalNow() + 24 * 3600000;
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 409);
  assert.equal(services.calls.length, 1); assert.equal(context.objects.size, 2);
});

test('malformed/truncated PNG, corrupt chunk CRC and excessive dimensions are rejected before storage', async () => {
  const context = environment(); globalThis.fetch = () => assert.fail('Invalid PNG');
  const crc = Buffer.from(image); crc[40] ^= 1;
  const dimensions = Buffer.from(image); dimensions.writeUInt32BE(2049, 16);
  for (const bytes of [image.subarray(0, 33), image.subarray(0, image.length - 12), crc, dimensions, Buffer.concat([image, Buffer.from([0])])]) {
    assert.equal((await handleCheckout(checkout(key(), { previewImage: new File([bytes], 'x.png', { type: 'image/png' }) }), context.env)).status, 400);
  }
  assert.equal(context.objects.size, 0);
});

test('Stripe response-persistence failure is recoverable with immutable persisted API parameters', async () => {
  const context = environment(), services = mockServices(), submission = key();
  const prepare = context.env.CHECKOUT_DB.prepare;
  let fail = true;
  context.env.CHECKOUT_DB.prepare = sql => {
    const statement = prepare(sql);
    if (sql.startsWith('UPDATE checkout_orders SET session_id=') && fail) {
      statement.run = async () => { fail = false; throw new Error('DB unavailable after Stripe session created'); };
    }
    return statement;
  };
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 503);
  const order = context.db.prepare('SELECT * FROM checkout_orders').get();
  assert.equal(order.session_id, null); assert.equal(order.stage, 'ready'); assert.equal(context.objects.size, 2);
  assert.equal(order.session_params, services.calls[0].options.body);
  assert.equal((await handleCheckout(checkout(submission), context.env)).status, 200);
  assert.equal(services.calls[0].options.body, services.calls[1].options.body);
  assert.equal(services.calls[0].options.headers['Idempotency-Key'], services.calls[1].options.headers['Idempotency-Key']);
});

test('webhook transaction rolls back receipt if payment update fails and retries commit both', async () => {
  const context = environment(), services = mockServices(); const { order } = await started(context);
  const batch = context.env.CHECKOUT_DB.batch;
  context.env.CHECKOUT_DB.batch = statements => batch([statements[0], { run: async () => { throw new Error('Failed payment mutation'); } }]);
  const event = eventFor(order);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 503);
  assert.equal(context.db.prepare('SELECT count(*) AS n FROM checkout_events').get().n, 0);
  assert.equal(state(context, order.id).status, 'pending'); assert.equal(services.emails.length, 0);
  context.env.CHECKOUT_DB.batch = batch;
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 200);
  assert.equal(context.db.prepare('SELECT count(*) AS n FROM checkout_events').get().n, 1);
  assert.equal(state(context, order.id).status, 'paid');
});

test('missing mail configuration still persists verified paid state; live key cannot process even signed test webhook', async () => {
  const context = environment(); mockServices(); const { order } = await started(context), event = eventFor(order);
  assert.equal((await handleStripeWebhook(await webhook(event), { ...context.env, STRIPE_SECRET_KEY: 'sk_live_forbidden' })).status, 503);
  assert.equal(state(context, order.id).status, 'pending');
  assert.equal((await handleStripeWebhook(await webhook(event), { ...context.env, RESEND_API_KEY: undefined, CHECKOUT_ENABLED: 'false' })).status, 503);
  assert.equal(state(context, order.id).status, 'paid'); assert.equal(state(context, order.id).owner_sent, 0);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 200);
});

test('ambiguous Resend timeout is retryable without losing paid state and reuses the exact notification body/key', async () => {
  const context = environment(); const { emails } = mockServices({
    mail: (_payload, _options, count) => count === 1 ? new Promise(() => {}) : Response.json({ id: 'mail-id' }),
  });
  const { order } = await started(context), event = eventFor(order);
  globalThis.setTimeout = (callback, delay, ...args) => originalTimeout(callback, delay === 10000 ? 30 : delay, ...args);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 503);
  assert.equal(state(context, order.id).status, 'paid'); assert.equal(state(context, order.id).owner_sent, 0);
  assert.equal((await handleStripeWebhook(await webhook(event), context.env)).status, 200);
  assert.equal(emails.length, 3); assert.equal(emails[0].options.body, emails[1].options.body);
  assert.equal(emails[0].options.headers['Idempotency-Key'], emails[1].options.headers['Idempotency-Key']);
});

test('rotated webhook signatures and exactly 5-minute tolerance are accepted; duplicate timestamps fail', async () => {
  const context = environment(); mockServices(); const { order } = await started(context);
  const current = originalNow(); Date.now = () => current;
  const event = eventFor(order), signed = await webhook(event, { timestamp: Math.floor(current / 1000) - 300 });
  const signature = signed.headers.get('stripe-signature');
  signed.headers.set('stripe-signature', signature.replace(',v1=', `,v1=${'0'.repeat(64)},v1=`));
  assert.equal((await handleStripeWebhook(signed, context.env)).status, 200);
  const duplicateTime = await webhook(event); duplicateTime.headers.append('stripe-signature', `t=${Math.floor(current / 1000)}`);
  assert.equal((await handleStripeWebhook(duplicateTime, context.env)).status, 400);
});

test('Checkout API and webhook versions are independently pinned; Dahlia shipping schema is enforced', async () => {
  assert.equal(STRIPE_API_VERSION, '2026-09-30.endive');
  assert.equal(STRIPE_WEBHOOK_API_VERSION, '2026-08-26.dahlia');
  const context = environment(); mockServices(); const { order } = await started(context);
  for (const api_version of [undefined, '2024-06-20', '2025-03-31.basil', '2026-03-25.dahlia', STRIPE_API_VERSION]) {
    assert.equal((await handleStripeWebhook(await webhook({ ...eventFor(order), api_version }), context.env)).status, 400);
  }
  const legacy = eventFor(order);
  legacy.data.object.shipping_details = legacy.data.object.collected_information.shipping_details;
  delete legacy.data.object.collected_information;
  assert.equal((await handleStripeWebhook(await webhook(legacy), context.env)).status, 400);
  assert.equal(state(context, order.id).status, 'pending');
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order)), context.env)).status, 200);
});

test('restricted sandbox rk_test keys are accepted but publishable/live keys remain rejected', async () => {
  const context = environment(); const services = mockServices();
  context.env.STRIPE_SECRET_KEY = 'rk_test_mock';
  assert.deepEqual(await (await handleShopStatus(req('/shop-status'), context.env)).json(), { enabled: true, testMode: true, mode: 'test' });
  const { order } = await started(context);
  assert.equal(services.calls[0].options.headers.Authorization, 'Bearer rk_test_mock');
  assert.equal((await handleStripeWebhook(await webhook(eventFor(order)), context.env)).status, 200);
  for (const forbidden of ['rk_live_forbidden', 'sk_live_forbidden', 'pk_test_mock']) {
    assert.equal((await handleCheckout(checkout(), { ...context.env, STRIPE_SECRET_KEY: forbidden })).status, 503);
  }
});

test('live checkout remains fail-closed until live bindings, secrets and both review acknowledgements exist', async () => {
  const context = configureLive(environment());
  context.env.CHECKOUT_LIVE_LEGAL_REVIEWED = 'false';
  assert.deepEqual(await (await handleShopStatus(req('/shop-status'), context.env)).json(),
    { enabled: false, testMode: false, mode: 'live' });
  assert.equal((await handleCheckout(checkout(), context.env, 'live')).status, 503);
  context.env.CHECKOUT_LIVE_LEGAL_REVIEWED = 'true';
  context.env.CHECKOUT_LIVE_WAF_REVIEWED = 'false';
  assert.deepEqual(await (await handleShopStatus(req('/shop-status'), context.env)).json(),
    { enabled: false, testMode: false, mode: 'live' });
  assert.equal((await handleCheckout(checkout(), context.env, 'live')).status, 503);
  context.env.CHECKOUT_LIVE_WAF_REVIEWED = 'true';
  context.env.CHECKOUT_LIVE_LEGAL_REVIEWED = 'true';
  context.env.STRIPE_LIVE_SECRET_KEY = 'sk_test_wrong_mode';
  assert.equal((await handleCheckout(checkout(), context.env, 'live')).status, 503);
  context.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_mock';
  context.env.CHECKOUT_LIVE_FILES = undefined;
  assert.equal((await handleCheckout(checkout(), context.env, 'live')).status, 503);
  assert.equal((await handleCheckout(checkout(), context.env, 'test')).status, 503,
    'test checkout cannot be started when live checkout is selected');
  assert.equal(context.db.prepare('SELECT count(*) AS count FROM checkout_orders').get().count, 0);
});

test('live checkout isolates storage and verifies live-mode webhook before sending production order emails', async () => {
  const context = configureLive(environment()), services = mockServices();
  assert.deepEqual(await (await handleShopStatus(req('/shop-status'), context.env)).json(),
    { enabled: true, testMode: false, mode: 'live' });
  const response = await handleCheckout(checkout(), context.env, 'live');
  assert.equal(response.status, 200, await response.clone().text());
  const created = await response.json();
  assert.match(created.statusUrl, /mode=live/);
  const order = context.live.db.prepare('SELECT * FROM checkout_orders WHERE id=?').get(created.orderId);
  assert.ok(order);
  assert.equal(context.db.prepare('SELECT count(*) AS count FROM checkout_orders').get().count, 0);
  const params = services.calls[0].params;
  assert.equal(params.get('line_items[0][price_data][unit_amount]'), '5000');
  assert.equal(params.get('metadata[live_order]'), 'true');
  assert.equal(params.has('metadata[test_only]'), false);
  assert.match(params.get('line_items[0][price_data][product_data][name]'), /PeakMemory/);
  assert.doesNotMatch(params.get('line_items[0][price_data][product_data][name]'), /TEST/);
  assert.equal(params.get('success_url').includes('mode=live'), true);
  assert.match(params.get('custom_text[submit][message]'), /kein gesetzliches Widerrufsrecht/);
  assert.match(params.get('custom_text[submit][message]'), /Vertragsschluss bei erfolgreicher Zahlungsbestätigung/);
  assert.equal(services.calls[0].options.headers.Authorization, 'Bearer sk_live_mock');

  const liveEvent = eventFor(order, {}, 'checkout.session.completed', true);
  assert.equal((await handleStripeWebhook(await webhook(liveEvent, { mode: 'live', secret: 'whsec_mock' }),
    context.env, 'live')).status, 400, 'test signing secret cannot authenticate a live webhook');
  assert.equal(context.live.db.prepare('SELECT status FROM checkout_orders WHERE id=?').get(order.id).status, 'pending');
  const valid = await webhook(liveEvent, { mode: 'live', secret: 'whsec_livemock' });
  assert.equal((await handleStripeWebhook(valid, context.env, 'live')).status, 200);
  assert.equal(context.live.db.prepare('SELECT status,owner_sent,buyer_sent FROM checkout_orders WHERE id=?').get(order.id).status, 'paid');
  assert.equal(services.emails.length, 2);
  assert.ok(services.emails.every(({ payload }) => !payload.subject.includes('TEST') && !payload.text.includes('keine echte Bestellung')));
  assert.equal(services.emails[0].payload.attachments.length, 3);
  assert.equal(services.emails[1].payload.to, 'ada@example.com');
  assert.ok(services.emails.every(({ payload }) => payload.text.includes(PURCHASE_INFORMATION_TEXT)),
    'Both live order confirmations contain the full purchase information');
  assert.equal((await handleOrderStatus(req(`/order-status?mode=live&order=${order.id}&token=${order.status_token}`), context.env)).status, 200);
  assert.equal((await handleOrderStatus(req(`/order-status?mode=test&order=${order.id}&token=${order.status_token}`), context.env)).status, 404);
});

test('stream stalls time out explicitly and private order blobs are not exposed through Worker asset routes', async () => {
  const context = environment(); mockServices(); const { order } = await started(context);
  globalThis.setTimeout = (callback, delay, ...args) => originalTimeout(callback, delay === 10000 ? 30 : delay, ...args);
  let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const request = req('/checkout', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' },
    body: stream, duplex: 'half' });
  assert.equal((await handleCheckout(request, context.env)).status, 503);
  assert.equal(cancelled, true);
  const response = await worker.fetch(req('/' + order.gpx_key),
    { ...context.env, ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } }, {});
  assert.equal(response.status, 404);
  assert.equal(context.objects.size, 2);
});

test('a stale checkout read cannot reacquire a purged order or recreate abandoned private blobs', async () => {
  const context = environment(), services = mockServices();
  const prepare = context.env.CHECKOUT_DB.prepare;
  context.env.CHECKOUT_DB.prepare = sql => {
    const statement = prepare(sql);
    if (sql === 'SELECT * FROM checkout_orders WHERE submission_key=?') {
      const read = statement.first;
      statement.first = async () => {
        const snapshot = await read();
        context.db.prepare("UPDATE checkout_orders SET stage='purged' WHERE id=?").run(snapshot.id);
        return snapshot;
      };
    }
    return statement;
  };
  assert.equal((await handleCheckout(checkout(), context.env)).status, 503);
  assert.equal(context.objects.size, 0);
  assert.equal(services.calls.length, 0);
  assert.equal(context.db.prepare('SELECT stage FROM checkout_orders').get().stage, 'purged');
});

test('configured limiter denies checkout and status and failures fail closed', async () => {
  const context = environment(); globalThis.fetch = () => assert.fail('Rate limited');
  const keys = [];
  context.env.CHECKOUT_RATE_LIMITER = { async limit(input) { keys.push(input.key); return { success: false }; } };
  assert.equal((await handleCheckout(checkout(), context.env)).status, 429);
  assert.equal((await handleOrderStatus(req('/order-status'), context.env)).status, 429);
  assert.deepEqual(keys, ['checkout:unknown', 'checkout:unknown']);
  context.env.CHECKOUT_RATE_LIMITER.limit = async () => { throw new Error('Limiter failed'); };
  assert.equal((await handleCheckout(checkout(), context.env)).status, 503);
});

test('Worker and all Pages routes are wired and enforce methods', async () => {
  for (const [path, page, method] of [
    ['/checkout', pagesCheckout, 'POST'], ['/order-status', pagesStatus, 'GET'],
    ['/shop-status', pagesShop, 'GET'], ['/stripe-webhook', pagesWebhook, 'POST'],
  ]) {
    const request = req(path, { method: method === 'GET' ? 'POST' : 'GET' });
    const response = await worker.fetch(request, {}, {});
    assert.equal(response.status, 405); assert.equal(response.headers.get('Allow'), method);
    assert.equal((await page({ request, env: {} })).status, 405);
  }
});
