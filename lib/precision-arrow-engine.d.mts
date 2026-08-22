export type Point = { x: number; y: number };
export function aimFromPoint(origin: Point, point: Point, maxDistance?: number): { angle: number; power: number };
export function segmentHitsCircle(start: Point, end: Point, circle: Point & { radius: number }): boolean;
