import test from 'node:test';
import assert from 'node:assert/strict';

const dragChoice = await import('../lib/drag-choice.mjs').catch(() => ({}));

const targets = {
  yes: { left: 20, right: 140, top: 300, bottom: 360 },
  no: { left: 170, right: 290, top: 300, bottom: 360 },
};

test('dropping over yes chooses yes', () => {
  assert.equal(typeof dragChoice.getDropChoice, 'function');
  assert.equal(dragChoice.getDropChoice({ x: 80, y: 330 }, targets), 'yes');
});

test('dropping over no chooses no', () => {
  assert.equal(typeof dragChoice.getDropChoice, 'function');
  assert.equal(dragChoice.getDropChoice({ x: 230, y: 330 }, targets), 'no');
});

test('touch drops get a small forgiving hit area', () => {
  assert.equal(typeof dragChoice.getDropChoice, 'function');
  assert.equal(dragChoice.getDropChoice({ x: 80, y: 374 }, targets, 18), 'yes');
});

test('dropping away from either choice returns null', () => {
  assert.equal(typeof dragChoice.getDropChoice, 'function');
  assert.equal(dragChoice.getDropChoice({ x: 155, y: 120 }, targets), null);
});
