export type DropChoice = 'yes' | 'no';
export interface DropPoint { x: number; y: number; }
export interface DropRect { left: number; right: number; top: number; bottom: number; }
export interface DropTargets { yes: DropRect; no: DropRect; }
export function getDropChoice(point: DropPoint, targets: DropTargets, hitSlop?: number): DropChoice | null;
