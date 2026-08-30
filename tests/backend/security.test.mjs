import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const security = await import('../../lib/server/security.ts').catch(() => null);

describe('shared-space security primitives', () => {
  test('derives a peppered PBKDF2 verifier and checks keys without storing the key', async () => {
    assert.equal(typeof security?.deriveKeyVerifier, 'function');

    const verifier = await security.deriveKeyVerifier('correct horse battery staple', {
      pepper: 'deployment-only-pepper',
      salt: new Uint8Array(16).fill(7),
      iterations: 10_000,
    });

    assert.match(verifier.salt, /^[A-Za-z0-9_-]+$/);
    assert.match(verifier.hash, /^[A-Za-z0-9_-]+$/);
    assert.equal(verifier.iterations, 10_000);
    assert.equal(JSON.stringify(verifier).includes('correct horse'), false);
    assert.equal(
      await security.verifySharedKey(
        'correct horse battery staple',
        verifier,
        'deployment-only-pepper',
      ),
      true,
    );
    assert.equal(
      await security.verifySharedKey('wrong key', verifier, 'deployment-only-pepper'),
      false,
    );
  });

  test('issues opaque session material and stores only its digest', async () => {
    assert.equal(typeof security?.createSessionMaterial, 'function');

    const first = await security.createBoundSessionMaterial('deployment-only-pepper');
    const second = await security.createBoundSessionMaterial('deployment-only-pepper');

    assert.notEqual(first.token, second.token);
    assert.match(first.token, /^[A-Za-z0-9_-]{40,}$/);
    assert.match(first.digest, /^[a-f0-9]{64}$/);
    assert.match(first.csrfToken, /^[A-Za-z0-9_-]{30,}$/);
    assert.match(first.csrfDigest, /^[a-f0-9]{64}$/);
    assert.equal(first.digest.includes(first.token), false);
    assert.equal(first.csrfDigest.includes(first.csrfToken), false);
  });

  test('builds a 12-hour secure HttpOnly same-site cookie', () => {
    assert.equal(typeof security?.sessionCookie, 'function');

    const cookie = security.sessionCookie('opaque-token', 12 * 60 * 60);
    assert.match(cookie, /^tr_session=opaque-token;/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Max-Age=43200/i);
    assert.match(cookie, /Path=\//i);
  });

  test('rejects write requests with a missing or foreign Origin', () => {
    assert.equal(typeof security?.assertTrustedOrigin, 'function');

    const good = new Request('https://experience.example/api/experiences', {
      method: 'POST',
      headers: { origin: 'https://experience.example' },
    });
    assert.doesNotThrow(() => security.assertTrustedOrigin(good));

    const missing = new Request('https://experience.example/api/experiences', {
      method: 'POST',
    });
    assert.throws(() => security.assertTrustedOrigin(missing), /origin/i);

    const foreign = new Request('https://experience.example/api/experiences', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });
    assert.throws(() => security.assertTrustedOrigin(foreign), /origin/i);
  });

  test('requires the session-bound CSRF token on writes', () => {
    assert.equal(typeof security?.assertCsrf, 'function');

    const request = new Request('https://experience.example/api/experiences', {
      method: 'POST',
      headers: { 'x-csrf-token': 'session-csrf' },
    });
    assert.doesNotThrow(() => security.assertCsrf(request, 'session-csrf'));
    assert.throws(() => security.assertCsrf(request, 'different'), /csrf/i);
  });

  test('validates CSRF against a stored digest and can re-derive it from the opaque session token', async () => {
    assert.equal(typeof security?.deriveCsrfToken, 'function');
    assert.equal(typeof security?.assertCsrfDigest, 'function');
    const material = await security.createBoundSessionMaterial('deployment-only-pepper');
    assert.equal(
      await security.deriveCsrfToken(material.token, 'deployment-only-pepper'),
      material.csrfToken,
    );
    const request = new Request('https://experience.example/api/experiences', {
      method: 'POST',
      headers: { 'x-csrf-token': material.csrfToken },
    });
    await assert.doesNotReject(() => security.assertCsrfDigest(request, material.csrfDigest));
    await assert.rejects(
      () => security.assertCsrfDigest(request, '0'.repeat(64)),
      /csrf/i,
    );
  });
});

