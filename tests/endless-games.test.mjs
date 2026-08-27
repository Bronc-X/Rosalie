import test from 'node:test';
import assert from 'node:assert/strict';

const endless = await import('../lib/endless-games.mjs').catch(() => ({}));

const EXPECTED_IDS = [
  'snake',
  'bubble',
  'merge',
  'breakout',
  'hop',
  'stack',
  'drift',
  'wave',
  'slice',
  'orbit',
];

test('ten distinct endless games are registered, including snake', () => {
  assert.deepEqual(endless.ENDLESS_GAME_IDS, EXPECTED_IDS);
  assert.equal(new Set(endless.ENDLESS_GAME_CATALOG?.map((game) => game.id)).size, 10);
  assert.ok(endless.ENDLESS_GAME_CATALOG?.every((game) => game.endless && game.label && game.instruction));
  assert.equal(endless.isEndlessGameId('snake'), true);
  assert.equal(endless.isEndlessGameId('hole'), false);
});

test('2048-style rows merge once per move and report their score', () => {
  assert.deepEqual(endless.mergeTileLine([2, 2, 4, 4]), {
    line: [4, 8, 0, 0],
    score: 12,
    moved: true,
  });
  assert.deepEqual(endless.mergeTileLine([4, 4, 4, 0]), {
    line: [8, 4, 0, 0],
    score: 8,
    moved: true,
  });
});

test('stack overlap keeps only the shared horizontal span', () => {
  assert.deepEqual(
    endless.getStackOverlap({ x: 20, width: 100 }, { x: 55, width: 80 }),
    { x: 55, width: 65 },
  );
  assert.equal(endless.getStackOverlap({ x: 0, width: 20 }, { x: 30, width: 20 }), null);
});

test('controller artwork accepts both loaded images and tinted canvas sources', () => {
  assert.equal(endless.isDrawableControllerSource?.({ complete: true, naturalWidth: 512, naturalHeight: 512 }), true);
  assert.equal(endless.isDrawableControllerSource?.({ width: 512, height: 512 }), true);
  assert.equal(endless.isDrawableControllerSource?.({ complete: false, naturalWidth: 0, naturalHeight: 0 }), false);
  assert.equal(endless.isDrawableControllerSource?.(null), false);
});

test('every endless game accepts its primary mobile control and advances safely', () => {
  const actions = {
    snake: { type: 'key', key: 'ArrowDown' },
    bubble: { type: 'tap', x: 150, y: 220 },
    merge: { type: 'swipe', direction: 'left' },
    breakout: { type: 'move', x: 260, y: 560 },
    hop: { type: 'tap', x: 180, y: 280 },
    stack: { type: 'tap', x: 180, y: 280 },
    drift: { type: 'move', x: 120, y: 520 },
    wave: { type: 'down', x: 160, y: 300 },
    slice: { type: 'move', x: 180, y: 320, previousX: 120, previousY: 400 },
    orbit: { type: 'tap', x: 180, y: 280 },
  };

  for (const id of EXPECTED_IDS) {
    const state = endless.createEndlessGameState(id, 1212);
    const controlled = endless.controlEndlessGame(state, actions[id]);
    const advanced = endless.advanceEndlessGame(controlled, 120);
    assert.equal(advanced.id, id);
    assert.equal(typeof advanced.alive, 'boolean');
    assert.ok(Number.isFinite(advanced.score));
  }
});
