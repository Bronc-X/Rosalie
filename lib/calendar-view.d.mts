export type CalendarMonth = { year: number; month: number };

export type CalendarDay = {
  key: string;
  day: number;
  inCurrentMonth: boolean;
};

export function buildMonthDays(year: number, month: number): CalendarDay[];
export function shiftMonth(view: CalendarMonth, delta: number): CalendarMonth;
export function toBeijingDateKey(value: string | number | Date): string;
export function defaultDateTimeForDay(dateKey: string): string;
