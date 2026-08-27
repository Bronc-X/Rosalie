import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureSiteSchema } from '@/lib/site-database';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import { INSERT_TREEHOLE_REPLY_SQL } from '@/lib/site-schema.mjs';
import { normalizeTreeholeReply } from '@/lib/treehole.mjs';
import { insertVercelReply, usesVercelBlob } from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return json({ ok: false, error: 'ORIGIN_REJECTED' }, 403);
  if (Number(request.headers.get('content-length') ?? 0) > 4_096) {
    return json({ ok: false, error: 'REPLY_TOO_LARGE' }, 413);
  }

  let normalized;
  try {
    const body = await request.json() as { messageId?: unknown; reply?: unknown };
    normalized = normalizeTreeholeReply(body.messageId, body.reply);
  } catch {
    return json({ ok: false, error: 'INVALID_REQUEST' }, 400);
  }
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const reply: TreeholeReply = {
    id: crypto.randomUUID(),
    text: normalized.value.text,
    createdAt: new Date().toISOString(),
  };

  try {
    if (usesVercelBlob()) {
      const inserted = await insertVercelReply(normalized.value.messageId, reply);
      if (!inserted) return json({ ok: false, error: 'MESSAGE_NOT_FOUND' }, 404);
      return attachPlayerCookie(json({ ok: true, messageId: normalized.value.messageId, reply }, 201), session);
    }
    const database = await ensureSiteSchema();
    await database
      .prepare(INSERT_TREEHOLE_REPLY_SQL)
      .bind(reply.id, normalized.value.messageId, session.playerId, reply.text, reply.createdAt)
      .run();
    return attachPlayerCookie(json({ ok: true, messageId: normalized.value.messageId, reply }, 201), session);
  } catch {
    return json({ ok: false, error: 'TREEHOLE_UNAVAILABLE' }, 503);
  }
}
