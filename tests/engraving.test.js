import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEngraving } from '../src/shared/configuration.js';
import { drawEngraving } from '../src/client/engraving.js';

test('engraving preserves up to three entered lines and normalizes newline formats', () => {
  for (const text of ['Tour', 'Tour\n2026', 'Tour\n2026\nFür dich', '\nTour\n']) {
    assert.equal(validateEngraving(text), text);
  }
  assert.equal(validateEngraving('Tour\r\n2026\rFür dich'), 'Tour\n2026\nFür dich');
  assert.equal(validateEngraving('   '), '');
  assert.throws(() => validateEngraving('1\n2\n3\n4'), /maximal 3 Zeilen/);
  assert.throws(() => validateEngraving('1\r\n2\r\n3\r\n4'), /maximal 3 Zeilen/);
  assert.throws(() => validateEngraving('x'.repeat(121)), /120 Zeichen/);
});

test('engraving draws only text over a transparent canvas without wrapping or placeholder', () => {
  const calls = [];
  const context = {
    clearRect: (...args) => calls.push(['clear', ...args]),
    fillText: (...args) => calls.push(['text', ...args]),
    fillRect: () => assert.fail('Engraving must not draw a background'),
    measureText: text => ({ width: text.length * parseFloat(context.font.slice(4)) * 0.5 }),
  };
  const longLine = 'Eine lange Zeile bleibt ohne automatischen Umbruch auf dem Holz';
  drawEngraving(context, `${longLine}\n2026\nFür dich`, 1024, 256);
  const lines = calls.filter(call => call[0] === 'text');
  assert.deepEqual(lines.map(call => call[1]), [longLine, '2026', 'Für dich']);
  assert.ok(lines.every(call => call[2] === 512 && call[3] > 0 && call[3] < 256 && call.length === 4));
  assert.match(context.font, /^400 .*"Quicksand Book"$/);
  calls.length = 0;
  drawEngraving(context, '', 1024, 192);
  assert.deepEqual(calls, [['clear', 0, 0, 1024, 192]]);
});

test('engraving uses a fixed 5 mm size for one to three lines and shrinks only beyond 8 cm', () => {
  const calls = [];
  const context = {
    clearRect() {},
    measureText(text) { return { width: text.length * parseFloat(this.font.slice(4)) * 0.5 }; },
    fillText(text) { calls.push({ text, size: parseFloat(this.font.slice(4)) }); },
  };
  for (const text of ['Tour', 'Tour\n2026', 'Tour\n2026\nFür dich', 'x'.repeat(32)]) {
    calls.length = 0;
    drawEngraving(context, text, 1024, 256);
    assert.ok(calls.every(call => call.size === 64));
  }
  calls.length = 0;
  drawEngraving(context, `${'x'.repeat(40)}\nTour`, 1024, 256);
  assert.ok(calls.every(call => call.size === 51.2));
  assert.equal(context.measureText(calls[0].text).width, 1024);
});
