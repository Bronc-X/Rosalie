'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';

import {
  buildMonthDays,
  defaultDateTimeForDay,
  shiftMonth,
  toBeijingDateKey,
} from '@/lib/calendar-view.mjs';
import type { CalendarMonth } from '@/lib/calendar-view.mjs';
import {
  SCHEDULE_ADDED_BY_MAX_LENGTH,
  SCHEDULE_CONTENT_MAX_LENGTH,
  SCHEDULE_LOCATION_MAX_LENGTH,
  sortScheduleEntries,
} from '@/lib/schedule.mjs';
import type { ScheduleEntry } from '@/lib/schedule.mjs';

type Draft = {
  scheduledAt: string;
  content: string;
  location: string;
  addedBy: string;
};

const EMPTY_DRAFT: Draft = { scheduledAt: '', content: '', location: '', addedBy: '' };
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

async function fetchEntries() {
  const response = await fetch('/api/schedule', { cache: 'no-store' });
  const data = await response.json() as { ok?: boolean; entries?: ScheduleEntry[]; error?: string };
  if (!response.ok || !data.ok || !Array.isArray(data.entries)) throw new Error(data.error ?? 'load failed');
  return data.entries;
}

function monthFromDateKey(dateKey: string): CalendarMonth {
  const [year, month] = dateKey.split('-').map(Number);
  return { year, month };
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+08:00`);
}

function formatMonth(view: CalendarMonth) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(view.year, view.month - 1, 1)));
}

function formatSelectedDate(dateKey: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(dateFromKey(dateKey));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function monthCode(month: number) {
  return String(month).padStart(2, '0');
}

export function ScheduleBoard() {
  const todayKey = useMemo(() => toBeijingDateKey(new Date()), []);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() => monthFromDateKey(todayKey));
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('');
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const monthDays = useMemo(
    () => buildMonthDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const key = toBeijingDateKey(entry.scheduledAt);
      const dayEntries = grouped.get(key) ?? [];
      dayEntries.push(entry);
      grouped.set(key, dayEntries);
    }
    return grouped;
  }, [entries]);

  const selectedEntries = entriesByDay.get(selectedDay) ?? [];

  async function loadEntries() {
    setLoadState('loading');
    try {
      setEntries(await fetchEntries());
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }

  useEffect(() => {
    let current = true;
    void fetchEntries()
      .then((nextEntries) => {
        if (!current) return;
        setEntries(nextEntries);
        setLoadState('loaded');
      })
      .catch(() => {
        if (current) setLoadState('error');
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!composerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setComposerOpen(false);
      addButtonRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [composerOpen]);

  function selectDay(dateKey: string) {
    setSelectedDay(dateKey);
    const nextMonth = monthFromDateKey(dateKey);
    if (nextMonth.year !== visibleMonth.year || nextMonth.month !== visibleMonth.month) {
      setVisibleMonth(nextMonth);
    }
  }

  function goToToday() {
    setSelectedDay(todayKey);
    setVisibleMonth(monthFromDateKey(todayKey));
  }

  function openComposer() {
    setDraft({ ...EMPTY_DRAFT, scheduledAt: defaultDateTimeForDay(selectedDay) });
    setSendState('idle');
    setFeedback('所有人可见');
    setComposerOpen(true);
  }

  function closeComposer() {
    if (sendState === 'sending') return;
    setComposerOpen(false);
    window.setTimeout(() => addButtonRef.current?.focus(), 0);
  }

  function dismissComposer(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeComposer();
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (sendState !== 'idle') setSendState('idle');
    setFeedback('所有人可见');
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendState === 'sending' || Object.values(draft).some((value) => !value.trim())) return;
    setSendState('sending');
    setFeedback('添加中');

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json() as { ok?: boolean; entry?: ScheduleEntry; error?: string };
      if (!response.ok || !data.ok || !data.entry) throw new Error(data.error ?? 'send failed');
      const entry = data.entry;
      const entryDay = toBeijingDateKey(entry.scheduledAt);
      setEntries((current) => sortScheduleEntries([...current, entry]));
      setSelectedDay(entryDay);
      setVisibleMonth(monthFromDateKey(entryDay));
      setDraft(EMPTY_DRAFT);
      setComposerOpen(false);
      setSendState('idle');
      setNotice('已添加');
      window.setTimeout(() => setNotice(''), 2800);
    } catch (error) {
      setSendState('error');
      setFeedback(error instanceof Error && /最多|不能为空|请选择|添加人/.test(error.message)
        ? error.message
        : '添加失败，请重试');
    }
  }

  return (
    <main className="schedule-page">
      <div className="schedule-aurora" aria-hidden="true" />

      <header className="schedule-header liquid-glass">
        <div>
          <h1>日历</h1>
        </div>
      </header>

      <section className="calendar-hero" aria-labelledby="calendar-month-title">
        <div className="calendar-title-block">
          <h2 id="calendar-month-title">{formatMonth(visibleMonth)}</h2>
          <span>{entries.length === 0 ? '暂无日程' : `${entries.length} 项日程`}</span>
        </div>

        <div className="calendar-actions liquid-glass" aria-label="日历操作">
          <button type="button" aria-label="上个月" onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}>‹</button>
          <button type="button" className="calendar-today-button" onClick={goToToday}>今天</button>
          <button type="button" aria-label="下个月" onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}>›</button>
          <span aria-hidden="true" />
          <button ref={addButtonRef} type="button" className="calendar-add-button" onClick={openComposer}>
            <b aria-hidden="true">＋</b><em>新增日程</em>
          </button>
        </div>
      </section>

      <div className="calendar-shell">
        <section className="calendar-panel liquid-glass" aria-label={`${formatMonth(visibleMonth)}月历`}>
          <div className="calendar-watermark" aria-hidden="true">{monthCode(visibleMonth.month)}</div>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>周{weekday}</span>)}
          </div>

          <div className="calendar-grid">
            {monthDays.map((day) => {
              const dayEntries = entriesByDay.get(day.key) ?? [];
              const isSelected = day.key === selectedDay;
              const isToday = day.key === todayKey;
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`calendar-day${day.inCurrentMonth ? '' : ' is-outside'}${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`${formatSelectedDate(day.key)}，${dayEntries.length} 项日程`}
                  onClick={() => selectDay(day.key)}
                >
                  <span className="calendar-day-number">{day.day}</span>
                  <span className="calendar-day-events">
                    {dayEntries.slice(0, 2).map((entry, index) => (
                      <span key={entry.id} className={`calendar-event-chip tone-${index % 4}`}>
                        <i aria-hidden="true" />{entry.content}
                      </span>
                    ))}
                    {dayEntries.length > 2 && <small>＋{dayEntries.length - 2}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="day-agenda" aria-labelledby="selected-day-title">
          <div className="day-agenda-heading">
            <div>
              <h2 id="selected-day-title">{formatSelectedDate(selectedDay)}</h2>
            </div>
            <button type="button" onClick={() => void loadEntries()} disabled={loadState === 'loading'}>
              {loadState === 'loading' ? '读取中' : '刷新'}
            </button>
          </div>

          {loadState === 'error' ? (
            <div className="agenda-state" role="status">
              <i aria-hidden="true" /><p>暂时无法读取日程</p><button type="button" onClick={() => void loadEntries()}>重试</button>
            </div>
          ) : loadState === 'loading' && entries.length === 0 ? (
            <div className="agenda-state" role="status"><i aria-hidden="true" /><p>读取中</p></div>
          ) : selectedEntries.length === 0 ? (
            <div className="agenda-state is-empty">
              <div className="agenda-empty-orbit" aria-hidden="true"><i /><i /><i /></div>
              <p>当天没有日程</p>
              <button type="button" onClick={openComposer}>新增日程</button>
            </div>
          ) : (
            <ol className="agenda-list">
              {selectedEntries.map((entry, index) => (
                <li key={entry.id} className={`tone-${index % 4}`}>
                  <time dateTime={entry.scheduledAt}>{formatTime(entry.scheduledAt)}</time>
                  <div>
                    <h3>{entry.content}</h3>
                    <p>{entry.location}</p>
                    <small>由 {entry.addedBy} 添加</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {composerOpen && (
        <div className="schedule-modal-layer" onMouseDown={dismissComposer}>
          <section className="schedule-dialog liquid-glass" role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
            <div className="schedule-dialog-handle" aria-hidden="true" />
            <header>
              <div>
                <h2 id="schedule-dialog-title">新增日程</h2>
                <span>{formatSelectedDate(selectedDay)}</span>
              </div>
              <button type="button" aria-label="关闭新增日程" onClick={closeComposer}>×</button>
            </header>

            <form onSubmit={addEntry}>
              <label>
                <span>时间（北京时间）</span>
                <input
                  ref={firstFieldRef}
                  type="datetime-local"
                  value={draft.scheduledAt}
                  min="2020-01-01T00:00"
                  max="2100-12-31T23:59"
                  onChange={(event) => updateDraft('scheduledAt', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>内容</span>
                <input
                  type="text"
                  value={draft.content}
                  maxLength={SCHEDULE_CONTENT_MAX_LENGTH}
                  placeholder="写下日程"
                  onChange={(event) => updateDraft('content', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>地点</span>
                <input
                  type="text"
                  value={draft.location}
                  maxLength={SCHEDULE_LOCATION_MAX_LENGTH}
                  placeholder="输入地点"
                  onChange={(event) => updateDraft('location', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>添加人</span>
                <input
                  type="text"
                  value={draft.addedBy}
                  maxLength={SCHEDULE_ADDED_BY_MAX_LENGTH}
                  placeholder="输入名字"
                  onChange={(event) => updateDraft('addedBy', event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={sendState === 'sending' || Object.values(draft).some((value) => !value.trim())}>
                {sendState === 'sending' ? '添加中' : '添加日程'}
              </button>
            </form>
            <p className={`schedule-feedback is-${sendState}`} aria-live="polite">{feedback}</p>
          </section>
        </div>
      )}

      <div className={`schedule-toast${notice ? ' is-visible' : ''}`} role="status" aria-live="polite">{notice}</div>
    </main>
  );
}
