export type SessionContext = {
  tokenDigest: string;
  spaceId: string;
  memberId: string | null;
  csrfTokenDigest: string;
  expiresAt: string;
};

export type Member = {
  id: string;
  handle: 'toni' | 'rosalie';
  name: string;
  avatarUrl: string | null;
};

export type Place = {
  id: string;
  name: string;
};

export type AuthenticatedContext = { spaceId: string; memberId: string };

type D1 = Pick<D1Database, 'prepare' | 'batch'>;

export class StoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'StoreError';
    this.status = status;
    this.code = code;
  }
}

type Row = Record<string, unknown>;

function stringValue(value: unknown): string {
  return String(value ?? '');
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function changes(result: D1Result): number {
  return Number(result.meta?.changes ?? 0);
}

async function allRows(db: D1, sql: string, values: unknown[] = []): Promise<Row[]> {
  const result = await db.prepare(sql).bind(...values).all<Row>();
  return result.results as Row[];
}

async function firstRow(db: D1, sql: string, values: unknown[] = []): Promise<Row | null> {
  return db.prepare(sql).bind(...values).first<Row>();
}

export async function getConfiguredSpace(db: D1): Promise<{
  id: string;
  salt: string;
  hash: string;
  iterations: number;
} | null> {
  const row = await firstRow(
    db,
    'SELECT id, key_salt, key_hash, key_iterations FROM spaces WHERE id = ? LIMIT 1',
    ['toni-rosalie'],
  );
  return row
    ? {
        id: stringValue(row.id),
        salt: stringValue(row.key_salt),
        hash: stringValue(row.key_hash),
        iterations: Number(row.key_iterations),
      }
    : null;
}

type InitialExperienceSeed = {
  id: string;
  name: string;
  category: string;
  address: string;
  coordinates?: readonly [number, number];
  coordinateSystem: string;
  locationStatus: string;
  locationNote?: string;
  recommendationStatus: string;
  state: string;
  tip?: string;
  image?: string;
};

const INITIAL_PLACES = [
  { id: 'shantou', name: '汕頭', position: 0 },
  { id: 'guangzhou', name: '廣州', position: 1 },
  { id: 'shenzhen', name: '深圳', position: 2 },
] as const;

function initialMembershipStatements(
  db: D1,
  verifier: { salt: string; hash: string; iterations: number },
  now: string,
): D1PreparedStatement[] {
  return [
    db
      .prepare(
        'INSERT INTO spaces (id, name, key_salt, key_hash, key_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind('toni-rosalie', 'Toni & Rosalie', verifier.salt, verifier.hash, verifier.iterations, now, now),
    db
      .prepare(
        'INSERT INTO members (id, space_id, handle, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind('toni', 'toni-rosalie', 'toni', 'Toni', now),
    db
      .prepare(
        'INSERT INTO members (id, space_id, handle, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind('rosalie', 'toni-rosalie', 'rosalie', 'Rosalie', now),
  ];
}

function initialPlaceStatements(db: D1, spaceId: string, now: string): D1PreparedStatement[] {
  return INITIAL_PLACES.map((place) =>
    db
      .prepare(
        'INSERT OR IGNORE INTO places (space_id, id, name, position, created_by_member_id, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)',
      )
      .bind(spaceId, place.id, place.name, place.position, now, now),
  );
}

function initialExperienceStatements(
  db: D1,
  spaceId: string,
  seeds: InitialExperienceSeed[],
  now: string,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  const experienceRow = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?, ?)';
  for (let offset = 0; offset < seeds.length; offset += 5) {
    const chunk = seeds.slice(offset, offset + 5);
    const values = chunk.flatMap((seed) => [
      seed.id,
      spaceId,
      'shantou',
      seed.name,
      'food_drink',
      seed.address,
      seed.coordinates?.[0] ?? null,
      seed.coordinates?.[1] ?? null,
      seed.coordinates ? seed.coordinateSystem : null,
      seed.locationStatus,
      seed.locationNote ?? null,
      seed.recommendationStatus,
      seed.state,
      seed.tip ?? null,
      seed.image ?? null,
      `initial:${seed.id}`,
      now,
      now,
    ]);
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO experiences (id, space_id, place_id, name, category, address, latitude, longitude, coordinate_system, location_status, location_note, recommendation_status, experience_state, source_url, source_kind, opening_hours, notes, image_url, created_by_member_id, legacy_key, created_at, updated_at)
           VALUES ${chunk.map(() => experienceRow).join(', ')}`,
        )
        .bind(...values),
    );
  }
  for (let offset = 0; offset < seeds.length; offset += 30) {
    const chunk = seeds.slice(offset, offset + 30);
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO experience_tags (space_id, experience_id, tag) VALUES ${chunk
            .map(() => '(?, ?, ?)')
            .join(', ')}`,
        )
        .bind(...chunk.flatMap((seed) => [spaceId, seed.id, seed.category])),
    );
  }
  return statements;
}

export async function createInitialSpace(
  db: D1,
  verifier: { salt: string; hash: string; iterations: number },
  now: string,
): Promise<void> {
  const statements = [
    ...initialMembershipStatements(db, verifier, now),
    ...initialPlaceStatements(db, 'toni-rosalie', now),
  ];
  try {
    await db.batch(statements);
  } catch {
    throw new StoreError('already_configured', 'The shared space is already configured', 409);
  }
}

export async function seedInitialExperiences(
  db: D1,
  spaceId: string,
  seeds: InitialExperienceSeed[],
  now: string,
): Promise<void> {
  const statements = [
    ...initialPlaceStatements(db, spaceId, now),
    ...initialExperienceStatements(db, spaceId, seeds, now),
  ];
  if (statements.length > 0) await db.batch(statements);
}

export async function initializeSpaceWithSeeds(
  db: D1,
  verifier: { salt: string; hash: string; iterations: number },
  seeds: InitialExperienceSeed[],
  meta: { now: string; auditId: string },
): Promise<void> {
  const statements = [
    ...initialMembershipStatements(db, verifier, meta.now),
    ...initialPlaceStatements(db, 'toni-rosalie', meta.now),
    ...initialExperienceStatements(db, 'toni-rosalie', seeds, meta.now),
    db
      .prepare(
        'INSERT INTO audit_events (id, space_id, member_id, event_type, entity_type, entity_id, actor_hash, metadata_json, created_at) VALUES (?, ?, NULL, ?, NULL, NULL, NULL, ?, ?)',
      )
      .bind(
        meta.auditId,
        'toni-rosalie',
        'space.setup',
        JSON.stringify({ seeded: seeds.length }),
        meta.now,
      ),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    if (await getConfiguredSpace(db)) {
      throw new StoreError('already_configured', 'The shared space is already configured', 409);
    }
    throw error;
  }
}

export async function listMembers(db: D1, spaceId: string): Promise<Member[]> {
  const rows = await allRows(
    db,
    'SELECT id, handle, display_name, avatar_key FROM members WHERE space_id = ? ORDER BY CASE handle WHEN ? THEN 0 ELSE 1 END',
    [spaceId, 'toni'],
  );
  return rows.map((row) => ({
    id: stringValue(row.id),
    handle: stringValue(row.handle) as Member['handle'],
    name: stringValue(row.display_name),
    avatarUrl: row.avatar_key ? `/api/media/avatar/${encodeURIComponent(stringValue(row.id))}` : null,
  }));
}

export async function seedInitialPlaces(db: D1, spaceId: string, now: string): Promise<void> {
  await db.batch(initialPlaceStatements(db, spaceId, now));
}

export async function listPlaces(db: D1, context: { spaceId: string }): Promise<Place[]> {
  const rows = await allRows(
    db,
    'SELECT id, name FROM places WHERE space_id = ? ORDER BY position, created_at, id',
    [context.spaceId],
  );
  return rows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name) }));
}

async function requirePlace(db: D1, context: { spaceId: string }, id: string): Promise<Place> {
  const row = await firstRow(db, 'SELECT id, name FROM places WHERE space_id = ? AND id = ? LIMIT 1', [
    context.spaceId,
    id,
  ]);
  if (!row) throw new StoreError('place_not_found', 'Place not found', 404);
  return { id: stringValue(row.id), name: stringValue(row.name) };
}

export async function createPlace(
  db: D1,
  context: AuthenticatedContext,
  input: { name: string },
  meta: { id: string; now: string },
): Promise<Place> {
  const duplicate = await firstRow(db, 'SELECT id FROM places WHERE space_id = ? AND name = ? LIMIT 1', [
    context.spaceId,
    input.name,
  ]);
  if (duplicate) throw new StoreError('place_exists', 'Place already exists', 409);
  const positionRow = await firstRow(
    db,
    'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM places WHERE space_id = ?',
    [context.spaceId],
  );
  try {
    await db
      .prepare(
        'INSERT INTO places (space_id, id, name, position, created_by_member_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        context.spaceId,
        meta.id,
        input.name,
        Number(positionRow?.next_position ?? 0),
        context.memberId,
        meta.now,
        meta.now,
      )
      .run();
  } catch (error) {
    const raced = await firstRow(db, 'SELECT id FROM places WHERE space_id = ? AND name = ? LIMIT 1', [
      context.spaceId,
      input.name,
    ]);
    if (raced) throw new StoreError('place_exists', 'Place already exists', 409);
    throw error;
  }
  return { id: meta.id, name: input.name };
}

export async function createSessionRecord(
  db: D1,
  input: {
    digest: string;
    spaceId: string;
    csrfTokenDigest: string;
    expiresAt: string;
    now: string;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO sessions (token_digest, space_id, member_id, csrf_token_digest, expires_at, created_at, last_seen_at) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    )
    .bind(input.digest, input.spaceId, input.csrfTokenDigest, input.expiresAt, input.now, input.now)
    .run();
}

export async function loadSession(db: D1, tokenDigest: string, now: string): Promise<SessionContext | null> {
  const row = await firstRow(
    db,
    `SELECT token_digest, space_id, member_id, csrf_token_digest, expires_at
     FROM sessions WHERE token_digest = ? AND expires_at > ? LIMIT 1`,
    [tokenDigest, now],
  );
  return row
    ? {
        tokenDigest: stringValue(row.token_digest),
        spaceId: stringValue(row.space_id),
        memberId: nullableString(row.member_id),
        csrfTokenDigest: stringValue(row.csrf_token_digest),
        expiresAt: stringValue(row.expires_at),
      }
    : null;
}

export async function selectSessionMember(
  db: D1,
  session: SessionContext,
  handle: 'toni' | 'rosalie',
  now: string,
): Promise<Member> {
  const row = await firstRow(
    db,
    'SELECT id, handle, display_name, avatar_key FROM members WHERE space_id = ? AND handle = ? LIMIT 1',
    [session.spaceId, handle],
  );
  if (!row) throw new StoreError('member_not_found', 'Member not found', 404);
  const result = await db
    .prepare(
      'UPDATE sessions SET member_id = ?, last_seen_at = ? WHERE token_digest = ? AND space_id = ? AND expires_at > ?',
    )
    .bind(row.id, now, session.tokenDigest, session.spaceId, now)
    .run();
  if (changes(result) !== 1) throw new StoreError('session_expired', 'Session expired', 401);
  return {
    id: stringValue(row.id),
    handle: stringValue(row.handle) as Member['handle'],
    name: stringValue(row.display_name),
    avatarUrl: row.avatar_key ? `/api/media/avatar/${encodeURIComponent(stringValue(row.id))}` : null,
  };
}

export async function deleteSession(db: D1, tokenDigest: string, spaceId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_digest = ? AND space_id = ?').bind(tokenDigest, spaceId).run();
}

export async function rotateSpaceKey(
  db: D1,
  session: SessionContext,
  verifier: { salt: string; hash: string; iterations: number },
  now: string,
): Promise<void> {
  const statements = [
    db
      .prepare(
        'UPDATE spaces SET key_salt = ?, key_hash = ?, key_iterations = ?, updated_at = ? WHERE id = ?',
      )
      .bind(verifier.salt, verifier.hash, verifier.iterations, now, session.spaceId),
    db
      .prepare('DELETE FROM sessions WHERE space_id = ? AND token_digest <> ?')
      .bind(session.spaceId, session.tokenDigest),
  ];
  await db.batch(statements);
}

function parseTags(row: Row): string[] {
  try {
    const value = JSON.parse(stringValue(row.tags_json || '[]')) as unknown;
    return Array.isArray(value) ? value.map(String).sort((left, right) => left.localeCompare(right)) : [];
  } catch {
    return [];
  }
}

function mapExperience(row: Row) {
  const hasCoordinates = row.latitude !== null && row.latitude !== undefined;
  const coverMediaId = nullableString(row.cover_media_id);
  return {
    id: stringValue(row.id),
    placeId: nullableString(row.place_id),
    name: stringValue(row.name),
    category: stringValue(row.category),
    tags: parseTags(row),
    address: nullableString(row.address),
    coordinates: hasCoordinates
      ? {
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          system: stringValue(row.coordinate_system),
        }
      : null,
    locationStatus: stringValue(row.location_status),
    locationNote: nullableString(row.location_note),
    recommendationStatus: stringValue(row.recommendation_status),
    state: stringValue(row.experience_state),
    sourceUrl: nullableString(row.source_url),
    openingHours: nullableString(row.opening_hours),
    notes: nullableString(row.notes),
    imageUrl: coverMediaId
      ? `/api/media/${encodeURIComponent(coverMediaId)}`
      : nullableString(row.image_url),
    createdBy: row.created_by_id
      ? { id: stringValue(row.created_by_id), name: stringValue(row.created_by_name) }
      : null,
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    footprintCount: Number(row.footprint_count ?? 0),
    lastVisitedOn: nullableString(row.last_visited_on),
  };
}

const EXPERIENCE_SELECT = `SELECT e.*,
  creator.id AS created_by_id,
  creator.display_name AS created_by_name,
  (SELECT COALESCE(json_group_array(et.tag), '[]') FROM experience_tags et WHERE et.space_id = e.space_id AND et.experience_id = e.id) AS tags_json,
  (SELECT em.id FROM experience_media em WHERE em.space_id = e.space_id AND em.experience_id = e.id LIMIT 1) AS cover_media_id,
  (SELECT COUNT(*) FROM footprints f WHERE f.space_id = e.space_id AND f.experience_id = e.id) AS footprint_count,
  (SELECT MAX(f.visited_on) FROM footprints f WHERE f.space_id = e.space_id AND f.experience_id = e.id) AS last_visited_on
FROM experiences e
LEFT JOIN members creator ON creator.id = e.created_by_member_id AND creator.space_id = e.space_id`;

export async function getExperience(db: D1, context: { spaceId: string }, id: string) {
  const row = await firstRow(db, `${EXPERIENCE_SELECT} WHERE e.id = ? AND e.space_id = ? LIMIT 1`, [
    id,
    context.spaceId,
  ]);
  if (!row) throw new StoreError('experience_not_found', 'Experience not found', 404);
  return mapExperience(row);
}

export async function listExperiences(
  db: D1,
  context: { spaceId: string },
  filters: { state?: string; category?: string; tag?: string; search?: string; placeId?: string } = {},
) {
  const where = ['e.space_id = ?'];
  const values: unknown[] = [context.spaceId];
  if (filters.placeId) {
    where.push('e.place_id = ?');
    values.push(filters.placeId);
  }
  if (filters.state && filters.state !== 'all') {
    where.push('e.experience_state = ?');
    values.push(filters.state);
  }
  if (filters.category) {
    where.push('e.category = ?');
    values.push(filters.category);
  }
  if (filters.tag) {
    where.push('EXISTS (SELECT 1 FROM experience_tags filter_tag WHERE filter_tag.space_id = e.space_id AND filter_tag.experience_id = e.id AND filter_tag.tag = ?)');
    values.push(filters.tag);
  }
  if (filters.search) {
    where.push("(LOWER(e.name) LIKE ? OR LOWER(COALESCE(e.address, '')) LIKE ?)");
    const search = `%${filters.search.toLowerCase()}%`;
    values.push(search, search);
  }
  const rows = await allRows(
    db,
    `${EXPERIENCE_SELECT} WHERE ${where.join(' AND ')} ORDER BY e.updated_at DESC, e.id`,
    values,
  );
  return rows.map(mapExperience);
}

type ExperienceWrite = {
  placeId?: string;
  name: string;
  category: string;
  address: string | null;
  coordinates: { lat: number; lng: number; system: string } | null;
  locationStatus: string;
  locationNote: string | null;
  recommendationStatus: string;
  state?: string;
  sourceUrl: string | null;
  sourceKind: string | null;
  openingHours: string | null;
  notes: string | null;
  imageUrl?: string | null;
  tags: string[];
};

export async function createExperience(
  db: D1,
  context: AuthenticatedContext,
  input: ExperienceWrite,
  meta: { id: string; now: string; legacyKey?: string | null },
) {
  if (input.placeId !== undefined) await requirePlace(db, context, input.placeId);
  const statements = [
    db
      .prepare(
        `INSERT INTO experiences (id, space_id, place_id, name, category, address, latitude, longitude, coordinate_system, location_status, location_note, recommendation_status, experience_state, source_url, source_kind, opening_hours, notes, image_url, created_by_member_id, legacy_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        meta.id,
        context.spaceId,
        input.placeId ?? null,
        input.name,
        input.category,
        input.address,
        input.coordinates?.lat ?? null,
        input.coordinates?.lng ?? null,
        input.coordinates?.system ?? null,
        input.locationStatus,
        input.locationNote,
        input.recommendationStatus,
        input.state ?? 'wishlist',
        input.sourceUrl,
        input.sourceKind,
        input.openingHours,
        input.notes,
        input.imageUrl ?? null,
        context.memberId,
        meta.legacyKey ?? null,
        meta.now,
        meta.now,
      ),
    ...[...new Set(input.tags)].sort().map((tag) =>
      db
        .prepare('INSERT INTO experience_tags (space_id, experience_id, tag) VALUES (?, ?, ?)')
        .bind(context.spaceId, meta.id, tag),
    ),
  ];
  await db.batch(statements);
  return getExperience(db, context, meta.id);
}

export async function updateExperience(
  db: D1,
  context: AuthenticatedContext,
  id: string,
  patch: Partial<ExperienceWrite>,
  meta: { now: string },
) {
  await getExperience(db, context, id);
  if (patch.placeId !== undefined) await requirePlace(db, context, patch.placeId);
  const columns: string[] = [];
  const values: unknown[] = [];
  const assign = (column: string, value: unknown) => {
    columns.push(`${column} = ?`);
    values.push(value);
  };
  if (patch.placeId !== undefined) assign('place_id', patch.placeId);
  if (patch.name !== undefined) assign('name', patch.name);
  if (patch.category !== undefined) assign('category', patch.category);
  if (patch.address !== undefined) assign('address', patch.address);
  if (patch.coordinates !== undefined) {
    assign('latitude', patch.coordinates?.lat ?? null);
    assign('longitude', patch.coordinates?.lng ?? null);
    assign('coordinate_system', patch.coordinates?.system ?? null);
  }
  if (patch.locationStatus !== undefined) assign('location_status', patch.locationStatus);
  if (patch.locationNote !== undefined) assign('location_note', patch.locationNote);
  if (patch.recommendationStatus !== undefined) assign('recommendation_status', patch.recommendationStatus);
  if (patch.state !== undefined) assign('experience_state', patch.state);
  if (patch.sourceUrl !== undefined) assign('source_url', patch.sourceUrl);
  if (patch.sourceKind !== undefined) assign('source_kind', patch.sourceKind);
  if (patch.openingHours !== undefined) assign('opening_hours', patch.openingHours);
  if (patch.notes !== undefined) assign('notes', patch.notes);
  if (patch.imageUrl !== undefined) assign('image_url', patch.imageUrl);
  assign('updated_at', meta.now);

  const statements: D1PreparedStatement[] = [
    db
      .prepare(`UPDATE experiences SET ${columns.join(', ')} WHERE id = ? AND space_id = ?`)
      .bind(...values, id, context.spaceId),
  ];
  if (patch.tags !== undefined) {
    statements.push(
      db.prepare('DELETE FROM experience_tags WHERE experience_id = ? AND space_id = ?').bind(id, context.spaceId),
      ...[...new Set(patch.tags)].sort().map((tag) =>
        db
          .prepare('INSERT INTO experience_tags (space_id, experience_id, tag) VALUES (?, ?, ?)')
          .bind(context.spaceId, id, tag),
      ),
    );
  }
  await db.batch(statements);
  return getExperience(db, context, id);
}

export async function deleteExperience(db: D1, context: AuthenticatedContext, id: string): Promise<void> {
  const result = await db
    .prepare('DELETE FROM experiences WHERE id = ? AND space_id = ?')
    .bind(id, context.spaceId)
    .run();
  if (changes(result) !== 1) throw new StoreError('experience_not_found', 'Experience not found', 404);
}

type FootprintMedia = { id: string; url: string; mimeType: string };

function mapFootprint(row: Row, media: FootprintMedia[] = []) {
  return {
    id: stringValue(row.id),
    experienceId: stringValue(row.experience_id),
    visitedOn: stringValue(row.visited_on),
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    comment: nullableString(row.comment),
    member: { id: stringValue(row.member_id), name: stringValue(row.member_name) },
    media,
  };
}

export async function listExperienceFootprints(
  db: D1,
  context: { spaceId: string },
  experienceId: string,
) {
  await getExperience(db, context, experienceId);
  const rows = await allRows(
    db,
    `SELECT f.*, m.display_name AS member_name FROM footprints f
     JOIN members m ON m.id = f.member_id AND m.space_id = f.space_id
     WHERE f.experience_id = ? AND f.space_id = ?
     ORDER BY f.visited_on DESC, f.created_at DESC, f.id DESC`,
    [experienceId, context.spaceId],
  );
  const mediaRows = await allRows(
    db,
    `SELECT media.id, media.footprint_id, media.mime_type FROM media
     JOIN footprints f ON f.id = media.footprint_id AND f.space_id = media.space_id
     WHERE f.experience_id = ? AND media.space_id = ?
     ORDER BY media.created_at, media.id`,
    [experienceId, context.spaceId],
  );
  const mediaByFootprint = new Map<string, FootprintMedia[]>();
  for (const row of mediaRows) {
    const footprintId = stringValue(row.footprint_id);
    const items = mediaByFootprint.get(footprintId) ?? [];
    items.push({
      id: stringValue(row.id),
      url: `/api/media/${encodeURIComponent(stringValue(row.id))}`,
      mimeType: stringValue(row.mime_type),
    });
    mediaByFootprint.set(footprintId, items);
  }
  return rows.map((row) => mapFootprint(row, mediaByFootprint.get(stringValue(row.id)) ?? []));
}

async function getFootprint(db: D1, context: { spaceId: string }, id: string) {
  const row = await firstRow(
    db,
    `SELECT f.*, m.display_name AS member_name FROM footprints f
     JOIN members m ON m.id = f.member_id AND m.space_id = f.space_id
     WHERE f.id = ? AND f.space_id = ? LIMIT 1`,
    [id, context.spaceId],
  );
  if (!row) throw new StoreError('footprint_not_found', 'Footprint not found', 404);
  return mapFootprint(row);
}

export async function createFootprint(
  db: D1,
  context: AuthenticatedContext,
  experienceId: string,
  input: { visitedOn: string; rating: number | null; comment: string | null },
  meta: { id: string; now: string; legacyKey?: string | null },
) {
  await getExperience(db, context, experienceId);
  await db.batch([
    db
      .prepare(
        'INSERT INTO footprints (id, space_id, experience_id, member_id, visited_on, rating, comment, legacy_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        meta.id,
        context.spaceId,
        experienceId,
        context.memberId,
        input.visitedOn,
        input.rating,
        input.comment,
        meta.legacyKey ?? null,
        meta.now,
      ),
    db
      .prepare('UPDATE experiences SET experience_state = ?, updated_at = ? WHERE id = ? AND space_id = ?')
      .bind('footprint', meta.now, experienceId, context.spaceId),
  ]);
  return getFootprint(db, context, meta.id);
}

export async function deleteFootprint(
  db: D1,
  context: AuthenticatedContext,
  id: string,
  meta: { now: string },
  deleteMediaObjects?: (objectKeys: string[]) => Promise<void>,
) {
  const footprint = await firstRow(
    db,
    'SELECT experience_id FROM footprints WHERE id = ? AND space_id = ? LIMIT 1',
    [id, context.spaceId],
  );
  if (!footprint) throw new StoreError('footprint_not_found', 'Footprint not found', 404);

  const experienceId = stringValue(footprint.experience_id);
  const mediaRows = await allRows(
    db,
    'SELECT object_key FROM media WHERE footprint_id = ? AND space_id = ? ORDER BY id',
    [id, context.spaceId],
  );
  const mediaObjectKeys = mediaRows.map((row) => stringValue(row.object_key));
  if (deleteMediaObjects && mediaObjectKeys.length > 0) {
    await deleteMediaObjects(mediaObjectKeys);
  }

  const results = await db.batch([
    db.prepare('DELETE FROM media WHERE footprint_id = ? AND space_id = ?').bind(id, context.spaceId),
    db.prepare('DELETE FROM footprints WHERE id = ? AND space_id = ?').bind(id, context.spaceId),
    db
      .prepare(
        `UPDATE experiences
         SET experience_state = CASE
           WHEN EXISTS (SELECT 1 FROM footprints WHERE space_id = ? AND experience_id = ?) THEN ?
           ELSE ?
         END,
         updated_at = ?
         WHERE id = ? AND space_id = ?`,
      )
      .bind(
        context.spaceId,
        experienceId,
        'footprint',
        'wishlist',
        meta.now,
        experienceId,
        context.spaceId,
      ),
  ]);
  if (changes(results[1]) !== 1) throw new StoreError('footprint_not_found', 'Footprint not found', 404);

  return {
    deletedFootprintId: id,
    mediaObjectKeys,
    experience: await getExperience(db, context, experienceId),
  };
}

function mapPlan(row: Row) {
  return {
    id: stringValue(row.id),
    experienceId: stringValue(row.experience_id),
    scheduledFor: stringValue(row.scheduled_for),
    note: nullableString(row.note),
    status: stringValue(row.status),
    createdBy: { id: stringValue(row.created_by_id), name: stringValue(row.created_by_name) },
    targetMember: { id: stringValue(row.target_id), name: stringValue(row.target_name) },
    createdAt: stringValue(row.created_at),
  };
}

async function getPlan(db: D1, context: { spaceId: string }, id: string) {
  const row = await firstRow(
    db,
    `SELECT p.*, creator.id AS created_by_id, creator.display_name AS created_by_name,
       target.id AS target_id, target.display_name AS target_name
     FROM plans p
     JOIN members creator ON creator.id = p.created_by_member_id AND creator.space_id = p.space_id
     JOIN members target ON target.id = p.target_member_id AND target.space_id = p.space_id
     WHERE p.id = ? AND p.space_id = ? LIMIT 1`,
    [id, context.spaceId],
  );
  if (!row) throw new StoreError('plan_not_found', 'Plan not found', 404);
  return mapPlan(row);
}

export async function createPlan(
  db: D1,
  context: AuthenticatedContext,
  experienceId: string,
  input: { scheduledFor: string; note: string | null },
  meta: { id: string; now: string },
) {
  await getExperience(db, context, experienceId);
  const target = await firstRow(
    db,
    'SELECT id FROM members WHERE space_id = ? AND id <> ? ORDER BY id LIMIT 1',
    [context.spaceId, context.memberId],
  );
  if (!target) throw new StoreError('target_not_found', 'The other member was not found', 409);
  await db
    .prepare(
      'INSERT INTO plans (id, space_id, experience_id, created_by_member_id, target_member_id, scheduled_for, note, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      meta.id,
      context.spaceId,
      experienceId,
      context.memberId,
      target.id,
      input.scheduledFor,
      input.note,
      'pending',
      meta.now,
      meta.now,
    )
    .run();
  return getPlan(db, context, meta.id);
}

export async function respondToPlan(
  db: D1,
  context: AuthenticatedContext,
  id: string,
  status: 'accepted' | 'declined',
  now: string,
) {
  const result = await db
    .prepare(
      'UPDATE plans SET status = ?, responded_at = ?, updated_at = ? WHERE id = ? AND space_id = ? AND target_member_id = ? AND status = ?',
    )
    .bind(status, now, now, id, context.spaceId, context.memberId, 'pending')
    .run();
  if (changes(result) !== 1) throw new StoreError('plan_not_found', 'Pending Plan not found', 404);
  return getPlan(db, context, id);
}

export async function listNotifications(db: D1, context: AuthenticatedContext) {
  const rows = await allRows(
    db,
    `SELECT p.*, creator.id AS created_by_id, creator.display_name AS created_by_name,
       target.id AS target_id, target.display_name AS target_name
     FROM plans p
     JOIN members creator ON creator.id = p.created_by_member_id AND creator.space_id = p.space_id
     JOIN members target ON target.id = p.target_member_id AND target.space_id = p.space_id
     WHERE p.space_id = ? AND p.target_member_id = ? AND p.status = ? ORDER BY p.created_at DESC`,
    [context.spaceId, context.memberId, 'pending'],
  );
  return rows.map((row) => ({
    id: stringValue(row.id),
    type: 'plan' as const,
    createdAt: stringValue(row.created_at),
    plan: mapPlan(row),
  }));
}

export async function getCalendar(
  db: D1,
  context: { spaceId: string },
  boundary: { today: string; now: string },
) {
  const footprints = await allRows(
    db,
    `SELECT f.id, f.experience_id, f.visited_on, f.member_id, e.name AS experience_name
     FROM footprints f JOIN experiences e ON e.id = f.experience_id AND e.space_id = f.space_id
     WHERE f.space_id = ? AND f.visited_on <= ? ORDER BY f.visited_on, f.id`,
    [context.spaceId, boundary.today],
  );
  const plans = await allRows(
    db,
    `SELECT p.id, p.experience_id, p.scheduled_for, p.created_by_member_id, p.target_member_id, p.status, e.name AS experience_name
     FROM plans p JOIN experiences e ON e.id = p.experience_id AND e.space_id = p.space_id
     WHERE p.space_id = ? AND p.status = ? AND p.scheduled_for >= ? ORDER BY p.scheduled_for, p.id`,
    [context.spaceId, 'accepted', boundary.now],
  );
  return [
    ...footprints.map((row) => ({
      id: `footprint:${stringValue(row.id)}`,
      footprintId: stringValue(row.id),
      type: 'footprint' as const,
      date: stringValue(row.visited_on),
      experienceId: stringValue(row.experience_id),
      experienceName: stringValue(row.experience_name),
      memberIds: [stringValue(row.member_id)],
    })),
    ...plans.map((row) => ({
      id: `plan:${stringValue(row.id)}`,
      type: 'plan' as const,
      date: stringValue(row.scheduled_for),
      experienceId: stringValue(row.experience_id),
      experienceName: stringValue(row.experience_name),
      memberIds: [stringValue(row.created_by_member_id), stringValue(row.target_member_id)],
      status: stringValue(row.status),
    })),
  ].sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
}

export async function importLegacyFootprints(
  db: D1,
  context: AuthenticatedContext,
  items: Array<{
    experienceId: string;
    visitedOn: string | null;
    rating: number | null;
    comment: string | null;
  }>,
  meta: { now: string; id: () => string },
): Promise<{ imported: number; skipped: number; requiresDates: string[] }> {
  const requiresDates = items.filter((item) => !item.visitedOn).map((item) => item.experienceId);
  const dated = items.filter(
    (item): item is typeof item & { visitedOn: string } => item.visitedOn !== null,
  );
  if (dated.length === 0) return { imported: 0, skipped: 0, requiresDates };

  const requestedIds = [...new Set(dated.map((item) => item.experienceId))];
  const existing = new Set<string>();
  for (let offset = 0; offset < requestedIds.length; offset += 90) {
    const chunk = requestedIds.slice(offset, offset + 90);
    const rows = await allRows(
      db,
      `SELECT id FROM experiences WHERE space_id = ? AND id IN (${chunk.map(() => '?').join(', ')})`,
      [context.spaceId, ...chunk],
    );
    for (const row of rows) existing.add(stringValue(row.id));
  }
  const importable = dated.filter((item) => existing.has(item.experienceId));
  const insertStatements: D1PreparedStatement[] = [];
  const footprintRow = '(?, ?, ?, ?, ?, ?, ?, ?, ?)';
  for (let offset = 0; offset < importable.length; offset += 10) {
    const chunk = importable.slice(offset, offset + 10);
    insertStatements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO footprints (id, space_id, experience_id, member_id, visited_on, rating, comment, legacy_key, created_at) VALUES ${chunk
            .map(() => footprintRow)
            .join(', ')}`,
        )
        .bind(
          ...chunk.flatMap((item) => [
            meta.id(),
            context.spaceId,
            item.experienceId,
            context.memberId,
            item.visitedOn,
            item.rating,
            item.comment,
            `shantou-food-log-v1:${item.experienceId}`,
            meta.now,
          ]),
        ),
    );
  }
  const updateStatements: D1PreparedStatement[] = [];
  const importableIds = [...new Set(importable.map((item) => item.experienceId))];
  for (let offset = 0; offset < importableIds.length; offset += 90) {
    const chunk = importableIds.slice(offset, offset + 90);
    updateStatements.push(
      db
        .prepare(
          `UPDATE experiences SET experience_state = ?, updated_at = ? WHERE space_id = ? AND id IN (${chunk
            .map(() => '?')
            .join(', ')})`,
        )
        .bind('footprint', meta.now, context.spaceId, ...chunk),
    );
  }
  const results = insertStatements.length > 0
    ? await db.batch([...insertStatements, ...updateStatements])
    : [];
  const imported = results.slice(0, insertStatements.length).reduce((total, result) => total + changes(result), 0);
  const skipped = dated.length - imported;
  return { imported, skipped, requiresDates };
}

export async function recordUnlockAttempt(
  db: D1,
  spaceId: string,
  ipHash: string,
  succeeded: boolean,
  attemptedAt: string,
  id: string,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO unlock_attempts (id, space_id, ip_hash, succeeded, attempted_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, spaceId, ipHash, succeeded ? 1 : 0, attemptedAt)
    .run();
}

export async function countFailedUnlockAttempts(
  db: D1,
  spaceId: string,
  ipHash: string,
  since: string,
): Promise<number> {
  const row = await firstRow(
    db,
    'SELECT COUNT(*) AS count FROM unlock_attempts WHERE space_id = ? AND ip_hash = ? AND succeeded = 0 AND attempted_at >= ?',
    [spaceId, ipHash, since],
  );
  return Number(row?.count ?? 0);
}

export async function auditEvent(
  db: D1,
  context: { spaceId: string; memberId?: string | null },
  input: {
    id: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    actorHash?: string | null;
    metadata?: unknown;
    now: string;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO audit_events (id, space_id, member_id, event_type, entity_type, entity_id, actor_hash, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      input.id,
      context.spaceId,
      context.memberId ?? null,
      input.eventType,
      input.entityType ?? null,
      input.entityId ?? null,
      input.actorHash ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.now,
    )
    .run();
}

export async function countRecentWriteAttempts(
  db: D1,
  spaceId: string,
  actorHash: string,
  since: string,
): Promise<number> {
  const row = await firstRow(
    db,
    'SELECT COUNT(*) AS count FROM audit_events WHERE space_id = ? AND event_type = ? AND actor_hash = ? AND created_at >= ?',
    [spaceId, 'api.write', actorHash, since],
  );
  return Number(row?.count ?? 0);
}

export async function mediaUploadContext(db: D1, context: AuthenticatedContext, footprintId: string) {
  const footprint = await firstRow(
    db,
    'SELECT id FROM footprints WHERE id = ? AND space_id = ? LIMIT 1',
    [footprintId, context.spaceId],
  );
  if (!footprint) throw new StoreError('footprint_not_found', 'Footprint not found', 404);
  const count = await firstRow(
    db,
    'SELECT COUNT(*) AS count FROM media WHERE footprint_id = ? AND space_id = ?',
    [footprintId, context.spaceId],
  );
  return { count: Number(count?.count ?? 0) };
}

export async function experienceMediaUploadContext(
  db: D1,
  context: AuthenticatedContext,
  experienceId: string,
) {
  const row = await firstRow(
    db,
    `SELECT e.id, em.id AS media_id, em.object_key
     FROM experiences e
     LEFT JOIN experience_media em
       ON em.experience_id = e.id AND em.space_id = e.space_id
     WHERE e.id = ? AND e.space_id = ?
     LIMIT 1`,
    [experienceId, context.spaceId],
  );
  if (!row) throw new StoreError('experience_not_found', 'Experience not found', 404);
  return {
    existing: row.media_id
      ? { id: stringValue(row.media_id), objectKey: stringValue(row.object_key) }
      : null,
  };
}

export async function upsertExperienceMediaRecord(
  db: D1,
  context: AuthenticatedContext,
  input: {
    id: string;
    experienceId: string;
    objectKey: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
    now: string;
  },
) {
  await db
    .prepare(
      `INSERT INTO experience_media (id, space_id, experience_id, object_key, mime_type, byte_size, sha256, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(space_id, experience_id) DO UPDATE SET
         id = excluded.id,
         object_key = excluded.object_key,
         mime_type = excluded.mime_type,
         byte_size = excluded.byte_size,
         sha256 = excluded.sha256,
         created_at = excluded.created_at`,
    )
    .bind(
      input.id,
      context.spaceId,
      input.experienceId,
      input.objectKey,
      input.mimeType,
      input.byteSize,
      input.sha256,
      input.now,
    )
    .run();
  return { id: input.id, url: `/api/media/${encodeURIComponent(input.id)}`, mimeType: input.mimeType };
}

export async function createMediaRecord(
  db: D1,
  context: AuthenticatedContext,
  input: { id: string; footprintId: string; objectKey: string; mimeType: string; byteSize: number; sha256: string; now: string },
) {
  await db
    .prepare(
      'INSERT INTO media (id, space_id, footprint_id, object_key, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      input.id,
      context.spaceId,
      input.footprintId,
      input.objectKey,
      input.mimeType,
      input.byteSize,
      input.sha256,
      input.now,
    )
    .run();
  return { id: input.id, url: `/api/media/${encodeURIComponent(input.id)}`, mimeType: input.mimeType };
}

export async function getMediaRecord(db: D1, context: { spaceId: string }, id: string) {
  const row = await firstRow(
    db,
    `SELECT id, object_key, mime_type, byte_size, sha256 FROM media WHERE id = ? AND space_id = ?
     UNION ALL
     SELECT id, object_key, mime_type, byte_size, sha256 FROM experience_media WHERE id = ? AND space_id = ?
     LIMIT 1`,
    [id, context.spaceId, id, context.spaceId],
  );
  if (!row) throw new StoreError('media_not_found', 'Media not found', 404);
  return {
    id: stringValue(row.id),
    objectKey: stringValue(row.object_key),
    mimeType: stringValue(row.mime_type),
    byteSize: Number(row.byte_size),
    sha256: stringValue(row.sha256),
  };
}
