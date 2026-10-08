import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseGpx, validateFile, MAX_GPX_SIZE, MAX_POINTS } from '../src/shared/gpx.js';
import { parseConfiguration } from '../src/shared/configuration.js';

const points = '<trkpt lat="48.1" lon="9.1"/><trkpt lat="48.2" lon="9.2"/>';
const wrap = body => `<gpx version="1.1">${body}</gpx>`;
const track = text => wrap(`<trk><trkseg>${text}</trkseg></trk>`);

test('bundled Allgaeu Panorama Marathon sample contains the supplied track', async () => {
  const xml = await readFile(new URL('../src/client/sample.gpx', import.meta.url), 'utf8');
  const route = parseGpx(xml);
  assert.equal(route.pointCount, 2656);
  assert.equal(route.segments.length, 1);
  assert.match(xml, /Allgäu Panorama Marathon - Marathon/);
});

test('GPX tracks, route points, namespaces, and missing elevations', () => {
  assert.equal(parseGpx(track(points)).pointCount, 2);
  assert.equal(parseGpx(wrap('<rte><rtept lat="0" lon="0"/><rtept lat="0" lon="1"/></rte>')).segments.length, 1);
  assert.equal(parseGpx('<g:gpx xmlns:g="http://www.topografix.com/GPX/1/0" version="1.0"><g:trk><g:trkseg><g:trkpt lat="1" lon="2"/><g:trkpt lat="2" lon="3"/></g:trkseg></g:trk></g:gpx>').pointCount, 2);
});
test('disjoint segments remain separate and duplicate consecutive points are removed', () => {
  const result = parseGpx(wrap(`<trk><trkseg>${points}${points.slice(points.indexOf('<trkpt', 1))}</trkseg><trkseg>${points}</trkseg></trk>`));
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].length, 2);
});
test('malformed, empty, non GPX, entities, coordinates and unusable files reject explicitly', () => {
  for (const xml of ['', '<gpx>', '<other/>', '<!DOCTYPE gpx><gpx version="1.1"/>',
    track('<trkpt lat="" lon="1"/><trkpt lat="0" lon="1"/>'),
    track('<trkpt lat="Infinity" lon="1"/><trkpt lat="0" lon="1"/>'),
    track('<trkpt lat="91" lon="1"/><trkpt lat="0" lon="1"/>'),
    track('<trkpt lat="86" lon="1"/><trkpt lat="0" lon="1"/>'),
    track('<trkpt lat="0" lon="181"/><trkpt lat="0" lon="1"/>'),
    track('<trkpt lat="0" lon="0"/><trkpt lat="0" lon="0"/>'),
    '<gpx version="1.1"/><other/>']) {
    assert.throws(() => parseGpx(xml), Error);
  }
});
test('exact file and point limits are enforced', () => {
  validateFile({ name: 'route.GPX', size: MAX_GPX_SIZE });
  for (const file of [{name:'x.txt',size:1}, {name:'x.gpx',size:0}, {name:'x.gpx',size:MAX_GPX_SIZE+1}]) {
    assert.throws(() => validateFile(file));
  }
  const point = '<trkpt lat="1" lon="2"/>';
  const limit = track(point.repeat(MAX_POINTS - 1) + '<trkpt lat="2" lon="2"/>');
  assert.equal(parseGpx(limit).pointCount, MAX_POINTS);
  assert.throws(() => parseGpx(track(point.repeat(MAX_POINTS) + '<trkpt lat="2" lon="2"/>')), /100.000/);
  const padded = track(points);
  assert.equal(parseGpx(padded + ' '.repeat(MAX_GPX_SIZE - new TextEncoder().encode(padded).length)).pointCount, 2);
  assert.throws(() => parseGpx(padded + ' '.repeat(MAX_GPX_SIZE)), /5 MB/);
  assert.throws(() => parseGpx(wrap(`<trk>${`<trkseg>${points}</trkseg>`.repeat(101)}</trk>`)), /100 Strecken/);
});
test('configuration rejects invalid ranges, types, and text', () => {
  const valid = {version:1,product:'base',engraving:'Tour',margin:0.05,preview:'ready'};
  assert.deepEqual(parseConfiguration(JSON.stringify(valid)), valid);
  assert.equal(parseConfiguration(), null);
  for (const invalid of [{product:'invalid'}, {version:2}, {margin:0.049}, {margin:0.501},
    {margin:'0.1'}, {engraving:'x'.repeat(121)}, {engraving:'\u0000'}, {preview:'loading'}]) {
    assert.throws(() => parseConfiguration({...valid,...invalid}));
  }
  assert.equal(parseConfiguration({...valid,margin:0.5,engraving:'x'.repeat(120)}).engraving.length, 120);
  assert.throws(() => parseConfiguration('{'));
});
test('current configuration requires oak base and validated height scale; legacy requests remain accepted', () => {
  const valid = {version:2,product:'base',engraving:'Tour',margin:0.15,preview:'ready',elevationScale:2};
  for (const elevationScale of [1,2,8]) {
    assert.equal(parseConfiguration({...valid,elevationScale}).elevationScale, elevationScale);
  }
  for (const elevationScale of [undefined, null, '2', 0.99, 8.01, Infinity, NaN]) {
    assert.throws(() => parseConfiguration({...valid,elevationScale}));
  }
  assert.throws(() => parseConfiguration({...valid,product:'frame'}));
  assert.equal(parseConfiguration({...valid,version:1,product:'frame'}).product, 'frame');
});
