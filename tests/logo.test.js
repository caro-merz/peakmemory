import test from 'node:test';
import assert from 'node:assert/strict';
import { laserLogoPixels } from '../src/client/logo.js';
import { PRODUCT_LAYOUT } from '../src/shared/product.js';

test('logo converts white background to transparency and dark artwork to laser color', () => {
  const pixels = new Uint8ClampedArray([255,255,255,255,0,0,0,255,128,128,128,255]);
  laserLogoPixels(pixels);
  assert.deepEqual([...pixels.slice(0,4)], [73,49,32,0]);
  assert.deepEqual([...pixels.slice(4,8)], [73,49,32,255]);
  assert.equal(pixels[11], 127);
});
test('logo is on front face left and fits inside the wood face', () => {
  const halfWidth = PRODUCT_LAYOUT.woodWidth / 2;
  assert.ok(PRODUCT_LAYOUT.logoCenterX + PRODUCT_LAYOUT.logoWidth / 2 < 0);
  assert.ok(PRODUCT_LAYOUT.logoCenterX - PRODUCT_LAYOUT.logoWidth / 2 > -halfWidth);
  assert.ok(PRODUCT_LAYOUT.logoFrontZ > PRODUCT_LAYOUT.woodCenterZ + PRODUCT_LAYOUT.woodDepth / 2);
  const bottom = PRODUCT_LAYOUT.woodCenterY - PRODUCT_LAYOUT.woodThickness / 2;
  assert.ok(PRODUCT_LAYOUT.logoCenterY - PRODUCT_LAYOUT.logoHeight / 2 > bottom);
  assert.ok(PRODUCT_LAYOUT.logoCenterY + PRODUCT_LAYOUT.logoHeight / 2 < 0.02);
});

test('logo matches photo proportions with 2.2 cm width, half-face height and 0.6 cm left inset', () => {
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);
  near(PRODUCT_LAYOUT.logoWidth * 10, 2.2);
  near(PRODUCT_LAYOUT.logoWidth / PRODUCT_LAYOUT.logoHeight, 708 / 323);
  near((PRODUCT_LAYOUT.logoCenterX - PRODUCT_LAYOUT.logoWidth / 2 + PRODUCT_LAYOUT.woodWidth / 2) * 10, 0.6);
  near(PRODUCT_LAYOUT.logoCenterY, PRODUCT_LAYOUT.woodCenterY);
  assert.ok(Math.abs(PRODUCT_LAYOUT.logoHeight / PRODUCT_LAYOUT.woodThickness - 0.5) < 0.01);
});
