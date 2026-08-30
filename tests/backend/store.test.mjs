import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, test } from 'node:test';

const store = await import('../../lib/server/store.ts').catch(() => null);

class D1StatementAdapter {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    const statement = new D1StatementAdapter(this.database, this.sql);
    statement.values = values;
    return statement;
  }

  async first() {
    return this.database.sqlite.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return { success: true, results: this.database.sqlite.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
    };
  }
}

class D1Adapter {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }

  prepare(sql) {
    assert.equal(
      sql.replaceAll(/'[^']*'/g, '').includes(';'),
      false,
      'each D1 prepare call must contain exactly one SQL statement',
    );
    return new D1StatementAdapter(this, sql);
  }

  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

const NOW = '2026-08-30T10:00:00.000Z';
const TOMORROW = '2026-08-31T10:00:00.000Z';
const migration = (
  await Promise.all([
    readFile(new URL('../../drizzle/0002_experience_initial.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0003_experience_media.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0004_experience_places.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0005_experience_place_localization.sql', import.meta.url), 'utf8'),
  ])
).join('\n');

function seedSpace(sqlite, suffix = '') {
  const spaceId = `space${suffix}`;
  sqlite
    .prepare(
      'INSERT INTO spaces (id, name, key_salt, key_hash, key_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(spaceId, 'Toni & Rosalie', 'salt', 'hash', 10000, NOW, NOW);
  for (const handle of ['toni', 'rosalie']) {
    sqlite
      .prepare(
        'INSERT INTO members (id, space_id, handle, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(`${handle}${suffix}`, spaceId, handle, handle === 'toni' ? 'Toni' : 'Rosalie', NOW);
  }
  return spaceId;
}

describe('D1 shared-space store', () => {
  let sqlite;
  let db;
  let spaceId;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(migration);
    db = new D1Adapter(sqlite);
    spaceId = seedSpace(sqlite);
  });

  test('loads only unexpired opaque sessions and selects a member inside that space', async () => {
    assert.equal(typeof store?.loadSession, 'function');
    sqlite
      .prepare(
      'INSERT INTO sessions (token_digest, space_id, member_id, csrf_token_digest, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run('digest', spaceId, null, 'csrf', TOMORROW, NOW, NOW);

    const session = await store.loadSession(db, 'digest', NOW);
    assert.equal(session.spaceId, spaceId);
    assert.equal(session.memberId, null);

    const member = await store.selectSessionMember(db, session, 'toni', NOW);
    assert.deepEqual(member, { id: 'toni', handle: 'toni', name: 'Toni', avatarUrl: null });
    assert.equal((await store.loadSession(db, 'digest', NOW)).memberId, 'toni');
    assert.equal(await store.loadSession(db, 'digest', '2026-09-01T00:00:00.000Z'), null);
  });

  test('creates Wishlist Experiences and returns tags and footprint summaries', async () => {
    assert.equal(typeof store?.createExperience, 'function');
    await store.seedInitialPlaces(db, spaceId, NOW);
    const context = { spaceId, memberId: 'toni' };
    const created = await store.createExperience(
      db,
      context,
      {
        placeId: 'shantou',
        name: 'Paper Museum',
        category: 'museum_exhibition',
        address: '12 Paper Road',
        coordinates: null,
        locationStatus: 'pending',
        locationNote: 'Exact door pending',
        recommendationStatus: 'normal',
        sourceUrl: null,
        sourceKind: null,
        openingHours: 'Tue–Sun',
        notes: 'Bring a sketchbook',
        imageUrl: '/food/paper.webp',
        tags: ['quiet', 'paper'],
      },
      { id: 'exp-1', now: NOW },
    );

    assert.equal(created.state, 'wishlist');
    assert.equal(created.placeId, 'shantou');
    assert.deepEqual(created.tags, ['paper', 'quiet']);
    assert.equal(created.footprintCount, 0);
    assert.equal(created.openingHours, 'Tue–Sun');
    assert.equal(created.notes, 'Bring a sketchbook');
    assert.equal(created.imageUrl, '/food/paper.webp');
    const listed = await store.listExperiences(db, context, { state: 'wishlist', search: 'paper' });
    assert.deepEqual(listed.map((experience) => experience.id), ['exp-1']);
  });

  test('lists seeded Places in selector order and keeps additions inside their shared space', async () => {
    assert.equal(typeof store?.listPlaces, 'function');
    assert.equal(typeof store?.createPlace, 'function');
    await store.seedInitialPlaces(db, spaceId, NOW);

    assert.deepEqual(await store.listPlaces(db, { spaceId }), [
      { id: 'shantou', name: '汕頭' },
      { id: 'guangzhou', name: '廣州' },
      { id: 'shenzhen', name: '深圳' },
    ]);

    const created = await store.createPlace(
      db,
      { spaceId, memberId: 'toni' },
      { name: '潮州' },
      { id: 'chaozhou', now: NOW },
    );
    assert.deepEqual(created, { id: 'chaozhou', name: '潮州' });

    const foreignSpace = seedSpace(sqlite, '-places');
    await store.seedInitialPlaces(db, foreignSpace, NOW);
    assert.deepEqual((await store.listPlaces(db, { spaceId: foreignSpace })).map((place) => place.name), [
      '汕頭',
      '廣州',
      '深圳',
    ]);
    assert.equal((await store.listPlaces(db, { spaceId })).some((place) => place.name === '潮州'), true);
  });

  test('requires Experience place associations to belong to the same shared space', async () => {
    assert.equal(typeof store?.seedInitialPlaces, 'function');
    await store.seedInitialPlaces(db, spaceId, NOW);
    const context = { spaceId, memberId: 'toni' };
    const base = {
      name: 'Guangzhou walk',
      category: 'outdoor_nature',
      address: null,
      coordinates: null,
      locationStatus: 'pending',
      locationNote: null,
      recommendationStatus: 'normal',
      sourceUrl: null,
      sourceKind: null,
      openingHours: null,
      notes: null,
      tags: [],
    };

    const created = await store.createExperience(
      db,
      context,
      { ...base, placeId: 'guangzhou' },
      { id: 'gz-exp', now: NOW },
    );
    assert.equal(created.placeId, 'guangzhou');
    assert.deepEqual((await store.listExperiences(db, context, { placeId: 'guangzhou' })).map((item) => item.id), [
      'gz-exp',
    ]);

    const foreignSpace = seedSpace(sqlite, '-foreign-place');
    await store.seedInitialPlaces(db, foreignSpace, NOW);
    await store.createPlace(
      db,
      { spaceId: foreignSpace, memberId: 'toni-foreign-place' },
      { name: 'Only there' },
      { id: 'foreign-only', now: NOW },
    );
    await assert.rejects(
      () => store.createExperience(db, context, { ...base, placeId: 'foreign-only' }, { id: 'bad-place', now: NOW }),
      (error) => error?.status === 404 && error?.code === 'place_not_found',
    );
  });

  test('seeds the initial restaurant catalog with stable IDs, food category, tags and raw GCJ tuples', async () => {
    assert.equal(typeof store?.seedInitialExperiences, 'function');
    await store.seedInitialExperiences(
      db,
      spaceId,
      [
        {
          id: 'food-01',
          name: 'One',
          category: '甜品小食',
          address: 'Pending',
          coordinates: undefined,
          coordinateSystem: 'gcj02',
          locationStatus: 'pending',
          locationNote: 'Two branches',
          recommendationStatus: 'normal',
          state: 'wishlist',
          tip: 'Try this',
          image: '/food/two.jpg',
        },
        {
          id: 'food-02',
          name: 'Two',
          category: '肠粉',
          address: 'Exact',
          coordinates: [23.352958, 116.671607],
          coordinateSystem: 'gcj02',
          locationStatus: 'verified',
          locationNote: undefined,
          recommendationStatus: 'normal',
          state: 'wishlist',
        },
      ],
      NOW,
    );
    const rows = sqlite
      .prepare('SELECT id, place_id, category, latitude, longitude, coordinate_system FROM experiences ORDER BY id')
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(rows, [
      { id: 'food-01', place_id: 'shantou', category: 'food_drink', latitude: null, longitude: null, coordinate_system: null },
      {
        id: 'food-02',
        place_id: 'shantou',
        category: 'food_drink',
        latitude: 23.352958,
        longitude: 116.671607,
        coordinate_system: 'gcj02',
      },
    ]);
    assert.deepEqual(
      sqlite
        .prepare('SELECT experience_id, tag FROM experience_tags ORDER BY experience_id')
        .all()
        .map((row) => ({ ...row })),
      [
        { experience_id: 'food-01', tag: '甜品小食' },
        { experience_id: 'food-02', tag: '肠粉' },
      ],
    );
  });

  test('rolls back first-time space creation if catalog seeding fails', async () => {
    assert.equal(typeof store?.initializeSpaceWithSeeds, 'function');
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(migration);
    db = new D1Adapter(sqlite);
    await assert.rejects(() =>
      store.initializeSpaceWithSeeds(
        db,
        { salt: 'salt', hash: 'hash', iterations: 10000 },
        [
          {
            id: 'bad-seed',
            name: 'Bad',
            category: 'Other',
            address: 'Unknown',
            coordinateSystem: 'gcj02',
            locationStatus: 'not-a-status',
            recommendationStatus: 'normal',
            state: 'wishlist',
          },
        ],
        { now: NOW, auditId: 'setup-audit' },
      ),
    );
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM spaces').get().count, 0);
  });

  test('prevents cross-space Experience reads, edits and deletes', async () => {
    assert.equal(typeof store?.updateExperience, 'function');
    const foreignSpace = seedSpace(sqlite, '-foreign');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('foreign-exp', foreignSpace, 'Foreign', 'other', 'pending', 'normal', 'wishlist', NOW, NOW);
    const context = { spaceId, memberId: 'toni' };

    await assert.rejects(
      () => store.updateExperience(db, context, 'foreign-exp', { name: 'Defaced' }, { now: NOW }),
      (error) => error?.status === 404,
    );
    assert.equal(sqlite.prepare('SELECT name FROM experiences WHERE id = ?').get('foreign-exp').name, 'Foreign');
    await assert.rejects(
      () => store.deleteExperience(db, context, 'foreign-exp'),
      (error) => error?.status === 404,
    );
  });

  test('database foreign keys reject cross-space parent references even if a query is accidentally wrong', () => {
    const foreignSpace = seedSpace(sqlite, '-foreign-owner');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('foreign-parent', foreignSpace, 'Foreign', 'other', 'pending', 'normal', 'wishlist', NOW, NOW);
    assert.throws(
      () =>
        sqlite
          .prepare(
            'INSERT INTO footprints (id, space_id, experience_id, member_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run('bad-child', spaceId, 'foreign-parent', 'toni', '2026-08-01', NOW),
      /foreign key constraint/i,
    );
  });

  test('creates and lists attributed Footprint history with only safe media fields', async () => {
    assert.equal(typeof store?.createFootprint, 'function');
    assert.equal(typeof store?.listExperienceFootprints, 'function');
    const context = { spaceId, memberId: 'toni' };
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('exp-1', spaceId, 'Paper Museum', 'museum_exhibition', 'pending', 'normal', 'wishlist', NOW, NOW);

    await store.createFootprint(
      db,
      context,
      'exp-1',
      { visitedOn: '2026-08-20', rating: 5, comment: 'Lovely' },
      { id: 'fp-1', now: NOW },
    );
    await store.createFootprint(
      db,
      context,
      'exp-1',
      { visitedOn: '2026-08-21', rating: null, comment: null },
      { id: 'fp-2', now: NOW },
    );

    sqlite
      .prepare(
        'INSERT INTO media (id, space_id, footprint_id, object_key, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('media-1', spaceId, 'fp-1', 'private/object-key.png', 'image/png', 8, 'digest', NOW);

    const history = await store.listExperienceFootprints(db, context, 'exp-1');
    assert.deepEqual(history, [
      {
        id: 'fp-2',
        experienceId: 'exp-1',
        visitedOn: '2026-08-21',
        rating: null,
        comment: null,
        member: { id: 'toni', name: 'Toni' },
        media: [],
      },
      {
        id: 'fp-1',
        experienceId: 'exp-1',
        visitedOn: '2026-08-20',
        rating: 5,
        comment: 'Lovely',
        member: { id: 'toni', name: 'Toni' },
        media: [{ id: 'media-1', url: '/api/media/media-1', mimeType: 'image/png' }],
      },
    ]);
    assert.equal(JSON.stringify(history).includes('private/object-key.png'), false);

    const foreignSpace = seedSpace(sqlite, '-history');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('foreign-exp', foreignSpace, 'Foreign', 'other', 'pending', 'normal', 'wishlist', NOW, NOW);
    await assert.rejects(
      () => store.listExperienceFootprints(db, context, 'foreign-exp'),
      (error) => error?.status === 404,
    );

    sqlite
      .prepare(
        'INSERT INTO footprints (id, space_id, experience_id, member_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('future-fp', spaceId, 'exp-1', 'toni', '2026-09-02', NOW);
    const calendar = await store.getCalendar(db, context, { today: '2026-08-30', now: NOW });
    assert.deepEqual(calendar.map((entry) => entry.id), ['footprint:fp-1', 'footprint:fp-2']);
    assert.deepEqual(calendar[0].memberIds, ['toni']);
    assert.equal(calendar[0].footprintId, 'fp-1');
    assert.equal(
      sqlite.prepare('SELECT experience_state FROM experiences WHERE id = ?').get('exp-1').experience_state,
      'footprint',
    );
  });

  test('deletes only an in-space Footprint and returns its Experience to Wishlist after the last visit', async () => {
    assert.equal(typeof store?.deleteFootprint, 'function');
    const context = { spaceId, memberId: 'toni' };
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('exp-delete', spaceId, 'A place', 'other', 'pending', 'normal', 'wishlist', NOW, NOW);

    await store.createFootprint(
      db,
      context,
      'exp-delete',
      { visitedOn: '2026-08-20', rating: null, comment: null },
      { id: 'fp-older', now: NOW },
    );
    await store.createFootprint(
      db,
      context,
      'exp-delete',
      { visitedOn: '2026-08-25', rating: null, comment: null },
      { id: 'fp-newer', now: NOW },
    );
    sqlite
      .prepare(
        'INSERT INTO media (id, space_id, footprint_id, object_key, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('media-delete', spaceId, 'fp-newer', 'private/delete.webp', 'image/webp', 12, 'digest', NOW);

    const first = await store.deleteFootprint(db, context, 'fp-newer', { now: NOW });
    assert.deepEqual(first.mediaObjectKeys, ['private/delete.webp']);
    assert.equal(first.deletedFootprintId, 'fp-newer');
    assert.equal(first.experience.id, 'exp-delete');
    assert.equal(first.experience.state, 'footprint');
    assert.equal(first.experience.footprintCount, 1);
    assert.equal(first.experience.lastVisitedOn, '2026-08-20');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM media WHERE id = ?').get('media-delete').count, 0);

    const last = await store.deleteFootprint(db, context, 'fp-older', { now: NOW });
    assert.equal(last.experience.state, 'wishlist');
    assert.equal(last.experience.footprintCount, 0);
    assert.equal(last.experience.lastVisitedOn, null);

    const foreignSpace = seedSpace(sqlite, '-delete');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('foreign-delete-exp', foreignSpace, 'Foreign', 'other', 'pending', 'normal', 'footprint', NOW, NOW);
    sqlite
      .prepare(
        'INSERT INTO footprints (id, space_id, experience_id, member_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('foreign-delete-fp', foreignSpace, 'foreign-delete-exp', 'toni-delete', '2026-08-01', NOW);

    await assert.rejects(
      () => store.deleteFootprint(db, context, 'foreign-delete-fp', { now: NOW }),
      (error) => error?.status === 404 && error?.code === 'footprint_not_found',
    );
    assert.equal(
      sqlite.prepare('SELECT COUNT(*) AS count FROM footprints WHERE id = ?').get('foreign-delete-fp').count,
      1,
    );
  });

  test('sends a Plan only to the other member and only that member can respond', async () => {
    assert.equal(typeof store?.createPlan, 'function');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('exp-1', spaceId, 'Paper Museum', 'museum_exhibition', 'pending', 'normal', 'wishlist', NOW, NOW);

    const plan = await store.createPlan(
      db,
      { spaceId, memberId: 'toni' },
      'exp-1',
      { scheduledFor: '2026-09-05T12:00:00.000Z', note: 'Saturday?' },
      { id: 'plan-1', now: NOW },
    );
    assert.equal(plan.targetMember.id, 'rosalie');
    await assert.rejects(
      () =>
        store.respondToPlan(
          db,
          { spaceId, memberId: 'toni' },
          'plan-1',
          'accepted',
          NOW,
        ),
      (error) => error?.status === 404,
    );
    const accepted = await store.respondToPlan(
      db,
      { spaceId, memberId: 'rosalie' },
      'plan-1',
      'accepted',
      NOW,
    );
    assert.equal(accepted.status, 'accepted');

    const calendar = await store.getCalendar(
      db,
      { spaceId, memberId: 'toni' },
      { today: '2026-08-30', now: NOW },
    );
    assert.deepEqual(calendar[0].memberIds.sort(), ['rosalie', 'toni']);
    assert.equal((await store.listNotifications(db, { spaceId, memberId: 'rosalie' })).length, 0);
  });

  test('legacy import requires dates and stays idempotent', async () => {
    assert.equal(typeof store?.importLegacyFootprints, 'function');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('food-1', spaceId, 'Beef Balls', 'food_drink', 'verified', 'normal', 'wishlist', NOW, NOW);
    const context = { spaceId, memberId: 'toni' };
    const preview = await store.importLegacyFootprints(
      db,
      context,
      [{ experienceId: 'food-1', visitedOn: null, rating: null, comment: null }],
      { now: NOW, id: () => 'unused' },
    );
    assert.deepEqual(preview, { imported: 0, skipped: 0, requiresDates: ['food-1'] });

    const first = await store.importLegacyFootprints(
      db,
      context,
      [{ experienceId: 'food-1', visitedOn: '2026-08-01', rating: 4, comment: 'Still good' }],
      { now: NOW, id: () => 'legacy-fp' },
    );
    const second = await store.importLegacyFootprints(
      db,
      context,
      [{ experienceId: 'food-1', visitedOn: '2026-08-01', rating: 4, comment: 'Still good' }],
      { now: NOW, id: () => 'another-id' },
    );
    assert.deepEqual(first, { imported: 1, skipped: 0, requiresDates: [] });
    assert.deepEqual(second, { imported: 0, skipped: 1, requiresDates: [] });
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM footprints').get().count, 1);
    assert.deepEqual(
      { ...sqlite.prepare('SELECT rating, comment FROM footprints LIMIT 1').get() },
      { rating: 4, comment: 'Still good' },
    );
  });

  test('counts recent failed unlocks per hashed IP and space', async () => {
    assert.equal(typeof store?.recordUnlockAttempt, 'function');
    await store.recordUnlockAttempt(db, spaceId, 'ip-a', false, '2026-08-30T09:59:00.000Z', 'a1');
    await store.recordUnlockAttempt(db, spaceId, 'ip-a', false, '2026-08-30T09:59:30.000Z', 'a2');
    await store.recordUnlockAttempt(db, spaceId, 'ip-b', false, '2026-08-30T09:59:40.000Z', 'a3');
    assert.equal(
      await store.countFailedUnlockAttempts(db, spaceId, 'ip-a', '2026-08-30T09:55:00.000Z'),
      2,
    );
  });

  test('counts authenticated write attempts through the audit stream', async () => {
    assert.equal(typeof store?.countRecentWriteAttempts, 'function');
    await store.auditEvent(
      db,
      { spaceId, memberId: 'toni' },
      { id: 'write-1', eventType: 'api.write', actorHash: 'actor-a', now: NOW },
    );
    assert.equal(
      await store.countRecentWriteAttempts(db, spaceId, 'actor-a', '2026-08-30T09:59:00.000Z'),
      1,
    );
    assert.equal(
      await store.countRecentWriteAttempts(db, spaceId, 'actor-b', '2026-08-30T09:59:00.000Z'),
      0,
    );
  });
});
