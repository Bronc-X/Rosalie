import assert from 'node:assert/strict';
import test from 'node:test';

const calendar = await import('../lib/calendar-view.mjs').catch(() => ({}));

test('August 2026 renders as a complete Monday-first six-week grid', () => {
  assert.equal(typeof calendar.buildMonthDays, 'function');
  const days = calendar.buildMonthDays(2026, 8);

  assert.equal(days.length, 42);
  assert.deepEqual(days[0], {
    key: '2026-07-27',
    day: 27,
    inCurrentMonth: false,
  });
  assert.deepEqual(days[5], {
    key: '2026-08-01',
    day: 1,
    inCurrentMonth: true,
  });
  assert.equal(days.at(-1).key, '2026-09-06');
});

test('month navigation crosses year boundaries', () => {
  assert.equal(typeof calendar.shiftMonth, 'function');
  assert.deepEqual(calendar.shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.deepEqual(calendar.shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
});

test('schedule instants are assigned to the correct Beijing calendar day', () => {
  assert.equal(typeof calendar.toBeijingDateKey, 'function');
  assert.equal(calendar.toBeijingDateKey('2026-08-28T16:30:00.000Z'), '2026-08-29');
  assert.equal(calendar.toBeijingDateKey('2026-08-28T15:59:59.000Z'), '2026-08-28');
});

test('opening the composer from a selected day prefills nine in the morning', () => {
  assert.equal(typeof calendar.defaultDateTimeForDay, 'function');
  assert.equal(calendar.defaultDateTimeForDay('2026-08-29'), '2026-08-29T09:00');
});
