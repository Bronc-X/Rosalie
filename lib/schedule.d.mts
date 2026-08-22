export const SCHEDULE_CONTENT_MAX_LENGTH: number;
export const SCHEDULE_LOCATION_MAX_LENGTH: number;
export const SCHEDULE_ADDED_BY_MAX_LENGTH: number;

export type ScheduleDraft = {
  scheduledAt: string;
  content: string;
  location: string;
  addedBy: string;
};

export type ScheduleEntry = ScheduleDraft & {
  id: string;
  createdAt: string;
};

export type NormalizedScheduleEntry =
  | { ok: true; value: ScheduleDraft }
  | { ok: false; error: string };

export function normalizeScheduleEntry(input: unknown): NormalizedScheduleEntry;
export function sortScheduleEntries<T extends Pick<ScheduleEntry, 'scheduledAt' | 'createdAt'>>(entries: T[]): T[];
