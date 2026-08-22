CREATE TABLE IF NOT EXISTS game_progress (
  player_id TEXT NOT NULL,
  game_id TEXT NOT NULL CHECK (game_id IN ('hole', 'sand', 'parking', 'screw', 'water', 'rescue', 'arrow')),
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 99),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 999999999),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, game_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS treehole_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 180),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS treehole_created_at_idx
ON treehole_messages(created_at DESC, id DESC);
