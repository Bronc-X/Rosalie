PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS places (
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_by_member_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (space_id, id),
  UNIQUE (space_id, name),
  FOREIGN KEY (space_id, created_by_member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT
);

ALTER TABLE experiences ADD COLUMN place_id TEXT;

INSERT OR IGNORE INTO places (space_id, id, name, position, created_by_member_id, created_at, updated_at)
SELECT id, 'shantou', '汕頭', 0, NULL, created_at, updated_at FROM spaces;

INSERT OR IGNORE INTO places (space_id, id, name, position, created_by_member_id, created_at, updated_at)
SELECT id, 'guangzhou', '广州', 1, NULL, created_at, updated_at FROM spaces;

INSERT OR IGNORE INTO places (space_id, id, name, position, created_by_member_id, created_at, updated_at)
SELECT id, 'shenzhen', '深圳', 2, NULL, created_at, updated_at FROM spaces;

UPDATE experiences SET place_id = 'shantou' WHERE place_id IS NULL;

CREATE INDEX IF NOT EXISTS places_space_position_idx ON places(space_id, position, id);
CREATE INDEX IF NOT EXISTS experiences_space_place_idx ON experiences(space_id, place_id, updated_at DESC);

CREATE TRIGGER IF NOT EXISTS experiences_place_insert_guard
BEFORE INSERT ON experiences
WHEN NEW.place_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM places p WHERE p.space_id = NEW.space_id AND p.id = NEW.place_id
)
BEGIN
  SELECT RAISE(ABORT, 'place_not_found');
END;

CREATE TRIGGER IF NOT EXISTS experiences_place_update_guard
BEFORE UPDATE OF space_id, place_id ON experiences
WHEN NEW.place_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM places p WHERE p.space_id = NEW.space_id AND p.id = NEW.place_id
)
BEGIN
  SELECT RAISE(ABORT, 'place_not_found');
END;

CREATE TRIGGER IF NOT EXISTS places_delete_guard
BEFORE DELETE ON places
WHEN EXISTS (
  SELECT 1 FROM experiences e WHERE e.space_id = OLD.space_id AND e.place_id = OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'place_in_use');
END;
