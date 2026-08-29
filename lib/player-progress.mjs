export const GAME_IDS = [
  'holdem', 'hole', 'sand', 'parking', 'screw', 'water', 'rescue', 'arrow', 'connect',
  'snake', 'bubble', 'merge', 'breakout', 'hop', 'stack', 'drift', 'wave', 'slice', 'orbit',
];

export function normalizeProgressUpdate(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'INVALID_PROGRESS' };
  const { gameId, level, bestScore = 0 } = input;
  if (!GAME_IDS.includes(gameId)) return { ok: false, error: 'INVALID_GAME' };
  if (!Number.isSafeInteger(level) || level < 0 || level > 99) {
    return { ok: false, error: 'INVALID_LEVEL' };
  }
  if (!Number.isSafeInteger(bestScore) || bestScore < 0 || bestScore > 999_999_999) {
    return { ok: false, error: 'INVALID_SCORE' };
  }
  return { ok: true, value: { gameId, level, bestScore } };
}

export function mergeProgress(current, incoming) {
  if (!current) return { ...incoming };
  if (current.gameId !== incoming.gameId) throw new Error('Cannot merge different games');
  return {
    gameId: current.gameId,
    level: Math.max(current.level, incoming.level),
    bestScore: Math.max(current.bestScore, incoming.bestScore),
  };
}

export function nextUnlockedLevel(currentLevel, totalLevels) {
  if (!Number.isSafeInteger(totalLevels) || totalLevels <= 0) return 0;
  const current = Number.isSafeInteger(currentLevel) ? currentLevel : 0;
  return Math.min(Math.max(0, current + 1), totalLevels - 1);
}
