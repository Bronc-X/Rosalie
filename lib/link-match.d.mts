export type LinkIconType = 'pull' | 'sakura' | 'rosette' | 'charm';
export type LinkCell = { id: string; type: LinkIconType };
export type LinkBoard = { rows: number; columns: number; cells: Array<LinkCell | null> };
export type LinkPoint = { row: number; column: number };

export const ICON_TYPES: ReadonlyArray<LinkIconType>;
export function createLinkBoard(random?: () => number, rows?: number, columns?: number): LinkBoard;
export function findLinkPath(board: LinkBoard, firstIndex: number, secondIndex: number): LinkPoint[] | null;
export function removeLinkedPair(board: LinkBoard, firstIndex: number, secondIndex: number): {
  board: LinkBoard;
  matched: boolean;
  path: LinkPoint[] | null;
};
export function findAvailablePair(board: LinkBoard): [number, number] | null;
export function shuffleRemaining(board: LinkBoard, random?: () => number): LinkBoard;
