const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = 'tr_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const DEFAULT_PBKDF2_ITERATIONS = 310_000;

export type KeyVerifier = {
  salt: string;
  hash: string;
  iterations: number;
};

export class SecurityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.status = status;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function pbkdf2(
  key: string,
  pepper: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(iterations) || iterations < 10_000) {
    throw new TypeError('PBKDF2 iterations must be an integer of at least 10000');
  }
  if (!pepper) throw new TypeError('AUTH_PEPPER_V1 is required');

  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${pepper}\u0000${key}`),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function deriveKeyVerifier(
  key: string,
  options: {
    pepper: string;
    salt?: Uint8Array;
    iterations?: number;
  },
): Promise<KeyVerifier> {
  const salt = options.salt ?? randomBytes(16);
  if (salt.byteLength < 16) throw new TypeError('Key salt must be at least 16 bytes');
  const iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const hash = await pbkdf2(key, options.pepper, salt, iterations);
  return {
    salt: bytesToBase64Url(salt),
    hash: bytesToBase64Url(hash),
    iterations,
  };
}

export async function verifySharedKey(
  key: string,
  verifier: KeyVerifier,
  pepper: string,
): Promise<boolean> {
  try {
    const expected = base64UrlToBytes(verifier.hash);
    const actual = await pbkdf2(
      key,
      pepper,
      base64UrlToBytes(verifier.salt),
      verifier.iterations,
    );
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const input = typeof value === 'string' ? encoder.encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input as BufferSource));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createSessionMaterial(): Promise<{
  token: string;
  digest: string;
  csrfToken: string;
  csrfDigest: string;
}> {
  const token = bytesToBase64Url(randomBytes(32));
  const csrfToken = bytesToBase64Url(randomBytes(24));
  return {
    token,
    digest: await sha256Hex(token),
    csrfToken,
    csrfDigest: await sha256Hex(csrfToken),
  };
}

export async function deriveCsrfToken(sessionToken: string, pepper: string): Promise<string> {
  if (!pepper) throw new TypeError('AUTH_PEPPER_V1 is required');
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    encoder.encode(`csrf\u0000${sessionToken}`),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createBoundSessionMaterial(pepper: string): Promise<{
  token: string;
  digest: string;
  csrfToken: string;
  csrfDigest: string;
}> {
  const token = bytesToBase64Url(randomBytes(32));
  const csrfToken = await deriveCsrfToken(token, pepper);
  return {
    token,
    digest: await sha256Hex(token),
    csrfToken,
    csrfDigest: await sha256Hex(csrfToken),
  };
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS): string {
  if (!Number.isSafeInteger(maxAge) || maxAge < 0) throw new TypeError('Invalid cookie lifetime');
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return sessionCookie('', 0);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key === name) return pair.slice(separator + 1).trim() || null;
  }
  return null;
}

export function assertTrustedOrigin(request: Request): void {
  const supplied = request.headers.get('origin');
  if (!supplied) throw new SecurityError('origin_required', 'A valid Origin header is required');
  let origin: string;
  try {
    origin = new URL(supplied).origin;
  } catch {
    throw new SecurityError('origin_invalid', 'The request Origin is invalid');
  }
  if (origin !== new URL(request.url).origin || supplied !== origin) {
    throw new SecurityError('origin_mismatch', 'The request Origin is not trusted');
  }
}

export function assertCsrf(request: Request, expected: string): void {
  const supplied = request.headers.get('x-csrf-token') ?? '';
  if (!supplied || !constantTimeEqual(encoder.encode(supplied), encoder.encode(expected))) {
    throw new SecurityError('csrf_invalid', 'The CSRF token is missing or invalid');
  }
}

export async function assertCsrfDigest(request: Request, expectedDigest: string): Promise<void> {
  const supplied = request.headers.get('x-csrf-token') ?? '';
  const suppliedDigest = supplied ? await sha256Hex(supplied) : '';
  if (!supplied || !constantTimeEqual(encoder.encode(suppliedDigest), encoder.encode(expectedDigest))) {
    throw new SecurityError('csrf_invalid', 'The CSRF token is missing or invalid');
  }
}
