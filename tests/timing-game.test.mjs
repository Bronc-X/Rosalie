import test from 'node:test';
import assert from 'node:assert/strict';

const timingGame = await import('../lib/timing-game.mjs').catch(() => ({}));

test('the timing marker travels out and back in one cycle', () => {
  assert.equal(typeof timingGame.getTimingPosition, 'function');
  assert.equal(timingGame.getTimingPosition(0), 0);
  assert.equal(timingGame.getTimingPosition(550), 0.5);
  assert.equal(timingGame.getTimingPosition(1100), 1);
  assert.equal(timingGame.getTimingPosition(1650), 0.5);
  assert.equal(timingGame.getTimingPosition(2200), 0);
});

test('the middle heart zone distinguishes perfect, good, and missed pulls', () => {
  assert.equal(timingGame.judgeTimingHit(0.5), 'perfect');
  assert.equal(timingGame.judgeTimingHit(0.62), 'good');
  assert.equal(timingGame.judgeTimingHit(0.82), 'miss');
});

test('a perfect pull counts double and records the attempt', () => {
  const state = timingGame.beginTimingGame();
  assert.deepEqual(timingGame.collectTimingHit(state, 0.5), {
    status: 'playing',
    score: 2,
    attempts: 1,
    perfects: 1,
    lastJudge: 'perfect',
  });
});

test('six points completes the timing round', () => {
  const state = {
    status: 'playing',
    score: 5,
    attempts: 4,
    perfects: 1,
    lastJudge: 'good',
  };
  assert.equal(timingGame.collectTimingHit(state, 0.58).status, 'won');
});

test('seven misses end the round with a soft failure', () => {
  let state = timingGame.beginTimingGame();
  for (let index = 0; index < 7; index += 1) {
    state = timingGame.collectTimingHit(state, 0.95);
  }
  assert.equal(state.status, 'lost');
  assert.equal(state.attempts, 7);
});
