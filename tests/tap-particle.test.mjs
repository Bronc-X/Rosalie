import test from 'node:test';
import assert from 'node:assert/strict';

const tapParticle = await import('../lib/tap-particle.mjs').catch(() => ({}));

test('most taps create a cherry blossom', () => {
  assert.equal(typeof tapParticle.pickTapParticle, 'function');
  assert.equal(tapParticle.pickTapParticle(0.2), 'blossom');
});

test('some taps create the new pull charm', () => {
  assert.equal(typeof tapParticle.pickTapParticle, 'function');
  assert.equal(tapParticle.pickTapParticle(0.9), 'charm');
});

test('the random boundary is stable', () => {
  assert.equal(typeof tapParticle.pickTapParticle, 'function');
  assert.equal(tapParticle.pickTapParticle(0.57), 'blossom');
  assert.equal(tapParticle.pickTapParticle(0.58), 'charm');
});
