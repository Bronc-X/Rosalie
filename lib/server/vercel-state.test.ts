import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { applyVercelEvent, createVercelSeedState, listVercelExperiences, type VercelExperienceEvent } from './vercel-state.ts';

test('Vercel state starts with the 53 Shantou experiences and 47 mapped points', () => {
  const state = createVercelSeedState();
  const experiences = listVercelExperiences(state, { placeId: 'shantou' });

  assert.equal(experiences.length, 53);
  assert.equal(experiences.filter((experience) => experience.coordinates).length, 47);
  assert.deepEqual([...state.places.values()].map((place) => place.name), ['汕頭', '廣州', '深圳']);
});

test('deleting the final footprint returns an experience to the wishlist', () => {
  const state = createVercelSeedState();
  const base = state.experiences.get('food-01');
  assert.ok(base);

  const created: VercelExperienceEvent = {
    version: 1,
    id: 'event-1',
    type: 'footprint.created',
    createdAt: '2026-08-30T10:00:00.000Z',
    memberId: 'toni',
    payload: {
      id: 'footprint-1',
      experienceId: base.id,
      visitedOn: '2026-08-30',
      rating: 5,
      comment: '一起吃过。',
      createdAt: '2026-08-30T10:00:00.000Z',
    },
  };
  applyVercelEvent(state, created);
  assert.equal(state.experiences.get(base.id)?.state, 'footprint');

  applyVercelEvent(state, {
    version: 1,
    id: 'event-2',
    type: 'footprint.deleted',
    createdAt: '2026-08-30T11:00:00.000Z',
    memberId: 'toni',
    payload: { id: 'footprint-1' },
  });
  assert.equal(state.experiences.get(base.id)?.state, 'wishlist');
});
