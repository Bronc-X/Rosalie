import test from 'node:test';
import assert from 'node:assert/strict';

const quality = await import('../lib/game-render-quality.mjs').catch(() => ({}));

test('game backing resolution follows device pixels without exhausting mobile GPUs', () => {
  assert.equal(typeof quality.getGameRenderScale, 'function');
  assert.equal(quality.getGameRenderScale(1), 1);
  assert.equal(quality.getGameRenderScale(2), 2);
  assert.equal(quality.getGameRenderScale(2.25), 2.25);
  assert.equal(quality.getGameRenderScale(4), 2.5);
  assert.equal(quality.getGameRenderScale(Number.NaN), 1);
});

test('a logical game gets a larger high-DPI backing store at the same aspect ratio', () => {
  assert.deepEqual(quality.getGameBackingSize(390, 780, 2.5), {
    width: 975,
    height: 1950,
    scale: 2.5,
  });
});

test('a large desktop display scale is included even when device DPR is one', () => {
  assert.deepEqual(quality.getGameBackingSize(390, 780, 1, 780, 1560), {
    width: 780,
    height: 1560,
    scale: 2,
  });
});
