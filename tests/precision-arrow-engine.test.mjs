import test from 'node:test';
import assert from 'node:assert/strict';

const arrow = await import('../lib/precision-arrow-engine.mjs').catch(() => ({}));

test('aiming converts a drag point into a clamped angle and power', () => {
  assert.equal(typeof arrow.aimFromPoint, 'function');
  assert.deepEqual(
    arrow.aimFromPoint({ x: 195, y: 560 }, { x: 195, y: 260 }, 300),
    { angle: 0, power: 1 },
  );

  const farRight = arrow.aimFromPoint({ x: 195, y: 560 }, { x: 600, y: 520 }, 300);
  assert.equal(farRight.angle, 55);
  assert.equal(farRight.power, 1);
});

test('fast arrows still hit when their frame-to-frame segment crosses the target', () => {
  assert.equal(typeof arrow.segmentHitsCircle, 'function');
  assert.equal(arrow.segmentHitsCircle(
    { x: 10, y: 10 },
    { x: 30, y: 10 },
    { x: 20, y: 10, radius: 3 },
  ), true);
  assert.equal(arrow.segmentHitsCircle(
    { x: 10, y: 18 },
    { x: 30, y: 18 },
    { x: 20, y: 10, radius: 3 },
  ), false);
});
