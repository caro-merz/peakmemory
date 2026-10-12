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
async function dragPreview(page, dx = 80, dy = 0) {
  const canvas = page.locator('#viewer canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}
async function assertMobileOrder(page) {
  const route = await page.locator('#routeControls').boundingBox();
  const product = await page.locator('#productControls').boundingBox();
  const selection = await page.locator('#selectionControls').boundingBox();
  const preview = await page.locator('.preview').boundingBox();
  assert.ok(route.y + route.height <= selection.y);
  assert.ok(selection.y + selection.height <= product.y);
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
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const externalFontRequests = [];
  page.on('request', request => {
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(request.url()).hostname)) {
      externalFontRequests.push(request.url());
    }
  });
  page.on('pageerror', error => errors.push(error.message));
  const png = terrainPng();
  let terrainFailure = false, terrainOffline = false, emailFailure = false, submitted = null, submittedImage = null, terrainDelay = 0, terrainRequests = 0;
  await page.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":false,"testMode":true,"mode":"test"}',
  }));
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
  assert.deepEqual(await page.locator('.settings legend').allTextContents(),
    ['1 Deine Route', '2 Deine Produktauswahl', '3 Deine Personalisierung']);
  assert.equal(await page.locator('#routeControls details').count(), 0);
  assert.equal(await page.locator('.checkout #modelPrice').count(), 1);
  assert.equal(await page.locator('fieldset:has(.step) #modelPrice').count(), 0);
  assert.match(await page.locator('.model-price').innerText(), /Inkl. Versand innerhalb Deutschlands/);
  assert.equal(await page.locator('#checkoutForm').isHidden(), true);
  await assertDesktopLayout(page);
  const defaultEngraving = 'Deine Route\n100 km | 1000 hm | 10 h\n01.01.2026';
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  assert.equal(await page.locator('#routeControls a[href="gpx-hilfe.html"]').getAttribute('target'), '_blank');
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  await page.locator('#sample').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute');
  assert.equal(await page.locator('#fileName').innerText(), 'Allgäu Panorama Marathon – Marathon (Beispielroute)');
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  const canvas = page.locator('#viewer canvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(150);
  const spinningImage = await canvas.screenshot();
  await page.waitForTimeout(500);
  assert.notDeepEqual(await canvas.screenshot(), spinningImage, 'Model rotates automatically');
  await dragPreview(page);
  const pausedImage = await canvas.screenshot();
  await page.waitForTimeout(500);
  assert.deepEqual(await canvas.screenshot(), pausedImage, 'Manual controls pause automatic rotation');
  await page.waitForTimeout(700);
  assert.notDeepEqual(await canvas.screenshot(), pausedImage, 'Automatic rotation resumes after manual controls');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const stillImage = await canvas.screenshot();
  await page.waitForTimeout(350);
  assert.deepEqual(await canvas.screenshot(), stillImage, 'Reduced-motion preference stops automatic rotation');
  assert.equal(await page.evaluate(() => document.fonts.check('400 44px "Quicksand Book"')), true);
  assert.equal(await page.locator('#submitInquiry').isDisabled(), true);
  await dragPreview(page);
  await page.mouse.wheel(0, -100);
  await page.locator('#resetView').click();
  assert.equal(await page.locator('#rotate, #zoomIn, #zoomOut, #underside').count(), 0);
  assert.equal(await page.locator('#product').inputValue(), 'base');
  assert.equal(await page.locator('#wallMount').inputValue(), 'no');
  await dragPreview(page, 0, -180);
  const bareBack = await canvas.screenshot();
  await page.locator('#wallMount').selectOption('yes');
  assert.equal(await page.locator('#modelPrice').innerText(), '51 €');
  assert.match(await page.locator('#configurationSummary').innerText(), /Wandaufhängung: ja.*4 transparente Schutzfüße/);
  assert.notDeepEqual(await canvas.screenshot(), bareBack, 'Hanger becomes visible on the underside');
  await page.locator('#wallMount').selectOption('no');
  assert.deepEqual(await canvas.screenshot(), bareBack, 'Feet remain when the hanger is removed');
  await page.locator('#resetView').click();
  const requestsBeforeProducts = terrainRequests;
  await page.locator('#product').selectOption('compact');
  assert.equal(await page.locator('#modelPrice').innerText(), '45 €');
  assert.equal(await page.locator('#engraving').isDisabled(), true);
  assert.equal(await page.locator('#engravingControls').isHidden(), true);
  assert.equal(await page.locator('#margin').isEnabled(), true);
  assert.equal(await page.locator('#elevationScale').isEnabled(), true);
  assert.match(await page.locator('#configurationSummary').innerText(), /ohne Gravur.*11 × 11 × 2 cm.*Gravur: keine/);
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  await page.locator('#wallMount').selectOption('yes');
  assert.equal(await page.locator('#modelPrice').innerText(), '46 €');
  const compactImage = await page.locator('#viewer canvas').screenshot();
  await page.locator('#product').selectOption('frame');
  assert.equal(await page.locator('#modelPrice').innerText(), '55 €');
  assert.equal(await page.locator('#wallMountControls').isHidden(), true);
  assert.doesNotMatch(await page.locator('#configurationSummary').innerText(), /Wandaufhängung/);
  assert.equal(await page.locator('#engraving').isEnabled(), true);
  assert.equal(await page.locator('#engravingControls').isVisible(), true);
  assert.match(await page.locator('#configurationSummary').innerText(), /Passepartout.*20 × 20 cm/);
  assert.notDeepEqual(await page.locator('#viewer canvas').screenshot(), compactImage);
  await page.locator('#product').selectOption('base');
  assert.equal(await page.locator('#modelPrice').innerText(), '51 €');
  await page.locator('#wallMount').selectOption('no');
  assert.equal(await page.locator('#modelPrice').innerText(), '50 €');
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  assert.equal(terrainRequests, requestsBeforeProducts);
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
  assert.ok(submitted.includes('"version":4'));
  assert.ok(submitted.includes('"elevationScale":8'));
  assert.ok(submitted.includes('"preview":"ready"'));
  assert.ok(submitted.includes('"engraving":"Meine Tour\\nSommer 2026\\nFür dich"'));
  assert.ok(submittedImage);
  const firstImage = submittedImage;
  await dragPreview(page);
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
  const privacy = await page.locator('#datenschutzModal').innerText();
  assert.match(privacy, /Peak Memory GbR/);
  assert.match(privacy, /Stripe-Checkout und Bestelldaten/);
  assert.match(privacy, /7 Tagen/);
  assert.match(privacy, /90 Tagen/);
  assert.match(privacy, /§ 25 Abs. 1 TDDDG/);
  assert.match(privacy, /WEB.DE/);
  assert.doesNotMatch(privacy, /max\. 30 Tage|ausschließlich im Testmodus vorbereitet/);
  await page.evaluate(() => document.fonts.load('400 16px Inter'));
  assert.equal(await page.evaluate(() => document.fonts.check('400 16px Inter')), true);
  assert.deepEqual(externalFontRequests, [], 'Fonts must be loaded locally without Google requests');
  assert.equal(await page.locator('#main').evaluate(element => element.inert), true);
  assert.equal(await page.locator('#datenschutzClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.getElementById('datenschutzModal').contains(document.activeElement)), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main').evaluate(element => element.inert), false);
  assert.equal(await page.locator('#datenschutzLink').evaluate(element => element === document.activeElement), true);
  await page.locator('#impressumLink').click();
  assert.match(await page.locator('#impressumModal').innerText(), /Digitale-Dienste-Gesetz/);
  assert.doesNotMatch(await page.locator('#impressumModal').innerText(), /TMG/);
  assert.equal(await page.locator('#impressumModal a[href="tel:+491622701613"]').innerText(), '0162 2701613');
  assert.equal(await page.locator('#impressumClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#impressumClose').evaluate(element => element === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#impressumLink').evaluate(element => element === document.activeElement), true);
  await page.locator('#kaufbedingungenLink').click();
  assert.equal(await page.locator('#kaufbedingungenClose').evaluate(element => element === document.activeElement), true);
  assert.match(await page.locator('#kaufbedingungenModal').innerText(), /§ 312g Abs. 2 Nr. 1 BGB/);
  assert.match(await page.locator('#kaufbedingungenModal').innerText(), /erfolgreicher Zahlungsbestätigung/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main').evaluate(element => element.inert), false);
  await page.goto(url + '/#kaufbedingungen');
  assert.equal(await page.locator('#kaufbedingungenModal').evaluate(element => element.classList.contains('open')), true);
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:800,height:800});
  assert.ok(await page.locator('.navbar .container').evaluate(element => element.scrollWidth <= element.clientWidth));
  assert.equal(await page.locator('#hero + #konfigurator + #produkt').count(), 1);
  assert.equal(await page.locator('.process-card').count(), 5);
  assert.deepEqual(await page.locator('.process-card h3').allTextContents(),
    ['Route hochladen', 'Produkt auswählen', 'Personalisieren', 'Sicher bezahlen', 'Produktion & Versand']);
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
  await dragPreview(page);
  await page.mouse.wheel(0, -100);
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
  await noWebgl.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":true,"mode":"test"}',
  }));
  await noWebgl.route('**/terrain/**', request => request.fulfill({status:200,contentType:'image/png',body:png}));
  await noWebgl.goto(url + '/configurator.html');
  await noWebgl.locator('#gpxFile').setInputFiles({name:'valid.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(personal)});
  await noWebgl.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  assert.equal(await noWebgl.locator('#submitInquiry').isEnabled(), true);
  assert.equal(await noWebgl.locator('#submitCheckout').isDisabled(), true, 'Checkout requires a ready preview');
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
  assert.equal(await guide.locator('#kaufbedingungenModal').isVisible(), true);
  assert.match(await guide.locator('#kaufbedingungenModal').innerText(), /kein gesetzliches Widerrufsrecht/);
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
  const shop = await context.newPage();
  shop.on('pageerror', error => errors.push(error.message));
  await shop.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":true,"mode":"test"}',
  }));
  await shop.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/png', body: png }));
  let checkoutAttempt = 0;
  const checkoutSubmissions = [];
  await shop.route('**/checkout', async request => {
    const body = await new Response(request.request().postDataBuffer(), {
      headers: { 'Content-Type': request.request().headers()['content-type'] },
    }).formData();
    assert.equal(body.get('acceptance'), 'true');
    assert.equal(body.get('name'), 'Test Checkout');
    assert.equal(body.get('email'), 'checkout@example.invalid');
    assert.equal(await body.get('gpxFile').text(), personal);
    assert.equal(JSON.parse(body.get('configuration')).version, 4);
    assert.equal(body.get('previewImage').type, 'image/png');
    assert.equal(body.has('price'), false);
    checkoutSubmissions.push(body);
    checkoutAttempt += 1;
    await request.fulfill({
      status: checkoutAttempt === 1 ? 503 : 200, contentType: 'application/json',
      body: checkoutAttempt === 1 ? '{"error":"Temporary test outage"}'
        : checkoutAttempt === 2 ? '{"url":"https://example.invalid/not-stripe"}'
          : '{"url":"https://checkout.stripe.com/c/pay/cs_test_browser"}',
    });
  });
  await shop.route('https://checkout.stripe.com/**', request => request.fulfill({
    status: 200, contentType: 'text/html', body: '<h1>Mock Stripe checkout</h1>',
  }));
  await shop.goto(url + '/');
  await shop.locator('#checkoutForm').waitFor({ state: 'visible' });
  await shop.setViewportSize({ width: 390, height: 844 });
  assert.ok(await shop.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Test checkout fits mobile width');
  assert.equal(await shop.locator('#submitCheckout').isDisabled(), true);
  await shop.locator('#sample').click();
  await shop.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute');
  assert.equal(await shop.locator('#submitCheckout').isDisabled(), true);
  await shop.locator('#gpxFile').setInputFiles({ name: 'checkout.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(personal) });
  await shop.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await shop.locator('#checkoutName').fill('Test Checkout');
  await shop.locator('#checkoutEmail').fill('checkout@example.invalid');
  await shop.locator('#submitCheckout').click();
  assert.equal(checkoutAttempt, 0, 'Acceptance is required before creating checkout');
  await shop.locator('#checkoutAcceptance').check();
  for (const [product, price] of [['compact', '45'], ['frame', '55'], ['base', '50']]) {
    await shop.locator('#product').selectOption(product);
    assert.equal(await shop.locator('#checkoutAcceptance').isChecked(), false, 'Product changes require final selection approval');
    assert.match(await shop.locator('#submitCheckout').innerText(), new RegExp(`${price}.*€`));
    assert.match(await shop.locator('#checkoutSummary').innerText(), new RegExp(`Gesamt: ${price}`));
    assert.equal(await shop.locator('#engraving').isDisabled(), product === 'compact');
    assert.ok(await shop.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await shop.locator('#checkoutAcceptance').check();
  }
  await shop.locator('#wallMount').selectOption('yes');
  assert.equal(await shop.locator('#checkoutAcceptance').isChecked(), false);
  assert.match(await shop.locator('#submitCheckout').innerText(), /51.*€/);
  assert.match(await shop.locator('#checkoutSummary').innerText(), /Gesamt: 51/);
  await shop.locator('#wallMount').selectOption('no');
  await shop.locator('#checkoutAcceptance').check();
  await shop.locator('#engraving').fill('Finale Gravur');
  assert.equal(await shop.locator('#checkoutAcceptance').isChecked(), false, 'Changes require rechecking final selection');
  await shop.locator('#checkoutAcceptance').check();
  await shop.locator('#submitCheckout').click();
  await shop.waitForFunction(() => document.getElementById('checkoutStatus').textContent.includes('Temporary test outage'));
  assert.equal(await shop.locator('#checkoutName').inputValue(), 'Test Checkout');
  await shop.locator('#submitCheckout').click();
  await shop.waitForFunction(() => document.getElementById('checkoutStatus').textContent.includes('gültige Stripe-Adresse'));
  assert.equal(checkoutSubmissions[0].get('submissionKey'), checkoutSubmissions[1].get('submissionKey'));
  assert.deepEqual(Buffer.from(await checkoutSubmissions[0].get('previewImage').arrayBuffer()),
    Buffer.from(await checkoutSubmissions[1].get('previewImage').arrayBuffer()), 'Retries use identical saved preview');
  await shop.locator('#submitCheckout').click();
  await shop.waitForURL('https://checkout.stripe.com/**');
  assert.equal(checkoutAttempt, 3);
  let checkedOrder = null;
  await shop.route('**/order-status?**', request => {
    checkedOrder = new URL(request.request().url()).searchParams.get('order');
    return request.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"paid","orderId":"test-order"}' });
  });
  await shop.goto(url + '/?checkout=success&order=test-order&token=test-secret');
  await shop.waitForFunction(() => document.getElementById('paymentStatus').textContent.includes('Testzahlung bestätigt'));
  assert.equal(checkedOrder, 'test-order');
  assert.ok(!shop.url().includes('test-secret'), 'Remove private status token from browser address');
  assert.match(await shop.locator('#paymentStatus').innerText(), /keine echte Bestellung/);
  assert.equal(await shop.locator('#paymentStatus strong').innerText(), 'Testzahlung bestätigt');
  assert.equal(await shop.locator('#paymentStatus').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(237, 245, 232)');
  await shop.unroute('**/order-status?**');
  await shop.route('**/order-status?**', request => request.fulfill({
    status: 404, contentType: 'application/json', body: '{"error":"Test status not found"}',
  }));
  await shop.goto(url + '/?checkout=success&order=test-order&token=wrong-token');
  await shop.waitForFunction(() => document.getElementById('paymentStatus').textContent.includes('Test status not found'));
  assert.ok(!(await shop.locator('#paymentStatus').innerText()).includes('Testzahlung bestätigt'), 'Redirect alone never confirms payment');
  await shop.goto(url + '/?checkout=cancelled');
  await shop.waitForFunction(() => document.getElementById('paymentStatus').textContent.includes('verlassen'));
  assert.ok(!(await shop.locator('#paymentStatus').innerText()).includes('Testzahlung bestätigt'));

  const variants = await context.newPage();
  variants.on('pageerror', error => errors.push(error.message));
  await variants.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":true,"mode":"test"}',
  }));
  await variants.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/png', body: png }));
  const variantSubmissions = [];
  await variants.route('**/checkout', async request => {
    const body = await new Response(request.request().postDataBuffer(), {
      headers: { 'Content-Type': request.request().headers()['content-type'] },
    }).formData();
    variantSubmissions.push(JSON.parse(body.get('configuration')));
    await request.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Variant test captured"}' });
  });
  await variants.goto(url + '/');
  await variants.locator('#checkoutForm').waitFor({ state: 'visible' });
  await variants.locator('#gpxFile').setInputFiles({ name: 'variants.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(personal) });
  await variants.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await variants.locator('#engraving').fill('Mein Text');
  await variants.locator('#checkoutName').fill('Variantentest');
  await variants.locator('#checkoutEmail').fill('variants@example.invalid');
  for (const product of ['base', 'compact', 'frame']) {
    await variants.locator(`#produkt [data-configurator-product="${product}"]`).click();
    assert.equal(await variants.locator('#product').inputValue(), product);
    if (product !== 'frame') await variants.locator('#wallMount').selectOption('yes');
    await variants.locator('#checkoutAcceptance').check();
    await variants.locator('#submitCheckout').click();
    await variants.waitForFunction(() => document.getElementById('checkoutStatus').textContent.includes('Variant test captured'));
    assert.equal(variantSubmissions.at(-1).product, product);
    assert.equal(variantSubmissions.at(-1).engraving, product === 'compact' ? '' : 'Mein Text');
    assert.equal(variantSubmissions.at(-1).version, 4);
    assert.equal(variantSubmissions.at(-1).wallMount, product !== 'frame');
    assert.equal(await variants.locator('#selectionControls').isEnabled(), true);
  }
  assert.equal(variantSubmissions.length, 3);
  await variants.close();

  const liveShop = await context.newPage();
  liveShop.on('pageerror', error => errors.push(error.message));
  await liveShop.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":false,"mode":"live"}',
  }));
  await liveShop.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/png', body: png }));
  let liveCheckoutMode = null;
  await liveShop.route('**/checkout/live', async request => {
    liveCheckoutMode = new URL(request.request().url()).pathname;
    await request.fulfill({
      status: 200, contentType: 'application/json',
      body: '{"url":"https://checkout.stripe.com/c/pay/cs_live_browser"}',
    });
  });
  await liveShop.route('https://checkout.stripe.com/**', request => request.fulfill({
    status: 200, contentType: 'text/html', body: '<h1>Mock live Stripe checkout</h1>',
  }));
  await liveShop.goto(url + '/');
  await liveShop.locator('#checkoutForm').waitFor({ state: 'visible' });
  assert.equal(await liveShop.locator('#checkoutModeLabel').innerText(), 'ECHTE BESTELLUNGEN');
  assert.match(await liveShop.locator('#submitCheckout').innerText(), /Zahlungspflichtig bestellen/);
  await liveShop.locator('#gpxFile').setInputFiles({ name: 'live-checkout.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(personal) });
  await liveShop.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await liveShop.locator('#checkoutName').fill('Live Checkout');
  await liveShop.locator('#checkoutEmail').fill('live@example.invalid');
  await liveShop.locator('#checkoutAcceptance').check();
  await liveShop.locator('#submitCheckout').click();
  await liveShop.waitForURL('https://checkout.stripe.com/**');
  assert.equal(liveCheckoutMode, '/checkout/live');
  let liveStatusMode = null;
  await liveShop.route('**/order-status?**', request => {
    liveStatusMode = new URL(request.request().url()).searchParams.get('mode');
    return request.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"paid","orderId":"live-order"}' });
  });
  await liveShop.goto(url + '/?checkout=success&mode=live&order=live-order&token=live-token');
  await liveShop.waitForFunction(() => document.getElementById('paymentStatus').textContent.includes('Zahlung bestätigt'));
  assert.equal(liveStatusMode, 'live');
  assert.match(await liveShop.locator('#paymentStatus').innerText(), /Wir senden dir und PeakMemory/);
  assert.equal(await liveShop.locator('#paymentStatus strong').innerText(), 'Zahlung bestätigt');
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: homepage configurator, mobile galleries, inquiry flow, privacy, no WebGL, disabled/test/live checkout UI, final-selection acceptance, idempotent retries, Stripe-only redirects and verified payment return states.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
