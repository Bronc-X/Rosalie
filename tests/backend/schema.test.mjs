import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('D1 migration creates all shared-space domain tables with direct space ownership', async () => {
  const sql = await readFile(new URL('../../drizzle/0002_experience_initial.sql', import.meta.url), 'utf8').catch(
    () => '',
  );
  const tables = [
    'spaces',
    'members',
    'sessions',
    'experiences',
    'experience_tags',
    'footprints',
    'media',
    'plans',
    'unlock_attempts',
    'audit_events',
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, 'i'));
  }

  for (const table of tables.filter((name) => name !== 'spaces')) {
    const create = sql.match(
      new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}\\s*\\(([\\s\\S]*?)\\);`, 'i'),
    )?.[1];
    assert.ok(create, `${table} should have a CREATE TABLE statement`);
    assert.match(create, /\bspace_id\s+TEXT\s+NOT NULL\b/i, `${table} should carry space_id`);
  }

  assert.match(sql, /csrf_token_digest\s+TEXT\s+NOT NULL/i);
  assert.doesNotMatch(sql, /\bcsrf_token\s+TEXT\s+NOT NULL/i);
  assert.match(sql, /FOREIGN KEY\s*\(space_id,\s*experience_id\)\s*REFERENCES experiences\s*\(space_id,\s*id\)/i);
  assert.match(sql, /FOREIGN KEY\s*\(space_id,\s*footprint_id\)\s*REFERENCES footprints\s*\(space_id,\s*id\)/i);
});

test('Experience cover migration is private, space-scoped, and one-to-one', async () => {
  const sql = await readFile(new URL('../../drizzle/0003_experience_media.sql', import.meta.url), 'utf8').catch(
    () => '',
  );

  assert.match(sql, /CREATE TABLE(?: IF NOT EXISTS)? experience_media\b/i);
  assert.match(sql, /\bspace_id\s+TEXT\s+NOT NULL\b/i);
  assert.match(sql, /\bexperience_id\s+TEXT\s+NOT NULL\b/i);
  assert.match(sql, /UNIQUE\s*\(space_id,\s*experience_id\)/i);
  assert.match(sql, /FOREIGN KEY\s*\(space_id,\s*experience_id\)\s*REFERENCES experiences\s*\(space_id,\s*id\)\s*ON DELETE CASCADE/i);
  assert.match(sql, /mime_type TEXT NOT NULL CHECK\s*\(mime_type IN \('image\/jpeg', 'image\/png', 'image\/webp'\)\)/i);
});

test('Place migration seeds the shared selector and assigns existing Experiences to Shantou', async () => {
  const [sql, localization] = await Promise.all([
    readFile(new URL('../../drizzle/0004_experience_places.sql', import.meta.url), 'utf8').catch(() => ''),
    readFile(new URL('../../drizzle/0005_experience_place_localization.sql', import.meta.url), 'utf8').catch(() => ''),
  ]);

  assert.match(sql, /CREATE TABLE(?: IF NOT EXISTS)? places\b/i);
  assert.match(sql, /\bspace_id\s+TEXT\s+NOT NULL\b/i);
  assert.match(sql, /UNIQUE\s*\(space_id,\s*name\)/i);
  assert.match(sql, /ALTER TABLE experiences ADD COLUMN place_id TEXT/i);
  assert.match(sql, /['"]shantou['"][\s\S]*?['"]汕頭['"]/i);
  assert.match(sql, /['"]guangzhou['"][\s\S]*?['"]广州['"]/i);
  assert.match(sql, /['"]shenzhen['"][\s\S]*?['"]深圳['"]/i);
  assert.match(sql, /UPDATE experiences[\s\S]*?place_id\s*=\s*['"]shantou['"]/i);
  assert.match(localization, /UPDATE places[\s\S]*?name\s*=\s*['"]廣州['"][\s\S]*?id\s*=\s*['"]guangzhou['"]/i);
});
