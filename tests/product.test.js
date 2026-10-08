import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_DIMENSIONS_CM, PRODUCT_LAYOUT } from '../src/shared/product.js';
import { createWoodBase } from '../src/client/wood.js';
import { Box3, Vector3 } from 'three';

test('rendered wood mesh measures exactly 11 cm wide, 2 cm high and 13.5 cm long', () => {
  const base = createWoodBase();
  const dimensions = new Box3().setFromObject(base).getSize(new Vector3()).multiplyScalar(10);
  for (const [dimension, expected] of [[dimensions.x,11],[dimensions.y,2],[dimensions.z,13.5]]) {
    assert.ok(Math.abs(dimension - expected) < 1e-6);
  }
  base.geometry.dispose();
  base.material.dispose();
});

test('10 cm relief has half-centimeter top and side borders on 11 by 13.5 cm wood', () => {
  const unit = PRODUCT_DIMENSIONS_CM.relief;
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);
  near(PRODUCT_LAYOUT.woodWidth * unit, 11);
  near(PRODUCT_LAYOUT.woodDepth * unit, 13.5);
  near(PRODUCT_LAYOUT.woodThickness * unit, 2);
  near(PRODUCT_LAYOUT.engravingWidth * unit, 8);
  near(PRODUCT_LAYOUT.woodCenterY + PRODUCT_LAYOUT.woodThickness / 2, 0.02);
  near((PRODUCT_LAYOUT.woodWidth - 1) / 2 * unit, 0.5);
  const top = PRODUCT_LAYOUT.woodCenterZ - PRODUCT_LAYOUT.woodDepth / 2;
  const bottom = PRODUCT_LAYOUT.woodCenterZ + PRODUCT_LAYOUT.woodDepth / 2;
  near((-0.5 - top) * unit, 0.5);
  near((bottom - 0.5) * unit, 3);
  near((PRODUCT_LAYOUT.engravingCenterZ - 0.5) * unit, 1.5);
  assert.ok(PRODUCT_LAYOUT.engravingCenterZ - PRODUCT_LAYOUT.engravingDepth / 2 > 0.5);
  assert.ok(PRODUCT_LAYOUT.engravingCenterZ + PRODUCT_LAYOUT.engravingDepth / 2 < bottom);
});
