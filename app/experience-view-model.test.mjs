import assert from 'node:assert/strict';
import test from 'node:test';

const viewModel = await import('./experience-view-model.ts').catch(() => ({}));

const experiences = [
  {
    id: 'food-01',
    name: '纪德来甜汤',
    category: '甜品小食',
    address: '金平区',
    state: 'wishlist',
    memberIds: ['toni', 'rosalie'],
  },
  {
    id: 'food-02',
    name: '金二顺潮汕生腌',
    category: '生腌',
    address: '玫瑰一街',
    state: 'footprint',
    memberIds: ['rosalie'],
  },
  {
    id: 'food-03',
    name: '三姐妹肠粉',
    category: '肠粉',
    address: '永平路',
    state: 'wishlist',
    memberIds: ['toni'],
  },
];

test('filterExperiences gives map and list the same shared subset', () => {
  assert.equal(typeof viewModel.filterExperiences, 'function');
  const result = viewModel.filterExperiences(experiences, {
    state: 'wishlist',
    owner: 'shared',
    category: '全部',
    query: '',
  });
  assert.deepEqual(result.map((item) => item.id), ['food-01']);
});

test('filterExperiences searches names, addresses, and categories', () => {
  assert.equal(typeof viewModel.filterExperiences, 'function');
  const result = viewModel.filterExperiences(experiences, {
    state: 'all',
    owner: 'all',
    category: '全部',
    query: '玫瑰 生腌',
  });
  assert.deepEqual(result.map((item) => item.id), ['food-02']);
});

test('markBeenHere turns a wishlist into a dated footprint without mutating it', () => {
  assert.equal(typeof viewModel.markBeenHere, 'function');
  const original = experiences[0];
  const result = viewModel.markBeenHere(original, {
    visitedOn: '2026-08-30',
    rating: 5,
    comment: '下次还来。',
  });
  assert.equal(original.state, 'wishlist');
  assert.equal(result.state, 'footprint');
  assert.deepEqual(result.footprint, {
    visitedOn: '2026-08-30',
    rating: 5,
    comment: '下次还来。',
  });
});

test('buildCalendarMonth places accepted plans and footprints on their dates', () => {
  assert.equal(typeof viewModel.buildCalendarMonth, 'function');
  const cells = viewModel.buildCalendarMonth('2026-08', [
    { id: 'plan-1', kind: 'plan', status: 'accepted', scheduledFor: '2026-08-31T11:30:00+08:00', title: '去食肠粉' },
    { id: 'plan-2', kind: 'plan', status: 'pending', scheduledFor: '2026-08-31T17:00:00+08:00', title: '未接受邀请' },
    { id: 'fp-1', kind: 'footprint', visitedOn: '2026-08-30', title: '金二顺潮汕生腌' },
  ]);
  assert.ok(cells.length === 35 || cells.length === 42);
  assert.deepEqual(cells.find((cell) => cell.date === '2026-08-30').entries.map((entry) => entry.id), ['fp-1']);
  assert.deepEqual(cells.find((cell) => cell.date === '2026-08-31').entries.map((entry) => entry.id), ['plan-1']);
});

test('monthTitle stays deterministic for the calendar header', () => {
  assert.equal(typeof viewModel.monthTitle, 'function');
  assert.equal(viewModel.monthTitle('2026-08'), '2026 年 8 月');
});

test('shiftMonth crosses year boundaries without relying on locale parsing', () => {
  assert.equal(typeof viewModel.shiftMonth, 'function');
  assert.equal(viewModel.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(viewModel.shiftMonth('2026-12', 1), '2027-01');
});

test('filterExperiences intersects an explicit tag with the shared map/list filters', () => {
  const tagged = experiences.map((item, index) => ({ ...item, tags: index === 0 ? ['夜宵', '甜'] : ['正餐'] }));
  const result = viewModel.filterExperiences(tagged, {
    state: 'wishlist',
    owner: 'all',
    category: '全部',
    tag: '夜宵',
    query: '',
  });
  assert.deepEqual(result.map((item) => item.id), ['food-01']);
});

test('buildCalendarMonth places UTC plans on the matching Shantou calendar date', () => {
  const cells = viewModel.buildCalendarMonth('2026-08', [
    { id: 'late-plan', kind: 'plan', status: 'accepted', scheduledFor: '2026-08-30T16:30:00.000Z', title: '凌晨约会' },
  ]);
  assert.deepEqual(cells.find((cell) => cell.date === '2026-08-31').entries.map((entry) => entry.id), ['late-plan']);
});

test('dateKeyInTimeZone avoids the UTC-yesterday bug for Shantou mornings', () => {
  assert.equal(typeof viewModel.dateKeyInTimeZone, 'function');
  assert.equal(viewModel.dateKeyInTimeZone('2026-08-30T16:30:00.000Z'), '2026-08-31');
});

test('a Calendar invitation keeps the picked Shantou date outside China', () => {
  assert.equal(typeof viewModel.shantouDateTimeToIso, 'function');
  assert.equal(viewModel.shantouDateTimeToIso('2026-08-31', '19:30'), '2026-08-31T11:30:00.000Z');
});

test('the Experience map waits for loaded data before it initializes', () => {
  assert.equal(typeof viewModel.canInitializeExperienceMap, 'function');
  assert.equal(viewModel.canInitializeExperienceMap('ready', 'experiences', 'loading'), false);
  assert.equal(viewModel.canInitializeExperienceMap('ready', 'experiences', 'ready'), true);
});

test('Enter on a Leaflet marker activates the linked Experience card', () => {
  assert.equal(typeof viewModel.isExperienceMarkerActivation, 'function');
  assert.equal(viewModel.isExperienceMarkerActivation({ type: 'click' }), true);
  assert.equal(viewModel.isExperienceMarkerActivation({
    type: 'keypress',
    originalEvent: { key: 'Enter', keyCode: 13 },
  }), true);
  assert.equal(viewModel.isExperienceMarkerActivation({
    type: 'keypress',
    originalEvent: { key: ' ', keyCode: 32 },
  }), false);
});

test('notifications can only be answered after the current profile load is ready', () => {
  assert.equal(typeof viewModel.canRespondToNotifications, 'function');
  assert.equal(viewModel.canRespondToNotifications('ready'), true);
  assert.equal(viewModel.canRespondToNotifications('loading'), false);
  assert.equal(viewModel.canRespondToNotifications('error'), false);
});

test('card selection returns to the map only at the compact layout breakpoint', () => {
  assert.equal(typeof viewModel.shouldScrollMapForCardSelection, 'function');
  assert.equal(viewModel.shouldScrollMapForCardSelection(390), true);
  assert.equal(viewModel.shouldScrollMapForCardSelection(800), true);
  assert.equal(viewModel.shouldScrollMapForCardSelection(801), false);
});

test('Calendar footprint selection preserves the exact history record target', () => {
  assert.equal(typeof viewModel.resolveCalendarEntryTarget, 'function');
  assert.deepEqual(
    viewModel.resolveCalendarEntryTarget({
      id: 'footprint:fp-2',
      kind: 'footprint',
      title: 'Paper Museum',
      experienceId: 'exp-1',
      footprintId: 'fp-2',
    }),
    { kind: 'history', experienceId: 'exp-1', experienceName: 'Paper Museum', footprintId: 'fp-2' },
  );
  assert.deepEqual(
    viewModel.resolveCalendarEntryTarget({
      id: 'plan:plan-1',
      kind: 'plan',
      title: 'Paper Museum',
      experienceId: 'exp-1',
    }),
    { kind: 'experience', experienceId: 'exp-1' },
  );
});

