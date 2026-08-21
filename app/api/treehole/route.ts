import { get, list, put } from '@vercel/blob';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, verifyAccessToken } from '@/lib/access.mjs';
import { normalizeTreeholeMessage } from '@/lib/treehole.mjs';

export const runtime = 'nodejs';

type TreeholeMessage = {
  id: string;
  text: string;
  createdAt: string;
};

async function isAuthorized(request: NextRequest) {
  return verifyAccessToken(
    request.cookies.get(ACCESS_COOKIE)?.value,
    process.env.ACCESS_SECRET ?? '',
  );
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isTreeholeMessage(value: unknown): value is TreeholeMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TreeholeMessage>;
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && typeof candidate.createdAt === 'string';
}

async function readMessage(pathname: string) {
  try {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const value: unknown = await new Response(result.stream).json();
    return isTreeholeMessage(value) ? value : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return json({ ok: false, error: 'LOCKED' }, 401);

  try {
    const result = await list({ prefix: 'treehole/', limit: 24 });
    const messages = (await Promise.all(result.blobs.map((blob) => readMessage(blob.pathname))))
      .filter((message): message is TreeholeMessage => message !== null)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    return json({ ok: true, messages });
  } catch {
    return json({ ok: false, error: 'TREEHOLE_UNAVAILABLE' }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return json({ ok: false, error: 'LOCKED' }, 401);
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

  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const reverseTimestamp = String(9_999_999_999_999 - Date.now()).padStart(13, '0');
  const message: TreeholeMessage = { id, text: normalized.value, createdAt };

  try {
    await put(`treehole/${reverseTimestamp}-${id}.json`, JSON.stringify(message), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
    });
    return json({ ok: true, message }, 201);
  } catch {
    return json({ ok: false, error: 'TREEHOLE_UNAVAILABLE' }, 503);
  }
}

