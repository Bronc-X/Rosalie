export const ACCESS_COOKIE = 'rosalie_access';
export const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(first, second) {
  const length = Math.max(first.length, second.length);
  let mismatch = first.length ^ second.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function hmac(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))));
}

export async function hashAccessPassword(password) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(password)));
  return bytesToHex(new Uint8Array(digest));
}

export async function matchesAccessPassword(password, expectedHash) {
  if (typeof expectedHash !== 'string' || expectedHash.length !== 64) return false;
  return constantTimeEqual(await hashAccessPassword(password), expectedHash.toLowerCase());
}

export async function createAccessToken(secret, now = Date.now(), ttlMs = ACCESS_TTL_MS) {
  if (!secret) throw new Error('Access secret is required');
  const expiresAt = Math.floor(now + ttlMs);
  const payload = `v1.${expiresAt}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyAccessToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !secret) return false;
  const [version, expiresRaw, signature, extra] = token.split('.');
  const expiresAt = Number(expiresRaw);
  if (version !== 'v1' || extra !== undefined || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  const payload = `${version}.${expiresAt}`;
  return constantTimeEqual(signature ?? '', await hmac(payload, secret));
}

export function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname === '/unlock' ? '/' : value;
}

