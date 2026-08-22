import type { NextRequest, NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  PLAYER_COOKIE,
  PLAYER_TTL_MS,
  createPlayerToken,
  readPlayerId,
  verifyAccessToken,
} from '@/lib/access.mjs';

type PlayerSession = {
  ok: true;
  playerId: string;
  freshToken: string | null;
} | {
  ok: false;
  error: 'LOCKED' | 'ACCESS_NOT_CONFIGURED';
};

export async function resolvePlayerSession(request: NextRequest): Promise<PlayerSession> {
  const secret = process.env.ACCESS_SECRET ?? '';
  if (!secret) return { ok: false, error: 'ACCESS_NOT_CONFIGURED' };
  if (!(await verifyAccessToken(request.cookies.get(ACCESS_COOKIE)?.value, secret))) {
    return { ok: false, error: 'LOCKED' };
  }

  const existingId = await readPlayerId(request.cookies.get(PLAYER_COOKIE)?.value, secret);
  if (existingId) return { ok: true, playerId: existingId, freshToken: null };

  const playerId = crypto.randomUUID();
  return {
    ok: true,
    playerId,
    freshToken: await createPlayerToken(secret, playerId),
  };
}

export function attachPlayerCookie(response: NextResponse, session: Extract<PlayerSession, { ok: true }>) {
  if (!session.freshToken) return response;
  response.cookies.set(PLAYER_COOKIE, session.freshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(PLAYER_TTL_MS / 1_000),
    path: '/',
  });
  return response;
}
