import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ensureSiteSchema } from '@/lib/site-database';
import { normalizeProgressUpdate } from '@/lib/player-progress.mjs';
import { attachPlayerCookie, resolvePlayerSession } from '@/lib/player-session';
import { readBoundedJson, validateJsonMutation } from '@/lib/request-security.mjs';
import { SELECT_PROGRESS_SQL, UPSERT_PROGRESS_SQL } from '@/lib/site-schema.mjs';
import {
  readVercelProgress,
  usesVercelBlob,
  writeVercelProgress,
} from '@/lib/vercel-blob-storage';

export const runtime = 'nodejs';

type ProgressRow = {
  game_id: string;
  current_level: number;
  best_score: number;
  updated_at: string;
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
      return attachPlayerCookie(json({ ok: true, progress: await readVercelProgress(session.playerId) }), session);
    }
    const database = await ensureSiteSchema();
    const result = await database.prepare(SELECT_PROGRESS_SQL).bind(session.playerId).all<ProgressRow>();
    const progress = Object.fromEntries(result.results.map((row) => [row.game_id, {
      gameId: row.game_id,
      level: row.current_level,
      bestScore: row.best_score,
      updatedAt: row.updated_at,
    }]));
    return attachPlayerCookie(json({ ok: true, progress }), session);
  } catch {
    return json({ ok: false, error: 'PROGRESS_UNAVAILABLE' }, 503);
  }
}

export async function PUT(request: NextRequest) {
  const session = await resolvePlayerSession(request);
  if (!session.ok) return json({ ok: false, error: session.error }, session.error === 'LOCKED' ? 401 : 503);
  const mutation = validateJsonMutation(request);
  if (!mutation.ok) return json({ ok: false, error: mutation.error }, mutation.status);
  const parsed = await readBoundedJson(request, 2_048, 'PROGRESS_TOO_LARGE');
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  const normalized = normalizeProgressUpdate(parsed.value);
  if (!normalized.ok) return json({ ok: false, error: normalized.error }, 400);

  const updatedAt = new Date().toISOString();
  try {
    if (usesVercelBlob()) {
      const saved = await writeVercelProgress(session.playerId, normalized.value);
      return attachPlayerCookie(json({ ok: true, progress: { ...saved, updatedAt } }), session);
    }
    const database = await ensureSiteSchema();
    await database.prepare(UPSERT_PROGRESS_SQL).bind(
      session.playerId,
      normalized.value.gameId,
      normalized.value.level,
      normalized.value.bestScore,
      updatedAt,
    ).run();
    return attachPlayerCookie(json({ ok: true, progress: { ...normalized.value, updatedAt } }), session);
  } catch {
    return json({ ok: false, error: 'PROGRESS_UNAVAILABLE' }, 503);
  }
}
