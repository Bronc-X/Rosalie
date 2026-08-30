import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const validation = await import('../../lib/server/validation.ts').catch(() => null);

describe('API input validation', () => {
  test('accepts a complete Experience and normalizes optional text and tags', () => {
    assert.equal(typeof validation?.parseExperienceInput, 'function');
    const value = validation.parseExperienceInput({
      name: '  Paper Museum  ',
      category: 'museum_exhibition',
      address: '  12 Paper Road ',
      coordinates: { lat: 23.3, lng: 116.7, system: 'gcj02' },
      locationStatus: 'verified',
      recommendationStatus: 'normal',
      sourceUrl: 'https://example.com/place',
      openingHours: 'Tue–Sun 10:00–18:00',
      notes: 'Bring a sketchbook',
      tags: [' quiet ', 'quiet', '纸艺'],
    });

    assert.deepEqual(value.tags, ['quiet', '纸艺']);
    assert.equal(value.name, 'Paper Museum');
    assert.equal(value.address, '12 Paper Road');
    assert.deepEqual(value.coordinates, { lat: 23.3, lng: 116.7, system: 'gcj02' });
    assert.equal(value.openingHours, 'Tue–Sun 10:00–18:00');
    assert.equal(value.notes, 'Bring a sketchbook');
    assert.equal(value.placeId, 'shantou');
    assert.equal('imageUrl' in value, false);
  });

  test('normalizes Place names and validates Experience place IDs', () => {
    assert.equal(typeof validation?.parsePlaceInput, 'function');
    assert.deepEqual(validation.parsePlaceInput({ name: '  潮州  ' }), { name: '潮州' });
    assert.throws(() => validation.parsePlaceInput({ name: '   ' }), /name/i);
    assert.throws(() => validation.parsePlaceInput({ name: 'x'.repeat(81) }), /80/i);

    assert.equal(
      validation.parseExperienceInput({ name: 'A place', category: 'other', placeId: 'guangzhou' }).placeId,
      'guangzhou',
    );
    assert.throws(
      () => validation.parseExperienceInput({ name: 'A place', category: 'other', placeId: '../foreign' }),
      /placeId/i,
    );
  });

  test('rejects invalid categories, partial coordinates, unsafe links and oversized text', () => {
    assert.equal(typeof validation?.parseExperienceInput, 'function');
    const base = { name: 'A place', category: 'other' };

    assert.throws(
      () => validation.parseExperienceInput({ ...base, category: 'restaurant' }),
      /category/i,
    );
    assert.throws(
      () => validation.parseExperienceInput({ ...base, coordinates: { lat: 23.3 } }),
      /coordinate/i,
    );
    assert.throws(
      () => validation.parseExperienceInput({ ...base, sourceUrl: 'javascript:alert(1)' }),
      /https/i,
    );
    assert.throws(
      () => validation.parseExperienceInput({ ...base, imageUrl: '/food/paper-museum.webp' }),
      /imageUrl.*read.only/i,
    );
    assert.throws(
      () => validation.parseExperienceInput({ ...base, name: 'x'.repeat(201) }),
      /name/i,
    );
  });

  test('requires a real ISO visit date and bounds optional rating and comment', () => {
    assert.equal(typeof validation?.parseFootprintInput, 'function');
    assert.deepEqual(validation.parseFootprintInput({ visitedOn: '2026-08-30', rating: 5 }), {
      visitedOn: '2026-08-30',
      rating: 5,
      comment: null,
    });
    assert.throws(() => validation.parseFootprintInput({ visitedOn: '2026-02-30' }), /date/i);
    assert.throws(
      () => validation.parseFootprintInput({ visitedOn: '2026-08-30', rating: 6 }),
      /rating/i,
    );
  });

  test('requires accepted or declined as the only Plan response values', () => {
    assert.equal(typeof validation?.parsePlanResponse, 'function');
    assert.deepEqual(validation.parsePlanResponse({ status: 'accepted' }), { status: 'accepted' });
    assert.throws(() => validation.parsePlanResponse({ status: 'pending' }), /status/i);
  });

  test('enforces a non-trivial shared key without logging or returning it', () => {
    assert.equal(typeof validation?.parseSharedKey, 'function');
    assert.equal(validation.parseSharedKey({ key: 'ninechars' }), 'ninechars');
    assert.throws(() => validation.parseSharedKey({ key: 'eightchr' }), /9/);
    assert.throws(() => validation.parseSharedKey({ key: 'x'.repeat(257) }), /256/);
  });

  test('validates optional legacy rating and comment while still requiring visited dates later', () => {
    assert.equal(typeof validation?.parseLegacyImport, 'function');
    assert.deepEqual(
      validation.parseLegacyImport({
        items: [{ experienceId: 'food-01', visitedOn: '2026-08-01', rating: 4, comment: 'Still good' }],
      }),
      [{ experienceId: 'food-01', visitedOn: '2026-08-01', rating: 4, comment: 'Still good' }],
    );
    assert.throws(
      () => validation.parseLegacyImport({ items: [{ experienceId: 'food-01', rating: 9 }] }),
      /rating/i,
    );
    assert.throws(
      () =>
        validation.parseLegacyImport({
          items: Array.from({ length: 54 }, (_, index) => ({ experienceId: `food-${index}` })),
        }),
      /53/,
    );
  });

  test('derives visit-day boundaries in Asia/Shanghai rather than UTC', () => {
    assert.equal(typeof validation?.shanghaiDateKey, 'function');
    assert.equal(validation.shanghaiDateKey('2026-08-30T15:59:59.000Z'), '2026-08-30');
    assert.equal(validation.shanghaiDateKey('2026-08-30T16:30:00.000Z'), '2026-08-31');
  });
});
