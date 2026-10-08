import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { startDevServer } from './dev.js';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function terrainPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(256, 0); header.writeUInt32BE(256, 4);
  header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc(256 * (256 * 3 + 1));
  for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) {
    const offset = y * (256 * 3 + 1) + 1 + x * 3;
    rows[offset] = 128; rows[offset + 1] = 100 + Math.floor((x + y) / 8); rows[offset + 2] = 0;
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

const server = await startDevServer(0);
async function assertMobileOrder(page) {
  const route = await page.locator('#routeControls').boundingBox();
  const product = await page.locator('#productControls').boundingBox();
  const preview = await page.locator('.preview').boundingBox();
  assert.ok(route.y + route.height <= product.y);
  assert.ok(product.y + product.height <= preview.y);
}

async function assertDesktopLayout(page) {
  const route = await page.locator('#routeControls').boundingBox();
  const product = await page.locator('#productControls').boundingBox();
  const preview = await page.locator('.preview').boundingBox();
  assert.equal(route.x, product.x);
  assert.ok(route.x + route.width <= preview.x);
}

let browser;
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const png = terrainPng();
  let terrainFailure = false, terrainOffline = false, emailFailure = false, submitted = null, submittedImage = null, terrainDelay = 0, terrainRequests = 0;
  await page.route('**/terrain/**', async request => {
    terrainRequests += 1;
    if (terrainOffline) { await request.abort('connectionrefused'); return; }
    if (terrainDelay) await new Promise(resolve => setTimeout(resolve, terrainDelay));
    await request.fulfill(terrainFailure
      ? {status:502,contentType:'application/json',body:'{"error":"unavailable"}'}
      : {status:200,contentType:'image/png',body:png});
  });
  await page.route('**/contact', async request => {
    const bytes = request.request().postDataBuffer();
    submitted = bytes.toString();
    const multipart = await new Response(bytes, { headers: { 'Content-Type': request.request().headers()['content-type'] } }).formData();
    const image = multipart.get('previewImage');
    submittedImage = image ? Buffer.from(await image.arrayBuffer()) : null;
    if (image) {
      assert.equal(image.name, 'peakmemory-vorschau.png');
      assert.equal(image.type, 'image/png');
      assert.ok(image.size > 1000 && image.size <= 1024 * 1024);
      assert.deepEqual([...submittedImage.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    }
    await request.fulfill({status:emailFailure?502:200,contentType:'application/json',
      body:emailFailure?'{"error":"Test: E-Mail nicht gesendet"}':'{"ok":true}'});
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url + '/configurator.html');
  assert.equal(page.url(), url + '/#konfigurator');
  assert.equal(await page.locator('#modelPrice').innerText(), '50 €');
  await assertDesktopLayout(page);
  const defaultEngraving = 'Deine Route\n100 km | 1000 hm | 10 h\n01.01.2026';
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  assert.equal(await page.locator('#routeControls a[href="gpx-hilfe.html"]').getAttribute('target'), '_blank');
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  await page.locator('#sample').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute');
  assert.equal(await page.locator('#fileName').innerText(), 'Allgäu Panorama Marathon – Marathon (Beispielroute)');
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  assert.equal(await page.evaluate(() => document.fonts.check('400 44px "Quicksand Book"')), true);
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  await page.locator('#rotate').click(); await page.locator('#zoomIn').click(); await page.locator('#resetView').click();
  assert.equal(await page.locator('#product').count(), 0);
  assert.equal(await page.locator('#elevationScale').inputValue(), '2');
  const requestsBeforeScaling = terrainRequests;
  for (const scale of ['1', '8']) {
    await page.locator('#elevationScale').fill(scale);
    assert.equal(await page.locator('#elevationValue').innerText(), `${scale}×`);
    assert.equal(await page.locator('#previewBadge').innerText(), 'Beispielroute');
  }
  assert.equal(terrainRequests, requestsBeforeScaling);
  await page.locator('#engraving').fill('Meine Tour\nSommer 2026');
  assert.match(await page.locator('#configurationSummary').innerText(), /Eiche-Holzsockel/);
  await page.locator('#margin').fill('50');
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute'
    && document.getElementById('marginValue').textContent === '50 %');
  const personal = '<gpx version="1.1"><trk><trkseg><trkpt lat="48.2" lon="9.1"/><trkpt lat="48.23" lon="9.13"/></trkseg></trk></gpx>';
  const upload = text => page.locator('#gpxFile').setInputFiles({name:'personal.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(text)});
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  assert.equal(await page.locator('#gpxFile').evaluate(element => element.files[0]?.name), 'personal.gpx');
  assert.equal(await page.locator('#submitInquiry').isEnabled(), true);
  await page.locator('#engraving').fill('Erste Zeile\nZweite Zeile\nDritte Zeile\nVierte Zeile');
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  assert.match(await page.locator('#configurationSummary').innerText(), /maximal 3 Zeilen/);
  await page.locator('#engraving').fill('Meine Tour\nSommer 2026\nFür dich');
  assert.equal(await page.locator('#submitInquiry').isEnabled(), true);
  await page.locator('#name').fill('Test Person'); await page.locator('#email').fill('test@example.invalid');
  await page.locator('#message').fill('Automatisierte Testanfrage ohne echten Versand.');
  await page.evaluate(() => {
    globalThis.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); };
  });
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('Vorschaubild'));
  assert.equal(submitted, null);
  assert.equal(await page.locator('#name').inputValue(), 'Test Person');
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = globalThis.originalToBlob;
    delete globalThis.originalToBlob;
  });
  emailFailure = true;
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('Versand fehlgeschlagen'));
  assert.equal(await page.locator('#name').inputValue(), 'Test Person');
  assert.equal(await page.locator('#submitInquiry').isEnabled(), true);
  assert.ok(submitted.includes(personal));
  assert.ok(submitted.includes('"product":"base"'));
  assert.ok(submitted.includes('"version":2'));
  assert.ok(submitted.includes('"elevationScale":8'));
  assert.ok(submitted.includes('"preview":"ready"'));
  assert.ok(submitted.includes('"engraving":"Meine Tour\\nSommer 2026\\nFür dich"'));
  assert.ok(submittedImage);
  const firstImage = submittedImage;
  await page.locator('#rotate').click();
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('Versand fehlgeschlagen'));
  assert.notDeepEqual(submittedImage, firstImage);
  const rotatedImage = submittedImage;
  await page.locator('#elevationScale').fill('1');
  await page.locator('#elevationScale').fill('8');
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('Versand fehlgeschlagen'));
  assert.deepEqual(submittedImage, rotatedImage, 'Elevation changes must preserve camera angle and zoom');
  if (process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
  emailFailure = false;
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('wurde gesendet'));
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  await upload('<not-gpx/>');
  await page.waitForFunction(() => document.getElementById('previewStatus').textContent.includes('gültige GPX'));
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  terrainFailure = true;
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  assert.equal(await page.locator('#submitInquiry').isEnabled(), true);
  assert.equal(await page.locator('#viewer canvas').count(), 0);
  terrainFailure = false;
  terrainOffline = true;
  await page.locator('#retry').click();
  await page.waitForFunction(() => document.getElementById('previewStatus').textContent.includes('Keine Verbindung zum Vorschau-Server'));
  assert.equal(await page.locator('#submitInquiry').isEnabled(), true);
  assert.equal(await page.locator('#fileName').innerText(), 'personal.gpx');
  assert.equal(await page.locator('#viewer canvas').count(), 0);
  terrainOffline = false;
  await page.locator('#retry').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await page.locator('#remove').click();
  assert.equal(await page.locator('#fileName').innerText(), 'Noch keine Route ausgewählt.');
  await page.evaluate(text => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], 'drop.gpx', {type:'application/gpx+xml'}));
    document.getElementById('dropzone').dispatchEvent(new DragEvent('drop', {dataTransfer:transfer,bubbles:true,cancelable:true}));
  }, personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await assertMobileOrder(page);
  await page.locator('#engraving').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.locator('#margin').evaluate(element => element === document.activeElement), true);
  await page.locator('#margin').fill('5'); await page.locator('#margin').fill('35');
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  terrainDelay = 400;
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Wird geladen');
  await upload('<invalid/>');
  await page.waitForFunction(() => document.getElementById('previewStatus').textContent.includes('gültige GPX'));
  await page.waitForTimeout(600);
  assert.equal(await page.locator('#previewBadge').innerText(), 'Noch keine Route');
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  terrainDelay = 0;
  await page.goto(url + '/');
  await page.reload();
  await page.goto(url + '/#datenschutz');
  assert.equal(await page.locator('#datenschutzModal').evaluate(element => element.classList.contains('open')), true);
  assert.equal(await page.locator('#main').evaluate(element => element.inert), true);
  assert.equal(await page.locator('#datenschutzClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.getElementById('datenschutzModal').contains(document.activeElement)), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main').evaluate(element => element.inert), false);
  assert.equal(await page.locator('#datenschutzLink').evaluate(element => element === document.activeElement), true);
  await page.locator('#impressumLink').click();
  assert.equal(await page.locator('#impressumClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#impressumClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#impressumLink').evaluate(element => element === document.activeElement), true);
  await page.setViewportSize({width:800,height:800});
  assert.ok(await page.locator('.navbar .container').evaluate(element => element.scrollWidth <= element.clientWidth));
  assert.equal(await page.locator('#hero + #konfigurator + #produkt').count(), 1);
  assert.equal(await page.locator('.process-card').count(), 6);
  assert.deepEqual(await page.locator('.process-card h3').allTextContents(),
    ['Route hochladen', 'Personalisieren', 'Unverbindlich anfragen', 'Finale Freigabe', 'Bestellung & Bezahlung', 'Produktion & Versand']);
  assert.equal(await page.locator('.nav-cta').getAttribute('href'), '#konfigurator');
  assert.match(await page.locator('#contactType option[value="event"]').innerText(), /5 Stück/);
  for (const id of ['contactName', 'contactEmail', 'contactType', 'contactMessage']) {
    assert.equal(await page.locator(`#${id}`).evaluate(element => element.labels.length), 1);
  }
  assert.ok((await page.locator('#hero img').getAttribute('src')).endsWith('.webp'));
  for (const image of await page.locator('main img').all()) {
    assert.ok(Number(await image.getAttribute('width')) > 0);
    assert.ok(Number(await image.getAttribute('height')) > 0);
    assert.ok(await image.getAttribute('srcset'));
  }
  assert.match(await page.locator('#engravingHint').innerText(), /Beispielwerte/);
  await assertDesktopLayout(page);
  assert.equal(await page.locator('#routeControls a[href="gpx-hilfe.html"]').count(), 1);
  assert.equal(await page.locator('#kontakt a[href="gpx-hilfe.html"]').count(), 1);
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  assert.equal(await page.locator('.navbar a[href="#konfigurator"]').count(), 2);
  assert.deepEqual(await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  }), []);
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await page.locator('#engraving').fill('Startseite\n2026');
  await page.locator('#rotate').click();
  await page.locator('#zoomIn').click();
  await page.locator('#resetView').click();
  assert.equal(await page.locator('#contactGpxFile').evaluate(element => element.files.length), 0);
  await page.locator('#contactGpxFile').setInputFiles({name:'contact.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(personal)});
  assert.match(await page.locator('#gpxFileName').innerText(), /contact.gpx/);
  assert.equal(await page.locator('#gpxFile').evaluate(element => element.files[0].name), 'personal.gpx');
  await page.locator('#name').fill('Homepage Test');
  await page.locator('#email').fill('homepage@example.invalid');
  await page.locator('#message').fill('Homepage inquiry test without sending email.');
  await page.locator('#submitInquiry').click();
  await page.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('Deine Anfrage wurde gesendet'));
  assert.match(submitted, /Startseite/);
  assert.ok(submittedImage);
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await assertMobileOrder(page);
  assert.ok((await page.locator('#hero').boundingBox()).height < 850, 'Mobile hero should fit within one screen');
  for (const width of [320, 390, 768, 1365]) {
    await page.setViewportSize({ width, height: 844 });
    for (const image of await page.locator('.custom-formats-images img,.event-images img').all()) {
      const box = await image.boundingBox();
      const expectedRatio = await image.evaluate(element => Number(element.getAttribute('width')) / Number(element.getAttribute('height')));
      assert.ok(Math.abs(box.width / box.height - expectedRatio) < .02, 'Gallery images must preserve their aspect ratio before and after loading');
      assert.ok(box.x >= 0 && box.x + box.width <= width, 'Gallery image must fit phone width');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('#navLinks').evaluate(element => element.inert), true);
  await page.locator('#hamburger').click();
  assert.equal(await page.locator('#navLinks').evaluate(element => element.inert), false);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#hamburger').getAttribute('aria-expanded'), 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.hero .btn-primary').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  const unavailable = await browser.newContext();
  await unavailable.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (String(type).startsWith('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  const noWebgl = await unavailable.newPage();
  await noWebgl.route('**/terrain/**', request => request.fulfill({status:200,contentType:'image/png',body:png}));
  await noWebgl.goto(url + '/configurator.html');
  await noWebgl.locator('#gpxFile').setInputFiles({name:'valid.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(personal)});
  await noWebgl.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  assert.equal(await noWebgl.locator('#submitInquiry').isEnabled(), true);
  assert.equal(await noWebgl.locator('#viewer canvas').count(), 0);
  let unavailableImage = 'not submitted';
  await noWebgl.route('**/contact', async request => {
    const form = await new Response(request.request().postDataBuffer(), {
      headers: { 'Content-Type': request.request().headers()['content-type'] },
    }).formData();
    unavailableImage = form.get('previewImage');
    await request.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await noWebgl.locator('#name').fill('No WebGL');
  await noWebgl.locator('#email').fill('no-webgl@example.invalid');
  await noWebgl.locator('#message').fill('Request without an available preview.');
  await noWebgl.locator('#submitInquiry').click();
  await noWebgl.waitForFunction(() => document.getElementById('inquiryStatus').textContent.includes('wurde gesendet'));
  assert.equal(unavailableImage, null);
  const guideContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1365, height: 950 } });
  const guide = await guideContext.newPage();
  await guide.goto(url + '/');
  assert.equal(await guide.locator('#hero h1').isVisible(), true);
  assert.equal(await guide.locator('.faq-answer').first().isVisible(), true);
  assert.equal(await guide.locator('#impressumModal').isVisible(), true);
  assert.equal(await guide.locator('#datenschutzModal').isVisible(), true);
  assert.equal(await guide.locator('#contactForm button[type="submit"]').isVisible(), false);
  assert.equal((await guide.goto(url + '/gpx-hilfe')).status(), 200);
  assert.equal((await guide.goto(url + '/gpx-hilfe.html')).status(), 200);
  assert.equal(await guide.getByRole('heading', { level: 1 }).innerText(), 'Wie bekomme ich meine GPX-Datei?');
  for (const id of ['komoot', 'strava', 'garmin', 'ohne-aufzeichnung']) {
    assert.equal(await guide.locator(`#${id}`).count(), 1);
    assert.equal(await guide.locator(`a[href="#${id}"]`).count(), 1);
  }
  assert.equal(await guide.locator('.guide-cta').getAttribute('href'), '/#konfigurator');
  await guide.setViewportSize({ width: 390, height: 844 });
  const guideWidth = await guide.locator('body').boundingBox();
  for (const card of await guide.locator('main .card').all()) {
    const box = await card.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= guideWidth.width);
  }
  await guideContext.close();
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: homepage configurator and legacy redirects, fixed price, GPX guide without JavaScript, independent contact upload, sample, personal upload/drop, 3D controls, customization, margin, inquiry success/failure, retry, removal, mobile, privacy, no WebGL.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
