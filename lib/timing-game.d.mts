export type TimingJudge = 'perfect' | 'good' | 'miss';
export type TimingGameStatus = 'idle' | 'playing' | 'won' | 'lost';
export type TimingGameState = {
  status: TimingGameStatus;
  score: number;
  attempts: number;
  perfects: number;
  lastJudge: TimingJudge | null;
};

export const TIMING_GOAL: number;
export const TIMING_MAX_ATTEMPTS: number;
export const TIMING_CYCLE_MS: number;
export function createTimingGame(status?: TimingGameStatus): TimingGameState;
export function beginTimingGame(): TimingGameState;
export function getTimingPosition(elapsedMs: number): number;
export function judgeTimingHit(position: number): TimingJudge;
export function collectTimingHit(state: TimingGameState, position: number): TimingGameState;
