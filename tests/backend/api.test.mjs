import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, test } from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.{1,2}\//u.test(specifier) && !/\.[a-z]+$/iu.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const api = await import('../../lib/server/api.ts').catch(() => null);

class D1StatementAdapter {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }
  bind(...values) {
    return new D1StatementAdapter(this.database, this.sql, values);
  }
  async first() {
    return this.database.sqlite.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    return { success: true, results: this.database.sqlite.prepare(this.sql).all(...this.values) };
  }
  async run() {
    const result = this.database.sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class D1Adapter {
  constructor(sqlite) {
    this.sqlite = sqlite;
  }
  prepare(sql) {
    assert.equal(sql.replaceAll(/'[^']*'/g, '').includes(';'), false);
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

class PrivateR2 {
  constructor() {
    this.objects = new Map();
  }
  async put(key, value, options) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(await new Response(value).arrayBuffer());
    this.objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream' });
    return { key };
  }
  async get(key) {
    const value = this.objects.get(key);
    if (!value) return null;
    return {
      body: new Response(value.bytes).body,
      size: value.bytes.byteLength,
      httpMetadata: { contentType: value.contentType },
    };
  }
  async delete(key) {
    this.objects.delete(key);
  }
}

const migration = (
  await Promise.all([
    readFile(new URL('../../drizzle/0002_experience_initial.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0003_experience_media.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0004_experience_places.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../drizzle/0005_experience_place_localization.sql', import.meta.url), 'utf8'),
  ])
).join('\n');
const ORIGIN = 'https://experience.example';
const KEY = 'ninechars';
const CANONICAL_GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/%E5%85%AC%E5%9B%AD%E8%B7%AF%E7%89%9B%E8%82%89%E4%B8%B8/@23.354573,116.683161,17z';

function jsonRequest(path, method, body, headers = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function body(response) {
  return response.json();
}

describe('HTTP API integration', () => {
  let sqlite;
  let bindings;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(migration);
    bindings = { DB: new D1Adapter(sqlite), MEDIA: new PrivateR2(), AUTH_PEPPER_V1: 'test-pepper' };
  });

  test('first setup is origin-protected, never echoes the key, and seeds all 53 Experiences', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    const before = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/setup/status`),
      'setupStatus',
      {},
      bindings,
    );
    assert.deepEqual(await body(before), { configured: false });

    const withoutOrigin = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/setup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: KEY }),
      }),
      'setup',
      {},
      bindings,
    );
    assert.equal(withoutOrigin.status, 403);

    const setup = await api.handleApiRequest(
      jsonRequest('/api/setup', 'POST', { key: KEY }),
      'setup',
      {},
      bindings,
    );
    const setupBody = await body(setup);
    assert.equal(setup.status, 201);
    assert.deepEqual(setupBody, { configured: true });
    assert.equal(JSON.stringify(setupBody).includes(KEY), false);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM experiences').get().count, 53);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM experience_tags').get().count, 53);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM experiences WHERE place_id = 'shantou'").get().count, 53);
    assert.deepEqual(
      sqlite.prepare('SELECT id, name FROM places ORDER BY position, id').all().map((row) => ({ ...row })),
      [
        { id: 'shantou', name: '汕頭' },
        { id: 'guangzhou', name: '廣州' },
        { id: 'shenzhen', name: '深圳' },
      ],
    );
  });

  test('lists and adds shared Places, then scopes Experience creation and filtering by placeId', async () => {
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );

    const placesResponse = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/places`, { headers: { cookie } }),
      'places',
      {},
      bindings,
    );
    assert.deepEqual(await body(placesResponse), {
      places: [
        { id: 'shantou', name: '汕頭' },
        { id: 'guangzhou', name: '廣州' },
        { id: 'shenzhen', name: '深圳' },
      ],
    });

    const addedResponse = await api.handleApiRequest(
      jsonRequest('/api/places', 'POST', { name: '  潮州  ' }, authHeaders),
      'places',
      {},
      bindings,
    );
    const added = (await body(addedResponse)).place;
    assert.equal(addedResponse.status, 201);
    assert.equal(added.name, '潮州');
    assert.equal(typeof added.id, 'string');

    const createdResponse = await api.handleApiRequest(
      jsonRequest('/api/experiences', 'POST', { name: '广州散步', category: 'outdoor_nature', placeId: 'guangzhou' }, authHeaders),
      'experiences',
      {},
      bindings,
    );
    const experience = (await body(createdResponse)).experience;
    assert.equal(experience.placeId, 'guangzhou');

    const filteredResponse = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/experiences?placeId=guangzhou`, { headers: { cookie } }),
      'experiences',
      {},
      bindings,
    );
    assert.deepEqual((await body(filteredResponse)).experiences.map((item) => item.id), [experience.id]);

    const invalidPlace = await api.handleApiRequest(
      jsonRequest('/api/experiences', 'POST', { name: 'Nowhere', category: 'other', placeId: 'missing' }, authHeaders),
      'experiences',
      {},
      bindings,
    );
    assert.equal(invalidPlace.status, 404);
    assert.equal((await body(invalidPlace)).error.code, 'place_not_found');
  });

  test('unlock creates an opaque cookie, then CSRF-protected profile selection attributes the session', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);

    const wrong = await api.handleApiRequest(
      jsonRequest('/api/auth/unlock', 'POST', { key: 'this is not the key' }, { 'cf-connecting-ip': '203.0.113.5' }),
      'unlock',
      {},
      bindings,
    );
    assert.equal(wrong.status, 401);

    const unlocked = await api.handleApiRequest(
      jsonRequest('/api/auth/unlock', 'POST', { key: KEY }, { 'cf-connecting-ip': '203.0.113.5' }),
      'unlock',
      {},
      bindings,
    );
    const unlockedBody = await body(unlocked);
    assert.equal(unlocked.status, 200);
    assert.equal(unlockedBody.authenticated, true);
    assert.equal(unlockedBody.member, null);
    assert.equal(unlockedBody.members.length, 2);
    assert.ok(unlockedBody.csrfToken);
    const cookie = unlocked.headers.get('set-cookie').split(';')[0];
    assert.equal(cookie.includes(KEY), false);

    const missingCsrf = await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, { cookie }),
      'profile',
      {},
      bindings,
    );
    assert.equal(missingCsrf.status, 403);

    const selected = await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, {
        cookie,
        'x-csrf-token': unlockedBody.csrfToken,
      }),
      'profile',
      {},
      bindings,
    );
    assert.equal((await body(selected)).member.id, 'toni');
    const session = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/session`, { headers: { cookie } }),
      'session',
      {},
      bindings,
    );
    assert.equal((await body(session)).member.id, 'toni');
  });

  test('Quick Add returns a local partial Preview when canonical Google Maps fetch times out', async () => {
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new DOMException('The operation was aborted', 'AbortError');
    };
    try {
      const response = await api.handleApiRequest(
        jsonRequest('/api/experiences/preview', 'POST', { url: CANONICAL_GOOGLE_MAPS_URL }, authHeaders),
        'preview',
        {},
        bindings,
      );
      const payload = await body(response);
      assert.equal(response.status, 200);
      assert.equal(payload.status, 'partial');
      assert.equal(payload.title, '公园路牛肉丸');
      assert.deepEqual(payload.coordinates, { lat: 23.354573, lng: 116.683161, system: 'wgs84' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Experience, Footprint, Plan and Calendar routes use only the selected server session identity', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(
      jsonRequest('/api/auth/unlock', 'POST', { key: KEY }),
      'unlock',
      {},
      bindings,
    );
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );

    const created = await api.handleApiRequest(
      jsonRequest(
        '/api/experiences',
        'POST',
        { name: 'New place', category: 'other', spaceId: 'attacker-space', createdBy: 'rosalie' },
        authHeaders,
      ),
      'experiences',
      {},
      bindings,
    );
    const experience = (await body(created)).experience;
    assert.equal(created.status, 201);
    assert.equal(experience.createdBy.id, 'toni');
    assert.equal(sqlite.prepare('SELECT space_id FROM experiences WHERE id = ?').get(experience.id).space_id, 'toni-rosalie');

    const footprintResponse = await api.handleApiRequest(
      jsonRequest(
        `/api/experiences/${experience.id}/footprints`,
        'POST',
        { visitedOn: '2026-08-29', memberId: 'rosalie' },
        authHeaders,
      ),
      'footprints',
      { id: experience.id },
      bindings,
    );
    const footprintPayload = await body(footprintResponse);
    assert.equal(footprintPayload.footprint.member.id, 'toni');

    sqlite
      .prepare(
        'INSERT INTO media (id, space_id, footprint_id, object_key, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        'history-media',
        'toni-rosalie',
        footprintPayload.footprint.id,
        'toni-rosalie/private/history.webp',
        'image/webp',
        12,
        'history-digest',
        '2026-08-30T10:00:00.000Z',
      );

    const historyResponse = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/experiences/${experience.id}/footprints`, { headers: { cookie } }),
      'footprints',
      { id: experience.id },
      bindings,
    );
    const historyPayload = await body(historyResponse);
    assert.equal(historyResponse.status, 200);
    assert.equal(historyPayload.footprints.length, 1);
    assert.equal(historyPayload.footprints[0].member.id, 'toni');
    assert.deepEqual(historyPayload.footprints[0].media, [
      { id: 'history-media', url: '/api/media/history-media', mimeType: 'image/webp' },
    ]);
    assert.equal(JSON.stringify(historyPayload).includes('toni-rosalie/private/history.webp'), false);

    const calendarResponse = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/calendar`, { headers: { cookie } }),
      'calendar',
      {},
      bindings,
    );
    const calendarPayload = await body(calendarResponse);
    assert.equal(calendarPayload.entries[0].type, 'footprint');
    assert.equal(calendarPayload.entries[0].footprintId, historyPayload.footprints[0].id);
  });

  test('deleting Footprints is CSRF-protected, space-scoped, removes private media, and recomputes Experience state', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );

    const created = await api.handleApiRequest(
      jsonRequest('/api/experiences', 'POST', { name: 'Delete visits', category: 'other' }, authHeaders),
      'experiences',
      {},
      bindings,
    );
    const experienceId = (await body(created)).experience.id;
    const createFootprint = async (visitedOn) => {
      const response = await api.handleApiRequest(
        jsonRequest(`/api/experiences/${experienceId}/footprints`, 'POST', { visitedOn }, authHeaders),
        'footprints',
        { id: experienceId },
        bindings,
      );
      return (await body(response)).footprint.id;
    };
    const olderId = await createFootprint('2026-08-20');
    const newerId = await createFootprint('2026-08-25');
    const objectKey = `toni-rosalie/${newerId}/private.webp`;
    await bindings.MEDIA.put(objectKey, new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'image/webp' },
    });
    sqlite
      .prepare(
        'INSERT INTO media (id, space_id, footprint_id, object_key, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run('delete-media', 'toni-rosalie', newerId, objectKey, 'image/webp', 3, 'digest', '2026-08-30T10:00:00.000Z');

    const withoutOrigin = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/footprints/${newerId}`, {
        method: 'DELETE',
        headers: authHeaders,
      }),
      'footprint',
      { id: newerId },
      bindings,
    );
    assert.equal(withoutOrigin.status, 403);

    const withoutCsrf = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/footprints/${newerId}`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, cookie },
      }),
      'footprint',
      { id: newerId },
      bindings,
    );
    assert.equal(withoutCsrf.status, 403);

    const foreignSpace = 'foreign-delete-space';
    sqlite
      .prepare(
        'INSERT INTO spaces (id, name, key_salt, key_hash, key_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(foreignSpace, 'Foreign', 'salt', 'hash', 10000, '2026-08-30T10:00:00.000Z', '2026-08-30T10:00:00.000Z');
    sqlite
      .prepare('INSERT INTO members (id, space_id, handle, display_name, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('foreign-toni', foreignSpace, 'toni', 'Toni', '2026-08-30T10:00:00.000Z');
    sqlite
      .prepare(
        `INSERT INTO experiences (id, space_id, name, category, location_status, recommendation_status, experience_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('foreign-exp', foreignSpace, 'Foreign', 'other', 'pending', 'normal', 'footprint', '2026-08-30T10:00:00.000Z', '2026-08-30T10:00:00.000Z');
    sqlite
      .prepare(
        'INSERT INTO footprints (id, space_id, experience_id, member_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('foreign-footprint', foreignSpace, 'foreign-exp', 'foreign-toni', '2026-08-20', '2026-08-30T10:00:00.000Z');
    const foreignDelete = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/footprints/foreign-footprint`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, ...authHeaders },
      }),
      'footprint',
      { id: 'foreign-footprint' },
      bindings,
    );
    assert.equal(foreignDelete.status, 404);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM footprints WHERE id = ?').get('foreign-footprint').count, 1);

    const firstDelete = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/footprints/${newerId}`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, ...authHeaders },
      }),
      'footprint',
      { id: newerId },
      bindings,
    );
    const firstPayload = await body(firstDelete);
    assert.equal(firstDelete.status, 200);
    assert.equal(firstPayload.deletedFootprintId, newerId);
    assert.equal(firstPayload.experience.id, experienceId);
    assert.equal(firstPayload.experience.state, 'footprint');
    assert.equal(firstPayload.experience.footprintCount, 1);
    assert.equal(firstPayload.experience.lastVisitedOn, '2026-08-20');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM media WHERE id = ?').get('delete-media').count, 0);
    assert.equal(bindings.MEDIA.objects.has(objectKey), false);

    const lastDelete = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/footprints/${olderId}`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, ...authHeaders },
      }),
      'footprint',
      { id: olderId },
      bindings,
    );
    const lastPayload = await body(lastDelete);
    assert.equal(lastDelete.status, 200);
    assert.equal(lastPayload.experience.state, 'wishlist');
    assert.equal(lastPayload.experience.footprintCount, 0);
    assert.equal(lastPayload.experience.lastVisitedOn, null);
  });

  test('private media accepts valid images, enforces eight per Footprint, and requires a session to read', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );
    const experienceId = sqlite.prepare('SELECT id FROM experiences ORDER BY id LIMIT 1').get().id;
    const footprintResponse = await api.handleApiRequest(
      jsonRequest(`/api/experiences/${experienceId}/footprints`, 'POST', { visitedOn: '2026-08-29' }, authHeaders),
      'footprints',
      { id: experienceId },
      bindings,
    );
    const footprintId = (await body(footprintResponse)).footprint.id;
    let mediaId;
    for (let index = 0; index < 9; index += 1) {
      const form = new FormData();
      form.set(
        'file',
        new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], `image-${index}.png`, {
          type: 'image/png',
        }),
      );
      const response = await api.handleApiRequest(
        new Request(`${ORIGIN}/api/footprints/${footprintId}/media`, {
          method: 'POST',
          headers: { origin: ORIGIN, ...authHeaders },
          body: form,
        }),
        'mediaUpload',
        { id: footprintId },
        bindings,
      );
      if (index < 8) {
        assert.equal(response.status, 201);
        mediaId = (await body(response)).media.id;
      } else {
        assert.equal(response.status, 409);
      }
    }

    const anonymous = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/media/${mediaId}`),
      'media',
      { id: mediaId },
      bindings,
    );
    assert.equal(anonymous.status, 401);
    const image = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/media/${mediaId}`, { headers: { cookie } }),
      'media',
      { id: mediaId },
      bindings,
    );
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  test('an Experience cover is uploaded to private R2, returned on the card, and replaced one-to-one', async () => {
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );
    const experienceId = sqlite.prepare('SELECT id FROM experiences ORDER BY id LIMIT 1').get().id;

    const upload = async (name, bytes, type) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], name, { type }));
      return api.handleApiRequest(
        new Request(`${ORIGIN}/api/experiences/${experienceId}/media`, {
          method: 'POST',
          headers: { origin: ORIGIN, ...authHeaders },
          body: form,
        }),
        'experienceMediaUpload',
        { id: experienceId },
        bindings,
      );
    };

    const first = await upload('first.png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png');
    assert.equal(first.status, 201);
    const firstPayload = await body(first);
    assert.match(firstPayload.experience.imageUrl, /^\/api\/media\//u);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM experience_media WHERE experience_id = ?').get(experienceId).count, 1);
    assert.equal(bindings.MEDIA.objects.size, 1);

    const second = await upload('second.jpg', [0xff, 0xd8, 0xff, 0xd9], 'image/jpeg');
    assert.equal(second.status, 200);
    const secondPayload = await body(second);
    assert.notEqual(secondPayload.experience.imageUrl, firstPayload.experience.imageUrl);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM experience_media WHERE experience_id = ?').get(experienceId).count, 1);
    assert.equal(bindings.MEDIA.objects.size, 1);

    const mediaId = secondPayload.media.id;
    const anonymous = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/media/${mediaId}`),
      'media',
      { id: mediaId },
      bindings,
    );
    assert.equal(anonymous.status, 401);
    const image = await api.handleApiRequest(
      new Request(`${ORIGIN}/api/media/${mediaId}`, { headers: { cookie } }),
      'media',
      { id: mediaId },
      bindings,
    );
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
  });

  test('media route accepts 3.1 MiB and exact 10 MiB images while rejecting larger files', async () => {
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );
    const experienceId = sqlite.prepare('SELECT id FROM experiences ORDER BY id LIMIT 1').get().id;
    const footprintResponse = await api.handleApiRequest(
      jsonRequest(`/api/experiences/${experienceId}/footprints`, 'POST', { visitedOn: '2026-08-29' }, authHeaders),
      'footprints',
      { id: experienceId },
      bindings,
    );
    const footprintId = (await body(footprintResponse)).footprint.id;
    const uploadPng = async (size, name) => {
      const bytes = new Uint8Array(size);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const form = new FormData();
      form.set('file', new File([bytes], name, { type: 'image/png' }));
      return api.handleApiRequest(
        new Request(`${ORIGIN}/api/footprints/${footprintId}/media`, {
          method: 'POST',
          headers: { origin: ORIGIN, ...authHeaders },
          body: form,
        }),
        'mediaUpload',
        { id: footprintId },
        bindings,
      );
    };

    assert.equal((await uploadPng(3_108_096, 'og-experience.png')).status, 201);
    assert.equal((await uploadPng(10 * 1024 * 1024, 'ten-mib.png')).status, 201);
    assert.notEqual((await uploadPng(10 * 1024 * 1024 + 1, 'too-large.png')).status, 201);
    assert.equal(bindings.MEDIA.objects.size, 2);
  });

  test('rejects future Footprints and throttles all authenticated writes at one choke point', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken, 'cf-connecting-ip': '203.0.113.8' };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );
    const experienceId = sqlite.prepare('SELECT id FROM experiences ORDER BY id LIMIT 1').get().id;
    const future = await api.handleApiRequest(
      jsonRequest(`/api/experiences/${experienceId}/footprints`, 'POST', { visitedOn: '2099-01-01' }, authHeaders),
      'footprints',
      { id: experienceId },
      bindings,
    );
    assert.equal(future.status, 400);

    let response;
    for (let index = 0; index < 60; index += 1) {
      response = await api.handleApiRequest(
        jsonRequest('/api/auth/profile', 'POST', { memberId: index % 2 ? 'toni' : 'rosalie' }, authHeaders),
        'profile',
        {},
        bindings,
      );
      if (response.status === 429) break;
    }
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
  });

  test('rejects future visit dates in legacy imports without creating a Footprint', async () => {
    assert.equal(typeof api?.handleApiRequest, 'function');
    await api.handleApiRequest(jsonRequest('/api/setup', 'POST', { key: KEY }), 'setup', {}, bindings);
    const unlock = await api.handleApiRequest(jsonRequest('/api/auth/unlock', 'POST', { key: KEY }), 'unlock', {}, bindings);
    const unlocked = await body(unlock);
    const cookie = unlock.headers.get('set-cookie').split(';')[0];
    const authHeaders = { cookie, 'x-csrf-token': unlocked.csrfToken };
    await api.handleApiRequest(
      jsonRequest('/api/auth/profile', 'POST', { memberId: 'toni' }, authHeaders),
      'profile',
      {},
      bindings,
    );

    const response = await api.handleApiRequest(
      jsonRequest(
        '/api/import/legacy',
        'POST',
        { items: [{ experienceId: 'food-01', visitedOn: '2099-01-01' }] },
        authHeaders,
      ),
      'legacyImport',
      {},
      bindings,
    );

    assert.equal(response.status, 400);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM footprints').get().count, 0);
  });
});
