import type { PlanStatus } from './types.ts';

export type CalendarExperience = {
  id: string;
  title: string;
};

export type CalendarFootprintSource = {
  id: string;
  experienceId: string;
  memberId: string;
  visitedOn: string;
};

export type CalendarPlanSource = {
  id: string;
  experienceId: string;
  scheduledFor: string;
  status: PlanStatus;
  inviterMemberId: string;
  inviteeMemberId: string;
};

export type CalendarEntry = {
  id: string;
  kind: 'footprint' | 'plan';
  sourceId: string;
  experienceId: string;
  title: string;
  date: string;
  memberIds: string[];
};

export type DeriveCalendarInput = {
  today: string;
  experiences: readonly CalendarExperience[];
  footprints: readonly CalendarFootprintSource[];
  plans: readonly CalendarPlanSource[];
};

export const deriveCalendarEntries = (input: DeriveCalendarInput): CalendarEntry[] => {
  const experienceTitles = new Map(input.experiences.map(({ id, title }) => [id, title]));
  const entries: CalendarEntry[] = [];

  for (const footprint of input.footprints) {
    const title = experienceTitles.get(footprint.experienceId);
    if (!title || footprint.visitedOn > input.today) continue;
    entries.push({
      id: `footprint:${footprint.id}`,
      kind: 'footprint',
      sourceId: footprint.id,
      experienceId: footprint.experienceId,
      title,
      date: footprint.visitedOn,
      memberIds: [footprint.memberId],
    });
  }

  for (const plan of input.plans) {
    const title = experienceTitles.get(plan.experienceId);
    if (!title || plan.status !== 'accepted' || plan.scheduledFor < input.today) continue;
    entries.push({
      id: `plan:${plan.id}`,
      kind: 'plan',
      sourceId: plan.id,
      experienceId: plan.experienceId,
      title,
      date: plan.scheduledFor,
      memberIds: [...new Set([plan.inviterMemberId, plan.inviteeMemberId])],
    });
  }

  return entries.sort((left, right) => left.date.localeCompare(right.date));
};
