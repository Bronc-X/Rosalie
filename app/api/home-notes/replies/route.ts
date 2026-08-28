import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { normalizeHomeNoteReply } from '@/lib/home-notes.mjs';
import { ensureSiteSchema } from '@/lib/site-database';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import {
  getRequestClientKey,
  readBoundedJson,
  takeRateLimit,
  validateJsonMutation,
} from '@/lib/request-security.mjs';
import { INSERT_HOME_NOTE_REPLY_SQL } from '@/lib/site-schema.mjs';
import { insertVercelHomeNoteReply, usesVercelBlob } from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

type HomeNoteReply = {
  id: string;
  text: string;
  createdAt: string;
};

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

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const mutation = validateJsonMutation(request);
  if (!mutation.ok) return json({ ok: false, error: mutation.error }, mutation.status);
  const rate = takeRateLimit({
    scope: 'home-note-reply',
    key: getRequestClientKey(request.headers, session.playerId),
    limit: 24,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return json({ ok: false, error: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate.retryAfter) });
  }

  const parsed = await readBoundedJson(request, 4_096, 'REPLY_TOO_LARGE');
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.value as { noteId?: unknown; reply?: unknown };
  const normalized = normalizeHomeNoteReply(body?.noteId, body?.reply);
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const reply: HomeNoteReply = {
    id: crypto.randomUUID(),
    text: normalized.value.text,
    createdAt: new Date().toISOString(),
  };

  try {
    if (usesVercelBlob()) {
      const inserted = await insertVercelHomeNoteReply(normalized.value.noteId, reply);
      if (!inserted) return json({ ok: false, error: 'NOTE_NOT_FOUND' }, 404);
      return attachPlayerCookie(json({ ok: true, noteId: normalized.value.noteId, reply }, 201), session);
    }
    const database = await ensureSiteSchema();
    await database
      .prepare(INSERT_HOME_NOTE_REPLY_SQL)
      .bind(reply.id, normalized.value.noteId, session.playerId, reply.text, reply.createdAt)
      .run();
    return attachPlayerCookie(json({ ok: true, noteId: normalized.value.noteId, reply }, 201), session);
  } catch {
    return json({ ok: false, error: 'HOME_NOTES_UNAVAILABLE' }, 503);
  }
}
