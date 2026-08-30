import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { LEGACY_FOOD_LOG_STORAGE_KEY, planLegacyFoodLogImport } from '../lib/domain/legacy-import.ts';

const legacyRaw = JSON.stringify({
  'food-02': { visited: true, rating: 5, comment: '血蚶很鲜' },
  'food-03': { visited: true, rating: 4, comment: '薄皮有韧劲' },
  'food-04': { visited: false, rating: 0, comment: '' },
  'unknown-id': { visited: true, rating: 5, comment: '旧版本残留' },
});

test('does not create a visited Footprint until that imported visit has a date', () => {
  const plan = planLegacyFoodLogImport({
    raw: legacyRaw,
    memberId: 'toni',
    knownExperienceIds: ['food-02', 'food-03', 'food-04'],
    visitDates: { 'food-02': '2026-08-12' },
  });

  assert.deepEqual(plan.missingVisitDates, ['food-03']);
  assert.deepEqual(plan.footprints.map(({ experienceId }) => experienceId), ['food-02']);
  assert.deepEqual(plan.wishlistExperienceIds, ['food-04']);
  assert.deepEqual(plan.ignoredExperienceIds, ['unknown-id']);
  assert.equal(plan.preserveSource, true);
  assert.equal(LEGACY_FOOD_LOG_STORAGE_KEY, 'shantou-food-log-v1');
});

test('creates deterministic attributed Footprints after valid dates are supplied', () => {
  const input = {
    raw: legacyRaw,
    memberId: 'rosalie',
    knownExperienceIds: ['food-02', 'food-03', 'food-04'],
    visitDates: { 'food-02': '2026-08-12', 'food-03': '2026-08-13' },
  } as const;

  const firstPlan = planLegacyFoodLogImport(input);
  const secondPlan = planLegacyFoodLogImport(input);

  assert.deepEqual(firstPlan, secondPlan);
  assert.deepEqual(firstPlan.missingVisitDates, []);
  assert.deepEqual(firstPlan.footprints, [
    {
      sourceKey: 'shantou-food-log-v1:food-02',
      experienceId: 'food-02',
      memberId: 'rosalie',
      visitedOn: '2026-08-12',
      rating: 5,
      comment: '血蚶很鲜',
    },
    {
      sourceKey: 'shantou-food-log-v1:food-03',
      experienceId: 'food-03',
      memberId: 'rosalie',
      visitedOn: '2026-08-13',
      rating: 4,
      comment: '薄皮有韧劲',
    },
  ]);
});

test('rejects malformed legacy JSON and invalid visit dates without guessing', () => {
  assert.throws(
    () => planLegacyFoodLogImport({
      raw: '{broken',
      memberId: 'toni',
      knownExperienceIds: ['food-02'],
      visitDates: {},
    }),
    /旧食单数据无法解析/,
  );

  assert.throws(
    () => planLegacyFoodLogImport({
      raw: legacyRaw,
      memberId: 'toni',
      knownExperienceIds: ['food-02', 'food-03', 'food-04'],
      visitDates: { 'food-02': '08\/12\/2026', 'food-03': '2026-08-13' },
    }),
    /food-02.*YYYY-MM-DD/,
  );
});

