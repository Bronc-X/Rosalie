export {
  INTERVIEW_FALLBACK_MODEL_ID,
  INTERVIEW_MODEL_ID,
  INTERVIEW_MODEL_LABEL,
  INTERVIEW_PRIMARY_FIRST_TOKEN_TIMEOUT_MS,
} from './interview-model.mjs';

export type InterviewAction = 'start' | 'reply' | 'review';
export type InterviewRoleId = 'community' | 'pr' | 'brand' | 'product-marketing';
export type InterviewExperienceId = 'entry' | 'junior' | 'senior';
export type InterviewMessageRole = 'assistant' | 'user';

export type InterviewProfile = {
  company: string;
  role: InterviewRoleId;
  experience: InterviewExperienceId;
};

export type InterviewMessage = {
  role: InterviewMessageRole;
  content: string;
};

export type InterviewRequest = {
  action: InterviewAction;
  profile: InterviewProfile;
  messages: InterviewMessage[];
};

export type InterviewJobRequest = InterviewRequest & { sessionId: string };

export type InterviewRecord = {
  id: string;
  stage: 'interview' | 'review';
  profile: InterviewProfile;
  messages: InterviewMessage[];
  review: string;
  createdAt: string;
  updatedAt: string;
};

export type InterviewJobEvent = {
  type: 'job.started' | 'step.started' | 'tool.started' | 'tool.completed' | 'artifact.created' | 'artifact.patch' | 'step.failed' | 'job.completed';
  jobId: string;
  at: string;
  [key: string]: unknown;
};

export const INTERVIEW_ROLES: ReadonlyArray<{ id: InterviewRoleId; label: string }>;
export const INTERVIEW_EXPERIENCE_LEVELS: ReadonlyArray<{ id: InterviewExperienceId; label: string }>;
export const INTERVIEW_COMPANY_MAX_LENGTH: number;
export const INTERVIEW_MESSAGE_MAX_LENGTH: number;
export const INTERVIEW_MAX_MESSAGES: number;
export const INTERVIEW_RECORD_MAX_COUNT: number;
export const INTERVIEW_OUTPUT_MAX_LENGTH: number;

export function normalizeInterviewRequest(input: unknown):
  | { ok: true; value: InterviewRequest }
  | { ok: false; error: string };
export function normalizeInterviewJobRequest(input: unknown):
  | { ok: true; value: InterviewJobRequest }
  | { ok: false; error: string };
export function normalizeInterviewRecord(input: unknown):
  | { ok: true; value: InterviewRecord }
  | { ok: false; error: string };
export function mergeInterviewRecords(...collections: unknown[]): InterviewRecord[];
export function buildInterviewMessages(request: InterviewRequest): Array<{ role: 'system' | InterviewMessageRole; content: string }>;
export function extractAssistantContent(payload: unknown): string | null;
export function extractAssistantDelta(payload: unknown): string | null;
export function encodeInterviewEvent(event: InterviewJobEvent): string;
export function parseInterviewEventFrame(frame: string): InterviewJobEvent | null;
export function splitProviderSseFrames(buffer: string, chunk: string): { frames: string[]; remainder: string };
