import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_COOKIE, safeNextPath, verifyAccessToken } from '@/lib/access.mjs';

const PUBLIC_PATHS = new Set([
  '/unlock',
  '/api/access',
  '/favicon.svg',
  '/og.png',
  '/aurora-rainbow-bg.jpg',
  '/soft-pull-cursor.png',
  '/soft-pull-cursor.webp',
  '/soft-pull-controller.webp',
  '/match-rosette.png',
  '/match-rosette.webp',
  '/match-charm.png',
  '/match-charm.webp',
]);

export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const secret = process.env.ACCESS_SECRET ?? '';
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (await verifyAccessToken(token, secret)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'LOCKED' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = '/unlock';
  unlockUrl.search = '';
  unlockUrl.searchParams.set('next', safeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
};
