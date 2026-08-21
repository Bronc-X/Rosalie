import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  ACCESS_TTL_MS,
  createAccessToken,
  matchesAccessPassword,
} from '@/lib/access.mjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 1_024) {
    return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 413 });
  }

  const expectedHash = process.env.SITE_PASSWORD_HASH;
  const secret = process.env.ACCESS_SECRET;
  if (!expectedHash || !secret) {
    return NextResponse.json({ ok: false, error: 'ACCESS_NOT_CONFIGURED' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  let password = '';
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 400 });
  }

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
  return response;
}

