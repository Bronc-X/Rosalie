'use client';

import { buildCalendarMonth, monthTitle, shiftMonth, type CalendarEntry } from '../experience-view-model';

export type SharedCalendarEntry = CalendarEntry & {
  experienceId: string;
  memberIds: string[];
  date: string;
  footprintId?: string;
};

type SharedCalendarProps = {
  entries: SharedCalendarEntry[];
  month: string;
  status: 'loading' | 'ready' | 'error';
  error?: string;
  canAdd: boolean;
  addError?: string;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
  onEntrySelect: (entry: SharedCalendarEntry) => void;
  onRetry: () => void;
  onAddRetry: () => void;
};

export default function SharedCalendar({
  entries,
  month,
  status,
  error,
  canAdd,
  addError,
  onMonthChange,
  onDateSelect,
  onEntrySelect,
  onRetry,
  onAddRetry,
}: SharedCalendarProps) {
  const cells = buildCalendarMonth(month, entries);

  return (
    <section className="calendar-page" aria-labelledby="calendar-title">
      <div className="calendar-lede">
        <div>
          <h1 id="calendar-title">不思量，自难忘</h1>
        </div>
      </div>

      <div className="calendar-toolbar">
        <button type="button" aria-label="上一个月" onClick={() => onMonthChange(shiftMonth(month, -1))}>←</button>
        <strong>{monthTitle(month)}</strong>
        <button type="button" aria-label="下一个月" onClick={() => onMonthChange(shiftMonth(month, 1))}>→</button>
      </div>

      {status === 'loading' && <div className="page-state"><span className="ink-loader" aria-hidden="true" /><strong>正在打开日历…</strong></div>}
      {status === 'error' && <div className="page-state is-error"><strong>日历暂时打不开</strong><p>{error ?? '稍后再试。'}</p><button type="button" onClick={onRetry}>再试一次</button></div>}
      {addError && <div className="calendar-add-error" role="alert"><span>{addError}</span><button type="button" onClick={onAddRetry}>再试一次</button></div>}

      {status === 'ready' && (
        <div className="calendar-board">
          <div className="calendar-weekdays" aria-hidden="true">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>周{day}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map((cell) => (
              <div className={`calendar-cell ${cell.inMonth ? '' : 'is-outside'} ${cell.entries.length ? 'has-entry' : ''}`} key={cell.date}>
                <button
                  type="button"
                  className="calendar-day-trigger"
                  disabled={!cell.inMonth || !canAdd}
                  aria-label={cell.inMonth ? `${cell.date} 新增` : cell.date}
                  onClick={() => onDateSelect(cell.date)}
                >
                  <time dateTime={cell.date}>{cell.day}</time>
                </button>
                <div className="calendar-cell-entries">
                  {cell.entries.map((entry) => (
                    <button
                      type="button"
                      className={`calendar-entry is-${entry.kind}`}
                      key={entry.id}
                      onClick={() => onEntrySelect(entry as SharedCalendarEntry)}
                    >
                      <span>{entry.kind === 'plan' ? '约' : '去'}</span>
                      <strong>{entry.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
