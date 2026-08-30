import { del, get, list, put } from '@vercel/blob';

import { ACCESS_COOKIE, verifyAccessToken } from '../access.mjs';
import { previewQuickAddUrl } from './google-maps';
import { extensionForImageType, MAX_IMAGE_BYTES, MAX_MEDIA_PER_FOOTPRINT, validateImageUpload } from './media';
import { assertCsrfDigest, assertTrustedOrigin, deriveCsrfToken, readCookie, sha256Hex } from './security';
import {
  applyVercelEvent,
  createVercelSeedState,
  experiencePayload,
  footprintPayload,
  listVercelExperiences,
  memberPayload,
  planPayload,
  type VercelExperience,
  type VercelExperienceEvent,
  type VercelExperienceState,
  type VercelFootprint,
  type VercelMedia,
  type VercelMemberId,
  type VercelPlan,
} from './vercel-state';
import type { ApiRoute } from './api';
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
  readJson,
  shanghaiDateKey,
  type ExperienceInput,
} from './validation';

const MEMBER_COOKIE = 'nto_member';
const EVENT_PREFIX = 'nto/events/';
const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
} as const;
const EVENT_TYPES = new Set([
  'place.created',
  'experience.created',
  'experience.updated',
  'experience.deleted',
  'footprint.created',
  'footprint.deleted',
  'plan.created',
  'plan.responded',
  'media.saved',
  'media.deleted',
]);

type RequestContext = {
  accessToken: string;
  csrfToken: string;
  memberId: VercelMemberId | null;
  secret: string;
};

type InputError = Error & { status: number; code: string };

function inputError(code: string, message: string, status: number): InputError {
  return Object.assign(new Error(message), { code, status });
}

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...Object.fromEntries(new Headers(headers)) },
  });
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
  return json({ error: { code, message } }, status);
}

function methodNotAllowed(allowed: string[]) {
  return json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } }, 405, { allow: allowed.join(', ') });
}

function isMemberId(value: unknown): value is VercelMemberId {
  return value === 'toni' || value === 'rosalie';
}

function isEvent(value: unknown): value is VercelExperienceEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VercelExperienceEvent>;
  return candidate.version === 1
    && typeof candidate.id === 'string'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.type === 'string'
    && EVENT_TYPES.has(candidate.type)
    && isMemberId(candidate.memberId)
    && Boolean(candidate.payload && typeof candidate.payload === 'object');
}

async function readPrivateJson(pathname: string): Promise<unknown> {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

async function loadEvents(): Promise<VercelExperienceEvent[]> {
  const blobs: Array<{ pathname: string }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: EVENT_PREFIX, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const values = await Promise.all(blobs.map(async (blob) => {
    try {
      const value = await readPrivateJson(blob.pathname);
      return isEvent(value) ? value : null;
    } catch {
      return null;
    }
  }));
  return values
    .filter((value): value is VercelExperienceEvent => value !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

async function loadState(): Promise<VercelExperienceState> {
  const state = createVercelSeedState();
  for (const event of await loadEvents()) {
    try {
      applyVercelEvent(state, event);
    } catch {
      // A malformed private event must not make the whole shared page unavailable.
    }
  }
  return state;
}

async function appendEvent(event: VercelExperienceEvent): Promise<void> {
  const safeTime = event.createdAt.replace(/[:.]/g, '-');
  await put(`${EVENT_PREFIX}${safeTime}-${event.id}.json`, JSON.stringify(event), {
    access: 'private',
    contentType: 'application/json; charset=utf-8',
  });
}

function now() {
  return new Date().toISOString();
}

function cleanId(value: string | undefined): string {
  if (!value || value.length > 200 || !/^[\p{L}\p{N}_.:-]+$/u.test(value)) {
    throw inputError('invalid_id', 'Resource id is invalid', 400);
  }
  return value;
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

async function requestContext(request: Request): Promise<RequestContext> {
  const secret = process.env.ACCESS_SECRET ?? '';
  const accessToken = readCookie(request, ACCESS_COOKIE) ?? '';
  if (!secret || !(await verifyAccessToken(accessToken, secret))) {
    throw inputError('authentication_required', 'Unlock the site to continue', 401);
  }
  const rawMember = readCookie(request, MEMBER_COOKIE);
  return {
    accessToken,
    csrfToken: await deriveCsrfToken(accessToken, secret),
    memberId: isMemberId(rawMember) ? rawMember : null,
    secret,
  };
}

function sessionPayload(context: RequestContext) {
  const members = [memberPayload('toni'), memberPayload('rosalie')];
  return {
    configured: true,
    authenticated: true,
    csrfToken: context.csrfToken,
    member: context.memberId ? memberPayload(context.memberId) : null,
    members,
    expiresAt: null,
  };
}

async function assertWrite(request: Request, context: RequestContext) {
  assertTrustedOrigin(request);
  await assertCsrfDigest(request, await sha256Hex(context.csrfToken));
}

function requireMember(context: RequestContext): VercelMemberId {
  if (!context.memberId) throw inputError('profile_required', 'Choose Toni or Rosalie to continue', 409);
  return context.memberId;
}

function requireExperience(state: VercelExperienceState, id: string): VercelExperience {
  const experience = state.experiences.get(id);
  if (!experience) throw inputError('experience_not_found', 'Experience not found', 404);
  return experience;
}

function requirePlace(state: VercelExperienceState, id: string) {
  const place = state.places.get(id);
  if (!place) throw inputError('place_not_found', 'Place not found', 404);
  return place;
}

function writeEvent<T extends VercelExperienceEvent>(event: T): T {
  return event;
}

function experienceFromInput(
  input: ExperienceInput,
  memberId: VercelMemberId,
  id: string,
  timestamp: string,
): VercelExperience {
  return {
    id,
    placeId: input.placeId ?? null,
    name: input.name,
    category: input.category,
    tags: [...new Set(input.tags)].sort(),
    address: input.address,
    coordinates: input.coordinates,
    locationStatus: input.locationStatus,
    locationNote: input.locationNote,
    recommendationStatus: input.recommendationStatus,
    state: input.state ?? 'wishlist',
    sourceUrl: input.sourceUrl,
    sourceKind: input.sourceKind,
    openingHours: input.openingHours,
    notes: input.notes,
    imageUrl: null,
    coverMediaId: null,
    createdByMemberId: memberId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function readLimitedMultipart(request: Request, maxBytes: number): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw inputError('invalid_upload', 'Multipart body is required', 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw inputError('upload_too_large', 'Upload must not exceed 10 MiB', 413);
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
  state: VercelExperienceState,
  memberId: VercelMemberId,
  ownerType: 'experience' | 'footprint',
  ownerId: string,
) {
  if (ownerType === 'experience') requireExperience(state, ownerId);
  if (ownerType === 'footprint' && !state.footprints.has(ownerId)) throw inputError('footprint_not_found', 'Footprint not found', 404);
  const existing = [...state.media.values()].filter((item) => item.ownerType === ownerType && item.ownerId === ownerId);
  if (ownerType === 'footprint' && existing.length >= MAX_MEDIA_PER_FOOTPRINT) {
    throw inputError('media_limit', 'Each Footprint can contain at most 8 images', 409);
  }
  const form = await readLimitedMultipart(request, MAX_IMAGE_BYTES + 1024 * 1024);
  const candidate = form.get('file');
  if (!(candidate instanceof File)) throw inputError('invalid_upload', 'A file field is required', 400);
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  validateImageUpload({ type: candidate.type, size: candidate.size }, bytes);
  const id = crypto.randomUUID();
  const timestamp = now();
  const pathname = `nto/media/${ownerType}/${ownerId}/${id}.${extensionForImageType(candidate.type)}`;
  await put(pathname, bytes, { access: 'private', contentType: candidate.type });
  const media: VercelMedia = {
    id,
    ownerType,
    ownerId,
    pathname,
    mimeType: candidate.type,
    byteSize: candidate.size,
    sha256: await sha256Hex(bytes),
    createdAt: timestamp,
  };
  try {
    await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'media.saved', createdAt: timestamp, memberId, payload: media }));
  } catch (error) {
    await del(pathname);
    throw error;
  }
  if (ownerType === 'experience' && existing.length > 0) await Promise.all(existing.map((item) => del(item.pathname)));
  return media;
}

async function protectedRoute(request: Request, route: ApiRoute, params: { id?: string }, context: RequestContext): Promise<Response> {
  if (route === 'session') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    return json(sessionPayload(context));
  }
  if (route === 'profile') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    await assertWrite(request, context);
    const memberId = parseMemberSelection(await readJson(request));
    const response = json({ ...sessionPayload({ ...context, memberId }), member: memberPayload(memberId) });
    response.headers.append('set-cookie', cookie(MEMBER_COOKIE, memberId, 365 * 24 * 60 * 60));
    return response;
  }
  if (route === 'logout') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    await assertWrite(request, context);
    const response = json({ authenticated: false });
    response.headers.append('set-cookie', cookie(MEMBER_COOKIE, '', 0));
    response.headers.append('set-cookie', cookie(ACCESS_COOKIE, '', 0));
    return response;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') await assertWrite(request, context);
  const memberId = requireMember(context);
  const state = await loadState();

  if (route === 'rotate') return json({ error: { code: 'managed_by_site_lock', message: 'The site passcode is managed by the main lock' } }, 409);
  if (route === 'places') {
    if (request.method === 'GET') {
      return json({ places: [...state.places.values()].sort((a, b) => a.position - b.position).map(({ id, name }) => ({ id, name })) });
    }
    if (request.method === 'POST') {
      const input = parsePlaceInput(await readJson(request));
      if ([...state.places.values()].some((place) => place.name === input.name)) throw inputError('place_exists', 'Place already exists', 409);
      const timestamp = now();
      const place = { id: crypto.randomUUID(), name: input.name, position: state.places.size, createdAt: timestamp };
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'place.created', createdAt: timestamp, memberId, payload: place }));
      return json({ place: { id: place.id, name: place.name } }, 201);
    }
    return methodNotAllowed(['GET', 'POST']);
  }
  if (route === 'experiences') {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const stateFilter = url.searchParams.get('state') ?? undefined;
      if (stateFilter && !['all', 'wishlist', 'footprint'].includes(stateFilter)) throw inputError('invalid_input', 'state is invalid', 400);
      const category = url.searchParams.get('category') ?? undefined;
      if (category && !EXPERIENCE_CATEGORIES.includes(category as (typeof EXPERIENCE_CATEGORIES)[number])) throw inputError('invalid_input', 'category is invalid', 400);
      return json({
        experiences: listVercelExperiences(state, {
          placeId: url.searchParams.has('placeId') ? parsePlaceId(url.searchParams.get('placeId')) : undefined,
          state: stateFilter,
          category,
          tag: url.searchParams.get('tag')?.slice(0, 40) || undefined,
          search: url.searchParams.get('q')?.slice(0, 200) || undefined,
        }),
      });
    }
    if (request.method === 'POST') {
      const input = parseExperienceInput(await readJson(request));
      if (input.placeId) requirePlace(state, input.placeId);
      const timestamp = now();
      const experience = experienceFromInput(input, memberId, crypto.randomUUID(), timestamp);
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'experience.created', createdAt: timestamp, memberId, payload: experience }));
      applyVercelEvent(state, { version: 1, id: 'local', type: 'experience.created', createdAt: timestamp, memberId, payload: experience });
      return json({ experience: experiencePayload(state, experience) }, 201);
    }
    return methodNotAllowed(['GET', 'POST']);
  }
  if (route === 'experience') {
    const id = cleanId(params.id);
    const experience = requireExperience(state, id);
    if (request.method === 'GET') return json({ experience: experiencePayload(state, experience) });
    if (request.method === 'PATCH') {
      const input = parseExperienceInput(await readJson(request), true);
      if (input.placeId !== undefined) requirePlace(state, input.placeId);
      const timestamp = now();
      const patch: Partial<VercelExperience> = { ...input, updatedAt: timestamp };
      if (input.tags) patch.tags = [...new Set(input.tags)].sort();
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'experience.updated', createdAt: timestamp, memberId, payload: { id, patch, updatedAt: timestamp } }));
      const updated = { ...experience, ...patch, updatedAt: timestamp };
      state.experiences.set(id, updated);
      return json({ experience: experiencePayload(state, updated) });
    }
    if (request.method === 'DELETE') {
      const media = [...state.media.values()].filter((item) => item.ownerType === 'experience' && item.ownerId === id);
      await Promise.all(media.map((item) => del(item.pathname)));
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'experience.deleted', createdAt: now(), memberId, payload: { id } }));
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
  }
  if (route === 'preview') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const value = await readJson(request);
    const url = (value as { url?: unknown })?.url;
    if (typeof url !== 'string') throw inputError('invalid_input', 'url is required', 400);
    return json(await previewQuickAddUrl(url));
  }
  if (route === 'footprints') {
    const experienceId = cleanId(params.id);
    requireExperience(state, experienceId);
    if (request.method === 'GET') {
      const footprints = [...state.footprints.values()]
        .filter((item) => item.experienceId === experienceId)
        .sort((a, b) => b.visitedOn.localeCompare(a.visitedOn) || b.createdAt.localeCompare(a.createdAt))
        .map((item) => footprintPayload(state, item));
      return json({ footprints });
    }
    if (request.method === 'POST') {
      const input = parseFootprintInput(await readJson(request));
      if (input.visitedOn > shanghaiDateKey(now())) throw inputError('invalid_input', 'visit date cannot be in the future', 400);
      const timestamp = now();
      const footprint: VercelFootprint = { id: crypto.randomUUID(), experienceId, ...input, memberId, createdAt: timestamp };
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'footprint.created', createdAt: timestamp, memberId, payload: footprint }));
      state.footprints.set(footprint.id, footprint);
      return json({ footprint: footprintPayload(state, footprint) }, 201);
    }
    return methodNotAllowed(['GET', 'POST']);
  }
  if (route === 'footprint') {
    if (request.method !== 'DELETE') return methodNotAllowed(['DELETE']);
    const id = cleanId(params.id);
    if (!state.footprints.has(id)) throw inputError('footprint_not_found', 'Footprint not found', 404);
    const media = [...state.media.values()].filter((item) => item.ownerType === 'footprint' && item.ownerId === id);
    await Promise.all(media.map((item) => del(item.pathname)));
    const timestamp = now();
    const experienceId = state.footprints.get(id)?.experienceId as string;
    await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'footprint.deleted', createdAt: timestamp, memberId, payload: { id } }));
    applyVercelEvent(state, { version: 1, id: 'local', type: 'footprint.deleted', createdAt: timestamp, memberId, payload: { id } });
    return json({ deletedFootprintId: id, experience: experiencePayload(state, requireExperience(state, experienceId)) });
  }
  if (route === 'plans') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const experienceId = cleanId(params.id);
    requireExperience(state, experienceId);
    const input = parsePlanInput(await readJson(request));
    if (new Date(input.scheduledFor).valueOf() <= Date.now()) throw inputError('invalid_input', 'scheduledFor must be in the future', 400);
    const timestamp = now();
    const plan: VercelPlan = {
      id: crypto.randomUUID(),
      experienceId,
      ...input,
      status: 'pending',
      createdByMemberId: memberId,
      targetMemberId: memberId === 'toni' ? 'rosalie' : 'toni',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'plan.created', createdAt: timestamp, memberId, payload: plan }));
    return json({ plan: planPayload(plan) }, 201);
  }
  if (route === 'planRespond') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const id = cleanId(params.id);
    const plan = state.plans.get(id);
    if (!plan || plan.status !== 'pending' || plan.targetMemberId !== memberId) throw inputError('plan_not_found', 'Pending Plan not found', 404);
    const input = parsePlanResponse(await readJson(request));
    const timestamp = now();
    await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'plan.responded', createdAt: timestamp, memberId, payload: { id, status: input.status, updatedAt: timestamp } }));
    return json({ plan: planPayload({ ...plan, status: input.status, updatedAt: timestamp }) });
  }
  if (route === 'notifications') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const notifications = [...state.plans.values()]
      .filter((plan) => plan.targetMemberId === memberId && plan.status === 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((plan) => ({ id: plan.id, type: 'plan', createdAt: plan.createdAt, plan: planPayload(plan) }));
    return json({ notifications });
  }
  if (route === 'calendar') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const timestamp = now();
    const entries = [
      ...[...state.footprints.values()]
        .filter((item) => item.visitedOn <= shanghaiDateKey(timestamp))
        .map((item) => ({ id: `footprint:${item.id}`, footprintId: item.id, type: 'footprint', date: item.visitedOn, experienceId: item.experienceId, experienceName: state.experiences.get(item.experienceId)?.name ?? '', memberIds: [item.memberId] })),
      ...[...state.plans.values()]
        .filter((item) => item.status === 'accepted' && item.scheduledFor >= timestamp)
        .map((item) => ({ id: `plan:${item.id}`, type: 'plan', date: item.scheduledFor, experienceId: item.experienceId, experienceName: state.experiences.get(item.experienceId)?.name ?? '', memberIds: [item.createdByMemberId, item.targetMemberId], status: item.status })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    return json({ entries });
  }
  if (route === 'legacyImport') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const timestamp = now();
    const items = parseLegacyImport(await readJson(request));
    const requiresDates = items.filter((item) => !item.visitedOn).map((item) => item.experienceId);
    let imported = 0;
    for (const item of items) {
      if (!item.visitedOn || !state.experiences.has(item.experienceId)) continue;
      if (item.visitedOn > shanghaiDateKey(timestamp)) throw inputError('invalid_input', 'visit date cannot be in the future', 400);
      const duplicate = [...state.footprints.values()].some((footprint) => footprint.experienceId === item.experienceId && footprint.memberId === memberId && footprint.visitedOn === item.visitedOn);
      if (duplicate) continue;
      const footprint: VercelFootprint = { id: crypto.randomUUID(), experienceId: item.experienceId, visitedOn: item.visitedOn, rating: item.rating, comment: item.comment, memberId, createdAt: timestamp };
      await appendEvent(writeEvent({ version: 1, id: crypto.randomUUID(), type: 'footprint.created', createdAt: timestamp, memberId, payload: footprint }));
      state.footprints.set(footprint.id, footprint);
      imported += 1;
    }
    return json({ imported, skipped: items.length - requiresDates.length - imported, requiresDates });
  }
  if (route === 'experienceMediaUpload') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const experienceId = cleanId(params.id);
    const media = await uploadMedia(request, state, memberId, 'experience', experienceId);
    const experience = requireExperience(state, experienceId);
    experience.coverMediaId = media.id;
    return json({ media: { id: media.id, url: `/api/media/${media.id}`, mimeType: media.mimeType }, experience: experiencePayload(state, experience) }, 201);
  }
  if (route === 'mediaUpload') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const media = await uploadMedia(request, state, memberId, 'footprint', cleanId(params.id));
    return json({ media: { id: media.id, url: `/api/media/${media.id}`, mimeType: media.mimeType } }, 201);
  }
  if (route === 'media') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const media = state.media.get(cleanId(params.id));
    if (!media) throw inputError('media_not_found', 'Media not found', 404);
    const object = await get(media.pathname, { access: 'private', useCache: false });
    if (!object || object.statusCode !== 200) throw inputError('media_not_found', 'Media not found', 404);
    return new Response(object.stream, {
      headers: {
        'cache-control': 'private, no-store',
        'content-length': String(media.byteSize),
        'content-type': media.mimeType,
        'content-security-policy': "default-src 'none'; sandbox",
        'x-content-type-options': 'nosniff',
      },
    });
  }
  throw new Error('Unknown Vercel API route');
}

export async function handleVercelApiRequest(
  request: Request,
  route: ApiRoute,
  params: { id?: string },
): Promise<Response> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw inputError('storage_not_configured', 'Shared storage is not configured', 503);
    const context = await requestContext(request);
    if (route === 'setupStatus') {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      return json({ configured: true });
    }
    if (route === 'setup') return json({ error: { code: 'already_configured', message: 'The shared space is already configured' } }, 409);
    if (route === 'unlock') return json(sessionPayload(context));
    return protectedRoute(request, route, params, context);
  } catch (error) {
    return apiError(error);
  }
}
