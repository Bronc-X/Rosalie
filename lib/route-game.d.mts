export type RoutePoint = { x: number; y: number };
export type RouteObstacle = RoutePoint & { radius: number; label: string };
export type RouteGameStatus = 'playing' | 'won' | 'lost';
export type RouteGameState = { status: RouteGameStatus; points: RoutePoint[] };

export const ROUTE_START: RoutePoint;
export const ROUTE_TARGET: RoutePoint;
export const ROUTE_OBSTACLES: readonly RouteObstacle[];
export function segmentHitsCircle(start: RoutePoint, end: RoutePoint, circle: RouteObstacle): boolean;
export function beginRouteGame(): RouteGameState;
export function advanceRouteGame(state: RouteGameState, point: RoutePoint, obstacles?: readonly RouteObstacle[]): RouteGameState;
export function releaseRouteGame(state: RouteGameState): RouteGameState;
