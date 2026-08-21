import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUNTDOWN_START,
  COUNTDOWN_TARGET,
  getCountdownState,
  splitDuration,
} from '../lib/countdown.mjs';

test('keeps the full ten days before the countdown starts', () => {
  const state = getCountdownState(Date.parse('2026-08-18T20:00:00+08:00'));

  assert.equal(state.phase, 'before');
  assert.equal(state.progress, 0);
  assert.equal(state.remainingMs, COUNTDOWN_TARGET - COUNTDOWN_START);
});

test('reports five days remaining at the exact midpoint', () => {
  const state = getCountdownState(Date.parse('2026-08-24T00:00:00+08:00'));

  assert.equal(state.phase, 'counting');
  assert.equal(state.progress, 0.5);
  assert.deepEqual(splitDuration(state.remainingMs), {
    days: 5,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});

test('preserves the final second without rounding up or going negative', () => {
  const state = getCountdownState(Date.parse('2026-08-28T23:59:59+08:00'));

  assert.equal(state.phase, 'counting');
  assert.deepEqual(splitDuration(state.remainingMs), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1,
  });
});

test('enters the reunited state at the target instant', () => {
  const state = getCountdownState(Date.parse('2026-08-29T00:00:00+08:00'));

  assert.equal(state.phase, 'reunited');
  assert.equal(state.progress, 1);
  assert.equal(state.remainingMs, 0);
});

test('stays reunited after the target instead of returning negative time', () => {
  const state = getCountdownState(Date.parse('2026-09-01T12:00:00+08:00'));

  assert.equal(state.phase, 'reunited');
  assert.equal(state.progress, 1);
  assert.deepEqual(splitDuration(state.remainingMs), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});
