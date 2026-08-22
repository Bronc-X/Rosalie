import test from 'node:test';
import assert from 'node:assert/strict';

const schedule = await import('../lib/schedule.mjs').catch(() => ({}));

test('a complete Beijing schedule entry is normalized for public storage', () => {
  assert.equal(typeof schedule.normalizeScheduleEntry, 'function');
  assert.deepEqual(schedule.normalizeScheduleEntry({
    scheduledAt: '2026-08-29T18:30',
    content: '  见面吃饭  ',
    location: '  上海 · 静安  ',
    addedBy: '  Rosalie  ',
  }), {
    ok: true,
    value: {
      scheduledAt: '2026-08-29T10:30:00.000Z',
      content: '见面吃饭',
      location: '上海 · 静安',
      addedBy: 'Rosalie',
    },
  });
});

test('all four public fields are required and have bounded lengths', () => {
  const valid = {
    scheduledAt: '2026-08-29T18:30',
    content: '见面吃饭',
    location: '上海',
    addedBy: 'Toni',
  };
  for (const field of ['scheduledAt', 'content', 'location', 'addedBy']) {
    assert.equal(schedule.normalizeScheduleEntry({ ...valid, [field]: '' }).ok, false);
  }
  assert.equal(schedule.normalizeScheduleEntry({ ...valid, content: '啊'.repeat(121) }).ok, false);
  assert.equal(schedule.normalizeScheduleEntry({ ...valid, location: '地'.repeat(61) }).ok, false);
  assert.equal(schedule.normalizeScheduleEntry({ ...valid, addedBy: '人'.repeat(25) }).ok, false);
});

test('markup, control characters and impossible local dates never reach shared storage', () => {
  assert.deepEqual(schedule.normalizeScheduleEntry({
    scheduledAt: '2026-08-29T18:30',
    content: '<b>见面</b>\u0000',
    location: '<上海>',
    addedBy: '<Toni>',
  }), {
    ok: true,
    value: {
      scheduledAt: '2026-08-29T10:30:00.000Z',
      content: 'b见面/b',
      location: '上海',
      addedBy: 'Toni',
    },
  });
  assert.equal(schedule.normalizeScheduleEntry({
    scheduledAt: '2026-02-30T18:30',
    content: '见面',
    location: '上海',
    addedBy: 'Toni',
  }).ok, false);
});

test('shared entries are ordered by schedule time, not submission time', () => {
  assert.equal(typeof schedule.sortScheduleEntries, 'function');
  const entries = [
    { id: 'later', scheduledAt: '2026-09-01T10:00:00.000Z', createdAt: '2026-08-22T00:00:00.000Z' },
    { id: 'first', scheduledAt: '2026-08-29T10:30:00.000Z', createdAt: '2026-08-22T01:00:00.000Z' },
  ];
  assert.deepEqual(schedule.sortScheduleEntries(entries).map((entry) => entry.id), ['first', 'later']);
  assert.deepEqual(entries.map((entry) => entry.id), ['later', 'first']);
});
