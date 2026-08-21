export type CountdownPhase = 'before' | 'counting' | 'reunited';
export interface CountdownState { phase: CountdownPhase; progress: number; remainingMs: number; }
export interface DurationParts { days: number; hours: number; minutes: number; seconds: number; }
export const COUNTDOWN_START: number;
export const COUNTDOWN_TARGET: number;
export function getCountdownState(now?: number): CountdownState;
export function splitDuration(remainingMs: number): DurationParts;
