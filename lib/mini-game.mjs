export const GAME_DURATION_MS = 18_000;
export const GAME_WIN_SCORE = 8;

export function createMiniGame(status = 'idle') {
  return {
    status,
    score: 0,
    streak: 0,
    hearts: 3,
  };
}

export function collectMiniGameItem(state, kind) {
  if (state.status !== 'playing') return state;

  if (kind === 'blossom') {
    return {
      ...state,
      score: state.score + 1,
      streak: state.streak + 1,
    };
  }

  const hearts = Math.max(0, state.hearts - 1);
  return {
    ...state,
    status: hearts === 0 ? 'lost' : state.status,
    streak: 0,
    hearts,
  };
}

export function finishMiniGame(state) {
  if (state.status !== 'playing') return state;
  return {
    ...state,
    status: state.score >= GAME_WIN_SCORE ? 'won' : 'lost',
  };
}

export function createFallingItem(id, kindRoll, xRoll, elapsedMs) {
  const progress = Math.min(1, Math.max(0, elapsedMs / GAME_DURATION_MS));
  const blossomChance = 0.88 - progress * 0.08;
  return {
    id,
    kind: kindRoll < blossomChance ? 'blossom' : 'work',
    x: Math.round((8 + Math.min(1, Math.max(0, xRoll)) * 84) * 10) / 10,
    durationMs: Math.round(3_600 - progress * 850),
  };
}

export function clampPlayerX(value) {
  return Math.min(100, Math.max(0, value));
}

export function rectanglesOverlap(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}
