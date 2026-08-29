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

test('every endless game owns a distinct world, palette and progression brief', () => {
  const worlds = EXPECTED_IDS.map((id) => endless.ENDLESS_GAME_WORLDS?.[id]);

  assert.ok(worlds.every((world) => world?.id && world?.motif && world?.phaseNames?.length === 4));
  assert.equal(new Set(worlds.map((world) => world.id)).size, EXPECTED_IDS.length);
  assert.equal(new Set(worlds.map((world) => world.motif)).size, EXPECTED_IDS.length);
  assert.equal(new Set(worlds.map((world) => world.light?.join('|'))).size, EXPECTED_IDS.length);
  assert.ok(endless.ENDLESS_GAME_CATALOG?.every((game) => game.worldId && game.objective));
});

test('run meta advances through bounded phases and exposes each game challenge', () => {
  for (const id of EXPECTED_IDS) {
    const state = endless.createEndlessGameState(id, 1212);
    const opening = endless.getEndlessGameRunMeta?.(state);
    state.score = 80;
    state.combo = 99;
    const late = endless.getEndlessGameRunMeta?.(state);

    assert.equal(opening.phase, 0);
    assert.equal(late.phase, 3);
    assert.equal(late.multiplier, 4);
    assert.ok(opening.challenge.length > 0);
    assert.notEqual(opening.phaseName, late.phaseName);
  }
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

test('a prism bubble clears its nearby cluster instead of behaving like a reskinned bubble', () => {
  const state = endless.createEndlessGameState('bubble', 1212);
  state.bubbles = [
    { x: 120, y: 180, radius: 22, prism: true, popped: false },
    { x: 170, y: 180, radius: 20, prism: false, popped: false },
    { x: 300, y: 180, radius: 20, prism: false, popped: false },
  ];

  endless.controlEndlessGame(state, { type: 'tap', x: 120, y: 180 });

  assert.equal(state.bubbles[0].popped, true);
  assert.equal(state.bubbles[1].popped, true);
  assert.equal(state.bubbles[2].popped, false);
  assert.equal(state.combo, 2);
  assert.ok(state.score >= 4);
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
