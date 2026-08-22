import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import { normalizeScheduleEntry } from '@/lib/schedule.mjs';
import type { ScheduleEntry } from '@/lib/schedule.mjs';
import {
  hasVercelBlobStorage,
  insertVercelScheduleEntry,
  listVercelScheduleEntries,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
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
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return json({ ok: false, error: 'ORIGIN_REJECTED' }, 403);
  if (Number(request.headers.get('content-length') ?? 0) > 8_192) {
    return json({ ok: false, error: 'ENTRY_TOO_LARGE' }, 413);
  }
  if (!hasVercelBlobStorage()) return json({ ok: false, error: 'SCHEDULE_UNAVAILABLE' }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'INVALID_REQUEST' }, 400);
  }

  const normalized = normalizeScheduleEntry(body);
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
