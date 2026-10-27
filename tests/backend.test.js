import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import worker from '../worker.js';
import { onRequest as pagesContact } from '../functions/contact.js';
import { onRequest as pagesTerrain } from '../functions/terrain/[[path]].js';
import { handleContact, MAX_CONTACT_SIZE } from '../src/server/contact.js';
import { handleTerrain, MAX_TILE_SIZE, TERRAIN_CACHE_TTL } from '../src/server/terrain.js';
import { MAX_GPX_SIZE } from '../src/shared/gpx.js';
import { readGpxCollection } from '../src/shared/gpx-collection.js';
import { MAX_PREVIEW_SIZE } from '../src/shared/preview.js';

const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;
const originalSetTimeout = globalThis.setTimeout;
const originalConsoleError = console.error;
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  console.error = originalConsoleError;
  if (originalCaches === undefined) delete globalThis.caches;
  else globalThis.caches = originalCaches;
});
const env = { RESEND_API_KEY: 'test-key' };
const fields = { name: 'Ada', email: 'ada@example.com', type: 'individual', message: 'Meine Gipfelroute.' };
const configuration = { version: 1, product: 'frame', engraving: 'Mein Gipfel', margin: 0.15, preview: 'ready' };
const gpx = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="47" lon="11"/><trkpt lat="47.1" lon="11.1"/></trkseg></trk></gpx>';
const contact = (data = fields) => new Request('https://peak-memory.de/contact', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});
function formContact(overrides = {}, file) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) form.append(key, value);
  if (file !== undefined) form.append('gpxFile', file);
  return new Request('https://peak-memory.de/contact', { method: 'POST', body: form });
}
function collectionContact(files, overrides = {}, configure) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) form.append(key, value);
  for (const file of files) form.append('gpxFiles', file);
  configure?.(form);
  return new Request('https://peak-memory.de/contact', { method: 'POST', body: form });
}
function tile(path = '/terrain/5/16/10.webp', options) {
  return new Request(`https://peak-memory.de${path}`, options);
}
function png() {
  const bytes = new Uint8Array(64);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12);
  view.setUint32(16, 256);
  view.setUint32(20, 256);
  bytes[24] = 8;
  bytes[25] = 2;
  return bytes;
}
function webp(width = 512, height = 512, chunk = 'VP8L') {
  const bytes = new Uint8Array(26);
  bytes.set([82, 73, 70, 70]);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, bytes.length - 8, true);
  bytes.set([87, 69, 66, 80], 8);
  bytes.set([...chunk].map(character => character.charCodeAt(0)), 12);
  view.setUint32(16, 5, true);
  bytes[20] = 0x2f;
  view.setUint32(21, (width - 1) | ((height - 1) << 14), true);
  return bytes;
}
function webpResponse(bytes = webp(), headers = {}) {
  return new Response(bytes, { headers: { 'Content-Type': 'image/webp', ...headers } });
}
function pngResponse(bytes = png(), headers = {}) {
  return new Response(bytes, { headers: { 'Content-Type': 'image/png', ...headers } });
}
function captureMail() {
  const payloads = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    payloads.push(JSON.parse(options.body));
    return new Response('{"id":"mail-id"}');
  };
  return payloads;
}
function timeoutFetch() {
  globalThis.setTimeout = (callback, _delay, ...args) => originalSetTimeout(callback, 0, ...args);
  globalThis.fetch = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

test('terrain-only contact retains reproducible area in JSON without GPX and rejects mixed sources', async () => {
  const payloads = captureMail();
  const area = {
    version: 6, source: 'area', area: { left: 0.525, top: 0.35, size: 0.0004 },
    product: 'base', wallMount: false, engraving: 'Meine Landschaft', elevationScale: 2, preview: 'unavailable',
  };
  assert.equal((await handleContact(formContact({ configuration: JSON.stringify(area) }), env)).status, 200);
  assert.match(payloads[0].text, /ohne Route.*Nord oben/);
  assert.doesNotMatch(payloads[0].text, /Geländerand/);
  assert.equal(payloads[0].attachments.length, 1);
  assert.equal(payloads[0].attachments[0].filename, 'konfiguration.json');
  assert.deepEqual(JSON.parse(Buffer.from(payloads[0].attachments[0].content, 'base64')), area);
  const mixed = await handleContact(formContact({ configuration: JSON.stringify(area) }, new File([gpx], 'route.gpx')), env);
  assert.equal(mixed.status, 400);
  assert.match((await mixed.json()).error, /keine GPX/);
  assert.equal((await handleContact(formContact({ configuration: JSON.stringify({
    ...area, area: { ...area.area, size: 0.5 },
  }) }), env)).status, 400);
  assert.equal(payloads.length, 1);
});

test('ordinary JSON contact remains attachment-optional and preserves delivery fields', async () => {
  const payloads = captureMail();
  const response = await handleContact(contact(), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(payloads[0].to, 'peak.memory@web.de');
  assert.equal(payloads[0].from, 'kontakt@peak-memory.de');
  assert.equal(payloads[0].reply_to, fields.email);
  assert.match(payloads[0].text, /Einzelstück/);
  assert.equal(payloads[0].attachments, undefined);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('ordinary form contact and empty optional file work', async () => {
  const payloads = captureMail();
  assert.equal((await handleContact(formContact(), env)).status, 200);
  assert.equal((await handleContact(formContact({}, new File([], '')), env)).status, 200);
  const encoded = new Request('https://peak-memory.de/contact', {
    method: 'POST', body: new URLSearchParams(fields),
  });
  assert.equal((await handleContact(encoded, env)).status, 200);
  assert.equal(payloads.length, 3);
  assert.equal(payloads[1].attachments, undefined);
});

test('ordinary uploaded GPX is parsed and original bytes attached once', async () => {
  const payloads = captureMail();
  const response = await handleContact(formContact({}, new File([gpx], 'Original.GPX')), env);
  assert.equal(response.status, 200);
  assert.equal(payloads[0].attachments.length, 1);
  assert.equal(payloads[0].attachments[0].filename, 'Original.GPX');
  assert.equal(Buffer.from(payloads[0].attachments[0].content, 'base64').toString(), gpx);
});

test('multiple contact GPX uploads attach every original in order and the regenerated combined GPX', async () => {
  const payloads = captureMail();
  const files = [
    new File([gpx], 'one.gpx', { type: 'application/gpx+xml' }),
    new File([gpx.replaceAll('47', '48')], 'two.gpx', { type: 'text/xml' }),
  ];
  const expected = await readGpxCollection(files);
  for (const overrides of [{}, { configuration: JSON.stringify(configuration), previewImage: new File([png()], 'preview.png', { type: 'image/png' }) }]) {
    const response = await handleContact(collectionContact(files, overrides), env);
    assert.equal(response.status, 200, await response.clone().text());
    const attachments = payloads.at(-1).attachments;
    assert.equal(attachments.length, overrides.configuration ? 4 : 3);
    for (const [index, source] of expected.sources.entries()) {
      assert.equal(attachments[index].filename, `original-${String(index + 1).padStart(2, '0')}-${source.name}`);
      assert.deepEqual(Buffer.from(attachments[index].content, 'base64'), Buffer.from(source.bytes));
    }
    assert.equal(attachments[2].filename, expected.filename);
    assert.deepEqual(Buffer.from(attachments[2].content, 'base64'), Buffer.from(expected.gpx));
  }
});

test('a single repeated GPX contact upload stays byte-exact and does not add a combined attachment', async () => {
  const payloads = captureMail();
  assert.equal((await handleContact(collectionContact([new File([gpx], 'one.gpx')]), env)).status, 200);
  assert.equal(payloads[0].attachments.length, 1);
  assert.equal(Buffer.from(payloads[0].attachments[0].content, 'base64').toString(), gpx);
});

test('contact original labels stay unique despite filename sanitization, truncation and combined-name collisions', async () => {
  const payloads = captureMail();
  const names = ['same.gpx', 'same.gpx', 'a/b.gpx', 'a\\b.gpx',
    `${'x'.repeat(205)}a.gpx`, `${'x'.repeat(205)}b.gpx`, 'peakmemory-routen.gpx'];
  const files = names.map((name, index) => new File([gpx.replaceAll('47', String(40 + index))], name));
  const response = await handleContact(collectionContact(files), env);
  assert.equal(response.status, 200, await response.clone().text());
  const attachments = payloads[0].attachments;
  assert.equal(new Set(attachments.map(attachment => attachment.filename)).size, names.length + 1);
  for (const [index, attachment] of attachments.slice(0, names.length).entries()) {
    assert.ok(attachment.filename.startsWith(`original-${String(index + 1).padStart(2, '0')}-`));
    assert.ok(attachment.filename.length <= 200);
    assert.doesNotMatch(attachment.filename, /[/\\]/);
    assert.deepEqual(Buffer.from(attachment.content, 'base64'), Buffer.from(await files[index].arrayBuffer()));
  }
});

test('contact collection validation rejects mixed fields, duplicates, malformed encoding and aggregate limits', async () => {
  globalThis.fetch = () => assert.fail('Invalid collections must not send mail');
  const first = new File([gpx], 'one.gpx');
  const large = gpx + ' '.repeat(Math.floor(MAX_GPX_SIZE / 2) + 1 - Buffer.byteLength(gpx));
  const segments = count => `<gpx version="1.1"><trk>${'<trkseg><trkpt lat="47" lon="11"/><trkpt lat="48" lon="11"/></trkseg>'.repeat(count)}</trk></gpx>`;
  const points = (offset) => `<gpx version="1.1"><trk><trkseg>${Array.from({ length: 50001 },
    (_, index) => `<trkpt lat="${offset + index % 2}" lon="11"/>`).join('')}</trkseg></trk></gpx>`;
  for (const files of [
    [first, new File([gpx], 'duplicate.gpx')],
    Array.from({ length: 11 }, (_, index) => new File([gpx + ' '.repeat(index)], `${index}.gpx`)),
    [new File([large], 'large-a.gpx'), new File([large + '\n'], 'large-b.gpx')],
    [new File([new Uint8Array([0xff]), gpx], 'encoding.gpx')],
    [new File([segments(51)], 'segments-a.gpx'), new File([segments(50)], 'segments-b.gpx')],
    [new File([points(47)], 'points-a.gpx'), new File([points(49)], 'points-b.gpx')],
    ['not-a-file'],
  ]) {
    const response = await handleContact(collectionContact(files), env);
    assert.equal(response.status, 400, await response.clone().text());
  }
  const mixed = collectionContact([first], {}, form => form.append('gpxFile', first));
  assert.equal((await handleContact(mixed, env)).status, 400);
  assert.equal((await handleContact(contact({ ...fields, gpxFiles: [] }), env)).status, 400);
});

test('a valid GPX at the exact 5 MB file boundary is accepted unchanged', async () => {
  const payloads = captureMail();
  const source = gpx + ' '.repeat(MAX_GPX_SIZE - Buffer.byteLength(gpx));
  const response = await handleContact(formContact({}, new File([source], 'limit.gpx')), env);
  assert.equal(response.status, 200);
  assert.equal(Buffer.from(payloads[0].attachments[0].content, 'base64').byteLength, MAX_GPX_SIZE);
});

test('configuration and personal GPX produce validated settings in the email', async () => {
  const payloads = captureMail();
  const response = await handleContact(formContact({
    configuration: JSON.stringify({ ...configuration, preview: 'unavailable', ignored: 'never include this' }),
  }, new File([gpx], 'personal.gpx')), env);
  assert.equal(response.status, 200);
  assert.match(payloads[0].text, /Konfiguration \(Version 1\)/);
  assert.match(payloads[0].text, /Gerahmtes Relief/);
  assert.match(payloads[0].text, /Mein Gipfel/);
  assert.match(payloads[0].text, /15 %/);
  assert.match(payloads[0].text, /nicht verfügbar/);
  assert.doesNotMatch(payloads[0].text, /never include/);
  assert.equal(payloads[0].attachments.length, 1);
  assert.equal(Buffer.from(payloads[0].attachments[0].content, 'base64').toString(), gpx);
});

test('configurator requests require a personal file even for unavailable previews', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  for (const preview of ['ready', 'unavailable']) {
    const response = await handleContact(formContact({ configuration: JSON.stringify({ ...configuration, preview }) }), env);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /persönliche GPX/);
  }
});

test('configurator screenshot is attached as PNG alongside unchanged GPX', async () => {
  const payloads = captureMail();
  const image = new File([png()], 'arbitrary-name.png', { type: 'image/png' });
  const response = await handleContact(formContact({
    configuration: JSON.stringify(configuration), previewImage: image,
  }, new File([gpx], 'personal.gpx')), env);
  assert.equal(response.status, 200);
  assert.equal(payloads[0].attachments.length, 2);
  assert.equal(Buffer.from(payloads[0].attachments[0].content, 'base64').toString(), gpx);
  assert.equal(payloads[0].attachments[1].filename, 'peakmemory-vorschau.png');
  assert.equal(payloads[0].attachments[1].content_type, 'image/png');
  assert.deepEqual(Buffer.from(payloads[0].attachments[1].content, 'base64'), Buffer.from(png()));
  assert.match(payloads[0].text, /Vorschaubild: als PNG angehängt/);
});

test('invalid, oversized or unconfigured screenshots reject before mail delivery', async () => {
  globalThis.fetch = () => assert.fail('Invalid screenshot must not send mail');
  const oversizedDimensions = png();
  new DataView(oversizedDimensions.buffer).setUint32(16, 2049);
  for (const image of [
    'not-a-file',
    new File([png()], 'preview.jpg', { type: 'image/jpeg' }),
    new File([], 'preview.png', { type: 'image/png' }),
    new File(['not png'], 'preview.png', { type: 'image/png' }),
    new File([oversizedDimensions], 'preview.png', { type: 'image/png' }),
    new File([new Uint8Array(MAX_PREVIEW_SIZE + 1)], 'preview.png', { type: 'image/png' }),
  ]) {
    assert.equal((await handleContact(formContact({
      configuration: JSON.stringify(configuration), previewImage: image,
    }, new File([gpx], 'personal.gpx')), env)).status, 400);
  }
  for (const config of [undefined, { ...configuration, preview: 'unavailable' }]) {
    assert.equal((await handleContact(formContact({
      ...(config ? { configuration: JSON.stringify(config) } : {}),
      previewImage: new File([png()], 'preview.png', { type: 'image/png' }),
    }, new File([gpx], 'personal.gpx')), env)).status, 400);
  }
});

test('current inquiries include validated oak-base and height scaling settings', async () => {
  const payloads = captureMail();
  for (const elevationScale of [1,2,8]) {
    const config = {...configuration,version:2,product:'base',elevationScale};
    assert.equal((await handleContact(formContact({configuration:JSON.stringify(config)}, new File([gpx], 'personal.gpx')), env)).status, 200);
    assert.match(payloads.at(-1).text, /Relief auf Eichenholzsockel/);
    assert.ok(payloads.at(-1).text.includes(`Höhenüberhöhung: ${elevationScale}×`));
    assert.match(payloads.at(-1).text, /Modellpreis: 50 EUR inkl. Versand innerhalb Deutschlands/);
  }
  globalThis.fetch = () => assert.fail('Invalid height scale must not send mail');
  for (const elevationScale of [null,'2',0.99,8.01]) {
    assert.equal((await handleContact(formContact({configuration:JSON.stringify({...configuration,version:2,product:'base',elevationScale})},
      new File([gpx], 'personal.gpx')), env)).status, 400);
  }
});

test('v3 inquiries include the selected product, dimensions, engraving and price', async () => {
  const payloads = captureMail();
  for (const [product, engraving, price, dimensions] of [
    ['base', 'Meine Tour', 50, '11 × 13,5 × 2 cm'],
    ['compact', '', 45, '11 × 11 × 2 cm'],
    ['frame', 'Meine Tour', 55, '20 × 20 cm Außenmaß'],
  ]) {
    const config = { ...configuration, version: 3, product, engraving, elevationScale: 2 };
    const response = await handleContact(formContact({ configuration: JSON.stringify(config) },
      new File([gpx], 'personal.gpx')), env);
    assert.equal(response.status, 200);
    const text = payloads.at(-1).text;
    assert.ok(text.includes(`Modellpreis: ${price} EUR`));
    assert.ok(text.includes(`Ausführung: ${dimensions}`));
    assert.ok(text.includes(`Gravur: ${engraving || '(keine)'}`));
    assert.ok(text.includes('Höhenüberhöhung: 2×'));
  }
});

test('v4 wood inquiries include paid mounting choice and standard protective feet', async () => {
  const payloads = captureMail();
  for (const product of ['base', 'compact']) for (const wallMount of [false, true]) {
    const config = { ...configuration, version: 4, product, engraving: '', elevationScale: 2, wallMount };
    assert.equal((await handleContact(formContact({ configuration: JSON.stringify(config) },
      new File([gpx], 'personal.gpx')), env)).status, 200);
    const text = payloads.at(-1).text;
    assert.ok(text.includes(`Wandaufhängung: ${wallMount ? 'ja (+1 EUR)' : 'nein'}`));
    assert.ok(text.includes('4 transparente Schutzfüße'));
    assert.ok(text.includes(`Modellpreis: ${(product === 'base' ? 50 : 45) + (wallMount ? 1 : 0)} EUR`));
  }
});

test('legacy configurator addresses redirect to the embedded homepage configurator', async () => {
  for (const path of ['/configurator', '/configurator.html', '/configurator/']) {
    const response = await worker.fetch(new Request(`https://peak-memory.de${path}`), {
      ASSETS: { fetch() { assert.fail('Redirect must not serve standalone assets'); } },
    }, {});
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), 'https://peak-memory.de/#konfigurator');
  }
});

test('contact rejects missing or malformed fields without fetching', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  for (const data of [
    null, [], { ...fields, name: null }, { ...fields, name: '   ' },
    { ...fields, name: {} }, { ...fields, email: 'invalid' }, { ...fields, email: {} },
    { ...fields, message: 'abcd' }, { ...fields, message: {} },
    { ...fields, name: 'x'.repeat(10001) }, { ...fields, message: 'x'.repeat(20001) },
    { ...fields, gpxFile: 'not-a-file' }, { ...fields, type: { toString: 'bad' }, email: 'x'.repeat(201) + '@a.de' },
  ]) assert.equal((await handleContact(contact(data), env)).status, 400);
  const malformed = new Request('https://peak-memory.de/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal((await handleContact(malformed, env)).status, 400);
});

test('configuration rejects malformed JSON and every invalid threshold', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  for (const config of [
    '{', 'null', '[]', JSON.stringify({ ...configuration, version: 2 }),
    JSON.stringify({ ...configuration, product: 'other' }),
    JSON.stringify({ ...configuration, engraving: 'x'.repeat(121) }),
    JSON.stringify({ ...configuration, engraving: '1\n2\n3\n4' }),
    JSON.stringify({ ...configuration, margin: 0.049 }),
    JSON.stringify({ ...configuration, margin: 0.501 }),
    JSON.stringify({ ...configuration, preview: 'loading' }),
  ]) assert.equal((await handleContact(formContact({ configuration: config }, new File([gpx], 'route.gpx')), env)).status, 400);
});

test('ordinary upload rejects invalid GPX, XML entities, empty and oversized files', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  for (const file of [
    new File([gpx], 'route.txt'), new File([], 'empty.gpx'),
    new File(['x'.repeat(MAX_GPX_SIZE + 1)], 'big.gpx'),
    new File(['not xml'], 'broken.gpx'),
    new File(['<!DOCTYPE gpx><gpx version="1.1"></gpx>'], 'entity.gpx'),
    new File([gpx.replace('lat="47"', 'lat="91"')], 'coordinates.gpx'),
    new File(['<gpx version="1.1"><rte><rtept lat="1" lon="2"/></rte></gpx>'], 'one.gpx'),
  ]) assert.equal((await handleContact(formContact({}, file), env)).status, 400);
});

test('contact imposes total body bounds including unknown content length', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  assert.equal((await handleContact(new Request('https://peak-memory.de/contact', {
    method: 'POST', body: 'x', headers: { 'Content-Length': String(MAX_CONTACT_SIZE + 1) },
  }), env)).status, 413);
  assert.equal((await handleContact(new Request('https://peak-memory.de/contact', {
    method: 'POST', body: 'x'.repeat(MAX_CONTACT_SIZE + 1),
  }), env)).status, 413);
});

test('contact rejects duplicate multipart fields', async () => {
  globalThis.fetch = () => assert.fail('Invalid input must not send mail');
  const request = formContact();
  const form = await request.formData();
  form.append('name', 'second');
  assert.equal((await handleContact(new Request(request.url, { method: 'POST', body: form }), env)).status, 400);
});

test('valid configuration bounds and ordinary legacy truncation are retained', async () => {
  const payloads = captureMail();
  for (const margin of [0.05, 0.5]) {
    assert.equal((await handleContact(formContact({
      name: 'N'.repeat(250), message: 'M'.repeat(4500),
      configuration: JSON.stringify({ ...configuration, margin, product: 'base', engraving: 'E'.repeat(120) }),
    }, new File([gpx], 'route.gpx')), env)).status, 200);
  }
  assert.match(payloads[0].text, /Eichenholzsockel/);
  assert.match(payloads[0].text, /5 %/);
  assert.match(payloads[1].text, /50 %/);
  assert.ok(!payloads[0].text.includes('N'.repeat(201)));
  assert.ok(!payloads[0].text.includes('M'.repeat(4001)));
});

test('Resend rejection, network failure and timeout become explicit errors', async () => {
  const logged = [];
  console.error = (...args) => logged.push(args);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } });
  };
  assert.equal((await handleContact(contact(), env)).status, 502);
  globalThis.fetch = async () => new Response('private upstream details', { status: 422 });
  let response = await handleContact(contact(), env);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private upstream/);
  globalThis.fetch = async () => { throw new Error('private network details'); };
  response = await handleContact(contact(), env);
  assert.equal(response.status, 502);
  timeoutFetch();
  assert.equal((await handleContact(contact(), env)).status, 504);
  assert.deepEqual(logged, [
    ['Contact delivery failure', 'Error'],
    ['Contact delivery failure', 'AbortError'],
  ]);
});

test('contact missing secret and unsupported method never fetch', async () => {
  globalThis.fetch = () => assert.fail('Must not fetch');
  assert.equal((await handleContact(contact(), {})).status, 500);
  const response = await handleContact(new Request('https://peak-memory.de/contact'), env);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});

test('terrain fetch uses fixed Mapterhorn upstream, verifies lossless WebP and sets cache headers', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://tiles.mapterhorn.com/5/16/10.webp');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Accept, 'image/webp');
    return webpResponse();
  };
  const response = await handleTerrain(tile());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/webp');
  assert.equal(response.headers.get('Cache-Control'), `public, max-age=${TERRAIN_CACHE_TTL}`);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), webp());
});

test('terrain rejects invalid coordinates, queries, arbitrary URLs and methods before fetch', async () => {
  globalThis.fetch = () => assert.fail('Must not proxy invalid inputs');
  for (const path of [
    '/terrain', '/terrain/15/0/0.webp', '/terrain/-1/0/0.webp', '/terrain/1/2/0.webp',
    '/terrain/1/0/2.webp', '/terrain/1/0/0.5.webp', '/terrain/01/0/0.webp',
    '/terrain/0/0/0.png', '/terrain/0/0/0.webp?url=https://evil.example/',
    '/terrain/https://evil.example/x.webp', '/terrain/14/16384/0.webp', '/terrain/14/0/16384.webp',
  ]) assert.equal((await handleTerrain(tile(path))).status, 400, path);
  const response = await handleTerrain(tile(undefined, { method: 'POST' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
});

test('terrain accepts zoom and tile coordinate bounds', async () => {
  globalThis.fetch = async () => webpResponse();
  for (const path of ['/terrain/0/0/0.webp', '/terrain/14/16383/16383.webp']) {
    assert.equal((await handleTerrain(tile(path))).status, 200);
  }
});

test('cache hit avoids rate limiter and provider; cache miss writes using waitUntil', async () => {
  const stored = new Map();
  const writes = [];
  globalThis.caches = { default: {
    match: async request => stored.get(request.url)?.clone(),
    put: async (request, response) => { writes.push(request.url); stored.set(request.url, response); },
  } };
  let limiterCalls = 0;
  let fetchCalls = 0;
  const limiterEnv = { TERRAIN_RATE_LIMITER: { limit: async ({ key }) => {
    assert.equal(key, 'terrain:192.0.2.42');
    limiterCalls++;
    return { success: true };
  } } };
  globalThis.fetch = async () => { fetchCalls++; return webpResponse(); };
  const pending = [];
  const context = { waitUntil: promise => pending.push(promise) };
  const request = tile(undefined, { headers: { 'CF-Connecting-IP': '192.0.2.42' } });
  assert.equal((await handleTerrain(request, limiterEnv, context)).status, 200);
  await Promise.all(pending);
  assert.equal((await handleTerrain(request, limiterEnv, context)).status, 200);
  assert.equal(fetchCalls, 1);
  assert.equal(limiterCalls, 1);
  assert.equal(writes.length, 1);
});

test('rate limiter denial and failure have explicit status and do not fetch', async () => {
  const logged = [];
  console.error = (...args) => logged.push(args);
  globalThis.fetch = () => assert.fail('Limiter must block fetch');
  let response = await handleTerrain(tile(), {
    TERRAIN_RATE_LIMITER: { limit: async ({ key }) => {
      assert.equal(key, 'terrain:unknown');
      return { success: false };
    } },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  response = await handleTerrain(tile(), { TERRAIN_RATE_LIMITER: { limit: async () => { throw new Error('offline'); } } });
  assert.equal(response.status, 503);
  assert.deepEqual(logged, [['Terrain limiter failure', 'Error']]);
});

test('cache outages do not break valid terrain responses', async () => {
  const logged = [];
  console.error = (...args) => logged.push(args);
  globalThis.caches = { default: {
    match: async () => { throw new Error('cache read outage'); },
    put: () => { throw new Error('cache write outage'); },
  } };
  globalThis.fetch = async () => webpResponse();
  assert.equal((await handleTerrain(tile())).status, 200);
  assert.deepEqual(logged, [
    ['Terrain cache read failure', 'Error'],
    ['Terrain cache write failure', 'Error'],
  ]);
});

test('terrain provider HTTP and network failures remain errors, never cached', async () => {
  globalThis.caches = { default: { match: async () => undefined, put: () => assert.fail('Do not cache errors') } };
  for (const status of [302, 403, 404, 500, 429]) {
    globalThis.fetch = async () => new Response('upstream detail', { status });
    const response = await handleTerrain(tile());
    assert.equal(response.status, status === 429 ? 503 : 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /upstream detail/);
  }
  globalThis.fetch = async () => { throw new Error('network'); };
  assert.equal((await handleTerrain(tile())).status, 502);
  timeoutFetch();
  assert.equal((await handleTerrain(tile())).status, 504);
});

test('terrain rejects invalid content, WebP format, tile dimensions and size bounds', async () => {
  const wrongSignature = webp();
  wrongSignature[0] = 0;
  const wrongDimensions = webp(256, 256);
  const lossyTile = webp(512, 512, 'VP8 ');
  const responses = [
    new Response('html', { headers: { 'Content-Type': 'text/html' } }),
    webpResponse(new Uint8Array(25)), webpResponse(wrongSignature), webpResponse(wrongDimensions),
    webpResponse(lossyTile),
    webpResponse(webp(), { 'Content-Length': String(MAX_TILE_SIZE + 1) }),
    webpResponse(webp(), { 'Content-Length': '25' }),
    webpResponse(webp(), { 'Content-Length': '27' }),
    webpResponse(new Uint8Array(MAX_TILE_SIZE + 1)),
    webpResponse(webp(), { 'Content-Length': 'not-a-number' }),
  ];
  for (const response of responses) {
    globalThis.fetch = async () => response;
    assert.equal((await handleTerrain(tile())).status, 502);
  }
});

test('Worker and Pages both route through the shared handlers', async () => {
  captureMail();
  assert.equal((await worker.fetch(contact(), env, {})).status, 200);
  assert.equal((await pagesContact({ request: contact(), env })).status, 200);
  globalThis.fetch = async () => webpResponse();
  assert.equal((await worker.fetch(tile(), {}, {})).status, 200);
  assert.equal((await pagesTerrain({ request: tile(), env: {} })).status, 200);
  assert.equal((await worker.fetch(tile('/terrain/nope'), {}, {})).status, 400);
  const assetsEnv = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal(await (await worker.fetch(new Request('https://peak-memory.de/'), assetsEnv)).text(), 'asset');
  const redirect = await worker.fetch(new Request('https://www.peak-memory.de/contact'), env);
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('Location'), 'https://peak-memory.de/contact');
});
