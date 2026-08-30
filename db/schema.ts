export const D1_SCHEMA_VERSION = 3 as const;

export const D1_TABLES = [
  'spaces',
  'members',
  'sessions',
  'places',
  'experiences',
  'experience_tags',
  'footprints',
  'media',
  'experience_media',
  'plans',
  'unlock_attempts',
  'audit_events',
] as const;

export type D1Table = (typeof D1_TABLES)[number];
