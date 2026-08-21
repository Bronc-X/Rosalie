export type ArrowTarget = { readonly x: number; readonly y: number; readonly radius: number };
export type ArrowJudge = 'hit' | 'miss';
export type ArrowShot = { angle: number; judge: ArrowJudge; targetIndex: number };
export type ArrowGameState = {
  status: 'idle' | 'playing' | 'won' | 'lost';
  attempts: number;
  hits: number;
  targetIndex: number;
  shots: ArrowShot[];
};
export const ARROW_AIM_CYCLE_MS: number;
export const ARROW_MAX_ATTEMPTS: number;
export const ARROW_GOAL: number;
export const ARROW_LAUNCHER: Readonly<{ x: number; y: number }>;
export const ARROW_TARGETS: ReadonlyArray<ArrowTarget>;
export function getArrowAimAngle(elapsedMs: number): number;
export function getArrowEndpoint(angle: number, distance?: number): { x: number; y: number };
export function angleToArrowTarget(target: ArrowTarget): number;
export function judgeArrowShot(angle: number, target: ArrowTarget): ArrowJudge;
export function createArrowGame(status?: ArrowGameState['status']): ArrowGameState;
export function beginArrowGame(): ArrowGameState;
export function takeArrowShot(state: ArrowGameState, angle: number): ArrowGameState;

