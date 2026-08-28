const RATE_BUCKET_CAP = 2_048;
const rateBuckets = new Map();

function boundedKey(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return (candidate || fallback).slice(0, 160);
}

export function getRequestClientKey(headers, fallback = 'anonymous') {
  const forwarded = headers?.get?.('x-forwarded-for')?.split(',', 1)[0];
  const direct = headers?.get?.('x-real-ip');
  return boundedKey(forwarded || direct, boundedKey(fallback, 'anonymous'));
}

export function validateJsonMutation(request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if ((origin && origin !== new URL(request.url).origin) || fetchSite === 'cross-site') {
    return { ok: false, error: 'ORIGIN_REJECTED', status: 403 };
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return { ok: false, error: 'UNSUPPORTED_MEDIA_TYPE', status: 415 };
  }
  return { ok: true };
}

export async function readBoundedJson(
  request,
  maxBytes,
  tooLargeError = 'REQUEST_TOO_LARGE',
  invalidError = 'INVALID_REQUEST',
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('A positive body limit is required');
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, error: tooLargeError, status: 413 };
  }
  if (!request.body) return { ok: false, error: invalidError, status: 400 };

  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, error: tooLargeError, status: 413 };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: invalidError, status: 400 };
  }
}

export function takeRateLimit({ scope, key, limit, windowMs, now = Date.now() }) {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new TypeError('A positive rate limit and window are required');
  }

  if (rateBuckets.size >= RATE_BUCKET_CAP) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
    }
    if (rateBuckets.size >= RATE_BUCKET_CAP) rateBuckets.delete(rateBuckets.keys().next().value);
  }

  const bucketKey = `${boundedKey(scope, 'default')}:${boundedKey(key, 'anonymous')}`;
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
