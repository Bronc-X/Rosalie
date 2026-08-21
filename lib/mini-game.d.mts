export type MiniGameStatus = 'idle' | 'playing' | 'won' | 'lost';
export type MiniGameItemKind = 'blossom' | 'work';

export type MiniGameState = {
  status: MiniGameStatus;
  score: number;
  streak: number;
  hearts: number;
};

export type FallingItem = {
  id: number;
  kind: MiniGameItemKind;
  x: number;
  durationMs: number;
};

export type CollisionRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const GAME_DURATION_MS: number;
export const GAME_WIN_SCORE: number;
export function createMiniGame(status?: MiniGameStatus): MiniGameState;
export function collectMiniGameItem(state: MiniGameState, kind: MiniGameItemKind): MiniGameState;
export function finishMiniGame(state: MiniGameState): MiniGameState;
export function createFallingItem(id: number, kindRoll: number, xRoll: number, elapsedMs: number): FallingItem;
export function clampPlayerX(value: number): number;
export function rectanglesOverlap(first: CollisionRect, second: CollisionRect): boolean;
