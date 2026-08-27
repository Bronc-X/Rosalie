export const CREATE_GAME_PROGRESS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS game_progress (
  player_id TEXT NOT NULL,
  game_id TEXT NOT NULL CHECK (game_id IN ('hole', 'sand', 'parking', 'screw', 'water', 'rescue', 'arrow')),
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 99),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 999999999),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, game_id)
) WITHOUT ROWID`;

export const CREATE_TREEHOLE_MESSAGES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS treehole_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 180),
  created_at TEXT NOT NULL
)`;

export const CREATE_TREEHOLE_CREATED_INDEX_SQL = `CREATE INDEX IF NOT EXISTS treehole_created_at_idx
ON treehole_messages(created_at DESC, id DESC)`;

export const CREATE_TREEHOLE_REPLIES_TABLE_SQL = `CREATE TABLE IF NOT EXISTS treehole_replies (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 120),
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES treehole_messages(id) ON DELETE CASCADE
)`;

export const CREATE_TREEHOLE_REPLIES_INDEX_SQL = `CREATE INDEX IF NOT EXISTS treehole_replies_message_idx
ON treehole_replies(message_id, created_at ASC, id ASC)`;

export const SCHEMA_STATEMENTS = [
  CREATE_GAME_PROGRESS_TABLE_SQL,
  CREATE_TREEHOLE_MESSAGES_TABLE_SQL,
  CREATE_TREEHOLE_CREATED_INDEX_SQL,
  CREATE_TREEHOLE_REPLIES_TABLE_SQL,
  CREATE_TREEHOLE_REPLIES_INDEX_SQL,
];

export const SELECT_PROGRESS_SQL = `SELECT game_id, current_level, best_score, updated_at
FROM game_progress
WHERE player_id = ?
ORDER BY game_id`;

export const UPSERT_PROGRESS_SQL = `INSERT INTO game_progress (
  player_id, game_id, current_level, best_score, updated_at
) VALUES (?, ?, ?, ?, ?)
ON CONFLICT(player_id, game_id) DO UPDATE SET
  current_level = MAX(game_progress.current_level, excluded.current_level),
  best_score = MAX(game_progress.best_score, excluded.best_score),
  updated_at = excluded.updated_at`;

export const SELECT_TREEHOLE_MESSAGES_SQL = `SELECT id, text, created_at
FROM treehole_messages
ORDER BY created_at DESC, id DESC LIMIT ?`;

export const INSERT_TREEHOLE_MESSAGE_SQL = `INSERT INTO treehole_messages (
  id, player_id, text, created_at
) VALUES (?, ?, ?, ?)`;

export const SELECT_TREEHOLE_REPLIES_SQL = `SELECT r.id, r.message_id, r.text, r.created_at
FROM treehole_replies AS r
JOIN (
  SELECT id FROM treehole_messages
  ORDER BY created_at DESC, id DESC LIMIT ?
) AS visible_messages ON visible_messages.id = r.message_id
ORDER BY r.created_at ASC, r.id ASC`;

export const INSERT_TREEHOLE_REPLY_SQL = `INSERT INTO treehole_replies (
  id, message_id, player_id, text, created_at
) VALUES (?, ?, ?, ?, ?)`;
