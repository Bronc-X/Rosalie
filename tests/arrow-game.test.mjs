import test from 'node:test';
import assert from 'node:assert/strict';

const arrowGame = await import('../lib/arrow-game.mjs').catch(() => ({}));

test('the arrow aim sweeps left, center, right, then returns', () => {
  assert.equal(typeof arrowGame.getArrowAimAngle, 'function');
  assert.equal(arrowGame.getArrowAimAngle(0), -38);
  assert.equal(arrowGame.getArrowAimAngle(550), 0);
  assert.equal(arrowGame.getArrowAimAngle(1100), 38);
  assert.equal(arrowGame.getArrowAimAngle(1650), 0);
  assert.equal(arrowGame.getArrowAimAngle(2200), -38);
});

test('a shot through the small hole is a hit while a distant shot misses', () => {
  const target = { x: 50, y: 20, radius: 4 };

  assert.equal(arrowGame.judgeArrowShot(0, target), 'hit');
  assert.equal(arrowGame.judgeArrowShot(32, target), 'miss');
});

test('three hits clear the round', () => {
  let state = arrowGame.beginArrowGame();
  for (let index = 0; index < 3; index += 1) {
    const target = arrowGame.ARROW_TARGETS[state.targetIndex];
    const angle = arrowGame.angleToArrowTarget(target);
    state = arrowGame.takeArrowShot(state, angle);
  }

  assert.equal(state.status, 'won');
  assert.equal(state.hits, 3);
  assert.equal(state.attempts, 3);
});

test('five misses close the round without a negative score', () => {
  let state = arrowGame.beginArrowGame();
  for (let index = 0; index < 5; index += 1) {
    state = arrowGame.takeArrowShot(state, 38);
  }

  assert.equal(state.status, 'lost');
  assert.equal(state.hits, 0);
  assert.equal(state.attempts, 5);
});

