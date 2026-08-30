export type ExperienceState = 'wishlist' | 'footprint';
export type ExperienceOwner = 'all' | 'shared' | 'toni' | 'rosalie';

export type ExperiencePlace = { id: string; label: string };

export const DEFAULT_EXPERIENCE_PLACES: ExperiencePlace[] = [
  { id: 'shantou', label: '汕頭' },
  { id: 'guangzhou', label: '廣州' },
  { id: 'shenzhen', label: '深圳' },
];

const EXPERIENCE_PLACE_HERO_IMAGES: Record<string, string> = {
  shantou: '/place-covers/shantou-v2.png',
  guangzhou: '/place-covers/guangzhou-v2.png',
  shenzhen: '/place-covers/shenzhen-v2.png',
};

export function getExperiencePlaceHeroImage(placeId: string): string {
  return EXPERIENCE_PLACE_HERO_IMAGES[placeId] ?? '/place-covers/shantou-v2.png';
}

export type FilterableExperience = {
  id: string;
  name: string;
  placeId?: string | null;
  category: string;
  address?: string | null;
  tags?: string[];
  state: ExperienceState;
  memberIds?: string[];
};

export function filterExperiencesByPlace<T extends { placeId?: string | null }>(items: T[], placeId: string): T[] {
  return items.filter((item) => (item.placeId ?? 'shantou') === placeId);
}

export function appendExperiencePlace(places: ExperiencePlace[], place: ExperiencePlace): ExperiencePlace[] {
  return places.some((item) => item.id === place.id) ? places : [...places, place];
}

export function withExperiencePlace<T extends object>(draft: T, placeId: string): T & { placeId: string } {
  return { ...draft, placeId };
}

export type ExperienceFilters = {
  state: 'all' | ExperienceState;
  owner: ExperienceOwner;
  category: string;
  tag?: string;
  query: string;
};

export type FootprintDraft = {
  visitedOn: string;
  rating?: number;
  comment?: string;
};

export type CalendarEntry = {
  id: string;
  kind: 'plan' | 'footprint';
  title: string;
  status?: string;
  scheduledFor?: string;
  visitedOn?: string;
  [key: string]: unknown;
};

export type CalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
  entries: CalendarEntry[];
};

export function canInitializeExperienceMap(accessStatus: string, activeView: string, dataStatus: string): boolean {
  return accessStatus === 'ready' && activeView === 'experiences' && dataStatus === 'ready';
}

export function isExperienceMarkerActivation(event: { type: string; originalEvent?: unknown }): boolean {
  if (event.type === 'click') return true;
  if (event.type !== 'keypress' || !event.originalEvent || typeof event.originalEvent !== 'object') return false;
  const keyboardEvent = event.originalEvent as { key?: unknown; keyCode?: unknown };
  return keyboardEvent.key === 'Enter' || keyboardEvent.keyCode === 13;
}

export function canRespondToNotifications(status: string): boolean {
  return status === 'ready';
}

export function shouldScrollMapForCardSelection(viewportWidth: number): boolean {
  return viewportWidth <= 800;
}

export type SelectableCalendarEntry = {
  kind: 'plan' | 'footprint';
  title: string;
  experienceId: string;
  footprintId?: string;
};

export type CalendarEntryTarget =
  | { kind: 'history'; experienceId: string; experienceName: string; footprintId: string | null }
  | { kind: 'experience'; experienceId: string };

export function resolveCalendarEntryTarget(entry: SelectableCalendarEntry): CalendarEntryTarget {
  return entry.kind === 'footprint'
    ? {
        kind: 'history',
        experienceId: entry.experienceId,
        experienceName: entry.title,
        footprintId: entry.footprintId ?? null,
      }
    : { kind: 'experience', experienceId: entry.experienceId };
}

export function filterExperiences<T extends FilterableExperience>(items: T[], filters: ExperienceFilters): T[] {
  const tokens = filters.query.trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    if (filters.state !== 'all' && item.state !== filters.state) return false;
    if (filters.category !== '全部' && item.category !== filters.category) return false;
    if (filters.tag && !(item.tags ?? []).includes(filters.tag)) return false;

    const members = item.memberIds ?? [];
    if (filters.owner === 'shared' && !(members.includes('toni') && members.includes('rosalie'))) return false;
    if ((filters.owner === 'toni' || filters.owner === 'rosalie') && !members.includes(filters.owner)) return false;

    const haystack = [item.name, item.address, item.category, ...(item.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('zh-CN');
    return tokens.every((token) => haystack.includes(token));
  });
}

export function markBeenHere<T extends FilterableExperience>(item: T, footprint: FootprintDraft): T & { footprint: FootprintDraft } {
  return { ...item, state: 'footprint', footprint };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateKeyInTimeZone(value: string | Date, timeZone = 'Asia/Shanghai'): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function shantouDateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

export function buildCalendarMonth(month: string, entries: CalendarEntry[]): CalendarCell[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const last = new Date(Date.UTC(year, monthNumber, 0));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const visibleStart = new Date(first);
  visibleStart.setUTCDate(visibleStart.getUTCDate() - mondayOffset);
  const visibleDays = mondayOffset + last.getUTCDate() > 35 ? 42 : 35;

  const visibleEntries = entries.filter((entry) => entry.kind === 'footprint' || entry.status === 'accepted');

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(visibleStart);
    date.setUTCDate(visibleStart.getUTCDate() + index);
    const dateKey = isoDate(date);
    return {
      date: dateKey,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthNumber - 1,
      entries: visibleEntries.filter((entry) => {
        const value = entry.kind === 'plan' ? entry.scheduledFor : entry.visitedOn;
        return value ? dateKeyInTimeZone(value) === dateKey : false;
      }),
    };
  });
}

export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year} 年 ${monthNumber} 月`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}
