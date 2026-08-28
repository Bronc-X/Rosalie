import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { normalizeHomeNote } from '@/lib/home-notes.mjs';
import { ensureSiteSchema } from '@/lib/site-database';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import {
  getRequestClientKey,
  readBoundedJson,
  takeRateLimit,
  validateJsonMutation,
} from '@/lib/request-security.mjs';
import {
  INSERT_HOME_NOTE_SQL,
  SELECT_HOME_NOTES_SQL,
  SELECT_HOME_NOTE_REPLIES_SQL,
} from '@/lib/site-schema.mjs';
import {
  insertVercelHomeNote,
  listVercelHomeNotes,
  usesVercelBlob,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

type HomeNoteRow = {
  id: string;
  text: string;
  created_at: string;
};

type HomeNoteReplyRow = {
  id: string;
  note_id: string;
  text: string;
  created_at: string;
};

type HomeNoteReply = {
  id: string;
  text: string;
  createdAt: string;
};

type HomeNote = {
  id: string;
  text: string;
  createdAt: string;
  replies: HomeNoteReply[];
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

export async function GET(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);

  try {
    if (usesVercelBlob()) {
      return attachPlayerCookie(json({ ok: true, notes: await listVercelHomeNotes() }), session);
    }
    const database = await ensureSiteSchema();
    const [result, replyResult] = await Promise.all([
      database.prepare(SELECT_HOME_NOTES_SQL).bind(24).all<HomeNoteRow>(),
      database.prepare(SELECT_HOME_NOTE_REPLIES_SQL).bind(24).all<HomeNoteReplyRow>(),
    ]);
    const repliesByNote = new Map<string, HomeNoteReply[]>();
    for (const row of replyResult.results) {
      const replies = repliesByNote.get(row.note_id) ?? [];
      replies.push({ id: row.id, text: row.text, createdAt: row.created_at });
      repliesByNote.set(row.note_id, replies);
    }
    const notes: HomeNote[] = result.results.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      replies: repliesByNote.get(row.id) ?? [],
    }));
    return attachPlayerCookie(json({ ok: true, notes }), session);
  } catch {
    return json({ ok: false, error: 'HOME_NOTES_UNAVAILABLE' }, 503);
  }
}

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const mutation = validateJsonMutation(request);
  if (!mutation.ok) return json({ ok: false, error: mutation.error }, mutation.status);
  const rate = takeRateLimit({
    scope: 'home-note',
    key: getRequestClientKey(request.headers, session.playerId),
    limit: 16,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return json({ ok: false, error: 'RATE_LIMITED' }, 429, { 'Retry-After': String(rate.retryAfter) });
  }

  const parsed = await readBoundedJson(request, 4_096, 'NOTE_TOO_LARGE');
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const body = parsed.value as { note?: unknown };
  const normalized = normalizeHomeNote(body?.note);
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const note: HomeNote = {
    id: crypto.randomUUID(),
    text: normalized.value,
    createdAt: new Date().toISOString(),
    replies: [],
  };

  try {
    if (usesVercelBlob()) {
      await insertVercelHomeNote(note);
      return attachPlayerCookie(json({ ok: true, note }, 201), session);
    }
    const database = await ensureSiteSchema();
    await database
      .prepare(INSERT_HOME_NOTE_SQL)
      .bind(note.id, session.playerId, note.text, note.createdAt)
      .run();
    return attachPlayerCookie(json({ ok: true, note }, 201), session);
  } catch {
    return json({ ok: false, error: 'HOME_NOTES_UNAVAILABLE' }, 503);
  }
}
