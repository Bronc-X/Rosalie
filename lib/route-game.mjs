export const ROUTE_START = Object.freeze({ x: 10, y: 78 });
export const ROUTE_TARGET = Object.freeze({ x: 90, y: 22 });
export const ROUTE_OBSTACLES = Object.freeze([
  Object.freeze({ x: 31, y: 58, radius: 9, label: '干' }),
  Object.freeze({ x: 52, y: 43, radius: 10, label: '会' }),
  Object.freeze({ x: 71, y: 60, radius: 9, label: '活' }),
]);

function clamp(value) {
  return Math.min(100, Math.max(0, value));
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function segmentHitsCircle(start, end, circle) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, ((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSquared));
  const closest = {
    x: start.x + dx * progress,
    y: start.y + dy * progress,
  };
  return distance(closest, circle) <= circle.radius;
}

export function beginRouteGame() {
  return {
    status: 'playing',
    points: [ROUTE_START],
  };
}

export function advanceRouteGame(state, rawPoint, obstacles = ROUTE_OBSTACLES) {
  if (state.status !== 'playing') return state;
  const point = { x: clamp(rawPoint.x), y: clamp(rawPoint.y) };
  const previous = state.points.at(-1) ?? ROUTE_START;
  if (distance(previous, point) < 0.8) return state;

  const points = [...state.points.slice(-139), point];
  if (obstacles.some((obstacle) => segmentHitsCircle(previous, point, obstacle))) {
    return { status: 'lost', points };
  }
  if (distance(point, ROUTE_TARGET) <= 7) {
    return { status: 'won', points: [...points, ROUTE_TARGET] };
  }
  return { status: 'playing', points };
}

export function releaseRouteGame(state) {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'lost' };
}
