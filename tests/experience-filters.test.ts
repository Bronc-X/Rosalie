import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { EXPERIENCE_CATEGORIES, filterExperiences, type ExperienceSummary } from '../lib/domain/experience.ts';

const experiences: ExperienceSummary[] = [
  {
    id: 'food-01',
    title: '纪德来甜汤',
    category: 'Food & Drink',
    tags: ['甜品小食', '夜宵'],
    address: '具体门牌待确认',
    locationStatus: 'pending',
    recommendationStatus: 'normal',
    state: 'wishlist',
  },
  {
    id: 'food-02',
    title: '金二顺潮汕生腌',
    category: 'Food & Drink',
    tags: ['生腌'],
    address: '金平区玫瑰一街102号',
    coordinates: [23.371834, 116.710949],
    coordinateSystem: 'gcj02',
    locationStatus: 'verified',
    recommendationStatus: 'normal',
    state: 'footprint',
  },
  {
    id: 'museum-01',
    title: 'Shantou Museum',
    category: 'Museum & Exhibition',
    tags: ['history', '雨天'],
    address: '月眉路',
    locationStatus: 'pending',
    recommendationStatus: 'normal',
    state: 'wishlist',
  },
];

test('exposes only the six fixed Experience categories', () => {
  assert.deepEqual(EXPERIENCE_CATEGORIES, [
    'Food & Drink',
    'Museum & Exhibition',
    'Shop & Market',
    'Entertainment',
    'Outdoor & Nature',
    'Other',
  ]);
});

test('intersects view, category, tag, and search filters without changing order', () => {
  const filtered = filterExperiences(experiences, {
    view: 'footprints',
    category: 'Food & Drink',
    tag: '生腌',
    query: '玫瑰一街',
  });

  assert.deepEqual(filtered.map((experience) => experience.id), ['food-02']);
  assert.deepEqual(experiences.map((experience) => experience.id), ['food-01', 'food-02', 'museum-01']);
});

test('searches title, address, and tags case-insensitively', () => {
  assert.deepEqual(
    filterExperiences(experiences, { view: 'all', category: 'all', query: 'SHANTOU' }).map(({ id }) => id),
    ['museum-01'],
  );
  assert.deepEqual(
    filterExperiences(experiences, { view: 'all', category: 'all', query: '夜宵' }).map(({ id }) => id),
    ['food-01'],
  );
});

test('keeps matching pending Experiences without coordinates in the visible collection', () => {
  const filtered = filterExperiences(experiences, {
    view: 'wishlist',
    category: 'Food & Drink',
    query: '纪德来',
  });

  assert.deepEqual(filtered.map((experience) => experience.id), ['food-01']);
  assert.equal(filtered[0]?.coordinates, undefined);
});

