import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startDevServer } from './dev.js';

const server = await startDevServer(0);
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const stravaRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/strava/') || url.hostname.endsWith('strava.com')) {
      stravaRequests.push(request.url());
    }
  });
  await context.route('**/strava/status', route => route.fulfill({
    contentType: 'application/json',
    body: '{"available":true,"configured":true,"connected":true}',
  }));
  await context.route('**/shop-status', route => route.fulfill({
    contentType: 'application/json', body: '{"enabled":false,"testMode":true,"mode":"test"}',
  }));
  const port = server.address().port;
  for (const hostname of ['localhost', '127.0.0.1']) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`http://${hostname}:${port}/#konfigurator`);
      await page.waitForFunction(() => !document.getElementById('sample').disabled);
      assert.equal(await page.locator('#stravaLocal, #stravaConnect, #stravaPicker').count(), 0);
      assert.equal(await page.locator('a[href*="/strava/"]').count(), 0);
      assert.equal(await page.locator('#gpxFile').getAttribute('multiple'), '');
      assert.equal(await page.locator('input[name="gpxFiles"]').getAttribute('multiple'), '');
    }
  }
  assert.deepEqual(stravaRequests, []);
  await context.unroute('**/strava/status');
  for (const pathname of ['/strava/status', '/strava/connect', '/strava/callback', '/strava/activities', '/strava/gpx', '/strava/disconnect']) {
    const response = await context.request.fetch(`http://localhost:${port}${pathname}`, {
      method: pathname.endsWith('/disconnect') ? 'POST' : 'GET', maxRedirects: 0,
    });
    assert.equal(response.status(), pathname.endsWith('/disconnect') ? 405 : 404);
    assert.equal(response.headers()['set-cookie'], undefined);
  }
  assert.deepEqual(errors, []);
  console.log('Strava disabled checks passed: no controls, no background requests, no API routes; GPX multi-selection retained on desktop and mobile.');
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
