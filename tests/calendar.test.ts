import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { deriveCalendarEntries } from '../lib/domain/calendar.ts';

test('derives Calendar entries only from past Footprints and accepted future plans', () => {
  const entries = deriveCalendarEntries({
    today: '2026-08-30',
    experiences: [
      { id: 'food-02', title: '金二顺潮汕生腌' },
      { id: 'food-03', title: '三姐妹肠粉' },
    ],
    footprints: [
      { id: 'visit-1', experienceId: 'food-02', memberId: 'toni', visitedOn: '2026-08-12' },
      { id: 'visit-2', experienceId: 'food-02', memberId: 'rosalie', visitedOn: '2026-08-18' },
      { id: 'future-visit', experienceId: 'food-03', memberId: 'toni', visitedOn: '2026-09-02' },
    ],
    plans: [
      {
        id: 'plan-accepted',
        experienceId: 'food-03',
        scheduledFor: '2026-09-03',
        status: 'accepted',
        inviterMemberId: 'toni',
        inviteeMemberId: 'rosalie',
      },
      {
        id: 'plan-pending',
        experienceId: 'food-02',
        scheduledFor: '2026-09-04',
        status: 'pending',
        inviterMemberId: 'rosalie',
        inviteeMemberId: 'toni',
      },
      {
        id: 'plan-declined',
        experienceId: 'food-02',
        scheduledFor: '2026-09-05',
        status: 'declined',
        inviterMemberId: 'rosalie',
        inviteeMemberId: 'toni',
      },
      {
        id: 'past-plan',
        experienceId: 'food-03',
        scheduledFor: '2026-08-01',
        status: 'accepted',
        inviterMemberId: 'toni',
        inviteeMemberId: 'rosalie',
      },
    ],
  });

  assert.deepEqual(entries, [
    {
      id: 'footprint:visit-1',
      kind: 'footprint',
      sourceId: 'visit-1',
      experienceId: 'food-02',
      title: '金二顺潮汕生腌',
      date: '2026-08-12',
      memberIds: ['toni'],
    },
    {
      id: 'footprint:visit-2',
      kind: 'footprint',
      sourceId: 'visit-2',
      experienceId: 'food-02',
      title: '金二顺潮汕生腌',
      date: '2026-08-18',
      memberIds: ['rosalie'],
    },
    {
      id: 'plan:plan-accepted',
      kind: 'plan',
      sourceId: 'plan-accepted',
      experienceId: 'food-03',
      title: '三姐妹肠粉',
      date: '2026-09-03',
      memberIds: ['toni', 'rosalie'],
    },
  ]);
});

test('does not invent Calendar entries for missing Experiences', () => {
  const entries = deriveCalendarEntries({
    today: '2026-08-30',
    experiences: [],
    footprints: [{ id: 'visit-1', experienceId: 'deleted', memberId: 'toni', visitedOn: '2026-08-12' }],
    plans: [{
      id: 'plan-1',
      experienceId: 'deleted',
      scheduledFor: '2026-09-03',
      status: 'accepted',
      inviterMemberId: 'toni',
      inviteeMemberId: 'rosalie',
    }],
  });

  assert.deepEqual(entries, []);
});

