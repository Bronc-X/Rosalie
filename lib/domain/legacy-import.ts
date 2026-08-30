export const LEGACY_FOOD_LOG_STORAGE_KEY = 'shantou-food-log-v1';

type LegacyFoodLog = {
  visited: boolean;
  rating?: number;
  comment?: string;
};

export type LegacyImportFootprint = {
  sourceKey: string;
  experienceId: string;
  memberId: string;
  visitedOn: string;
  rating?: number;
  comment?: string;
};

export type LegacyFoodLogImportPlan = {
  footprints: LegacyImportFootprint[];
  wishlistExperienceIds: string[];
  missingVisitDates: string[];
  ignoredExperienceIds: string[];
  preserveSource: true;
};

export type LegacyFoodLogImportInput = {
  raw: string | null;
  memberId: string;
  knownExperienceIds: readonly string[];
  visitDates: Readonly<Record<string, string>>;
};

const parseLegacyLogs = (raw: string | null): Record<string, LegacyFoodLog> => {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('旧食单数据无法解析，请保留原始 localStorage 后重试。');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('旧食单数据无法解析，请保留原始 localStorage 后重试。');
  }

  const logs: Record<string, LegacyFoodLog> = {};
  for (const [experienceId, value] of Object.entries(parsed)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const candidate = value as Record<string, unknown>;
    logs[experienceId] = {
      visited: candidate.visited === true,
      rating: typeof candidate.rating === 'number' ? candidate.rating : undefined,
      comment: typeof candidate.comment === 'string' ? candidate.comment : undefined,
    };
  }
  return logs;
};

const isIsoCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const planLegacyFoodLogImport = (
  input: LegacyFoodLogImportInput,
): LegacyFoodLogImportPlan => {
  const logs = parseLegacyLogs(input.raw);
  const knownIds = new Set(input.knownExperienceIds);
  const plan: LegacyFoodLogImportPlan = {
    footprints: [],
    wishlistExperienceIds: [],
    missingVisitDates: [],
    ignoredExperienceIds: [],
    preserveSource: true,
  };

  for (const [experienceId, log] of Object.entries(logs)) {
    if (!knownIds.has(experienceId)) {
      plan.ignoredExperienceIds.push(experienceId);
      continue;
    }

    if (!log.visited) {
      plan.wishlistExperienceIds.push(experienceId);
      continue;
    }

    const visitedOn = input.visitDates[experienceId];
    if (!visitedOn) {
      plan.missingVisitDates.push(experienceId);
      continue;
    }
    if (!isIsoCalendarDate(visitedOn)) {
      throw new Error(`${experienceId} 的访问日期必须使用有效的 YYYY-MM-DD 格式。`);
    }

    const footprint: LegacyImportFootprint = {
      sourceKey: `${LEGACY_FOOD_LOG_STORAGE_KEY}:${experienceId}`,
      experienceId,
      memberId: input.memberId,
      visitedOn,
    };
    if (Number.isInteger(log.rating) && (log.rating ?? 0) >= 1 && (log.rating ?? 0) <= 5) {
      footprint.rating = log.rating;
    }
    if (log.comment) footprint.comment = log.comment;
    plan.footprints.push(footprint);
  }

  return plan;
};
