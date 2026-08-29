export type EndlessGameId = 'snake' | 'bubble' | 'merge' | 'breakout' | 'hop' | 'stack' | 'drift' | 'wave' | 'slice' | 'orbit';
export type EndlessGameCatalogItem = Readonly<{
  id: EndlessGameId;
  worldId: string;
  objective: string;
  label: string;
  note: string;
  instruction: string;
  glyph: string;
  endless: true;
}>;
export type EndlessGameState = {
  id: EndlessGameId;
  score: number;
  alive: boolean;
  elapsed: number;
  seed: number;
  flash: number;
} & Record<string, unknown>;
export type EndlessGameWorld = Readonly<{
  id: string;
  motif: string;
  light: readonly [string, string, string];
  dark: readonly [string, string, string];
  shell: readonly [string, string];
  shellDark: readonly [string, string];
  accent: string;
  phaseNames: readonly [string, string, string, string];
  challenges: readonly [string, string, string, string];
}>;
export type EndlessGameRunMeta = {
  phase: number;
  phaseName: string;
  challenge: string;
  combo: number;
  multiplier: number;
};
export type EndlessGameInput = {
  type: 'tap' | 'down' | 'move' | 'up' | 'swipe' | 'key';
  x?: number;
  y?: number;
  previousX?: number;
  previousY?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  key?: string;
};

export const ENDLESS_GAME_IDS: readonly EndlessGameId[];
export const ENDLESS_GAME_CATALOG: readonly EndlessGameCatalogItem[];
export const ENDLESS_GAME_WORLDS: Readonly<Record<EndlessGameId, EndlessGameWorld>>;
export function getEndlessGameRunMeta(state: EndlessGameState): EndlessGameRunMeta;
export function isEndlessGameId(value: unknown): value is EndlessGameId;
export function mergeTileLine(values: number[]): { line: number[]; score: number; moved: boolean };
export function getStackOverlap(base: { x: number; width: number }, moving: { x: number; width: number }): { x: number; width: number } | null;
export function isDrawableControllerSource(image: unknown): boolean;
export function createEndlessGameState(id: EndlessGameId, seed?: number): EndlessGameState;
export function controlEndlessGame(state: EndlessGameState, input: EndlessGameInput): EndlessGameState;
export function advanceEndlessGame(state: EndlessGameState, elapsedMs: number): EndlessGameState;
export function drawEndlessGame(context: CanvasRenderingContext2D, state: EndlessGameState, controllerImage?: CanvasImageSource | null): void;
