import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canCarExit,
  clearSandGroup,
  holeSizeAfterSequence,
  nextHoleSize,
  parkingLayoutHasOverlap,
  pourWater,
  swallowObject,
  trayAfterPick,
  waterPuzzleSolved,
} from '../lib/arcade-games.mjs';

test('sand groups clear only at three and collapse downward', () => {
  const board = [
    ['rose', null],
    ['rose', 'mint'],
    ['rose', 'mint'],
  ];
  const result = clearSandGroup(board, 1, 0);
  assert.equal(result.removed, 3);
  assert.deepEqual(result.board, [[null, null], [null, 'mint'], [null, 'mint']]);
  assert.equal(clearSandGroup(board, 1, 1).removed, 0);
});

test('water pours the complete matching top run and detects solved tubes', () => {
  const tubes = [['rose', 'mint', 'mint'], ['mint'], ['rose', 'rose', 'rose']];
  assert.deepEqual(pourWater(tubes, 0, 1), [['rose'], ['mint', 'mint', 'mint'], ['rose', 'rose', 'rose']]);
  assert.ok(waterPuzzleSolved([['rose', 'rose'], [], ['mint', 'mint']], 2));
});

test('tray removes triples before overflow', () => {
  const result = trayAfterPick(['rose', 'mint', 'rose'], 'rose');
  assert.deepEqual(result.tray, ['mint']);
  assert.equal(result.cleared, true);
  assert.equal(result.overflow, false);
});

test('cars can leave only when their lane is clear', () => {
  const car = { id: 'a', row: 2, column: 1, length: 2, horizontal: true };
  assert.equal(canCarExit(car, [car]), true);
  assert.equal(canCarExit(car, [car, { id: 'b', row: 2, column: 4, length: 2, horizontal: false }]), false);
});

test('hole swallows only nearby smaller objects and grows after eating', () => {
  const hole = { x: 50, y: 50, size: 14 };
  assert.equal(swallowObject(hole, { x: 52, y: 51, size: 10 }), true);
  assert.equal(swallowObject(hole, { x: 52, y: 51, size: 18 }), false);
  assert.ok(nextHoleSize(14, 10) > 14);
});

test('both hole levels can be eaten from smallest to largest', () => {
  assert.ok(holeSizeAfterSequence(14, [7, 8, 8, 9, 11, 12, 14, 16]));
  assert.ok(holeSizeAfterSequence(14, [7, 7, 8, 9, 11, 12, 14, 17, 20]));
});

test('parking levels never begin with overlapping cars', () => {
  const first = [
    { id: 'a', row: 0, column: 0, length: 2, horizontal: true },
    { id: 'b', row: 0, column: 3, length: 2, horizontal: false },
    { id: 'c', row: 2, column: 0, length: 3, horizontal: true },
    { id: 'd', row: 1, column: 5, length: 2, horizontal: false },
    { id: 'e', row: 3, column: 1, length: 2, horizontal: false },
    { id: 'f', row: 4, column: 2, length: 2, horizontal: true },
    { id: 'g', row: 4, column: 5, length: 2, horizontal: false },
    { id: 'h', row: 5, column: 0, length: 2, horizontal: true },
  ];
  const second = [
    { id: 'a', row: 0, column: 2, length: 2, horizontal: false },
    { id: 'b', row: 0, column: 4, length: 2, horizontal: true },
    { id: 'c', row: 2, column: 0, length: 3, horizontal: true },
    { id: 'd', row: 2, column: 3, length: 2, horizontal: false },
    { id: 'e', row: 3, column: 0, length: 2, horizontal: true },
    { id: 'f', row: 4, column: 1, length: 2, horizontal: false },
    { id: 'g', row: 4, column: 3, length: 3, horizontal: true },
    { id: 'h', row: 2, column: 5, length: 2, horizontal: false },
  ];
  assert.equal(parkingLayoutHasOverlap(first), false);
  assert.equal(parkingLayoutHasOverlap(second), false);
});
