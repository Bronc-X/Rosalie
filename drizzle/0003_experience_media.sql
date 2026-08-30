CREATE TABLE IF NOT EXISTS experience_media (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  UNIQUE (space_id, experience_id),
  FOREIGN KEY (space_id, experience_id) REFERENCES experiences(space_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS experience_media_experience_idx
  ON experience_media(space_id, experience_id);
