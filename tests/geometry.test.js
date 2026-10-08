import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainPlan, terrainGrid, sampleTiles, decodeHeight, surfaceHeight, routePaths, GRID_SIZE, MAX_TILES, MAX_DRAW_POINTS } from '../src/shared/geometry.js';

const route = {segments: [[{lat:48.1,lon:9.1}, {lat:48.12,lon:9.14}]]};
function fixture(plan) {
  const tiles = new Map();
  for (const tile of plan.tiles) {
    const rgba = new Uint8ClampedArray(256 * 256 * 4);
    for (let index = 0; index < rgba.length; index += 4) {
      rgba[index] = 128; rgba[index + 1] = 100; rgba[index + 2] = 128; rgba[index + 3] = 255;
    }
    tiles.set(`${tile.x},${tile.y}`, rgba);
  }
  return terrainGrid(plan, tiles);
}
test('Terrarium height encoding uses all three channels', () => {
  assert.equal(decodeHeight(128, 0, 0), 0);
  assert.equal(decodeHeight(137, 219, 68), 2523.265625);
  assert.equal(decodeHeight(0, 0, 0), -32768);
});
test('bilinear heights interpolate continuously across tile seams', () => {
  const plan = {zoom:1, tileBounds:{x0:0,x1:1,y0:0,y1:0}};
  const tiles = new Map();
  for (const tileX of [0,1]) {
    const rgba = new Uint8ClampedArray(256 * 256 * 4);
    for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) {
      const height = tileX * 256 + x;
      const offset = (y * 256 + x) * 4;
      rgba[offset] = 128 + Math.floor(height / 256);
      rgba[offset + 1] = height % 256; rgba[offset + 3] = 255;
    }
    tiles.set(`${tileX},0`,rgba);
  }
  for (const pixel of [254.9,255.2,255.5,255.9,256.1]) {
    assert.ok(Math.abs(sampleTiles(plan,tiles,(pixel+0.5)/512,0.1) - pixel) < 1e-10);
  }
});
test('margin contains route; budgets and fixed grid are bounded', () => {
  for (const margin of [0.05, 0.1, 0.5]) {
    const plan = terrainPlan(route, margin);
    assert.ok(plan.tiles.length <= MAX_TILES);
    for (const segment of plan.coordinates) for (const point of segment) {
      assert.ok(point.x > plan.left && point.x < plan.left + plan.size);
      assert.ok(point.y > plan.top && point.y < plan.top + plan.size);
    }
    const grid = fixture(plan);
    assert.equal(grid.heights.length, GRID_SIZE ** 2);
    assert.ok(grid.heights.every(height => height === 100.5));
    assert.equal(surfaceHeight(grid, 0.4, 0.6), 0.045);
    assert.ok(routePaths(grid).flat().length <= MAX_DRAW_POINTS);
  }
});
test('antimeridian routes use nearby wrapped tiles rather than the whole world', () => {
  const plan = terrainPlan({segments:[[{lat:0,lon:179.9},{lat:0.1,lon:-179.9}]]}, 0.1);
  assert.ok(plan.size < 0.002);
  assert.ok(plan.tiles.some(tile => tile.x >= 2 ** plan.zoom));
  assert.ok(plan.tiles.every(tile => tile.wrappedX >= 0 && tile.wrappedX < 2 ** plan.zoom));
  const boundary = terrainPlan({segments:[[{lat:0,lon:180},{lat:0.01,lon:-180}]]}, 0.1);
  assert.ok(boundary.size < 0.001);
});
test('projection accounts for latitude when deriving real terrain width', () => {
  const width = lat => terrainPlan({segments:[[{lat,lon:10},{lat,lon:11}]]}, 0.1).groundWidth;
  assert.ok(Math.abs(width(80) / width(0) - Math.cos(80 * Math.PI / 180)) < 1e-6);
});
test('route heights follow triangulated surface and separate tracks remain separate', () => {
  const grid = fixture(terrainPlan({segments:[...route.segments, ...route.segments]}, 0.1));
  grid.heights[0] = 110;
  grid.heights[1] = 120;
  grid.heights[GRID_SIZE] = 130;
  grid.heights[GRID_SIZE + 1] = 300;
  const scale = 2 / grid.plan.groundWidth;
  assert.ok(Math.abs(surfaceHeight(grid, 0.25/128, 0.25/128) - (0.045 + (117.5-grid.minimum)*scale)) < 1e-7);
  assert.equal(routePaths(grid).length, 2);
});
test('every linear route portion stays above its triangulated terrain', () => {
  const grid = fixture(terrainPlan(route, 0.1));
  for (let index = 0; index < grid.heights.length; index += 1) grid.heights[index] += index % 7 * 20;
  for (const elevationScale of [1, 2, 8]) {
  grid.elevationScale = elevationScale;
  const paths = routePaths(grid);
  for (const path of paths) for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1], b = path[index];
    for (const t of [0.1, 0.4, 0.7]) {
      const u = a.x + (b.x - a.x) * t + 0.5;
      const v = a.z + (b.z - a.z) * t + 0.5;
      assert.ok(Math.abs(a.y + (b.y - a.y) * t - surfaceHeight(grid, u, v) - 0.003) < 1e-8);
    }
  }
  }
});
test('height scaling preserves footprint and base while scaling terrain and route together', () => {
  const grid = fixture(terrainPlan(route, 0.1));
  for (let index = 0; index < grid.heights.length; index += 1) grid.heights[index] += 10;
  grid.elevationScale = 1;
  const height = surfaceHeight(grid, 0.5, 0.5) - 0.045;
  const original = routePaths(grid)[0][0];
  grid.elevationScale = 8;
  assert.ok(Math.abs(surfaceHeight(grid, 0.5, 0.5) - 0.045 - height * 8) < 1e-10);
  const scaled = routePaths(grid)[0][0];
  assert.equal(original.x, scaled.x);
  assert.equal(original.z, scaled.z);
  assert.ok(Math.abs(scaled.y - 0.048 - (original.y - 0.048) * 8) < 1e-10);
});
test('large point sets and very long routes keep tile and route budgets', () => {
  const segments = [Array.from({length:100000}, (_, i) => ({lat:48 + (i%2)*0.01,lon:9 + (i%3)*0.01}))];
  const plan = terrainPlan({segments}, 0.5);
  assert.ok(plan.tiles.length <= MAX_TILES);
  assert.ok(routePaths(fixture(plan)).flat().length <= MAX_DRAW_POINTS);
  assert.throws(() => terrainPlan({segments:[[{lat:85.04,lon:0},{lat:85.04,lon:50}]]}, 0.5), /Polarregion/);
});
