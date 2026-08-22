export const MAX_GAME_RENDER_SCALE: number;
export function getGameRenderScale(devicePixelRatio: number, displayScale?: number): number;
export function getGameBackingSize(
  logicalWidth: number,
  logicalHeight: number,
  devicePixelRatio: number,
  availableWidth?: number,
  availableHeight?: number,
): {
  width: number;
  height: number;
  scale: number;
};
