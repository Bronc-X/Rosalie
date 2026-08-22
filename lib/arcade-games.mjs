export function connectedGroup(board, row, column) {
  const color = board[row]?.[column];
  if (!color) return [];
  const seen = new Set();
  const group = [];
  const queue = [[row, column]];
  while (queue.length) {
    const [currentRow, currentColumn] = queue.shift();
    const key = `${currentRow}:${currentColumn}`;
    if (seen.has(key) || board[currentRow]?.[currentColumn] !== color) continue;
    seen.add(key);
    group.push([currentRow, currentColumn]);
    queue.push(
      [currentRow - 1, currentColumn],
      [currentRow + 1, currentColumn],
      [currentRow, currentColumn - 1],
      [currentRow, currentColumn + 1],
    );
  }
  return group;
}

export function clearSandGroup(board, row, column) {
  const group = connectedGroup(board, row, column);
  if (group.length < 3) return { board, removed: 0 };
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const next = board.map((line) => [...line]);
  for (const [groupRow, groupColumn] of group) next[groupRow][groupColumn] = null;
  for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
    const particles = [];
    for (let rowIndex = height - 1; rowIndex >= 0; rowIndex -= 1) {
      if (next[rowIndex][columnIndex]) particles.push(next[rowIndex][columnIndex]);
    }
    for (let rowIndex = height - 1; rowIndex >= 0; rowIndex -= 1) {
      next[rowIndex][columnIndex] = particles[height - 1 - rowIndex] ?? null;
    }
  }
  return { board: next, removed: group.length };
}

export function topWaterColor(tube) {
  return tube.at(-1) ?? null;
}

export function canPourWater(source, target, capacity = 4) {
  if (!source.length || target.length >= capacity) return false;
  return !target.length || topWaterColor(source) === topWaterColor(target);
}

export function pourWater(tubes, sourceIndex, targetIndex, capacity = 4) {
  if (sourceIndex === targetIndex) return tubes;
  const source = tubes[sourceIndex];
  const target = tubes[targetIndex];
  if (!source || !target || !canPourWater(source, target, capacity)) return tubes;
  const next = tubes.map((tube) => [...tube]);
  const color = topWaterColor(next[sourceIndex]);
  while (
    next[sourceIndex].length
    && topWaterColor(next[sourceIndex]) === color
    && next[targetIndex].length < capacity
  ) {
    next[targetIndex].push(next[sourceIndex].pop());
  }
  return next;
}

export function waterPuzzleSolved(tubes, capacity = 4) {
  return tubes.every((tube) => {
    if (!tube.length) return true;
    return tube.length === capacity && tube.every((color) => color === tube[0]);
  });
}

export function trayAfterPick(tray, color, matchSize = 3, capacity = 7) {
  if (tray.length >= capacity) return { tray, cleared: false, overflow: true };
  const next = [...tray, color];
  const count = next.filter((candidate) => candidate === color).length;
  if (count < matchSize) return { tray: next, cleared: false, overflow: next.length >= capacity };
  let remaining = matchSize;
  const clearedTray = next.filter((candidate) => {
    if (candidate !== color || remaining === 0) return true;
    remaining -= 1;
    return false;
  });
  return { tray: clearedTray, cleared: true, overflow: false };
}

export function canCarExit(car, cars, boardSize = 6) {
  const occupied = new Set();
  for (const candidate of cars) {
    if (candidate.id === car.id || candidate.removed) continue;
    for (let offset = 0; offset < candidate.length; offset += 1) {
      occupied.add(candidate.horizontal
        ? `${candidate.row}:${candidate.column + offset}`
        : `${candidate.row + offset}:${candidate.column}`);
    }
  }
  if (car.horizontal) {
    const direction = car.direction === 'backward' ? -1 : 1;
    let column = direction > 0 ? car.column + car.length : car.column - 1;
    while (column >= 0 && column < boardSize) {
      if (occupied.has(`${car.row}:${column}`)) return false;
      column += direction;
    }
  } else {
    const direction = car.direction === 'backward' ? -1 : 1;
    let row = direction > 0 ? car.row + car.length : car.row - 1;
    while (row >= 0 && row < boardSize) {
      if (occupied.has(`${row}:${car.column}`)) return false;
      row += direction;
    }
  }
  return true;
}

export function parkingLayoutHasOverlap(cars) {
  const occupied = new Set();
  for (const car of cars) {
    for (let offset = 0; offset < car.length; offset += 1) {
      const key = car.horizontal
        ? `${car.row}:${car.column + offset}`
        : `${car.row + offset}:${car.column}`;
      if (occupied.has(key)) return true;
      occupied.add(key);
    }
  }
  return false;
}

export function holeSizeAfterSequence(initialSize, objectSizes) {
  let size = initialSize;
  for (const objectSize of objectSizes) {
    if (objectSize > size * 1.05) return null;
    size = nextHoleSize(size, objectSize);
  }
  return size;
}

export function swallowObject(hole, object) {
  const distance = Math.hypot(hole.x - object.x, hole.y - object.y);
  return object.size <= hole.size * 1.05 && distance <= hole.size * 0.5;
}

export function nextHoleSize(currentSize, objectSize) {
  return Math.min(34, Number(Math.sqrt(currentSize ** 2 + objectSize ** 2 * 0.28).toFixed(2)));
}
