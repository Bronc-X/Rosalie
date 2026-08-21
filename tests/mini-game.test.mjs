import test from 'node:test';
import assert from 'node:assert/strict';

const miniGame = await import('../lib/mini-game.mjs').catch(() => ({}));

test('a new round starts with no catches and three chances', () => {
  assert.equal(typeof miniGame.createMiniGame, 'function');
  assert.deepEqual(miniGame.createMiniGame(), {
    status: 'idle',
    score: 0,
    streak: 0,
    hearts: 3,
  });
});

test('catching a blossom increases both score and streak', () => {
  const state = { status: 'playing', score: 2, streak: 1, hearts: 3 };

  assert.deepEqual(miniGame.collectMiniGameItem(state, 'blossom'), {
    status: 'playing',
    score: 3,
    streak: 2,
    hearts: 3,
  });
  assert.equal(state.score, 2);
});

test('hitting work resets the streak and ends the round after three hits', () => {
  const oneChance = { status: 'playing', score: 5, streak: 4, hearts: 1 };

  assert.deepEqual(miniGame.collectMiniGameItem(oneChance, 'work'), {
    status: 'lost',
    score: 5,
    streak: 0,
    hearts: 0,
  });
});

test('finishing with eight blossoms counts as a successful pull', () => {
  assert.equal(
    miniGame.finishMiniGame({ status: 'playing', score: 8, streak: 2, hearts: 2 }).status,
    'won',
  );
  assert.equal(
    miniGame.finishMiniGame({ status: 'playing', score: 7, streak: 7, hearts: 3 }).status,
    'lost',
  );
});

test('falling items become slightly faster during the round', () => {
  const opening = miniGame.createFallingItem(7, 0.2, 0.3, 0);
  const closing = miniGame.createFallingItem(8, 0.9, 0.3, miniGame.GAME_DURATION_MS);

  assert.equal(opening.kind, 'blossom');
  assert.equal(closing.kind, 'work');
  assert.equal(opening.x, closing.x);
  assert.ok(closing.durationMs < opening.durationMs);
});

test('work stays rare at first and becomes more likely near the end', () => {
  assert.equal(miniGame.createFallingItem(9, 0.84, 0.5, 0).kind, 'blossom');
  assert.equal(
    miniGame.createFallingItem(10, 0.84, 0.5, miniGame.GAME_DURATION_MS).kind,
    'work',
  );
});

test('the pull charm stays inside the play field', () => {
  assert.equal(miniGame.clampPlayerX(-12), 0);
  assert.equal(miniGame.clampPlayerX(48), 48);
  assert.equal(miniGame.clampPlayerX(116), 100);
});

test('only overlapping falling items are collected', () => {
  const player = { left: 40, right: 80, top: 180, bottom: 230 };
  const caught = { left: 52, right: 72, top: 170, bottom: 195 };
  const missed = { left: 120, right: 140, top: 170, bottom: 195 };

  assert.equal(miniGame.rectanglesOverlap(player, caught), true);
  assert.equal(miniGame.rectanglesOverlap(player, missed), false);
});
