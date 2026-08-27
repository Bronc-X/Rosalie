import test from 'node:test';
import assert from 'node:assert/strict';

const schema = await import('../lib/site-schema.mjs').catch(() => ({}));

test('the durable store contains indexed message and reply tables plus player-scoped progress', () => {
  assert.ok(Array.isArray(schema.SCHEMA_STATEMENTS));
  assert.equal(schema.SCHEMA_STATEMENTS.length, 5);
  assert.match(schema.SCHEMA_STATEMENTS[0], /PRIMARY KEY \(player_id, game_id\)/i);
  assert.match(schema.SCHEMA_STATEMENTS[1], /player_id TEXT NOT NULL/i);
  assert.match(schema.SCHEMA_STATEMENTS[2], /created_at DESC, id DESC/i);
  assert.match(schema.SCHEMA_STATEMENTS[3], /message_id TEXT NOT NULL/i);
  assert.match(schema.SCHEMA_STATEMENTS[3], /FOREIGN KEY \(message_id\) REFERENCES treehole_messages\(id\)/i);
  assert.match(schema.SCHEMA_STATEMENTS[4], /message_id, created_at ASC, id ASC/i);
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

test('treehole replies are loaded in one ordered query for the visible messages', () => {
  assert.equal(typeof schema.SELECT_TREEHOLE_REPLIES_SQL, 'string');
  assert.match(schema.SELECT_TREEHOLE_REPLIES_SQL, /JOIN[\s\S]+LIMIT \?/i);
  assert.match(schema.SELECT_TREEHOLE_REPLIES_SQL, /ORDER BY r\.created_at ASC, r\.id ASC/i);
  assert.equal(typeof schema.INSERT_TREEHOLE_REPLY_SQL, 'string');
});
