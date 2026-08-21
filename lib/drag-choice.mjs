function contains(point, rect, hitSlop) {
  return point.x >= rect.left - hitSlop
    && point.x <= rect.right + hitSlop
    && point.y >= rect.top - hitSlop
    && point.y <= rect.bottom + hitSlop;
}

export function getDropChoice(point, targets, hitSlop = 18) {
  if (contains(point, targets.yes, hitSlop)) return 'yes';
  if (contains(point, targets.no, hitSlop)) return 'no';
  return null;
}
