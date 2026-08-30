import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const routes = [
  ['app/api/setup/status/route.ts', ['GET'], 'setupStatus'],
  ['app/api/setup/route.ts', ['POST'], 'setup'],
  ['app/api/session/route.ts', ['GET'], 'session'],
  ['app/api/auth/unlock/route.ts', ['POST'], 'unlock'],
  ['app/api/auth/profile/route.ts', ['POST'], 'profile'],
  ['app/api/auth/logout/route.ts', ['POST'], 'logout'],
  ['app/api/auth/rotate/route.ts', ['POST'], 'rotate'],
  ['app/api/places/route.ts', ['GET', 'POST'], 'places'],
  ['app/api/experiences/route.ts', ['GET', 'POST'], 'experiences'],
  ['app/api/experiences/preview/route.ts', ['POST'], 'preview'],
  ['app/api/experiences/[id]/route.ts', ['GET', 'PATCH', 'DELETE'], 'experience', true],
  ['app/api/experiences/[id]/media/route.ts', ['POST'], 'experienceMediaUpload', true],
  ['app/api/experiences/[id]/footprints/route.ts', ['GET', 'POST'], 'footprints', true],
  ['app/api/experiences/[id]/plans/route.ts', ['POST'], 'plans', true],
  ['app/api/notifications/route.ts', ['GET'], 'notifications'],
  ['app/api/plans/[id]/respond/route.ts', ['POST'], 'planRespond', true],
  ['app/api/calendar/route.ts', ['GET'], 'calendar'],
  ['app/api/import/legacy/route.ts', ['POST'], 'legacyImport'],
  ['app/api/footprints/[id]/media/route.ts', ['POST'], 'mediaUpload', true],
  ['app/api/footprints/[id]/route.ts', ['DELETE'], 'footprint', true],
  ['app/api/media/[id]/route.ts', ['GET'], 'media', true],
];

test('every public API path is wired to the tested handler and exports only intended methods', async () => {
  for (const [path, methods, routeName, dynamic] of routes) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8').catch(() => '');
    const factory = dynamic ? 'createDynamicRouteHandler' : 'createRouteHandler';
    assert.match(source, new RegExp(`${factory}\\(['"]${routeName}['"]\\)`), path);
    for (const method of methods) assert.match(source, new RegExp(`export const ${method}\\b`), `${path} ${method}`);
  }
});

test('runtime reads DB, MEDIA and pepper from Cloudflare bindings', async () => {
  const source = await readFile(new URL('../../lib/server/runtime.ts', import.meta.url), 'utf8').catch(() => '');
  assert.match(source, /from ['"]cloudflare:workers['"]/);
  assert.match(source, /\bDB\b/);
  assert.match(source, /\bMEDIA\b/);
  assert.match(source, /\bAUTH_PEPPER_V1\b/);
});

test('Vinext and Next leave multipart overhead above the 10 MiB image limit', async () => {
  const previousLifecycleScript = process.env.npm_lifecycle_script;
  try {
    process.env.npm_lifecycle_script = 'vinext dev';
    const vinextConfig = (await import('../../next.config.ts?upload-limit-vinext')).default;
    assert.equal(vinextConfig.experimental?.serverActions?.bodySizeLimit, '11mb');

    process.env.npm_lifecycle_script = 'next dev';
    const nextConfig = (await import('../../next.config.ts?upload-limit-next')).default;
    assert.equal(nextConfig.experimental?.proxyClientMaxBodySize, '11mb');
  } finally {
    if (previousLifecycleScript === undefined) delete process.env.npm_lifecycle_script;
    else process.env.npm_lifecycle_script = previousLifecycleScript;
  }
});

