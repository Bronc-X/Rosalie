export type EndlessGameId = 'snake' | 'bubble' | 'merge' | 'breakout' | 'hop' | 'stack' | 'drift' | 'wave' | 'slice' | 'orbit';
export type EndlessGameCatalogItem = Readonly<{
  id: EndlessGameId;
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
export function isEndlessGameId(value: unknown): value is EndlessGameId;
export function mergeTileLine(values: number[]): { line: number[]; score: number; moved: boolean };
export function getStackOverlap(base: { x: number; width: number }, moving: { x: number; width: number }): { x: number; width: number } | null;
export function isDrawableControllerSource(image: unknown): boolean;
export function createEndlessGameState(id: EndlessGameId, seed?: number): EndlessGameState;
export function controlEndlessGame(state: EndlessGameState, input: EndlessGameInput): EndlessGameState;
export function advanceEndlessGame(state: EndlessGameState, elapsedMs: number): EndlessGameState;
export function drawEndlessGame(context: CanvasRenderingContext2D, state: EndlessGameState, controllerImage?: CanvasImageSource | null): void;
