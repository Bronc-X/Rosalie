import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const progress = await import('../lib/player-progress.mjs').catch(() => ({}));

test('progress updates accept only known games and safe integer values', () => {
  assert.equal(typeof progress.normalizeProgressUpdate, 'function');
  assert.deepEqual(progress.normalizeProgressUpdate({
    gameId: 'arrow',
    level: 2,
    bestScore: 7,
  }), {
    ok: true,
    value: { gameId: 'arrow', level: 2, bestScore: 7 },
  });

  assert.deepEqual(progress.normalizeProgressUpdate({
    gameId: 'connect',
    level: 1,
    bestScore: 12,
  }), {
    ok: true,
    value: { gameId: 'connect', level: 1, bestScore: 12 },
  });

  assert.deepEqual(progress.normalizeProgressUpdate({
    gameId: 'snake',
    level: 0,
    bestScore: 88,
  }), {
    ok: true,
    value: { gameId: 'snake', level: 0, bestScore: 88 },
  });

  assert.equal(progress.normalizeProgressUpdate({ gameId: 'unknown', level: 1, bestScore: 0 }).ok, false);
  assert.equal(progress.normalizeProgressUpdate({ gameId: 'arrow', level: -1, bestScore: 0 }).ok, false);
  assert.equal(progress.normalizeProgressUpdate({ gameId: 'arrow', level: 1.5, bestScore: 0 }).ok, false);
  assert.equal(progress.normalizeProgressUpdate({ gameId: 'arrow', level: 1, bestScore: -1 }).ok, false);
});

test('server progress never moves a player backwards', () => {
  assert.equal(typeof progress.mergeProgress, 'function');
  assert.deepEqual(
    progress.mergeProgress(
      { gameId: 'arrow', level: 3, bestScore: 5 },
      { gameId: 'arrow', level: 1, bestScore: 9 },
    ),
    { gameId: 'arrow', level: 3, bestScore: 9 },
  );
});

test('the next unlocked level stops at the final level', () => {
  assert.equal(progress.nextUnlockedLevel(0, 4), 1);
  assert.equal(progress.nextUnlockedLevel(2, 4), 3);
  assert.equal(progress.nextUnlockedLevel(3, 4), 3);
});

test('cached progress unlocks the game before the remote sync begins', async () => {
  const source = await readFile(new URL('../app/play/use-player-progress.ts', import.meta.url), 'utf8');
  const loadEffectAt = source.indexOf('useEffect(() => {');
  const publishCacheAt = source.indexOf('setProgress(cached)', loadEffectAt);
  const fetchRemoteAt = source.indexOf("fetch('/api/progress'", loadEffectAt);

  assert.notEqual(loadEffectAt, -1);
  assert.notEqual(publishCacheAt, -1);
  assert.notEqual(fetchRemoteAt, -1);
  assert.ok(publishCacheAt < fetchRemoteAt, 'local progress must be published before waiting on the network');
});
