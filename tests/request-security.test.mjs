import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const security = await import('../lib/request-security.mjs').catch(() => ({}));

function mutationRequest({
  origin = 'https://rosalie.toni.asia',
  contentType = 'application/json',
  fetchSite = 'same-origin',
} = {}) {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  if (contentType !== null) headers.set('content-type', contentType);
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  return new Request('https://rosalie.toni.asia/api/example', { method: 'POST', headers });
}

test('JSON mutations accept same-origin browser requests and reject cross-site or form payloads', () => {
  assert.deepEqual(security.validateJsonMutation?.(mutationRequest()), { ok: true });
  assert.deepEqual(security.validateJsonMutation?.(mutationRequest({ origin: 'https://evil.example' })), {
    ok: false,
    error: 'ORIGIN_REJECTED',
    status: 403,
  });
  assert.deepEqual(security.validateJsonMutation?.(mutationRequest({ origin: null, fetchSite: 'cross-site' })), {
    ok: false,
    error: 'ORIGIN_REJECTED',
    status: 403,
  });
  assert.deepEqual(security.validateJsonMutation?.(mutationRequest({ contentType: 'text/plain' })), {
    ok: false,
    error: 'UNSUPPORTED_MEDIA_TYPE',
    status: 415,
  });
});

test('rate limits have deterministic windows and expose a retry delay', () => {
  const options = { scope: 'test-window', key: 'player-a', limit: 2, windowMs: 10_000 };
  assert.deepEqual(security.takeRateLimit?.({ ...options, now: 1_000 }), { allowed: true, retryAfter: 0 });
  assert.deepEqual(security.takeRateLimit?.({ ...options, now: 1_001 }), { allowed: true, retryAfter: 0 });
  assert.deepEqual(security.takeRateLimit?.({ ...options, now: 1_002 }), { allowed: false, retryAfter: 10 });
  assert.deepEqual(security.takeRateLimit?.({ ...options, now: 11_001 }), { allowed: true, retryAfter: 0 });
});

test('client keys are bounded and fall back to the signed player session', () => {
  const forwarded = new Headers({ 'x-forwarded-for': ` 203.0.113.7, ${'x'.repeat(300)}` });
  assert.equal(security.getRequestClientKey?.(forwarded, 'player-1'), '203.0.113.7');
  assert.equal(security.getRequestClientKey?.(new Headers(), 'player-1'), 'player-1');
});

test('JSON bodies are bounded by their actual bytes even without Content-Length', async () => {
  const valid = new Request('https://rosalie.toni.asia/api/example', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'ok' }),
  });
  assert.deepEqual(await security.readBoundedJson?.(valid, 64), {
    ok: true,
    value: { value: 'ok' },
  });

  const oversized = new Request('https://rosalie.toni.asia/api/example', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: '花'.repeat(80) }),
  });
  assert.deepEqual(await security.readBoundedJson?.(oversized, 64, 'BODY_TOO_LARGE'), {
    ok: false,
    error: 'BODY_TOO_LARGE',
    status: 413,
  });
});

test('every JSON mutation route uses the shared request guard', async () => {
  const routes = [
    'app/api/access/route.ts',
    'app/api/interview/route.ts',
    'app/api/progress/route.ts',
    'app/api/schedule/route.ts',
    'app/api/treehole/route.ts',
    'app/api/treehole/replies/route.ts',
    'app/api/home-notes/route.ts',
    'app/api/home-notes/replies/route.ts',
  ];
  for (const route of routes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), 'utf8');
    assert.match(source, /validateJsonMutation/, route);
  }
});

test('shared publishing and password routes apply abuse limits', async () => {
  const routes = [
    'app/api/access/route.ts',
    'app/api/schedule/route.ts',
    'app/api/treehole/route.ts',
    'app/api/treehole/replies/route.ts',
    'app/api/home-notes/route.ts',
    'app/api/home-notes/replies/route.ts',
  ];
  for (const route of routes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), 'utf8');
    assert.match(source, /takeRateLimit/, route);
    assert.match(source, /RATE_LIMITED/, route);
  }
});

test('the access proxy allowlist uses exact public paths rather than prefixes', async () => {
  const source = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');
  assert.match(source, /PUBLIC_PATHS/);
  assert.match(source, /PUBLIC_PATHS\.has\(request\.nextUrl\.pathname\)/);
  assert.doesNotMatch(source, /\(\?![^\n]*unlock\|api\/access/);
});
