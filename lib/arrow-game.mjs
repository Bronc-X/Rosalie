export const ARROW_AIM_CYCLE_MS = 2_200;
export const ARROW_MAX_ATTEMPTS = 5;
export const ARROW_GOAL = 3;
export const ARROW_LAUNCHER = Object.freeze({ x: 50, y: 88 });
export const ARROW_TARGETS = Object.freeze([
  Object.freeze({ x: 28, y: 22, radius: 4 }),
  Object.freeze({ x: 68, y: 18, radius: 3.8 }),
  Object.freeze({ x: 48, y: 25, radius: 3.5 }),
]);

function pointDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function getArrowAimAngle(elapsedMs) {
  const progress = (Math.max(0, elapsedMs) % ARROW_AIM_CYCLE_MS) / ARROW_AIM_CYCLE_MS;
  const sweep = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
  return Number((-38 + sweep * 76).toFixed(6));
}

export function getArrowEndpoint(angle, distance = 92) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: ARROW_LAUNCHER.x + Math.sin(radians) * distance,
    y: ARROW_LAUNCHER.y - Math.cos(radians) * distance,
  };
}

export function angleToArrowTarget(target) {
  return (Math.atan2(target.x - ARROW_LAUNCHER.x, ARROW_LAUNCHER.y - target.y) * 180) / Math.PI;
}

export function judgeArrowShot(angle, target) {
  const end = getArrowEndpoint(angle);
  const dx = end.x - ARROW_LAUNCHER.x;
  const dy = end.y - ARROW_LAUNCHER.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = Math.min(1, Math.max(0, (
    (target.x - ARROW_LAUNCHER.x) * dx + (target.y - ARROW_LAUNCHER.y) * dy
  ) / lengthSquared));
  const closest = {
    x: ARROW_LAUNCHER.x + dx * progress,
    y: ARROW_LAUNCHER.y + dy * progress,
  };
  return pointDistance(closest, target) <= target.radius ? 'hit' : 'miss';
}

export function createArrowGame(status = 'idle') {
  return { status, attempts: 0, hits: 0, targetIndex: 0, shots: [] };
}

export function beginArrowGame() {
  return createArrowGame('playing');
}

export function takeArrowShot(state, angle) {
  if (state.status !== 'playing') return state;
  const target = ARROW_TARGETS[state.targetIndex];
  const judge = judgeArrowShot(angle, target);
  const attempts = state.attempts + 1;
  const hits = state.hits + (judge === 'hit' ? 1 : 0);
  const shot = { angle, judge, targetIndex: state.targetIndex };
  return {
    ...state,
    status: hits >= ARROW_GOAL ? 'won' : attempts >= ARROW_MAX_ATTEMPTS ? 'lost' : 'playing',
    attempts,
    hits,
    targetIndex: judge === 'hit' ? (state.targetIndex + 1) % ARROW_TARGETS.length : state.targetIndex,
    shots: [...state.shots.slice(-4), shot],
  };
}

