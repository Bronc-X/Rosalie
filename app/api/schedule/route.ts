import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import {
  getRequestClientKey,
  readBoundedJson,
  takeRateLimit,
  validateJsonMutation,
} from '@/lib/request-security.mjs';
import { normalizeScheduleEntry } from '@/lib/schedule.mjs';
import type { ScheduleEntry } from '@/lib/schedule.mjs';
import {
  hasVercelBlobStorage,
  insertVercelScheduleEntry,
  listVercelScheduleEntries,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  if (!hasVercelBlobStorage()) return json({ ok: false, error: 'SCHEDULE_UNAVAILABLE' }, 503);

  try {
    const entries = await listVercelScheduleEntries();
    return attachPlayerCookie(json({ ok: true, entries }), session);
  } catch {
    return json({ ok: false, error: 'SCHEDULE_UNAVAILABLE' }, 503);
  }
}

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const mutation = validateJsonMutation(request);
  if (!mutation.ok) return json({ ok: false, error: mutation.error }, mutation.status);
  const rate = takeRateLimit({
    scope: 'schedule-publish',
    key: getRequestClientKey(request.headers, session.playerId),
    limit: 12,
    windowMs: 60 * 60_000,
  });
  if (!rate.allowed) {
    return json({ ok: false, error: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate.retryAfter) });
  }
  if (!hasVercelBlobStorage()) return json({ ok: false, error: 'SCHEDULE_UNAVAILABLE' }, 503);

  const parsed = await readBoundedJson(request, 8_192, 'ENTRY_TOO_LARGE');
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const normalized = normalizeScheduleEntry(parsed.value);
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const entry: ScheduleEntry = {
    id: crypto.randomUUID(),
    ...normalized.value,
    createdAt: new Date().toISOString(),
  };

  try {
    await insertVercelScheduleEntry(entry);
    return attachPlayerCookie(json({ ok: true, entry }, 201), session);
  } catch {
    return json({ ok: false, error: 'SCHEDULE_UNAVAILABLE' }, 503);
  }
}
