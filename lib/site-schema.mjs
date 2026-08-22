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

export const SCHEMA_STATEMENTS = [
  CREATE_GAME_PROGRESS_TABLE_SQL,
  CREATE_TREEHOLE_MESSAGES_TABLE_SQL,
  CREATE_TREEHOLE_CREATED_INDEX_SQL,
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
