import test from 'node:test';
import assert from 'node:assert/strict';

const schema = await import('../lib/site-schema.mjs').catch(() => ({}));

test('the durable store contains one indexed table for messages and one player-scoped table for progress', () => {
  assert.ok(Array.isArray(schema.SCHEMA_STATEMENTS));
  assert.equal(schema.SCHEMA_STATEMENTS.length, 3);
  assert.match(schema.SCHEMA_STATEMENTS[0], /PRIMARY KEY \(player_id, game_id\)/i);
  assert.match(schema.SCHEMA_STATEMENTS[1], /player_id TEXT NOT NULL/i);
  assert.match(schema.SCHEMA_STATEMENTS[2], /created_at DESC, id DESC/i);
});

test('progress upserts are monotonic so late requests cannot relock a level', () => {
  assert.equal(typeof schema.UPSERT_PROGRESS_SQL, 'string');
  assert.match(schema.UPSERT_PROGRESS_SQL, /MAX\(game_progress\.current_level, excluded\.current_level\)/i);
  assert.match(schema.UPSERT_PROGRESS_SQL, /MAX\(game_progress\.best_score, excluded\.best_score\)/i);
});

test('treehole reads use one ordered query instead of one network request per message', () => {
  assert.equal(typeof schema.SELECT_TREEHOLE_MESSAGES_SQL, 'string');
  assert.match(schema.SELECT_TREEHOLE_MESSAGES_SQL, /ORDER BY created_at DESC, id DESC LIMIT \?/i);
});
