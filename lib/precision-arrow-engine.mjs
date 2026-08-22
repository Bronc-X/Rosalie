function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function aimFromPoint(origin, point, maxDistance = 300) {
  const dx = point.x - origin.x;
  const dy = Math.max(1, origin.y - point.y);
  const angle = clamp(Math.atan2(dx, dy) * 180 / Math.PI, -55, 55);
  const power = clamp(Math.hypot(dx, origin.y - point.y) / maxDistance, 0.35, 1);
  return {
    angle: Number(angle.toFixed(1)),
    power: Number(power.toFixed(3)),
  };
}

export function segmentHitsCircle(start, end, circle) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : clamp(((circle.x - start.x) * dx + (circle.y - start.y) * dy) / lengthSquared, 0, 1);
  const closestX = start.x + dx * projection;
  const closestY = start.y + dy * projection;
  return Math.hypot(circle.x - closestX, circle.y - closestY) <= circle.radius;
}
