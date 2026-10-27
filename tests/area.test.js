import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArea, areaWidth, geographicPoint, describeArea, EARTH_CIRCUMFERENCE } from '../src/shared/area.js';
import { parseConfiguration } from '../src/shared/configuration.js';
import { areaPlan, routePaths, MAX_TILES, project } from '../src/shared/geometry.js';

const area = { left: 0.525, top: 0.35, size: 0.0004 };
const configuration = {
  version: 6, source: 'area', area, product: 'base', wallMount: false,
  engraving: 'Meine Landschaft', elevationScale: 2, preview: 'ready',
};

test('area configuration retains exact square without any route margin', () => {
  assert.deepEqual(parseConfiguration(configuration), configuration);
  assert.deepEqual(parseConfiguration(JSON.stringify(configuration)).area, area);
  assert.equal(Object.hasOwn(parseConfiguration(configuration), 'margin'), false);
  for (const bad of [
    { margin: 0.15 }, { source: 'unknown' }, { area: null },
    { area: { ...area, size: NaN } }, { area: { ...area, size: Infinity } },
    { area: { ...area, left: -1 } }, { area: { ...area, left: 1 } },
    { area: { ...area, top: -0.1 } }, { area: { ...area, top: 1 } },
    { area: { ...area, size: 0 } }, { area: { ...area, size: 1 } },
    { area: { ...area, zoom: 10 } },
  ]) assert.throws(() => parseConfiguration({ ...configuration, ...bad }));
  assert.throws(() => parseConfiguration({ ...configuration, source: 'gpx', margin: 0.15 }));
  for (const version of [1, 2, 3, 4, 5]) {
    assert.throws(() => parseConfiguration({ ...configuration, version, margin: 0.15 }));
  }
});

test('new GPX configurations and legacy configuration versions remain supported', () => {
  const { area: _area, source: _source, ...common } = configuration;
  assert.equal(parseConfiguration({ ...common, margin: 0.15, source: 'gpx' }).source, 'gpx');
  for (const version of [1, 2, 3, 4, 5]) {
    const legacy = { ...common, version, margin: 0.15 };
    if (version < 4) delete legacy.wallMount;
    if (version === 1) delete legacy.elevationScale;
    assert.deepEqual(parseConfiguration(legacy), legacy);
  }
});

test('ground width is restricted to 300m through 150km, including high latitudes', () => {
  for (const top of [0.1, 0.35, 0.5, 0.85]) {
    const scale = EARTH_CIRCUMFERENCE * Math.cos(geographicPoint(0.5, top).lat * Math.PI / 180);
    for (const width of [301, 149900]) {
      const selected = { left: 0.5, top: top - width / scale / 2, size: width / scale };
      assert.ok(Math.abs(areaWidth(parseArea(selected)) - width) < 1e-6);
    }
    for (const width of [299, 150100]) {
      assert.throws(() => parseArea({ left: 0.5, top: top - width / scale / 2, size: width / scale }));
    }
  }
});

test('area plan matches the exact selected square with bounded tiles and no route paths', () => {
  const plan = areaPlan(area);
  for (const key of ['left', 'top', 'size']) assert.equal(plan[key], area[key]);
  assert.equal(plan.groundWidth, areaWidth(area));
  assert.ok(plan.tiles.length <= MAX_TILES);
  assert.deepEqual(plan.coordinates, []);
  assert.deepEqual(routePaths({ plan }), []);
  assert.match(describeArea(area), /ohne Route.*Nord oben.*Nordwest.*Südost/);
});

test('geographic coordinates round-trip and antimeridian selections wrap tile X only', () => {
  for (const point of [{ lat: 0, lon: -180 }, { lat: 47.55, lon: 10.3 }, { lat: -70, lon: 179.99 }]) {
    const { x, y } = project(point);
    const restored = geographicPoint(x, y);
    assert.ok(Math.abs(restored.lat - point.lat) < 1e-10);
    assert.ok(Math.abs(restored.lon - point.lon) < 1e-10);
  }
  const crossing = { left: 0.9999, top: 0.35, size: 0.0004 };
  const plan = areaPlan(crossing);
  assert.ok(plan.tiles.some(tile => tile.x >= 2 ** tile.zoom));
  assert.ok(plan.tiles.every(tile => tile.wrappedX >= 0 && tile.wrappedX < 2 ** tile.zoom));
  assert.match(describeArea(crossing), /Südost: [\d.]+, -179/);
});
