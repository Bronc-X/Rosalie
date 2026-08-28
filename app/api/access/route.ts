import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  ACCESS_TTL_MS,
  PLAYER_COOKIE,
  PLAYER_TTL_MS,
  createAccessToken,
  createPlayerToken,
  matchesAccessPassword,
  readPlayerId,
} from '@/lib/access.mjs';
import {
  getRequestClientKey,
  readBoundedJson,
  takeRateLimit,
  validateJsonMutation,
} from '@/lib/request-security.mjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const mutation = validateJsonMutation(request);
  if (!mutation.ok) {
    return NextResponse.json({ ok: false, error: mutation.error }, {
      status: mutation.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const rate = takeRateLimit({
    scope: 'access',
    key: getRequestClientKey(request.headers),
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMITED' }, {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfter) },
    });
  }

  const expectedHash = process.env.SITE_PASSWORD_HASH;
  const secret = process.env.ACCESS_SECRET;
  if (!expectedHash || !secret) {
    return NextResponse.json({ ok: false, error: 'ACCESS_NOT_CONFIGURED' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const parsed = await readBoundedJson(request, 1_024, 'INVALID_REQUEST');
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, {
      status: parsed.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const body = parsed.value as { password?: unknown };
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!(await matchesAccessPassword(password, expectedHash))) {
    return NextResponse.json({ ok: false, error: 'WRONG_PASSWORD' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const response = NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
  response.cookies.set(ACCESS_COOKIE, await createAccessToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(ACCESS_TTL_MS / 1_000),
    path: '/',
  });
  const playerId = await readPlayerId(request.cookies.get(PLAYER_COOKIE)?.value, secret)
    ?? crypto.randomUUID();
  response.cookies.set(PLAYER_COOKIE, await createPlayerToken(secret, playerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(PLAYER_TTL_MS / 1_000),
    path: '/',
  });
  return response;
}
