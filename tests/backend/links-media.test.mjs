import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const links = await import('../../lib/server/google-maps.ts').catch(() => null);
const media = await import('../../lib/server/media.ts').catch(() => null);
const CANONICAL_GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/%E5%85%AC%E5%9B%AD%E8%B7%AF%E7%89%9B%E8%82%89%E4%B8%B8/@23.354573,116.683161,17z';

describe('Quick Add link handling', () => {
  test('only exact HTTPS Google Maps hosts are eligible for server fetching', () => {
    assert.equal(typeof links?.classifyQuickAddUrl, 'function');

    assert.equal(
      links.classifyQuickAddUrl('https://maps.app.goo.gl/AbCd').kind,
      'google_maps',
    );
    assert.equal(
      links.classifyQuickAddUrl('https://www.google.com/maps/place/Test').kind,
      'google_maps',
    );
    assert.equal(
      links.classifyQuickAddUrl('https://instagram.com/p/example').kind,
      'link_only',
    );
    assert.throws(
      () => links.classifyQuickAddUrl('http://maps.app.goo.gl/AbCd'),
      /https/i,
    );
    assert.equal(
      links.classifyQuickAddUrl('https://maps.app.goo.gl.evil.example/x').kind,
      'link_only',
    );
  });

  test('validates every manual redirect before following it', async () => {
    assert.equal(typeof links?.previewGoogleMapsUrl, 'function');
    const requested = [];
    const fetcher = async (input, init) => {
      requested.push({ url: String(input), redirect: init?.redirect });
      if (requested.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://evil.example/steal' },
        });
      }
      throw new Error('must not fetch foreign redirect');
    };

    await assert.rejects(
      () =>
        links.previewGoogleMapsUrl('https://maps.app.goo.gl/AbCd', {
          fetcher,
          timeoutMs: 100,
        }),
      /redirect|host/i,
    );
    assert.deepEqual(requested, [
      { url: 'https://maps.app.goo.gl/AbCd', redirect: 'manual' },
    ]);
  });

  test('extracts an editable partial preview from a final Google Maps URL', async () => {
    assert.equal(typeof links?.previewGoogleMapsUrl, 'function');
    const html = `<!doctype html><meta property="og:title" content="A &amp; B"><meta property="og:description" content="12 Paper Road">`;
    const fetcher = async () =>
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html', 'content-length': String(html.length) },
      });

    const preview = await links.previewGoogleMapsUrl(
      'https://www.google.com/maps/place/A+B/@23.375798,116.694295,17z',
      { fetcher, timeoutMs: 100 },
    );

    assert.equal(preview.title, 'A & B');
    assert.equal(preview.address, '12 Paper Road');
    assert.deepEqual(preview.coordinates, {
      lat: 23.375798,
      lng: 116.694295,
      system: 'wgs84',
    });
    assert.equal(preview.status, 'extracted');
    assert.equal(preview.openingHours, '');
    assert.equal(preview.notes, '');
    assert.equal(preview.imageUrl, '');
  });

  test('falls back to the canonical Google URL title and coordinates when fetch times out', async () => {
    assert.equal(typeof links?.previewGoogleMapsUrl, 'function');
    const preview = await links.previewGoogleMapsUrl(CANONICAL_GOOGLE_MAPS_URL, {
      fetcher: async () => {
        throw new DOMException('The operation was aborted', 'AbortError');
      },
      timeoutMs: 100,
    });

    assert.deepEqual(preview, {
      status: 'partial',
      sourceUrl: CANONICAL_GOOGLE_MAPS_URL,
      title: '公园路牛肉丸',
      address: '',
      openingHours: '',
      notes: '',
      imageUrl: '',
      coordinates: { lat: 23.354573, lng: 116.683161, system: 'wgs84' },
    });
  });

  test('never fetches ordinary links and returns a link-only preview', async () => {
    assert.equal(typeof links?.previewQuickAddUrl, 'function');
    let calls = 0;
    const result = await links.previewQuickAddUrl('https://www.xiaohongshu.com/explore/123', {
      fetcher: async () => {
        calls += 1;
        return new Response();
      },
    });

    assert.equal(calls, 0);
    assert.deepEqual(result, {
      status: 'link_only',
      sourceUrl: 'https://www.xiaohongshu.com/explore/123',
      title: '',
      address: '',
      openingHours: '',
      notes: '',
      imageUrl: '',
    });
  });

  test('cancels a streamed Google response as soon as it exceeds 256 KiB', async () => {
    assert.equal(typeof links?.previewGoogleMapsUrl, 'function');
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        pulls += 1;
        if (pulls > 8) return controller.close();
        controller.enqueue(new Uint8Array(128 * 1024).fill(65));
      },
      cancel() {
        cancelled = true;
      },
    });
    const fetcher = async () =>
      new Response(stream, { status: 200, headers: { 'content-type': 'text/html' } });

    await assert.rejects(
      () => links.previewGoogleMapsUrl('https://www.google.com/maps/place/Test', { fetcher }),
      /too large/i,
    );
    assert.equal(cancelled, true);
    assert.ok(pulls <= 4, `stream should stop early, pulled ${pulls} chunks`);
  });
});

describe('private R2 media validation', () => {
  test('accepts JPEG, PNG and WebP only when declared type matches file signature', () => {
    assert.equal(typeof media?.validateImageUpload, 'function');

    assert.doesNotThrow(() =>
      media.validateImageUpload(
        { type: 'image/jpeg', size: 4 },
        new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
      ),
    );
    assert.throws(
      () =>
        media.validateImageUpload(
          { type: 'image/png', size: 4 },
          new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
        ),
      /signature|content/i,
    );
    assert.throws(
      () =>
        media.validateImageUpload(
          { type: 'image/svg+xml', size: 20 },
          new TextEncoder().encode('<svg></svg>'),
        ),
      /type/i,
    );
  });

  test('rejects empty files and files over 10 MiB', () => {
    assert.equal(typeof media?.validateImageUpload, 'function');
    assert.throws(
      () =>
        media.validateImageUpload(
          { type: 'image/webp', size: 0 },
          new Uint8Array(),
        ),
      /empty/i,
    );
    assert.throws(
      () =>
        media.validateImageUpload(
          { type: 'image/webp', size: 10 * 1024 * 1024 + 1 },
          new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
        ),
      /10 mib/i,
    );
  });
});

