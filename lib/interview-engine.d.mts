import type { InterviewAction, InterviewMessage, InterviewProfile } from './interview.mjs';

export type InterviewDimensionScores = {
  relevance: number;
  evidence: number;
  judgment: number;
  ownership: number;
  structure: number;
};

export type InterviewEvaluation = {
  answerType: 'thin' | 'grounded' | 'strong' | 'clarification' | 'refusal' | 'off_topic';
  scores: InterviewDimensionScores;
  evidence: Array<{ quote: string; dimension: string; observation: string }>;
  gaps: string[];
  total: number;
};

export type InterviewEngineTurn = {
  question: string;
  answer: string;
  competencyId: string;
  difficulty: 1 | 2 | 3;
  wasProbe: boolean;
  evaluation: InterviewEvaluation | null;
};

export type InterviewEngineState = {
  version: 2;
  phase: 'opening' | 'experience' | 'case' | 'closing' | 'complete';
  currentArcIndex: number;
  probesOnCurrentArc: number;
  difficulty: 1 | 2 | 3;
  covered: string[];
  turns: InterviewEngineTurn[];
  planRole: string;
  planSize: number;
};

export type InterviewDecision = {
  action: 'probe' | 'move_on' | 'clarify' | 'redirect' | 'finish';
  competencyId: string;
  competencyLabel: string;
  brief: string;
  openingQuestion: string;
  difficulty: 1 | 2 | 3;
  probeTarget: string;
  turnNumber: number;
  maxTurns: number;
};

export type InterviewOrchestration = {
  engine: InterviewEngineState;
  evaluation: InterviewEvaluation | null;
  decision: InterviewDecision;
};

export const INTERVIEW_ENGINE_VERSION: 2;
export const INTERVIEW_MIN_TURNS: 5;
export const INTERVIEW_MAX_TURNS: 7;
export const INTERVIEW_MAX_PROBES_PER_ARC: 1;
export function getInterviewRolePlan(role: string): ReadonlyArray<{ id: string; label: string; brief: string; openingQuestion: string }>;
export function createInterviewEngine(profile: InterviewProfile): InterviewEngineState;
export function normalizeInterviewEngineState(input: unknown, profile: InterviewProfile):
  | { ok: true; value: InterviewEngineState }
  | { ok: false; error: string };
export function evaluateInterviewAnswer(value: string): InterviewEvaluation;
export function prepareInterviewTurn(request: {
  action: InterviewAction;
  profile: InterviewProfile;
  messages: InterviewMessage[];
  engine?: InterviewEngineState;
}): InterviewOrchestration;
export function commitInterviewQuestion(engine: InterviewEngineState, decision: InterviewDecision, value: string): InterviewEngineState;
export function getInterviewEngineStatus(profile: InterviewProfile, value?: InterviewEngineState | null): {
  competency: string;
  depth: string;
  phase: string;
  questionNumber: number;
  answered: number;
  maxTurns: number;
  covered: number;
};
export function buildInterviewDirective(orchestration: InterviewOrchestration): string;
export function buildInterviewEvidenceDigest(engine: InterviewEngineState): string;
