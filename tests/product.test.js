import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, configurationPrice, getProduct, productLayout, PRODUCT_DIMENSIONS_CM, PRODUCT_LAYOUT } from '../src/shared/product.js';
import { createWoodBase, woodTexturePixels } from '../src/client/wood.js';
import { Box3, Vector3 } from 'three';
import { createFrame } from '../src/client/frame.js';
import { parseConfiguration } from '../src/shared/configuration.js';
import { createWoodHardware } from '../src/client/wood-hardware.js';

test('wall mount requires a v4 boolean, costs one euro only on wood and preserves legacy prices', () => {
  for (const product of Object.keys(PRODUCTS)) {
    const configuration = { version: 4, product, wallMount: false, engraving: '',
      margin: 0.15, elevationScale: 2, preview: 'ready' };
    assert.deepEqual(parseConfiguration(configuration), configuration);
    assert.equal(configurationPrice(configuration), PRODUCTS[product].priceEur);
    assert.equal(configurationPrice({ ...configuration, version: 3 }), PRODUCTS[product].priceEur);
    if (product === 'frame') {
      assert.throws(() => parseConfiguration({ ...configuration, wallMount: true }), /Wandaufhängung/);
    } else {
      assert.equal(configurationPrice(parseConfiguration({ ...configuration, wallMount: true })), PRODUCTS[product].priceEur + 1);
    }
    for (const wallMount of [undefined, null, 'true', 1]) {
      assert.throws(() => parseConfiguration({ ...configuration, wallMount }), /Wandaufhängung/);
    }
  }
});

test('both wood variants always have four transparent corner feet and an optional sawtooth hanger beneath the base', () => {
  for (const product of ['base', 'compact']) for (const wallMount of [false, true]) {
    const layout = productLayout(product);
    const hardware = createWoodHardware(layout, wallMount);
    const feet = hardware.getObjectByName('protective-feet');
    assert.equal(feet.children.length, 4);
    assert.equal(new Set(feet.children.map(foot => `${foot.position.x},${foot.position.z}`)).size, 4);
    const underside = layout.woodCenterY - layout.woodThickness / 2;
    for (const foot of feet.children) {
      assert.equal(foot.material.transparent, true);
      assert.ok(foot.material.opacity > 0 && foot.material.opacity < 1);
      assert.ok(foot.position.y < underside);
      assert.ok(Math.abs(foot.position.x) + foot.scale.x < layout.woodWidth / 2);
      assert.ok(Math.abs(foot.position.z - layout.woodCenterZ) + foot.scale.z < layout.woodDepth / 2);
    }
    const hanger = hardware.getObjectByName('wall-mount');
    assert.equal(Boolean(hanger), wallMount);
    if (hanger) {
      assert.equal(hanger.children.filter(child => child.geometry.type === 'CylinderGeometry').length, 2);
      assert.equal(hanger.children[0].geometry.type, 'ExtrudeGeometry');
      assert.ok(hanger.position.y < underside);
      assert.ok(hanger.position.z < layout.woodCenterZ);
    }
    const geometries = new Set(), materials = new Set();
    hardware.traverse(child => { if (child.geometry) geometries.add(child.geometry); if (child.material) materials.add(child.material); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
});

test('three variants have fixed prices and validated v3 engraving capabilities', () => {
  assert.deepEqual(Object.values(PRODUCTS).map(product => product.priceEur), [50, 45, 55]);
  assert.throws(() => getProduct('unknown'), /Unbekanntes/);
  for (const product of Object.values(PRODUCTS)) {
    const configuration = { version: 3, product: product.id, engraving: product.engraving ? 'Tour\n2026' : '',
      margin: 0.15, elevationScale: 2, preview: 'ready' };
    assert.deepEqual(parseConfiguration(configuration), configuration);
    assert.throws(() => parseConfiguration({ ...configuration, elevationScale: 9 }), /Ungültige/);
  }
  assert.throws(() => parseConfiguration({ version: 3, product: 'compact', engraving: 'Tour',
    margin: 0.15, elevationScale: 2, preview: 'ready' }), /ohne Gravur/);
});

test('compact base measures 11 by 11 by 2 cm and centers the relief', () => {
  const layout = productLayout('compact');
  const base = createWoodBase(layout);
  const dimensions = new Box3().setFromObject(base).getSize(new Vector3()).multiplyScalar(10);
  assert.ok(Math.abs(dimensions.x - 11) < 1e-6 && Math.abs(dimensions.z - 11) < 1e-6);
  assert.ok(Math.abs(dimensions.y - 2) < 1e-6);
  assert.equal(base.position.z, 0);
  base.geometry.dispose();
  for (const material of new Set(base.material)) { material.map.dispose(); material.dispose(); }
});

test('white frame has 20 by 20 cm exterior and engraving stays below the relief inside the mat', () => {
  const frame = createFrame();
  const dimensions = new Box3().setFromObject(frame).getSize(new Vector3()).multiplyScalar(10);
  assert.ok(Math.abs(dimensions.x - 20) < 1e-6 && Math.abs(dimensions.z - 20) < 1e-6);
  const layout = productLayout('frame');
  assert.ok(layout.engravingCenterZ - layout.engravingDepth / 2 > 0.5);
  assert.ok(layout.engravingCenterZ + layout.engravingDepth / 2 < layout.frameWidth / 2 - layout.frameBorder);
  const materials = new Set();
  frame.traverse(child => {
    child.geometry?.dispose();
    if (child.material) {
      assert.ok([0xffffff, 0xf5f3ed, 0xb98b58, 0x202020].includes(child.material.color.getHex()));
      materials.add(child.material);
    }
  });
  for (const material of materials) material.dispose();
  assert.ok(layout.matOpening > 1, 'Passepartout opening leaves a visible border around the relief');
  assert.ok(layout.engravingCenterZ - layout.engravingDepth / 2 > layout.matOpening / 2);
  assert.ok(layout.reliefOffsetY < 0, 'Relief is mounted on the recessed backing');
});

test('frame back has a brown board, top hanger and hinged stand extending behind the frame', () => {
  const frame = createFrame();
  const board = frame.getObjectByName('frame-backboard');
  const hanger = frame.getObjectByName('frame-hanger');
  const stand = frame.getObjectByName('frame-stand');
  const hinge = frame.getObjectByName('frame-stand-hinge');
  assert.equal(board.material.color.getHex(), 0xb98b58);
  assert.equal(hanger.material.color.getHex(), 0x202020);
  assert.equal(hanger.geometry.parameters.shapes.holes.length, 1);
  assert.ok(hanger.position.z < -0.5, 'Hanger sits at the top of the back');
  assert.ok(hanger.position.y < board.position.y);
  assert.ok(stand.rotation.x > 0, 'Stand is unfolded');
  assert.equal(stand.children[0].material, board.material);
  assert.equal(hinge.material, hanger.material);
  frame.updateMatrixWorld(true);
  const standBounds = new Box3().setFromObject(stand);
  const boardBounds = new Box3().setFromObject(board);
  assert.ok(standBounds.min.y < boardBounds.min.y - 0.3, 'Stand projects behind the backing');
  assert.ok(standBounds.max.z < 1, 'Stand stays within the frame footprint');
  const geometries = new Set(), materials = new Set();
  frame.traverse(child => { if (child.geometry) geometries.add(child.geometry); if (child.material) materials.add(child.material); });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
});

test('rendered wood mesh measures exactly 11 cm wide, 2 cm high and 13.5 cm long', () => {
  const base = createWoodBase();
  const dimensions = new Box3().setFromObject(base).getSize(new Vector3()).multiplyScalar(10);
  for (const [dimension, expected] of [[dimensions.x,11],[dimensions.y,2],[dimensions.z,13.5]]) {
    assert.ok(Math.abs(dimension - expected) < 1e-6);
  }
  base.geometry.dispose();
  for (const material of new Set(base.material)) {
    material.map.dispose();
    material.dispose();
  }
});

test('oak textures have deterministic grain and different top, side and end patterns', () => {
  const top = woodTexturePixels(32, 'top');
  assert.equal(top.length, 32 * 32 * 4);
  assert.deepEqual(top, woodTexturePixels(32, 'top'));
  assert.notDeepEqual(top, woodTexturePixels(32, 'side'));
  assert.notDeepEqual(top, woodTexturePixels(32, 'end'));
  const reds = [];
  for (let index = 0; index < top.length; index += 4) {
    assert.equal(top[index + 3], 255);
    assert.ok(top[index] > top[index + 1] && top[index + 1] > top[index + 2]);
    reds.push(top[index]);
  }
  assert.ok(Math.max(...reds) - Math.min(...reds) > 20);
});

test('wood face materials use local grain textures and subtle bump without changing dimensions', () => {
  const base = createWoodBase();
  assert.equal(base.geometry.type, 'RoundedBoxGeometry');
  assert.equal(base.geometry.parameters.radius * 100, 2);
  assert.deepEqual(base.geometry.groups.map(group => group.materialIndex), [0, 1, 2, 3, 4, 5]);
  const normals = base.geometry.getAttribute('normal');
  let bevelVertices = 0;
  for (let index = 0; index < normals.count; index += 1) {
    const components = [normals.getX(index), normals.getY(index), normals.getZ(index)];
    if (components.filter(value => Math.abs(value) > 0.01).length > 1) bevelVertices += 1;
  }
  assert.ok(bevelVertices > 0);
  const flatTop = PRODUCT_LAYOUT.woodDepth / 2 - PRODUCT_LAYOUT.woodEdgeRadius;
  assert.ok(PRODUCT_LAYOUT.engravingCenterZ + PRODUCT_LAYOUT.engravingDepth / 2 - PRODUCT_LAYOUT.woodCenterZ < flatTop);
  assert.ok(PRODUCT_LAYOUT.logoHeight / 2 < PRODUCT_LAYOUT.woodThickness / 2 - PRODUCT_LAYOUT.woodEdgeRadius);
  assert.equal(base.material.length, 6);
  assert.equal(new Set(base.material).size, 3);
  for (const material of new Set(base.material)) {
    assert.equal(material.map.image.width, 512);
    assert.equal(material.map.image.height, 512);
    assert.equal(material.bumpMap, material.map);
    assert.equal(material.bumpScale, 0.0006);
    assert.equal(material.roughness, 0.85);
    material.map.dispose();
    material.dispose();
  }
  base.geometry.dispose();
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
