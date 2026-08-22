export const SCHEDULE_CONTENT_MAX_LENGTH = 120;
export const SCHEDULE_LOCATION_MAX_LENGTH = 60;
export const SCHEDULE_ADDED_BY_MAX_LENGTH = 24;

function normalizePublicText(input, maxLength, emptyError) {
  if (typeof input !== 'string') return { ok: false, error: emptyError };
  const value = input
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return { ok: false, error: emptyError };
  if (Array.from(value).length > maxLength) {
    return { ok: false, error: `最多 ${maxLength} 个字。` };
  }
  return { ok: true, value };
}

function parseBeijingLocal(input) {
  if (typeof input !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31
    || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const utcTimestamp = Date.UTC(year, month - 1, day, hour - 8, minute);
  const localMirror = new Date(utcTimestamp + 8 * 60 * 60 * 1_000);
  if (localMirror.getUTCFullYear() !== year
    || localMirror.getUTCMonth() !== month - 1
    || localMirror.getUTCDate() !== day
    || localMirror.getUTCHours() !== hour
    || localMirror.getUTCMinutes() !== minute) return null;
  return new Date(utcTimestamp).toISOString();
}

export function normalizeScheduleEntry(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: '日程没有填完整。' };
  const scheduledAt = parseBeijingLocal(input.scheduledAt);
  if (!scheduledAt) return { ok: false, error: '请选择有效的北京时间。' };

  const content = normalizePublicText(input.content, SCHEDULE_CONTENT_MAX_LENGTH, '日程内容不能为空。');
  if (!content.ok) return content;
  const location = normalizePublicText(input.location, SCHEDULE_LOCATION_MAX_LENGTH, '地点不能为空。');
  if (!location.ok) return location;
  const addedBy = normalizePublicText(input.addedBy, SCHEDULE_ADDED_BY_MAX_LENGTH, '请写添加人。');
  if (!addedBy.ok) return addedBy;

  return {
    ok: true,
    value: {
      scheduledAt,
      content: content.value,
      location: location.value,
      addedBy: addedBy.value,
    },
  };
}

export function sortScheduleEntries(entries) {
  return [...entries].sort((first, second) => {
    const bySchedule = first.scheduledAt.localeCompare(second.scheduledAt);
    return bySchedule || first.createdAt.localeCompare(second.createdAt);
  });
}
