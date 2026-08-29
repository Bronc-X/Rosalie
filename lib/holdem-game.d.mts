export type HoldemPlayerId = 'hero' | 'mira' | 'nox' | 'vela' | 'lyra' | 'orin' | 'kaia' | 'sol' | 'lune';
export type HoldemDifficulty = 'easy' | 'standard' | 'hard';
export type HoldemPlayerCount = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HoldemPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'hand-over' | 'session-over';
export type HoldemAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; raiseTo: number }
  | { type: 'all-in' };
export type HoldemLegalAction = {
  type: HoldemAction['type'];
  amount?: number;
  minTo?: number;
  maxTo?: number;
  to?: number;
};
export type HoldemEvaluation = { category: number; vector: number[]; cards: string[]; label: string };
export type HoldemPlayer = {
  id: HoldemPlayerId;
  name: string;
  stack: number;
  cards: string[];
  folded: boolean;
  allIn: boolean;
  streetBet: number;
  totalBet: number;
  acted: boolean;
  actedAtBet: number | null;
  canRaise: boolean;
};
export type HoldemState = {
  version: 2;
  baseSeed: number;
  deckSeed: number;
  aiSeed: number;
  playerCount: HoldemPlayerCount;
  difficulty: HoldemDifficulty;
  handNumber: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  actorIndex: number | null;
  phase: HoldemPhase;
  currentBet: number;
  minRaise: number;
  pot: number;
  deck: string[];
  board: string[];
  burned: string[];
  players: HoldemPlayer[];
  log: string[];
  resultText: string;
  showdown: boolean;
  awards: Record<string, number>;
  hands: Record<string, HoldemEvaluation>;
};
export type HoldemGameOptions = {
  playerCount?: HoldemPlayerCount;
  difficulty?: HoldemDifficulty;
  stacks?: number[];
};

export const HOLDEM_BLINDS: Readonly<{ small: number; big: number }>;
export const HOLDEM_BUY_IN: number;
export const HOLDEM_PLAYER_COUNTS: readonly HoldemPlayerCount[];
export const HOLDEM_DIFFICULTIES: readonly HoldemDifficulty[];
export function createHoldemDeck(seed?: number): string[];
export function evaluateHoldemHand(cards: string[]): HoldemEvaluation;
export function compareHoldemHands(first: HoldemEvaluation, second: HoldemEvaluation): number;
export function buildHoldemPots(players: Array<{ id: string; totalBet: number; folded: boolean }>): {
  pots: Array<{ amount: number; cap: number; participants: string[]; eligible: string[] }>;
  refunds: Record<string, number>;
};
export function resolveHoldemShowdown(input: {
  board: string[];
  players: Array<{ id: string; cards: string[]; totalBet: number; folded: boolean }>;
  dealerIndex?: number;
}): {
  awards: Record<string, number>;
  hands: Record<string, HoldemEvaluation>;
  pots: Array<{ amount: number; cap: number; participants: string[]; eligible: string[] }>;
  refunds: Record<string, number>;
};
export function createHoldemGame(seed?: number, options?: HoldemGameOptions | number[]): HoldemState;
export function startNextHoldemHand(previous: HoldemState): HoldemState;
export function getHoldemLegalActions(game: HoldemState, playerId: HoldemPlayerId): HoldemLegalAction[];
export function applyHoldemAction(game: HoldemState, action: HoldemAction): HoldemState;
export function estimateHoldemEquity(cards: string[], board?: string[], opponentCount?: number, seed?: number, trials?: number): number;
export function getHoldemAiThinkDelay(difficulty?: HoldemDifficulty, seed?: number): number;
export function chooseHoldemAiAction(game: HoldemState, seed?: number): HoldemAction;
export function grantHoldemChips(game: HoldemState, amount?: number, playerId?: HoldemPlayerId): HoldemState;
export function normalizeHoldemState(input: unknown): { ok: true; value: HoldemState } | { ok: false; error: string };
