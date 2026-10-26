import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { startDevServer } from './dev.js';

async function terrainWebp() {
  const size = 512, pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const offset = (y * size + x) * 3;
    pixels[offset] = 128; pixels[offset + 1] = 100 + Math.floor((x + y) / 8);
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .webp({ lossless: true }).toBuffer();
}

const server = await startDevServer(0);
async function dragPreview(page, dx = 80, dy = 0, release = true) {
  const canvas = page.locator('#viewer canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  if (release) await page.mouse.up();
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
  const webp = await terrainWebp();
  let terrainFailure = false, terrainOffline = false, terrainDelay = 0, terrainRequests = 0;
  await page.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":false,"testMode":true,"mode":"test"}',
  }));
  await page.route('**/terrain/**', async request => {
    terrainRequests += 1;
    if (terrainOffline) { await request.abort('connectionrefused'); return; }
    if (terrainDelay) await new Promise(resolve => setTimeout(resolve, terrainDelay));
    await request.fulfill(terrainFailure
      ? {status:502,contentType:'application/json',body:'{"error":"unavailable"}'}
      : {status:200,contentType:'image/webp',body:webp});
  });
  await page.route('**/contact', async request => {
    await request.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  console.log('Browser checks: loading configurator');
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
  const defaultEngraving = 'Deine Route\n100 km | 1000 hm | 10 h';
  assert.equal(await page.locator('#engraving').inputValue(), defaultEngraving);
  assert.equal(await page.locator('#routeControls a[href="gpx-hilfe.html"]').getAttribute('target'), '_blank');
  assert.equal(await page.locator('.inquiry a[href="#kontakt"]').count(), 1);
  await page.locator('#sample').click();
  console.log('Browser checks: sample terrain');
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute');
  assert.equal(await page.locator('#fileName').innerText(), 'Allgäu Panorama Marathon – Marathon (Beispielroute)');
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  const canvas = page.locator('#viewer canvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(150);
  const spinningImage = await canvas.screenshot();
  await page.waitForTimeout(500);
  assert.ok(!(await canvas.screenshot()).equals(spinningImage), 'Model rotates automatically');
  await dragPreview(page, 80, 0, false);
  const pausedImage = await canvas.screenshot();
  await page.waitForTimeout(500);
  assert.ok((await canvas.screenshot()).equals(pausedImage), 'Manual controls pause automatic rotation');
  await page.mouse.up();
  await page.waitForTimeout(1100);
  assert.ok(!(await canvas.screenshot()).equals(pausedImage), 'Automatic rotation resumes after manual controls');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const stillImage = await canvas.screenshot();
  await page.waitForTimeout(350);
  assert.ok((await canvas.screenshot()).equals(stillImage), 'Reduced-motion preference stops automatic rotation');
  assert.equal(await page.evaluate(() => document.fonts.check('400 44px "Quicksand Book"')), true);
  assert.equal(await page.locator('#inquiryForm').count(), 0);
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
  assert.ok(!(await canvas.screenshot()).equals(bareBack), 'Hanger becomes visible on the underside');
  await page.locator('#wallMount').selectOption('no');
  assert.ok((await canvas.screenshot()).equals(bareBack), 'Feet remain when the hanger is removed');
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
  assert.equal(await page.locator('#modelPrice').innerText(), '60 €');
  assert.equal(await page.locator('#wallMountControls').isHidden(), true);
  assert.doesNotMatch(await page.locator('#configurationSummary').innerText(), /Wandaufhängung/);
  assert.equal(await page.locator('#engraving').isEnabled(), true);
  assert.equal(await page.locator('#engravingControls').isVisible(), true);
  assert.match(await page.locator('#configurationSummary').innerText(), /Passepartout.*20 × 20 cm/);
  assert.ok(!(await page.locator('#viewer canvas').screenshot()).equals(compactImage));
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
  console.log('Browser checks: local upload and error recovery');
  const upload = text => page.locator('#gpxFile').setInputFiles({name:'personal.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(text)});
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  assert.equal(await page.locator('#routeFiles li span').innerText(), 'personal.gpx');
  await page.locator('#engraving').fill('Erste Zeile\nZweite Zeile\nDritte Zeile\nVierte Zeile');
  assert.equal(await page.locator('#engraving').evaluate(element => element.validity.valid), false);
  assert.match(await page.locator('#configurationSummary').innerText(), /maximal 3 Zeilen/);
  await page.locator('#engraving').fill('Meine Tour\nSommer 2026\nFür dich');
  assert.equal(await page.locator('#engraving').evaluate(element => element.validity.valid), true);
  await dragPreview(page);
  await page.locator('#elevationScale').fill('1');
  await page.locator('#elevationScale').fill('8');
  if (process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
  assert.equal(await page.locator('#viewer canvas').count(), 1);
  await upload('<not-gpx/>');
  await page.waitForFunction(() => document.getElementById('routeError').textContent.includes('gültige GPX'));
  assert.equal(await page.locator('#previewBadge').innerText(), 'Deine Route', 'Invalid additions preserve the current preview');
  await page.locator('#remove').click();
  terrainFailure = true;
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  assert.equal(await page.locator('#viewer canvas').count(), 0);
  terrainFailure = false;
  terrainOffline = true;
  await page.locator('#retry').click();
  await page.waitForFunction(() => document.getElementById('previewStatus').textContent.includes('Keine Verbindung zum Vorschau-Server'));
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
  await page.locator('#remove').click();
  await upload(personal);
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Wird geladen');
  await upload('<invalid/>');
  await page.waitForFunction(() => document.getElementById('routeError').textContent.includes('gültige GPX'));
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  assert.equal(await page.locator('#previewBadge').innerText(), 'Deine Route', 'A failed addition does not cancel the valid terrain request');
  terrainDelay = 0;
  await page.goto(url + '/');
  await page.reload();
  await page.goto(url + '/#datenschutz');
  console.log('Browser checks: homepage and legal dialogs');
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
  const activeProcessStep = () => page.locator('.process-dot[aria-current="step"]').textContent();
  assert.equal(await page.locator('.process-dot').count(), 5);
  assert.equal(await activeProcessStep(), '1');
  assert.equal(await page.locator('#processPrev').isDisabled(), true);
  await page.locator('#processNext').click();
  await page.waitForFunction(() => document.querySelector('.process-dot[aria-current="step"]').textContent === '2');
  await page.locator('.process-dot').nth(4).click();
  await page.waitForFunction(() => document.querySelector('.process-dot[aria-current="step"]').textContent === '5');
  assert.equal(await page.locator('#processNext').isDisabled(), true);
  await page.locator('#processTrack').press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('.process-dot[aria-current="step"]').textContent === '4');
  const insights = page.locator('#carouselViewport');
  assert.ok(await page.locator('.carousel-slide.is-clone[aria-hidden="true"]').count() >= 7);
  assert.equal(await page.locator('.carousel-slide.is-clone img:not([alt=""])').count(), 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await insights.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const reducedPeriod = await page.locator('.carousel-slide.is-clone').first()
    .evaluate(element => element.offsetLeft - element.parentElement.firstElementChild.offsetLeft);
  const reducedStart = await insights.evaluate(element => element.scrollLeft);
  await page.waitForTimeout(400);
  const reducedEnd = await insights.evaluate(element => element.scrollLeft);
  assert.equal(reducedEnd % reducedPeriod, reducedStart % reducedPeriod,
    'Insights must not auto-scroll with reduced motion; equivalent clone positions are identical');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(100);
  const autoStart = await insights.evaluate(element => element.scrollLeft);
  await page.waitForFunction(start => Math.abs(document.getElementById('carouselViewport').scrollLeft - start) > 5, autoStart);
  const insightsPeriod = await page.locator('.carousel-slide.is-clone').first()
    .evaluate(element => element.offsetLeft - element.parentElement.firstElementChild.offsetLeft);
  await insights.hover();
  await insights.evaluate((element, period) => { element.scrollLeft = period + 10; }, insightsPeriod);
  await page.waitForFunction(period => document.getElementById('carouselViewport').scrollLeft < period, insightsPeriod);
  const pausedAt = await insights.evaluate(element => element.scrollLeft);
  await page.waitForTimeout(300);
  assert.equal(await insights.evaluate(element => element.scrollLeft), pausedAt, 'Insights must pause on hover');
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.nav-cta').getAttribute('href'), '#konfigurator');
  assert.match(await page.locator('#contactType option[value="event"]').innerText(), /5 Stück/);
  for (const id of ['contactName', 'contactEmail', 'contactType', 'contactMessage']) {
    assert.equal(await page.locator(`#${id}`).evaluate(element => element.labels.length), 1);
  }
  assert.ok(new URL(await page.locator('#hero img').getAttribute('src'), url).pathname.endsWith('.webp'));
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
  assert.equal(await page.locator('#routeFiles li span').innerText(), 'personal.gpx');
  await page.locator('.inquiry a[href="#kontakt"]').click();
  assert.equal(new URL(page.url()).hash, '#kontakt');
  assert.equal(await page.locator('#kontakt a[href*="etsy.com"]').count(), 0);
  assert.ok(await page.locator('#kontakt .contact-wrapper').evaluate(element => {
    const parent = element.parentElement, style = getComputedStyle(parent);
    const contentWidth = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.abs(element.getBoundingClientRect().width - contentWidth) < 2;
  }));
  const deliveryAnswer = await page.locator('.faq-item').filter({ hasText: 'Wie lange dauert die Lieferung?' }).locator('.faq-answer').textContent();
  assert.match(deliveryAnswer, /5–10 Werktage/);
  assert.doesNotMatch(deliveryAnswer, /€|EUR|kostet|Umsatzsteuer/);
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
  await noWebgl.route('**/terrain/**', request => request.fulfill({status:200,contentType:'image/webp',body:webp}));
  await noWebgl.goto(url + '/configurator.html');
  await noWebgl.locator('#gpxFile').setInputFiles({name:'valid.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(personal)});
  await noWebgl.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  assert.equal(await noWebgl.locator('.inquiry a[href="#kontakt"]').count(), 1);
  assert.equal(await noWebgl.locator('#submitCheckout').isDisabled(), true, 'Checkout requires a ready preview');
  assert.equal(await noWebgl.locator('#viewer canvas').count(), 0);
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
  console.log('Browser checks: single-file checkout');
  shop.on('pageerror', error => errors.push(error.message));
  await shop.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":true,"mode":"test"}',
  }));
  await shop.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/webp', body: webp }));
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
    assert.equal(JSON.parse(body.get('configuration')).version, 5);
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
  for (const [product, price] of [['compact', '45'], ['frame', '60'], ['base', '50']]) {
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
  await variants.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/webp', body: webp }));
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
    assert.equal(variantSubmissions.at(-1).version, 5);
    assert.equal(variantSubmissions.at(-1).wallMount, product !== 'frame');
    assert.equal(await variants.locator('#selectionControls').isEnabled(), true);
  }
  assert.equal(variantSubmissions.length, 3);
  await variants.close();

  const multi = await context.newPage();
  console.log('Browser checks: multi-file checkout and inquiry');
  multi.on('pageerror', error => errors.push(error.message));
  await multi.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":true,"mode":"test"}',
  }));
  await multi.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/webp', body: webp }));
  const secondRoute = personal.replaceAll('48.2', '48.3');
  const secondName = 'tag-2-mit-einem-sehr-langen-streckennamen-fuer-die-mobile-dateiliste.gpx';
  const inputFile = (name, text) => ({ name, mimeType: 'application/gpx+xml', buffer: Buffer.from(text) });
  const multiSubmissions = [];
  const contactSubmissions = [];
  for (const [endpoint, submissions] of [['checkout', multiSubmissions], ['contact', contactSubmissions]]) {
    await multi.route(`**/${endpoint}`, async request => {
      submissions.push(await new Response(request.request().postDataBuffer(), {
        headers: { 'Content-Type': request.request().headers()['content-type'] },
      }).formData());
      await request.fulfill({ status: endpoint === 'checkout' ? 503 : 200, contentType: 'application/json',
        body: endpoint === 'checkout' ? '{"error":"Multi-file captured"}' : '{"ok":true}' });
    });
  }
  await multi.goto(url + '/');
  await multi.locator('#checkoutForm').waitFor({ state: 'visible' });
  await multi.locator('#engraving').fill('Meine Etappen');
  await multi.locator('#gpxFile').setInputFiles(inputFile('tag-1.gpx', personal));
  await multi.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  await multi.locator('#gpxFile').setInputFiles(inputFile(secondName, secondRoute));
  await multi.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Routen');
  assert.equal(await multi.locator('#routeFiles li').count(), 2);
  assert.match(await multi.locator('#checkoutSummary').innerText(), /tag-1.gpx/);
  assert.ok((await multi.locator('#checkoutSummary').innerText()).includes(secondName));
  await multi.locator('#gpxFile').setInputFiles(inputFile('copy.gpx', personal));
  await multi.waitForFunction(() => document.getElementById('routeError').textContent.includes('identischer Inhalt'));
  assert.equal(await multi.locator('#routeFiles li').count(), 2);
  await multi.locator('#gpxFile').setInputFiles([
    inputFile('new.gpx', personal.replaceAll('48.2', '48.4')), inputFile('bad.gpx', '<not-gpx/>'),
  ]);
  await multi.waitForFunction(() => document.getElementById('routeError').textContent.includes('bad.gpx'));
  assert.equal(await multi.locator('#routeFiles li').count(), 2, 'An invalid batch adds none of its files');
  await multi.locator('#checkoutName').fill('Mehrere Etappen');
  await multi.locator('#checkoutEmail').fill('etappen@example.invalid');
  await multi.locator('#checkoutAcceptance').check();
  await multi.locator('#submitCheckout').click();
  await multi.waitForFunction(() => document.getElementById('checkoutStatus').textContent.includes('Multi-file captured'));
  assert.equal(multiSubmissions[0].has('gpxFile'), false);
  assert.equal(multiSubmissions[0].getAll('gpxFiles').length, 2);
  assert.equal(await multiSubmissions[0].getAll('gpxFiles')[0].text(), personal);
  assert.equal(await multiSubmissions[0].getAll('gpxFiles')[1].text(), secondRoute);
  await multi.locator('#submitCheckout').click();
  await multi.waitForFunction(() => document.getElementById('submitCheckout').disabled === false);
  assert.equal(multiSubmissions.length, 2);
  assert.equal(multiSubmissions[0].get('submissionKey'), multiSubmissions[1].get('submissionKey'));
  for (const width of [1365, 390]) {
    await multi.setViewportSize({ width, height: 950 });
    assert.ok(await multi.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Multi-route names fit the viewport');
    await multi.locator('#routeControls').scrollIntoViewIfNeeded();
    if (process.env.ROUTE_SCREENSHOT_DIR) {
      await multi.locator('#routeControls').screenshot({ path: `${process.env.ROUTE_SCREENSHOT_DIR}\\routes-${width}.png` });
    }
  }
  await multi.locator('#routeFiles button').first().click();
  await multi.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Route');
  assert.equal(await multi.locator('#routeFiles li').count(), 1);
  assert.equal(await multi.locator('#engraving').inputValue(), 'Meine Etappen');
  assert.equal(await multi.locator('#checkoutAcceptance').isChecked(), false);
  assert.equal(await multi.locator('#gpxFile').evaluate(element => element === document.activeElement), true);
  await multi.locator('#routeFiles button').click();
  assert.equal(await multi.locator('#routeFiles').isHidden(), true);
  assert.equal(await multi.locator('#submitCheckout').isDisabled(), true);
  await multi.locator('#gpxFile').setInputFiles(Array.from({ length: 10 }, (_, index) =>
    inputFile(`stage-${index}.gpx`, personal.replaceAll('48.2', `48.${30 + index}`))));
  await multi.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Routen');
  assert.equal(await multi.locator('#routeFiles li').count(), 10);
  await multi.locator('#gpxFile').setInputFiles(inputFile('eleven.gpx', personal));
  await multi.waitForFunction(() => document.getElementById('routeError').textContent.includes('1 bis 10'));
  assert.equal(await multi.locator('#routeFiles li').count(), 10);
  await multi.locator('#remove').click();
  await multi.evaluate(text => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], 'first.gpx', { type: 'application/gpx+xml' }));
    transfer.items.add(new File([text.replaceAll('48.2', '48.3')], 'second.gpx', { type: 'application/gpx+xml' }));
    document.getElementById('dropzone').dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  }, personal);
  await multi.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Deine Routen');
  await multi.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    window.restoreFileReader = () => { File.prototype.arrayBuffer = original; };
    File.prototype.arrayBuffer = function() {
      if (this.name !== 'pending.gpx') return original.call(this);
      window.pendingReadStarted = true;
      return new Promise(resolve => setTimeout(resolve, 400)).then(() => original.call(this))
        .finally(() => { window.pendingReadFinished = true; });
    };
  });
  await multi.locator('#gpxFile').setInputFiles(inputFile('pending.gpx', personal.replaceAll('48.2', '48.4')));
  await multi.waitForFunction(() => window.pendingReadStarted === true);
  await multi.locator('#routeFiles button').first().click();
  await multi.waitForFunction(() => window.pendingReadFinished === true
    && document.getElementById('previewBadge').textContent === 'Deine Route');
  assert.equal(await multi.locator('#routeFiles li').count(), 1, 'Removal supersedes an in-flight file addition');
  assert.doesNotMatch(await multi.locator('#routeFiles').innerText(), /pending.gpx/);
  await multi.evaluate(() => { window.restoreFileReader(); delete window.restoreFileReader; });
  await multi.locator('#contactGpxFile').setInputFiles([inputFile('contact-1.gpx', personal), inputFile(secondName, secondRoute)]);
  assert.equal(await multi.locator('#contactRouteFiles li').count(), 2);
  assert.ok(await multi.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Contact file names fit mobile width');
  await multi.locator('#contactName').fill('Mehrere Etappen');
  await multi.locator('#contactEmail').fill('etappen@example.invalid');
  await multi.locator('#contactType').selectOption('individual');
  await multi.locator('#contactMessage').fill('Bitte beide Etappen auf einem Relief darstellen.');
  await multi.locator('#contactForm button[type="submit"]').click();
  await multi.waitForFunction(() => document.getElementById('contactStatus').textContent.includes('wurde gesendet'));
  assert.equal(contactSubmissions[0].getAll('gpxFiles').length, 2);
  assert.equal(await contactSubmissions[0].getAll('gpxFiles')[0].text(), personal);
  assert.equal(await multi.locator('#contactRouteFiles').isHidden(), true);
  assert.equal(await multi.locator('#routeFiles li').count(), 1, 'Contact submission does not reset the configurator');
  await multi.close();

  const liveShop = await context.newPage();
  liveShop.on('pageerror', error => errors.push(error.message));
  await liveShop.route('**/shop-status', request => request.fulfill({
    status: 200, contentType: 'application/json', body: '{"enabled":true,"testMode":false,"mode":"live"}',
  }));
  await liveShop.route('**/terrain/**', request => request.fulfill({ status: 200, contentType: 'image/webp', body: webp }));
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
  assert.equal(await liveShop.locator('#checkoutModeLabel').count(), 0);
  assert.equal(await liveShop.locator('#checkoutAvailability').isHidden(), true);
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
  assert.match(await liveShop.locator('#paymentStatus').innerText(), /Wir senden dir und Peak Memory/);
  assert.equal(await liveShop.locator('#paymentStatus strong').innerText(), 'Zahlung bestätigt');
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: multi-GPX add/remove/drop, atomic errors, mobile file lists, original checkout/contact payloads, homepage configurator, inquiry flow, privacy, no WebGL, disabled/test/live checkout UI, final-selection acceptance, idempotent retries, Stripe-only redirects and verified payment return states.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
