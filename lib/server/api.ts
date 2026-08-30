import { restaurants } from '../../app/restaurants';
import { previewQuickAddUrl } from './google-maps';
import { extensionForImageType, MAX_IMAGE_BYTES, MAX_MEDIA_PER_FOOTPRINT, validateImageUpload } from './media';
import {
  assertCsrfDigest,
  assertTrustedOrigin,
  clearSessionCookie,
  createBoundSessionMaterial,
  deriveCsrfToken,
  deriveKeyVerifier,
  readCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookie,
  sha256Hex,
  verifySharedKey,
} from './security';
import {
  auditEvent,
  countFailedUnlockAttempts,
  countRecentWriteAttempts,
  createExperience,
  createPlace,
  createFootprint,
  createMediaRecord,
  createPlan,
  createSessionRecord,
  deleteExperience,
  deleteFootprint,
  deleteSession,
  experienceMediaUploadContext,
  getCalendar,
  getConfiguredSpace,
  getExperience,
  getMediaRecord,
  importLegacyFootprints,
  initializeSpaceWithSeeds,
  listExperiences,
  listExperienceFootprints,
  listMembers,
  listNotifications,
  listPlaces,
  loadSession,
  mediaUploadContext,
  recordUnlockAttempt,
  respondToPlan,
  rotateSpaceKey,
  selectSessionMember,
  upsertExperienceMediaRecord,
  updateExperience,
  type AuthenticatedContext,
  type SessionContext,
} from './store';
import {
  EXPERIENCE_CATEGORIES,
  parseExperienceInput,
  parseFootprintInput,
  parseLegacyImport,
  parseMemberSelection,
  parsePlaceId,
  parsePlaceInput,
  parsePlanInput,
  parsePlanResponse,
  parseRotateKeyInput,
  parseSharedKey,
  readJson,
  shanghaiDateKey,
} from './validation';

export type AppBindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  AUTH_PEPPER_V1: string;
};

export type ApiRoute =
  | 'setupStatus'
  | 'setup'
  | 'session'
  | 'unlock'
  | 'profile'
  | 'logout'
  | 'rotate'
  | 'places'
  | 'experiences'
  | 'experience'
  | 'preview'
  | 'footprints'
  | 'footprint'
  | 'plans'
  | 'planRespond'
  | 'notifications'
  | 'calendar'
  | 'legacyImport'
  | 'experienceMediaUpload'
  | 'mediaUpload'
  | 'media';

const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
} as const;
const AUTHENTICATED_WRITE_LIMIT = 60;

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...Object.fromEntries(new Headers(headers)) },
  });
}

function methodNotAllowed(allowed: string[]): Response {
  return json(
    { error: { code: 'method_not_allowed', message: 'Method not allowed' } },
    405,
    { allow: allowed.join(', ') },
  );
}

function apiError(error: unknown): Response {
  const candidate = error as { status?: unknown; code?: unknown; message?: unknown; fields?: unknown };
  const status = typeof candidate?.status === 'number' ? candidate.status : 500;
  const code = typeof candidate?.code === 'string' ? candidate.code : 'internal_error';
  const message = status >= 500
    ? 'The server could not complete the request'
    : typeof candidate?.message === 'string'
      ? candidate.message
      : 'The request could not be completed';
  const fields = candidate?.fields && typeof candidate.fields === 'object' ? candidate.fields : undefined;
  return json({ error: { code, message, ...(fields ? { fields } : {}) } }, status);
}

function now(): string {
  return new Date().toISOString();
}

function cleanId(value: string | undefined): string {
  if (!value || value.length > 200 || !/^[\p{L}\p{N}_.:-]+$/u.test(value)) {
    const error = new Error('Resource id is invalid') as Error & { status: number; code: string };
    error.status = 400;
    error.code = 'invalid_id';
    throw error;
  }
  return value;
}

async function currentSession(
  request: Request,
  db: D1Database,
  requireMember: true,
): Promise<SessionContext & { memberId: string; rawToken: string }>;
async function currentSession(
  request: Request,
  db: D1Database,
  requireMember?: false,
): Promise<SessionContext & { rawToken: string }>;
async function currentSession(
  request: Request,
  db: D1Database,
  requireMember = false,
): Promise<SessionContext & { rawToken: string }> {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  const session = token ? await loadSession(db, await sha256Hex(token), now()) : null;
  if (!session) {
    const error = new Error('Unlock the shared space to continue') as Error & { status: number; code: string };
    error.status = 401;
    error.code = 'authentication_required';
    throw error;
  }
  if (requireMember && !session.memberId) {
    const error = new Error('Choose Toni or Rosalie to continue') as Error & { status: number; code: string };
    error.status = 409;
    error.code = 'profile_required';
    throw error;
  }
  return { ...session, rawToken: token as string } as SessionContext & { memberId: string; rawToken: string };
}

function authenticatedContext(session: SessionContext & { memberId: string }): AuthenticatedContext {
  return { spaceId: session.spaceId, memberId: session.memberId };
}

async function sessionPayload(
  db: D1Database,
  session: SessionContext,
  rawToken: string,
  pepper: string,
) {
  const members = await listMembers(db, session.spaceId);
  return {
    configured: true,
    authenticated: true,
    csrfToken: await deriveCsrfToken(rawToken, pepper),
    member: session.memberId ? members.find((member) => member.id === session.memberId) ?? null : null,
    members,
    expiresAt: session.expiresAt,
  };
}

function ipAddress(request: Request): string {
  const direct = request.headers.get('cf-connecting-ip')?.trim();
  if (direct && direct.length <= 64) return direct;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded && forwarded.length <= 64 ? forwarded : 'unknown';
}

async function setup(request: Request, bindings: AppBindings): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const key = parseSharedKey(await readJson(request));
  if (await getConfiguredSpace(bindings.DB)) {
    return json({ error: { code: 'already_configured', message: 'The shared space is already configured' } }, 409);
  }
  const timestamp = now();
  const verifier = await deriveKeyVerifier(key, { pepper: bindings.AUTH_PEPPER_V1 });
  await initializeSpaceWithSeeds(
    bindings.DB,
    verifier,
    restaurants,
    { now: timestamp, auditId: crypto.randomUUID() },
  );
  return json({ configured: true }, 201);
}

async function unlock(request: Request, bindings: AppBindings): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const key = parseSharedKey(await readJson(request));
  const space = await getConfiguredSpace(bindings.DB);
  if (!space) {
    return json({ error: { code: 'setup_required', message: 'Complete first-time setup before unlocking' } }, 409);
  }
  const timestamp = now();
  const ipHash = await sha256Hex(`${bindings.AUTH_PEPPER_V1}\u0000${ipAddress(request)}`);
  const since = new Date(new Date(timestamp).valueOf() - 15 * 60 * 1000).toISOString();
  if (await countFailedUnlockAttempts(bindings.DB, space.id, ipHash, since) >= 5) {
    return json(
      { error: { code: 'rate_limited', message: 'Too many unlock attempts; try again later' } },
      429,
      { 'retry-after': '900' },
    );
  }
  const verified = await verifySharedKey(
    key,
    { salt: space.salt, hash: space.hash, iterations: space.iterations },
    bindings.AUTH_PEPPER_V1,
  );
  await recordUnlockAttempt(
    bindings.DB,
    space.id,
    ipHash,
    verified,
    timestamp,
    crypto.randomUUID(),
  );
  if (!verified) {
    return json({ error: { code: 'invalid_key', message: 'The shared key is incorrect' } }, 401);
  }
  const material = await createBoundSessionMaterial(bindings.AUTH_PEPPER_V1);
  const expiresAt = new Date(new Date(timestamp).valueOf() + SESSION_TTL_SECONDS * 1000).toISOString();
  await createSessionRecord(bindings.DB, {
    digest: material.digest,
    spaceId: space.id,
    csrfTokenDigest: material.csrfDigest,
    expiresAt,
    now: timestamp,
  });
  const session = await loadSession(bindings.DB, material.digest, timestamp);
  if (!session) throw new Error('Created session could not be loaded');
  return json(await sessionPayload(bindings.DB, session, material.token, bindings.AUTH_PEPPER_V1), 200, {
    'set-cookie': sessionCookie(material.token),
  });
}

async function readLimitedMultipart(request: Request, maxBytes: number): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('Multipart body is required'), { status: 400, code: 'invalid_upload' });
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error('Upload must not exceed 10 MiB'), { status: 413, code: 'upload_too_large' });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
}

async function uploadMedia(
  request: Request,
  bindings: AppBindings,
  session: SessionContext & { memberId: string; rawToken: string },
  footprintId: string,
): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const context = authenticatedContext(session);
  const uploadContext = await mediaUploadContext(bindings.DB, context, footprintId);
  if (uploadContext.count >= MAX_MEDIA_PER_FOOTPRINT) {
    return json(
      { error: { code: 'media_limit', message: 'Each Footprint can contain at most 8 images' } },
      409,
    );
  }
  const form = await readLimitedMultipart(request, MAX_IMAGE_BYTES + 1024 * 1024);
  const candidate = form.get('file');
  if (
    !candidate ||
    typeof candidate === 'string' ||
    typeof candidate.arrayBuffer !== 'function' ||
    typeof candidate.type !== 'string' ||
    typeof candidate.size !== 'number'
  ) {
    throw Object.assign(new Error('A file field is required'), { status: 400, code: 'invalid_upload' });
  }
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  validateImageUpload({ type: candidate.type, size: candidate.size }, bytes);
  const id = crypto.randomUUID();
  const objectKey = `${context.spaceId}/${footprintId}/${id}.${extensionForImageType(candidate.type)}`;
  await bindings.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType: candidate.type },
    customMetadata: { spaceId: context.spaceId, footprintId },
  });
  try {
    const media = await createMediaRecord(bindings.DB, context, {
      id,
      footprintId,
      objectKey,
      mimeType: candidate.type,
      byteSize: candidate.size,
      sha256: await sha256Hex(bytes),
      now: now(),
    });
    return json({ media }, 201);
  } catch (error) {
    await bindings.MEDIA.delete(objectKey);
    throw error;
  }
}

async function uploadExperienceMedia(
  request: Request,
  bindings: AppBindings,
  session: SessionContext & { memberId: string; rawToken: string },
  experienceId: string,
): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const context = authenticatedContext(session);
  const uploadContext = await experienceMediaUploadContext(bindings.DB, context, experienceId);
  const form = await readLimitedMultipart(request, MAX_IMAGE_BYTES + 1024 * 1024);
  const candidate = form.get('file');
  if (
    !candidate ||
    typeof candidate === 'string' ||
    typeof candidate.arrayBuffer !== 'function' ||
    typeof candidate.type !== 'string' ||
    typeof candidate.size !== 'number'
  ) {
    throw Object.assign(new Error('A file field is required'), { status: 400, code: 'invalid_upload' });
  }
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  validateImageUpload({ type: candidate.type, size: candidate.size }, bytes);
  const id = crypto.randomUUID();
  const objectKey = `${context.spaceId}/experiences/${experienceId}/${id}.${extensionForImageType(candidate.type)}`;
  await bindings.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType: candidate.type },
    customMetadata: { spaceId: context.spaceId, experienceId },
  });
  let media;
  try {
    media = await upsertExperienceMediaRecord(bindings.DB, context, {
      id,
      experienceId,
      objectKey,
      mimeType: candidate.type,
      byteSize: candidate.size,
      sha256: await sha256Hex(bytes),
      now: now(),
    });
  } catch (error) {
    await bindings.MEDIA.delete(objectKey);
    throw error;
  }
  if (uploadContext.existing) await bindings.MEDIA.delete(uploadContext.existing.objectKey);
  return json(
    { media, experience: await getExperience(bindings.DB, context, experienceId) },
    uploadContext.existing ? 200 : 201,
  );
}

async function protectedApi(
  request: Request,
  route: ApiRoute,
  params: { id?: string },
  bindings: AppBindings,
): Promise<Response> {
  const requiresSelectedMember = !['session', 'profile', 'logout'].includes(route);
  const session = await currentSession(request, bindings.DB, requiresSelectedMember as true);
  const isWrite = request.method !== 'GET' && request.method !== 'HEAD';
  if (isWrite) {
    await assertCsrfDigest(request, session.csrfTokenDigest);
    const timestamp = now();
    const actorHash = await sha256Hex(
      `${bindings.AUTH_PEPPER_V1}\u0000${session.tokenDigest}\u0000${ipAddress(request)}`,
    );
    const since = new Date(new Date(timestamp).valueOf() - 60 * 1000).toISOString();
    if (
      (await countRecentWriteAttempts(bindings.DB, session.spaceId, actorHash, since)) >=
      AUTHENTICATED_WRITE_LIMIT
    ) {
      return json(
        { error: { code: 'rate_limited', message: 'Too many write requests; try again shortly' } },
        429,
        { 'retry-after': '60' },
      );
    }
    await auditEvent(
      bindings.DB,
      { spaceId: session.spaceId, memberId: session.memberId },
      {
        id: crypto.randomUUID(),
        eventType: 'api.write',
        actorHash,
        metadata: { route },
        now: timestamp,
      },
    );
  }

  if (route === 'session') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    return json(await sessionPayload(bindings.DB, session, session.rawToken, bindings.AUTH_PEPPER_V1));
  }
  if (route === 'profile') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    await selectSessionMember(bindings.DB, session, parseMemberSelection(await readJson(request)), now());
    const selected = await loadSession(bindings.DB, session.tokenDigest, now());
    if (!selected) throw new Error('Selected session could not be loaded');
    return json(await sessionPayload(bindings.DB, selected, session.rawToken, bindings.AUTH_PEPPER_V1));
  }
  if (route === 'logout') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    await deleteSession(bindings.DB, session.tokenDigest, session.spaceId);
    return json({ authenticated: false }, 200, { 'set-cookie': clearSessionCookie() });
  }

  const selected = session as SessionContext & { memberId: string; rawToken: string };
  const context = authenticatedContext(selected);
  if (route === 'rotate') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const input = parseRotateKeyInput(await readJson(request));
    const space = await getConfiguredSpace(bindings.DB);
    const valid = space
      ? await verifySharedKey(
          input.currentKey,
          { salt: space.salt, hash: space.hash, iterations: space.iterations },
          bindings.AUTH_PEPPER_V1,
        )
      : false;
    if (!valid) return json({ error: { code: 'invalid_key', message: 'The current shared key is incorrect' } }, 401);
    const verifier = await deriveKeyVerifier(input.newKey, { pepper: bindings.AUTH_PEPPER_V1 });
    await rotateSpaceKey(bindings.DB, selected, verifier, now());
    await auditEvent(bindings.DB, context, {
      id: crypto.randomUUID(),
      eventType: 'space.key_rotated',
      now: now(),
    });
    return json({ rotated: true });
  }
  if (route === 'places') {
    if (request.method === 'GET') return json({ places: await listPlaces(bindings.DB, context) });
    if (request.method === 'POST') {
      const place = await createPlace(
        bindings.DB,
        context,
        parsePlaceInput(await readJson(request)),
        { id: crypto.randomUUID(), now: now() },
      );
      return json({ place }, 201);
    }
    return methodNotAllowed(['GET', 'POST']);
  }
  if (route === 'experiences') {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const state = url.searchParams.get('state') ?? undefined;
      if (state && !['all', 'wishlist', 'footprint'].includes(state)) {
        throw Object.assign(new Error('state is invalid'), { status: 400, code: 'invalid_input' });
      }
      const category = url.searchParams.get('category') ?? undefined;
      if (category && !EXPERIENCE_CATEGORIES.includes(category as (typeof EXPERIENCE_CATEGORIES)[number])) {
        throw Object.assign(new Error('category is invalid'), { status: 400, code: 'invalid_input' });
      }
      return json({
        experiences: await listExperiences(bindings.DB, context, {
          placeId: url.searchParams.has('placeId')
            ? parsePlaceId(url.searchParams.get('placeId'))
            : undefined,
          state,
          category,
          tag: url.searchParams.get('tag')?.slice(0, 40) || undefined,
          search: url.searchParams.get('q')?.slice(0, 200) || undefined,
        }),
      });
    }
    if (request.method === 'POST') {
      const experience = await createExperience(
        bindings.DB,
        context,
        parseExperienceInput(await readJson(request)),
        { id: crypto.randomUUID(), now: now() },
      );
      return json({ experience }, 201);
    }
    return methodNotAllowed(['GET', 'POST']);
  }
  if (route === 'experience') {
    const id = cleanId(params.id);
    if (request.method === 'GET') return json({ experience: await getExperience(bindings.DB, context, id) });
    if (request.method === 'PATCH') {
      const experience = await updateExperience(
        bindings.DB,
        context,
        id,
        parseExperienceInput(await readJson(request), true),
        { now: now() },
      );
      return json({ experience });
    }
    if (request.method === 'DELETE') {
      await deleteExperience(bindings.DB, context, id);
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
  }
  if (route === 'preview') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const value = await readJson(request);
    const url = (value as { url?: unknown })?.url;
    if (typeof url !== 'string') {
      throw Object.assign(new Error('url is required'), { status: 400, code: 'invalid_input' });
    }
    return json(await previewQuickAddUrl(url));
  }
  if (route === 'footprints') {
    const experienceId = cleanId(params.id);
    if (request.method === 'GET') {
      return json({ footprints: await listExperienceFootprints(bindings.DB, context, experienceId) });
    }
    if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST']);
    const footprintInput = parseFootprintInput(await readJson(request));
    if (footprintInput.visitedOn > shanghaiDateKey(now())) {
      throw Object.assign(new Error('visit date cannot be in the future'), {
        status: 400,
        code: 'invalid_input',
      });
    }
    const footprint = await createFootprint(
      bindings.DB,
      context,
      experienceId,
      footprintInput,
      { id: crypto.randomUUID(), now: now() },
    );
    return json({ footprint }, 201);
  }
  if (route === 'footprint') {
    if (request.method !== 'DELETE') return methodNotAllowed(['DELETE']);
    const result = await deleteFootprint(
      bindings.DB,
      context,
      cleanId(params.id),
      { now: now() },
      async (objectKeys) => {
        await Promise.all(objectKeys.map((objectKey) => bindings.MEDIA.delete(objectKey)));
      },
    );
    return json({
      deletedFootprintId: result.deletedFootprintId,
      experience: result.experience,
    });
  }
  if (route === 'plans') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const input = parsePlanInput(await readJson(request));
    if (new Date(input.scheduledFor).valueOf() <= Date.now()) {
      throw Object.assign(new Error('scheduledFor must be in the future'), { status: 400, code: 'invalid_input' });
    }
    const plan = await createPlan(bindings.DB, context, cleanId(params.id), input, {
      id: crypto.randomUUID(),
      now: now(),
    });
    return json({ plan }, 201);
  }
  if (route === 'planRespond') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const input = parsePlanResponse(await readJson(request));
    return json({ plan: await respondToPlan(bindings.DB, context, cleanId(params.id), input.status, now()) });
  }
  if (route === 'notifications') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    return json({ notifications: await listNotifications(bindings.DB, context) });
  }
  if (route === 'calendar') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const timestamp = now();
    return json({
      entries: await getCalendar(bindings.DB, context, {
        today: shanghaiDateKey(timestamp),
        now: timestamp,
      }),
    });
  }
  if (route === 'legacyImport') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const timestamp = now();
    const items = parseLegacyImport(await readJson(request));
    if (items.some((item) => item.visitedOn !== null && item.visitedOn > shanghaiDateKey(timestamp))) {
      throw Object.assign(new Error('visit date cannot be in the future'), {
        status: 400,
        code: 'invalid_input',
      });
    }
    return json(
      await importLegacyFootprints(bindings.DB, context, items, {
        id: () => crypto.randomUUID(),
        now: timestamp,
      }),
    );
  }
  if (route === 'experienceMediaUpload') {
    return uploadExperienceMedia(request, bindings, selected, cleanId(params.id));
  }
  if (route === 'mediaUpload') {
    return uploadMedia(request, bindings, selected, cleanId(params.id));
  }
  if (route === 'media') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const record = await getMediaRecord(bindings.DB, context, cleanId(params.id));
    const object = await bindings.MEDIA.get(record.objectKey);
    if (!object) {
      return json({ error: { code: 'media_not_found', message: 'Media not found' } }, 404);
    }
    return new Response(object.body, {
      status: 200,
      headers: {
        'cache-control': 'private, no-store',
        'content-length': String(record.byteSize),
        'content-type': record.mimeType,
        'content-security-policy': "default-src 'none'; sandbox",
        'x-content-type-options': 'nosniff',
      },
    });
  }
  throw new Error('Unknown protected API route');
}

export async function handleApiRequest(
  request: Request,
  route: ApiRoute,
  params: { id?: string },
  bindings: AppBindings,
): Promise<Response> {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') assertTrustedOrigin(request);
    if (route === 'setupStatus') {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      return json({ configured: Boolean(await getConfiguredSpace(bindings.DB)) });
    }
    if (route === 'setup') return setup(request, bindings);
    if (route === 'unlock') return unlock(request, bindings);
    if (route === 'session') {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      const configured = Boolean(await getConfiguredSpace(bindings.DB));
      const token = readCookie(request, SESSION_COOKIE_NAME);
      const session = token ? await loadSession(bindings.DB, await sha256Hex(token), now()) : null;
      if (!session) return json({ configured, authenticated: false, member: null });
      return json(await sessionPayload(bindings.DB, session, token as string, bindings.AUTH_PEPPER_V1));
    }
    return await protectedApi(request, route, params, bindings);
  } catch (error) {
    return apiError(error);
  }
}
