import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { startDevServer } from './dev.js';

const server = await startDevServer(0);
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  const mapTile = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e1ead5"/><path d="M0 180Q90 50 256 120M0 100Q120 240 256 20" fill="none" stroke="#bbcba8" stroke-width="24"/><path d="M0 40L256 230" stroke="#fff" stroke-width="6"/><text x="50" y="130" font-family="sans-serif" fill="#42553a">Allgäu · Kartenfixture</text></svg>')).png().toBuffer();
  const pixels = Buffer.alloc(512 * 512 * 3);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const offset = (y * 512 + x) * 3;
    pixels[offset] = 128;
    pixels[offset + 1] = Math.floor(100 + 140 * Math.sin(x / 70) ** 2 * Math.cos(y / 110) ** 2);
  }
  const terrain = await sharp(pixels, { raw: { width: 512, height: 512, channels: 3 } }).webp({ lossless: true }).toBuffer();
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 }, reducedMotion: 'reduce', hasTouch: true });
  const page = await context.newPage();
  const errors = [], checkouts = [], inquiries = [], referrers = [];
  let mapRequests = 0, mapFailure = false, terrainFailure = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://tile.openstreetmap.org/**', async route => {
    mapRequests++;
    referrers.push(route.request().headers().referer);
    await route.fulfill(mapFailure ? { status: 503, body: 'unavailable' } : { contentType: 'image/png', body: mapTile });
  });
  await page.route('**/shop-status', route => route.fulfill({ json: { enabled: true, mode: 'test', testMode: true } }));
  await page.route('**/terrain/**', route => route.fulfill(terrainFailure
    ? { status: 502, body: 'unavailable' } : { contentType: 'image/webp', body: terrain }));
  async function multipart(request) {
    return new Response(request.postDataBuffer(), { headers: { 'Content-Type': request.headers()['content-type'] } }).formData();
  }
  await page.route('**/checkout', async route => {
    checkouts.push(await multipart(route.request()));
    await route.fulfill({ status: 503, json: { error: 'Test: keine echte Zahlung' } });
  });
  await page.route('**/contact', async route => {
    inquiries.push(await multipart(route.request()));
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(url + '/#konfigurator');
  await page.waitForFunction(() => document.documentElement.dataset.checkoutMode === 'test');
  assert.equal(mapRequests, 0, 'GPX default must not contact OSM');
  const sourceCards = page.locator('#sourceControls .source-option');
  const gpxSource = page.locator('input[name=terrainSource][value=gpx]');
  const areaSource = page.locator('input[name=terrainSource][value=area]');
  assert.equal(await sourceCards.count(), 2);
  for (const image of await sourceCards.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(image => image.decode());
    assert.ok(await image.evaluate(image => image.naturalWidth > 0));
  }
  await gpxSource.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await areaSource.isChecked(), true);
  assert.equal(await areaSource.evaluate(input => input.matches(':focus-visible')), true);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await gpxSource.isChecked(), true);
  await sourceCards.first().click();
  assert.equal(await gpxSource.isChecked(), true);
  const selectArea = () => page.locator('input[name=terrainSource][value=area]').check();
  const confirm = async () => {
    await page.waitForFunction(() => !document.getElementById('confirmArea').disabled);
    await page.locator('#confirmArea').click();
    await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Ohne Route');
  };
  await sourceCards.last().click();
  assert.equal(await page.locator('#areaFrame span').innerText(), 'Dein Relief');
  await page.waitForFunction(() => !document.getElementById('confirmArea').disabled);
  assert.ok(mapRequests > 0);
  assert.ok(referrers.every(referrer => referrer === url + '/'), 'OSM receives origin referrer despite page no-referrer default');
  assert.equal(await page.locator('#routeControls').isHidden(), true);
  assert.equal(await page.locator('#marginControls').isHidden(), true);
  assert.equal(await page.locator('#submitCheckout').isDisabled(), true);
  const square = await page.locator('#areaFrame').boundingBox();
  assert.ok(Math.abs(square.width - square.height) < 1);
  const expectedArea = await page.evaluate(() => {
    const tile = document.querySelector('#areaMap .leaflet-tile-loaded');
    const match = /\/(\d+)\/(\d+)\/(\d+)\.png/.exec(tile.src);
    const bounds = tile.getBoundingClientRect(), square = document.getElementById('areaFrame').getBoundingClientRect();
    const scale = 2 ** Number(match[1]);
    return {
      left: ((Number(match[2]) + (square.left - bounds.left) / bounds.width) / scale + 1) % 1,
      top: (Number(match[3]) + (square.top - bounds.top) / bounds.height) / scale,
      size: square.width / bounds.width / scale,
    };
  });
  assert.equal(await page.locator('#engraving').inputValue(), 'Deine Landschaft');
  await confirm();
  await page.locator('.inquiry a').click();
  assert.equal(await page.locator('#contactGpxFile').isDisabled(), true);
  assert.match(await page.locator('#contactAreaNotice').innerText(), /ohne Route.*Nordwest.*Südost/);
  await page.locator('#contactName').fill('Test');
  await page.locator('#contactEmail').fill('test@example.com');
  await page.locator('#contactType').selectOption('individual');
  await page.locator('#contactMessage').fill('Bitte meinen Kartenausschnitt anfragen.');
  await page.locator('#contactForm button[type=submit]').click();
  await page.waitForFunction(() => document.getElementById('contactStatus').textContent.includes('gesendet'));
  const initial = JSON.parse(inquiries[0].get('configuration'));
  assert.equal(initial.source, 'area');
  assert.equal(initial.version, 6);
  assert.equal(initial.area.size, square.width / (256 * 2 ** 11));
  for (const key of ['left', 'top', 'size']) assert.ok(Math.abs(initial.area[key] - expectedArea[key]) < 1e-10);
  assert.equal(inquiries[0].has('gpxFile'), false);
  assert.equal(inquiries[0].has('gpxFiles'), false);
  assert.equal(Object.hasOwn(initial, 'margin'), false);
  assert.equal(await page.locator('#contactGpxFile').isDisabled(), false);
  await page.locator('#checkoutName').fill('Test');
  await page.locator('#checkoutEmail').fill('test@example.com');
  await page.locator('#checkoutAcceptance').check();
  await page.locator('#submitCheckout').click();
  await page.waitForFunction(() => document.getElementById('checkoutStatus').textContent.includes('keine echte Zahlung'));
  assert.deepEqual(JSON.parse(checkouts[0].get('configuration')), initial);
  assert.equal(checkouts[0].has('gpxFile'), false);
  assert.equal(checkouts[0].has('gpxFiles'), false);
  assert.equal(checkouts[0].get('previewImage').type, 'image/png');
  assert.ok(checkouts[0].get('previewImage').size > 1000);
  await page.locator('#areaMap').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Ausschnitt bestätigen');
  assert.equal(await page.locator('#submitCheckout').isDisabled(), true);
  assert.equal(await page.locator('#checkoutAcceptance').isChecked(), false);
  await confirm();
  await page.locator('#areaMap').focus();
  await page.keyboard.press('+');
  await confirm();
  assert.match(await page.locator('#areaDescription').innerText(), /8\.7\d km/);
  await page.locator('#engraving').fill('Meine Berge');
  await page.locator('#elevationScale').fill('3');
  await page.locator('#product').selectOption('frame');
  assert.match(await page.locator('#configurationSummary').innerText(), /Höhen 3×.*Meine Berge/);
  await page.locator('input[name=terrainSource][value=gpx]').check();
  assert.equal(await page.locator('#routeControls').isHidden(), false);
  assert.equal(await page.locator('#engraving').inputValue(), 'Meine Berge');
  await page.locator('#sample').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Beispielroute');
  await selectArea();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Ohne Route');
  await page.locator('.inquiry a').click();
  const beforeResize = await page.locator('#contactAreaNotice').innerText();
  await page.locator('#removeContactArea').click();
  if (process.env.PM_SCREENSHOT_DIR) {
    await mkdir(process.env.PM_SCREENSHOT_DIR, { recursive: true });
    await page.locator('#sourceControls').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'source-cards-desktop.png') });
    await page.locator('#areaControls').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'area-desktop.png') });
    await page.locator('.preview').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'area-preview-desktop.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await confirm();
  await page.locator('.inquiry a').click();
  assert.equal(await page.locator('#contactAreaNotice').innerText(), beforeResize, 'resize must preserve geographic square');
  await page.locator('#removeContactArea').click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  if (process.env.PM_SCREENSHOT_DIR) {
    await page.locator('#sourceControls').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'source-cards-mobile.png') });
    await page.locator('#areaControls').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'area-mobile.png') });
    await page.locator('.preview').screenshot({ path: path.join(process.env.PM_SCREENSHOT_DIR, 'area-preview-mobile.png') });
  }
  await page.locator('#areaMap').scrollIntoViewIfNeeded();
  const touchBox = await page.locator('#areaMap').boundingBox();
  const cdp = await context.newCDPSession(page);
  const touch = (x, y) => [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }];
  const tx = touchBox.x + touchBox.width / 2, ty = touchBox.y + touchBox.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(tx, ty) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(tx + 20, ty + 5) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(tx + 60, ty + 10) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Ausschnitt bestätigen');
  await confirm();
  await cdp.detach();
  mapFailure = true;
  await page.locator('#retryMap').click();
  await page.waitForFunction(() => document.getElementById('areaStatus').textContent.includes('nicht vollständig'));
  assert.equal(await page.locator('#confirmArea').isDisabled(), true);
  assert.equal(await page.locator('#submitCheckout').isDisabled(), true);
  mapFailure = false;
  await page.locator('#retryMap').click();
  await page.waitForFunction(() => !document.getElementById('confirmArea').disabled);
  terrainFailure = true;
  await page.locator('#confirmArea').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Nicht verfügbar');
  terrainFailure = false;
  await page.locator('#retry').click();
  await page.waitForFunction(() => document.getElementById('previewBadge').textContent === 'Ohne Route');
  await page.locator('#areaMap').focus();
  for (let index = 0; index < 6; index++) await page.keyboard.press('+');
  await page.waitForFunction(() => document.getElementById('areaStatus').textContent.includes('zwischen 300 m und 150 km'));
  assert.equal(await page.locator('#confirmArea').isDisabled(), true);
  for (let index = 0; index < 16; index++) await page.keyboard.press('-');
  await page.waitForFunction(() => document.getElementById('areaStatus').textContent.includes('zwischen 300 m und 150 km'));
  assert.equal(await page.locator('#confirmArea').isDisabled(), true);
  assert.equal(await page.locator('#submitCheckout').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('Area browser checks passed: lazy OSM/referrer, exact square, route-free preview, inquiry/checkout payloads, switching, resize, errors and retry.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
