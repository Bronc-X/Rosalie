export const MAX_GAME_RENDER_SCALE = 2.5;

export function getGameRenderScale(devicePixelRatio, displayScale = 1) {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio < 1) return 1;
  const safeDisplayScale = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  const requiredScale = Math.max(1, devicePixelRatio * safeDisplayScale);
  return Math.min(MAX_GAME_RENDER_SCALE, Math.round(requiredScale * 100) / 100);
}

export function getGameBackingSize(logicalWidth, logicalHeight, devicePixelRatio, availableWidth, availableHeight) {
  const hasDisplayBounds = Number.isFinite(availableWidth) && availableWidth > 0
    && Number.isFinite(availableHeight) && availableHeight > 0;
  const displayScale = hasDisplayBounds
    ? Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight)
    : 1;
  const scale = getGameRenderScale(devicePixelRatio, displayScale);
  return {
    width: Math.round(logicalWidth * scale),
    height: Math.round(logicalHeight * scale),
    scale,
  };
}
