import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function readCalendarUi() {
  const [app, calendar, css] = await Promise.all([
    readFile(new URL('app/FoodAtlas.tsx', root), 'utf8'),
    readFile(new URL('app/calendar/SharedCalendar.tsx', root), 'utf8'),
    readFile(new URL('app/experience.css', root), 'utf8'),
  ]);
  return { app, calendar, css };
}

test('Calendar dates are the add entry point and the duplicate monthly agenda is gone', async () => {
  const { app, calendar } = await readCalendarUi();

  assert.match(calendar, /onDateSelect: \(date: string\) => void/);
  assert.match(calendar, /className="calendar-day-trigger"/);
  assert.match(calendar, /canAdd: boolean/);
  assert.match(calendar, /disabled=\{!cell\.inMonth \|\| !canAdd\}/);
  assert.match(calendar, /calendar-add-error/);
  assert.match(calendar, /onClick=\{\(\) => onDateSelect\(cell\.date\)\}/);
  assert.match(app, /onDateSelect=\{openFromCalendarDate\}/);
  assert.match(app, /canAdd=\{dataStatus === 'ready' && experiences\.length > 0\}/);
  assert.doesNotMatch(calendar, /calendar-agenda/);
  assert.doesNotMatch(calendar, /本月/);
  assert.doesNotMatch(calendar, /这个月还空着/);
});

test('a picked Calendar date opens a dated place form instead of Quick Add', async () => {
  const { app } = await readCalendarUi();

  assert.match(app, /function openFromCalendarDate\(date: string\)/);
  assert.match(app, /date < today/);
  assert.match(app, /setPlanDraft\(\{ date, time: '', note: '' \}\)/);
  assert.match(app, /地点<select value=\{planExperienceId\}/);
  assert.match(app, /地点<select value=\{footprintExperienceId\}/);
  assert.doesNotMatch(app, /className="add-button"/);
  assert.match(app, /className="filter-add-button"/);
});

test('topbar notification and lock controls use the generated journal icon pair', async () => {
  const { app, css } = await readCalendarUi();

  await Promise.all([
    access(new URL('public/icons/bell-journal-v2.png', root)),
    access(new URL('public/icons/lock-journal-v2.png', root)),
  ]);
  assert.match(app, /function BellIcon\(\)/);
  assert.match(app, /function LockIcon\(\)/);
  assert.match(app, /aria-label="通知"/);
  assert.match(app, /aria-label="退出并锁定"/);
  assert.match(app, /<BellIcon \/>/);
  assert.match(app, /<LockIcon \/>/);
  assert.match(app, /src="\/icons\/bell-journal-v2\.png"/);
  assert.match(app, /src="\/icons\/lock-journal-v2\.png"/);
  assert.match(app, /className="topbar-generated-icon"/);
  assert.doesNotMatch(app, /aria-hidden="true">铃/);
  assert.doesNotMatch(app, />锁<\/button>/);
  assert.doesNotMatch(app, /<svg className="topbar-icon"/);
  assert.match(css, /\.topbar-generated-icon \{[^}]*width:\s*1\.4rem;[^}]*height:\s*1\.4rem;/s);
  assert.match(css, /\.notification-button, \.more-button \{[^}]*width:\s*2\.25rem;[^}]*min-width:\s*2\.25rem;[^}]*min-height:\s*2\.25rem;/s);
  assert.match(css, /\.notification-button::before, \.more-button::before \{[^}]*inset:\s*-\.25rem;/s);
});

test('mobile Calendar entries keep a visible place name', async () => {
  const { css } = await readCalendarUi();

  assert.doesNotMatch(css, /\.calendar-entry > strong \{ display: none; \}/);
  assert.match(css, /\.calendar-entry > span \{ display: none; \}/);
});
