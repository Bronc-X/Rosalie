import test from 'node:test';
import assert from 'node:assert/strict';

const access = await import('../lib/access.mjs').catch(() => ({}));

test('password hashes are stable without storing the original password', async () => {
  assert.equal(typeof access.hashAccessPassword, 'function');
  const hash = await access.hashAccessPassword('1212');

  assert.equal(hash.length, 64);
  assert.equal(await access.matchesAccessPassword('1212', hash), true);
  assert.equal(await access.matchesAccessPassword('1213', hash), false);
  assert.equal(hash.includes('1212'), false);
});

test('a signed access token is accepted until it expires', async () => {
  const now = Date.UTC(2026, 7, 21);
  const token = await access.createAccessToken('secret-for-tests', now, 60_000);

  assert.equal(await access.verifyAccessToken(token, 'secret-for-tests', now + 59_999), true);
  assert.equal(await access.verifyAccessToken(token, 'wrong-secret', now + 1), false);
  assert.equal(await access.verifyAccessToken(token, 'secret-for-tests', now + 60_001), false);
});

test('only local return paths are allowed after unlocking', () => {
  assert.equal(access.safeNextPath('/play'), '/play');
  assert.equal(access.safeNextPath('/treehole?from=play'), '/treehole?from=play');
  assert.equal(access.safeNextPath('//outside.example'), '/');
  assert.equal(access.safeNextPath('https://outside.example'), '/');
  assert.equal(access.safeNextPath('/unlock'), '/');
});

test('a signed player token restores the same player until it expires', async () => {
  assert.equal(typeof access.createPlayerToken, 'function');
  assert.equal(typeof access.readPlayerId, 'function');

  const now = Date.UTC(2026, 7, 22);
  const playerId = '11111111-1111-4111-8111-111111111111';
  const token = await access.createPlayerToken('secret-for-tests', playerId, now, 60_000);

  assert.equal(await access.readPlayerId(token, 'secret-for-tests', now + 59_999), playerId);
  assert.equal(await access.readPlayerId(token, 'wrong-secret', now + 1), null);
  assert.equal(await access.readPlayerId(`${token}tampered`, 'secret-for-tests', now + 1), null);
  assert.equal(await access.readPlayerId(token, 'secret-for-tests', now + 60_001), null);
});
