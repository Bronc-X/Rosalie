export const TIMING_GOAL = 6;
export const TIMING_MAX_ATTEMPTS = 7;
export const TIMING_CYCLE_MS = 2_200;

export function createTimingGame(status = 'idle') {
  return {
    status,
    score: 0,
    attempts: 0,
    perfects: 0,
    lastJudge: null,
  };
}

export function beginTimingGame() {
  return createTimingGame('playing');
}

export function getTimingPosition(elapsedMs) {
  const progress = ((Math.max(0, elapsedMs) % TIMING_CYCLE_MS) / TIMING_CYCLE_MS);
  return progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
}

export function judgeTimingHit(position) {
  const distance = Math.abs(position - 0.5);
  if (distance <= 0.06) return 'perfect';
  if (distance <= 0.16) return 'good';
  return 'miss';
}

export function collectTimingHit(state, position) {
  if (state.status !== 'playing') return state;
  const lastJudge = judgeTimingHit(position);
  const score = state.score + (lastJudge === 'perfect' ? 2 : lastJudge === 'good' ? 1 : 0);
  const attempts = state.attempts + 1;
  return {
    ...state,
    status: score >= TIMING_GOAL ? 'won' : attempts >= TIMING_MAX_ATTEMPTS ? 'lost' : 'playing',
    score,
    attempts,
    perfects: state.perfects + (lastJudge === 'perfect' ? 1 : 0),
    lastJudge,
  };
}
