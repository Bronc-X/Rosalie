import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureSiteSchema } from '@/lib/site-database';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import {
  INSERT_TREEHOLE_MESSAGE_SQL,
  SELECT_TREEHOLE_MESSAGES_SQL,
  SELECT_TREEHOLE_REPLIES_SQL,
} from '@/lib/site-schema.mjs';
import { normalizeTreeholeMessage } from '@/lib/treehole.mjs';
import {
  insertVercelMessage,
  listVercelMessages,
  usesVercelBlob,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

type TreeholeRow = {
  id: string;
  text: string;
  created_at: string;
};

type TreeholeMessage = {
  id: string;
  text: string;
  createdAt: string;
  replies: TreeholeReply[];
};

type TreeholeReplyRow = {
  id: string;
  message_id: string;
  text: string;
  created_at: string;
};

type TreeholeReply = {
  id: string;
  text: string;
  createdAt: string;
};

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

  try {
    if (usesVercelBlob()) {
      return attachPlayerCookie(json({ ok: true, messages: await listVercelMessages() }), session);
    }
    const database = await ensureSiteSchema();
    const [result, replyResult] = await Promise.all([
      database.prepare(SELECT_TREEHOLE_MESSAGES_SQL).bind(24).all<TreeholeRow>(),
      database.prepare(SELECT_TREEHOLE_REPLIES_SQL).bind(24).all<TreeholeReplyRow>(),
    ]);
    const repliesByMessage = new Map<string, TreeholeReply[]>();
    for (const row of replyResult.results) {
      const replies = repliesByMessage.get(row.message_id) ?? [];
      replies.push({ id: row.id, text: row.text, createdAt: row.created_at });
      repliesByMessage.set(row.message_id, replies);
    }
    const messages: TreeholeMessage[] = result.results.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      replies: repliesByMessage.get(row.id) ?? [],
    }));
    return attachPlayerCookie(json({ ok: true, messages }), session);
  } catch {
    return json({ ok: false, error: 'TREEHOLE_UNAVAILABLE' }, 503);
  }
}

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return json({ ok: false, error: 'ORIGIN_REJECTED' }, 403);
  if (Number(request.headers.get('content-length') ?? 0) > 4_096) {
    return json({ ok: false, error: 'MESSAGE_TOO_LARGE' }, 413);
  }

  let rawMessage: unknown;
  try {
    const body = await request.json() as { message?: unknown };
    rawMessage = body.message;
  } catch {
    return json({ ok: false, error: 'INVALID_REQUEST' }, 400);
  }

  const normalized = normalizeTreeholeMessage(rawMessage);
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const message: TreeholeMessage = {
    id: crypto.randomUUID(),
    text: normalized.value,
    createdAt: new Date().toISOString(),
    replies: [],
  };

  try {
    if (usesVercelBlob()) {
      await insertVercelMessage(message);
      return attachPlayerCookie(json({ ok: true, message }, 201), session);
    }
    const database = await ensureSiteSchema();
    await database
      .prepare(INSERT_TREEHOLE_MESSAGE_SQL)
      .bind(message.id, session.playerId, message.text, message.createdAt)
      .run();
    return attachPlayerCookie(json({ ok: true, message }, 201), session);
  } catch {
    return json({ ok: false, error: 'TREEHOLE_UNAVAILABLE' }, 503);
  }
}
