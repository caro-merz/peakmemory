import test from 'node:test';
import assert from 'node:assert/strict';
import { readGpxCollection, MAX_GPX_FILES } from '../src/shared/gpx-collection.js';
import { MAX_GPX_SIZE, MAX_POINTS, parseGpx } from '../src/shared/gpx.js';
import { terrainPlan, routePaths, GRID_SIZE } from '../src/shared/geometry.js';

const wrap = body => `<gpx version="1.1">${body}</gpx>`;
const segment = (offset = 0) => `<trkseg><trkpt lat="${48 + offset}" lon="9"/><trkpt lat="${48.01 + offset}" lon="9.01"/></trkseg>`;
const xml = (offset = 0) => wrap(`<trk>${segment(offset)}</trk>`);
const file = (text = xml(), name = 'tour.gpx') => new File([text], name, { type: 'application/gpx+xml' });

test('single-file collection preserves original bytes and filename', async () => {
  const original = file(xml() + '\n');
  const result = await readGpxCollection([original]);
  assert.equal(result.filename, original.name);
  assert.deepEqual(result.gpx, new Uint8Array(await original.arrayBuffer()));
  assert.equal(result.sources.length, 1);
  assert.equal(result.route.pointCount, 2);
});

test('combined GPX preserves source identity, track boundaries and supported metadata', async () => {
  const first = file(wrap('<trk><trkseg><trkpt lat="48" lon="9"><ele>123.5</ele><time>2026-10-01T10:00:00Z</time></trkpt><trkpt lat="48.01" lon="9.01"/></trkseg></trk>'), 'A & <B>.gpx');
  const second = file(wrap(`<trk>${segment(0.02)}${segment(0.04)}</trk>`), 'second.gpx');
  const result = await readGpxCollection([first, second]);
  const combined = new TextDecoder().decode(result.gpx);
  assert.match(combined, /A &amp; &lt;B&gt;.gpx/);
  assert.match(combined, /<ele>123.5<\/ele><time>2026-10-01T10:00:00Z<\/time>/);
  assert.equal(result.route.segments.length, 3);
  assert.deepEqual(parseGpx(combined).segments, result.route.segments.map(points => points.map(({ lat, lon }) => ({ lat, lon }))));
  assert.deepEqual(result.sources[0].bytes, new Uint8Array(await first.arrayBuffer()));
  assert.deepEqual(await readGpxCollection([first, second]), result, 'composition is deterministic');
  const plan = terrainPlan(result.route, 0.15);
  const paths = routePaths({ plan, heights: new Float32Array(GRID_SIZE ** 2), minimum: 0 });
  assert.equal(paths.length, 3, 'no lines connect files or disjoint segments');
});

test('file count boundaries and identical content are enforced', async () => {
  const ten = Array.from({ length: MAX_GPX_FILES }, (_, index) => file(xml(index * 0.01), `${index}.gpx`));
  assert.equal((await readGpxCollection(ten)).sources.length, 10);
  await assert.rejects(readGpxCollection([]), /1 bis 10/);
  await assert.rejects(readGpxCollection([...ten, file(xml(1))]), /1 bis 10/);
  await assert.rejects(readGpxCollection([file(), file(xml(), 'renamed.gpx')]), /renamed.gpx:.*identischer Inhalt/);
  const namedAlike = await readGpxCollection([file(), file(xml(0.02))]);
  assert.equal(namedAlike.sources.length, 2, 'matching names alone do not mean matching files');
});

test('aggregate byte boundary is exact and generated GPX is bounded separately', async () => {
  const first = xml(), second = xml(0.01);
  const spare = MAX_GPX_SIZE - new TextEncoder().encode(first + second).length;
  const originals = [file(first + ' '.repeat(spare)), file(second)];
  assert.equal((await readGpxCollection(originals)).sources.reduce((sum, source) => sum + source.bytes.length, 0), MAX_GPX_SIZE);
  await assert.rejects(readGpxCollection([file(first + ' '.repeat(spare + 1)), file(second)]), /zusammen.*5 MB/);
  await assert.rejects(readGpxCollection([file(first, '&'.repeat(MAX_GPX_SIZE / 5) + '.gpx'), file(second)]), /kombinierte.*5 MB/);
});

test('aggregate point and raw segment boundaries are exact', async () => {
  const repeated = '<trkpt lat="48" lon="9"/>';
  const make = (count, name) => file(wrap(`<trk><trkseg>${repeated.repeat(count - 1)}<trkpt lat="48.01" lon="9"/></trkseg></trk>`), name);
  assert.equal((await readGpxCollection([make(MAX_POINTS - 2, 'a.gpx'), file(xml(0.01))])).route.pointCount, MAX_POINTS);
  await assert.rejects(readGpxCollection([make(MAX_POINTS - 1, 'a.gpx'), file(xml(0.01))]), /100.000/);
  const segments = file(wrap(`<trk>${segment().repeat(99)}</trk>`));
  assert.equal((await readGpxCollection([segments, file(xml(0.02))])).route.segments.length, 100);
  await assert.rejects(readGpxCollection([segments, file(wrap(`<trk>${segment(0.02).repeat(2)}</trk>`))]), /100 Strecken/);
});

test('invalid files, malformed UTF-8 and XML entities name the offending file', async () => {
  for (const invalid of [file('<not-gpx/>', 'bad.gpx'), file('<!DOCTYPE gpx><gpx version="1.1"/>', 'entity.gpx'),
    file(new Uint8Array([0xff]), 'encoding.gpx'), file('', 'empty.gpx'), file(xml(), 'wrong.txt')]) {
    await assert.rejects(readGpxCollection([file(), invalid]), error => error.message.includes(invalid.name));
  }
});

test('combined routes still use antimeridian wrapping and omit invalid optional metadata', async () => {
  const crossing = text => wrap(`<trk><trkseg><trkpt lat="0" lon="${text}"><ele>bad</ele><time>bad</time></trkpt><trkpt lat="0.01" lon="-179.9"/></trkseg></trk>`);
  const result = await readGpxCollection([file(crossing('179.9')), file(crossing('179.8'))]);
  assert.ok(terrainPlan(result.route, 0.15).size < 0.01);
  assert.doesNotMatch(new TextDecoder().decode(result.gpx), /<ele>|<time>/);
});
