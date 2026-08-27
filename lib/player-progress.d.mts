export type GameId =
  | 'hole' | 'sand' | 'parking' | 'screw' | 'water' | 'rescue' | 'arrow' | 'connect'
  | 'snake' | 'bubble' | 'merge' | 'breakout' | 'hop' | 'stack' | 'drift' | 'wave' | 'slice' | 'orbit';
export type GameProgress = { gameId: GameId; level: number; bestScore: number };
export const GAME_IDS: GameId[];
export function normalizeProgressUpdate(input: unknown): { ok: true; value: GameProgress } | { ok: false; error: string };
export function mergeProgress(current: GameProgress | null | undefined, incoming: GameProgress): GameProgress;
export function nextUnlockedLevel(currentLevel: number, totalLevels: number): number;
