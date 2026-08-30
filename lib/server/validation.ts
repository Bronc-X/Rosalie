export const EXPERIENCE_CATEGORIES = [
  'food_drink',
  'museum_exhibition',
  'shop_market',
  'entertainment',
  'outdoor_nature',
  'other',
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];
export type CoordinateSystem = 'gcj02' | 'wgs84' | 'bd09';
export type LocationStatus = 'verified' | 'pending';
export type RecommendationStatus = 'normal' | 'avoid';
export type ExperienceState = 'wishlist' | 'footprint';
export type PlanStatus = 'pending' | 'accepted' | 'declined';

const SHANGHAI_DATE_FORMAT = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function shanghaiDateKey(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new ValidationError('Timestamp is invalid');
  const parts = Object.fromEntries(
    SHANGHAI_DATE_FORMAT.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export class ValidationError extends Error {
  readonly status = 400;
  readonly code = 'invalid_input';
  readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label = 'request body'): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new ValidationError(`${label} is required`);
  const normalized = value.trim();
  if (!normalized) throw new ValidationError(`${label} is required`);
  if (normalized.length > max) throw new ValidationError(`${label} must be at most ${max} characters`);
  return normalized;
}

function nullableText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > max) throw new ValidationError(`${label} must be at most ${max} characters`);
  return normalized;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new ValidationError(`${label} is invalid`);
  }
  return value as T;
}

export function parsePlaceId(value: unknown): string {
  const id = requiredText(value, 'placeId', 64);
  if (!/^[a-z0-9](?:[a-z0-9_-]{0,63})$/u.test(id)) {
    throw new ValidationError('placeId is invalid');
  }
  return id;
}

export function parsePlaceInput(value: unknown): { name: string } {
  return { name: requiredText(record(value).name, 'name', 80) };
}

function parseHttpsUrl(value: unknown): string | null {
  const text = nullableText(value, 'sourceUrl', 2048);
  if (text === null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ValidationError('sourceUrl must be a valid HTTPS URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new ValidationError('sourceUrl must be a valid HTTPS URL without credentials');
  }
  return url.toString();
}

function parseCoordinates(value: unknown): {
  lat: number;
  lng: number;
  system: CoordinateSystem;
} | null {
  if (value === undefined || value === null) return null;
  const coordinates = record(value, 'coordinates');
  const lat = coordinates.lat;
  const lng = coordinates.lng;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) {
    throw new ValidationError('coordinates.lat is invalid');
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new ValidationError('coordinates.lng is invalid');
  }
  const system = oneOf(coordinates.system, ['gcj02', 'wgs84', 'bd09'] as const, 'coordinate system');
  return { lat, lng, system };
}

function parseTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new ValidationError('tags must contain at most 20 values');
  }
  const unique = new Set<string>();
  for (const tag of value) unique.add(requiredText(tag, 'tag', 40));
  return [...unique];
}

function inferSourceKind(sourceUrl: string | null): 'google_maps' | 'website' | 'instagram' | 'xiaohongshu' | 'other' | null {
  if (!sourceUrl) return null;
  const hostname = new URL(sourceUrl).hostname;
  if (
    hostname === 'maps.app.goo.gl' ||
    hostname === 'maps.google.com' ||
    ((hostname === 'google.com' || hostname === 'www.google.com') && new URL(sourceUrl).pathname.startsWith('/maps'))
  ) {
    return 'google_maps';
  }
  if (hostname === 'instagram.com' || hostname === 'www.instagram.com') return 'instagram';
  if (hostname === 'xiaohongshu.com' || hostname.endsWith('.xiaohongshu.com') || hostname === 'xhslink.com') {
    return 'xiaohongshu';
  }
  return 'website';
}

export type ExperienceInput = {
  placeId: string;
  name: string;
  category: ExperienceCategory;
  address: string | null;
  coordinates: { lat: number; lng: number; system: CoordinateSystem } | null;
  locationStatus: LocationStatus;
  locationNote: string | null;
  recommendationStatus: RecommendationStatus;
  state?: ExperienceState;
  sourceUrl: string | null;
  sourceKind: 'google_maps' | 'website' | 'instagram' | 'xiaohongshu' | 'other' | null;
  openingHours: string | null;
  notes: string | null;
  tags: string[];
};

export function parseExperienceInput(value: unknown): ExperienceInput;
export function parseExperienceInput(value: unknown, partial: true): Partial<ExperienceInput>;
export function parseExperienceInput(value: unknown, partial = false): ExperienceInput | Partial<ExperienceInput> {
  const input = record(value);
  if (input.imageUrl !== undefined) {
    throw new ValidationError('imageUrl is read-only; upload an Experience image instead');
  }
  const result: Partial<ExperienceInput> = {};

  if (!partial || input.placeId !== undefined) {
    result.placeId = input.placeId === undefined ? 'shantou' : parsePlaceId(input.placeId);
  }
  if (!partial || input.name !== undefined) result.name = requiredText(input.name, 'name', 200);
  if (!partial || input.category !== undefined) {
    result.category = oneOf(input.category, EXPERIENCE_CATEGORIES, 'category');
  }
  if (!partial || input.address !== undefined) result.address = nullableText(input.address, 'address', 500);
  if (!partial || input.coordinates !== undefined) result.coordinates = parseCoordinates(input.coordinates);
  if (!partial || input.locationStatus !== undefined) {
    const fallback = result.coordinates ? 'verified' : 'pending';
    result.locationStatus = input.locationStatus === undefined
      ? fallback
      : oneOf(input.locationStatus, ['verified', 'pending'] as const, 'locationStatus');
  }
  if (!partial || input.locationNote !== undefined) {
    result.locationNote = nullableText(input.locationNote, 'locationNote', 500);
  }
  if (!partial || input.recommendationStatus !== undefined) {
    result.recommendationStatus = input.recommendationStatus === undefined
      ? 'normal'
      : oneOf(input.recommendationStatus, ['normal', 'avoid'] as const, 'recommendationStatus');
  }
  if (input.state !== undefined) {
    result.state = oneOf(input.state, ['wishlist', 'footprint'] as const, 'state');
  }
  if (!partial || input.sourceUrl !== undefined) {
    result.sourceUrl = parseHttpsUrl(input.sourceUrl);
    result.sourceKind = input.sourceKind === undefined
      ? inferSourceKind(result.sourceUrl)
      : input.sourceKind === null
        ? null
        : oneOf(
            input.sourceKind,
            ['google_maps', 'website', 'instagram', 'xiaohongshu', 'other'] as const,
            'sourceKind',
          );
  } else if (input.sourceKind !== undefined) {
    result.sourceKind = input.sourceKind === null
      ? null
      : oneOf(
          input.sourceKind,
          ['google_maps', 'website', 'instagram', 'xiaohongshu', 'other'] as const,
          'sourceKind',
        );
  }
  if (!partial || input.openingHours !== undefined) {
    result.openingHours = nullableText(input.openingHours, 'openingHours', 1000);
  }
  if (!partial || input.notes !== undefined) result.notes = nullableText(input.notes, 'notes', 5000);
  if (!partial || input.tags !== undefined) result.tags = parseTags(input.tags);

  if (partial && Object.keys(result).length === 0) {
    throw new ValidationError('At least one Experience field is required');
  }
  return result as ExperienceInput | Partial<ExperienceInput>;
}

function validCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function parseFootprintInput(value: unknown): {
  visitedOn: string;
  rating: number | null;
  comment: string | null;
} {
  const input = record(value);
  const visitedOn = requiredText(input.visitedOn, 'visit date', 10);
  if (!validCalendarDate(visitedOn)) throw new ValidationError('visit date must be a real ISO date');
  const rating = input.rating === undefined || input.rating === null ? null : input.rating;
  if (rating !== null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) {
    throw new ValidationError('rating must be an integer from 1 to 5');
  }
  return {
    visitedOn,
    rating: rating as number | null,
    comment: nullableText(input.comment, 'comment', 5000),
  };
}

export function parsePlanInput(value: unknown): { scheduledFor: string; note: string | null } {
  const input = record(value);
  const scheduledFor = requiredText(input.scheduledFor, 'scheduledFor', 40);
  const date = new Date(scheduledFor);
  if (Number.isNaN(date.valueOf())) throw new ValidationError('scheduledFor must be a valid ISO date-time');
  return { scheduledFor: date.toISOString(), note: nullableText(input.note, 'note', 2000) };
}

export function parsePlanResponse(value: unknown): { status: 'accepted' | 'declined' } {
  const input = record(value);
  return { status: oneOf(input.status, ['accepted', 'declined'] as const, 'status') };
}

export function parseMemberSelection(value: unknown): 'toni' | 'rosalie' {
  return oneOf(record(value).memberId, ['toni', 'rosalie'] as const, 'memberId');
}

export function parseSharedKey(value: unknown): string {
  const key = record(value).key;
  if (typeof key !== 'string' || key.length < 9) {
    throw new ValidationError('Shared key must be at least 9 characters');
  }
  if (key.length > 256) throw new ValidationError('Shared key must be at most 256 characters');
  return key;
}

export function parseRotateKeyInput(value: unknown): { currentKey: string; newKey: string } {
  const input = record(value);
  return {
    currentKey: parseSharedKey({ key: input.currentKey }),
    newKey: parseSharedKey({ key: input.newKey }),
  };
}

export function parseLegacyImport(value: unknown): Array<{
  experienceId: string;
  visitedOn: string | null;
  rating: number | null;
  comment: string | null;
}> {
  const items = record(value).items;
  if (!Array.isArray(items) || items.length > 53) {
    throw new ValidationError('items must be an array with at most 53 records');
  }
  return items.map((item, index) => {
    const row = record(item, `items[${index}]`);
    const visitedOn = nullableText(row.visitedOn, `items[${index}].visitedOn`, 10);
    if (visitedOn !== null && !validCalendarDate(visitedOn)) {
      throw new ValidationError(`items[${index}].visitedOn must be a real ISO date`);
    }
    const rating = row.rating === undefined || row.rating === null ? null : row.rating;
    if (rating !== null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) {
      throw new ValidationError(`items[${index}].rating must be an integer from 1 to 5`);
    }
    return {
      experienceId: requiredText(row.experienceId, `items[${index}].experienceId`, 200),
      visitedOn,
      rating: rating as number | null,
      comment: nullableText(row.comment, `items[${index}].comment`, 5000),
    };
  });
}

export async function readJson(request: Request, maxBytes = 1024 * 1024): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new ValidationError('Request body is too large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ValidationError('Request body is too large');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError('Request body must contain valid JSON');
  }
}
