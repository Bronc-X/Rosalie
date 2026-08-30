PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  handle TEXT NOT NULL CHECK (handle IN ('toni', 'rosalie')),
  display_name TEXT NOT NULL,
  avatar_key TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  UNIQUE (space_id, handle)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_digest TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  member_id TEXT,
  csrf_token_digest TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (space_id, member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food_drink', 'museum_exhibition', 'shop_market', 'entertainment', 'outdoor_nature', 'other')),
  address TEXT,
  latitude REAL,
  longitude REAL,
  coordinate_system TEXT CHECK (coordinate_system IN ('gcj02', 'wgs84', 'bd09')),
  location_status TEXT NOT NULL CHECK (location_status IN ('verified', 'pending')),
  location_note TEXT,
  recommendation_status TEXT NOT NULL DEFAULT 'normal' CHECK (recommendation_status IN ('normal', 'avoid')),
  experience_state TEXT NOT NULL DEFAULT 'wishlist' CHECK (experience_state IN ('wishlist', 'footprint')),
  source_url TEXT,
  source_kind TEXT CHECK (source_kind IN ('google_maps', 'website', 'instagram', 'xiaohongshu', 'other')),
  opening_hours TEXT,
  notes TEXT,
  image_url TEXT,
  created_by_member_id TEXT,
  legacy_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  UNIQUE (space_id, legacy_key),
  FOREIGN KEY (space_id, created_by_member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT,
  CHECK ((latitude IS NULL AND longitude IS NULL AND coordinate_system IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND coordinate_system IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS experience_tags (
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (space_id, experience_id, tag),
  FOREIGN KEY (space_id, experience_id) REFERENCES experiences(space_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS footprints (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  visited_on TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  legacy_key TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  UNIQUE (space_id, legacy_key),
  FOREIGN KEY (space_id, experience_id) REFERENCES experiences(space_id, id) ON DELETE CASCADE,
  FOREIGN KEY (space_id, member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  footprint_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  FOREIGN KEY (space_id, footprint_id) REFERENCES footprints(space_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL,
  created_by_member_id TEXT NOT NULL,
  target_member_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (space_id, id),
  CHECK (created_by_member_id <> target_member_id),
  FOREIGN KEY (space_id, experience_id) REFERENCES experiences(space_id, id) ON DELETE CASCADE,
  FOREIGN KEY (space_id, created_by_member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (space_id, target_member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS unlock_attempts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  succeeded INTEGER NOT NULL CHECK (succeeded IN (0, 1)),
  attempted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  member_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  actor_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (space_id, member_id) REFERENCES members(space_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS sessions_space_expiry_idx ON sessions(space_id, expires_at);
CREATE INDEX IF NOT EXISTS experiences_space_updated_idx ON experiences(space_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS footprints_space_date_idx ON footprints(space_id, visited_on DESC);
CREATE INDEX IF NOT EXISTS footprints_experience_idx ON footprints(space_id, experience_id);
CREATE INDEX IF NOT EXISTS media_footprint_idx ON media(space_id, footprint_id);
CREATE INDEX IF NOT EXISTS plans_target_status_idx ON plans(space_id, target_member_id, status);
CREATE INDEX IF NOT EXISTS plans_calendar_idx ON plans(space_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS unlock_attempts_rate_idx ON unlock_attempts(space_id, ip_hash, attempted_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_space_time_idx ON audit_events(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_write_rate_idx ON audit_events(space_id, event_type, actor_hash, created_at DESC);
