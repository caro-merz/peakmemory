import { chromium, devices } from 'playwright';
import { writeFile } from 'node:fs/promises';

export const SITE = 'https://peak-memory.de';

export async function openPage({ reducedMotion = 'reduce' } = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--lang=de-DE'] });
  const iphone = devices['iPhone 13'];
  const context = await browser.newContext({ ...iphone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion, locale: 'de-DE' });
  const page = await context.newPage();
  const patched = [];
  await page.route(/\/assets\/.*\.js/, async route => {
    const response = await route.fetch();
    let body = await response.text();
    const before = body;
    // Expose the Leaflet map and three.js OrbitControls so the capture can drive them frame by frame.
    body = body.replace(/(\w+(?:\.\w+)?)\.map\((\w+),\{center:\[47\.55,10\.3\]/, 'window.__map=$1.map($2,{center:[47.55,10.3]');
    body = body.replace(/(\w+)\.autoRotateSpeed=\.5/, '(window.__controls=$1).autoRotateSpeed=.5');
    if (body !== before) patched.push(route.request().url());
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-type': 'application/javascript' } });
  });
  page.on('pageerror', error => console.error('pageerror', error.message));
  return { browser, context, page, patched };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const { browser, page, patched } = await openPage();
  await page.goto(SITE + '/configurator.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'capture/explore-top.png' });
  await page.screenshot({ path: 'capture/explore-full.png', fullPage: true });
  const boxes = await page.evaluate(() => Object.fromEntries(['sourceControls', 'areaControls', 'routeControls', 'previewBadge', 'gpxFile', 'routeFiles', 'confirmArea'].map(id => {
    const el = document.getElementById(id); const b = el?.getBoundingClientRect();
    return [id, b && { x: b.x, y: b.y + scrollY, w: b.width, h: b.height, hidden: el.hidden }];
  })));
  console.log(JSON.stringify(boxes, null, 1));
  await page.locator('input[name=terrainSource][value=area]').check({ force: true });
  await page.waitForTimeout(3000);
  console.log('patched', patched, 'map?', await page.evaluate(() => !!window.__map));
  await page.screenshot({ path: 'capture/explore-area.png', fullPage: true });
  await writeFile('capture/explore.json', JSON.stringify(boxes));
  await browser.close();
}
