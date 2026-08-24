export const ICON_TYPES = Object.freeze(['pull', 'sakura', 'rosette', 'charm']);

function shuffled(values, random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function createLinkBoard(random = Math.random, rows = 6, columns = 4) {
  const total = rows * columns;
  const perType = total / ICON_TYPES.length;
  if (!Number.isInteger(perType) || perType % 2 !== 0) {
    throw new Error('Board size must provide an even count for every icon type');
  }

  const types = shuffled(
    ICON_TYPES.flatMap((type) => Array.from({ length: perType }, () => type)),
    random,
  );

  return {
    rows,
    columns,
    cells: types.map((type, index) => ({ id: `${type}-${index}`, type })),
  };
}

function boardPoint(index, columns) {
  return { row: Math.floor(index / columns) + 1, column: (index % columns) + 1 };
}

function publicPoint(point) {
  return { row: point.row - 1, column: point.column - 1 };
}

export function findLinkPath(board, firstIndex, secondIndex) {
  if (!board || firstIndex === secondIndex) return null;
  const first = board.cells[firstIndex];
  const second = board.cells[secondIndex];
  if (!first || !second || first.type !== second.type) return null;

  const start = boardPoint(firstIndex, board.columns);
  const target = boardPoint(secondIndex, board.columns);
  const paddedRows = board.rows + 2;
  const paddedColumns = board.columns + 2;
  const directions = [
    { row: -1, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 0 },
    { row: 0, column: -1 },
  ];

  function isBlocked(row, column) {
    if ((row === start.row && column === start.column)
      || (row === target.row && column === target.column)) return false;
    if (row === 0 || column === 0 || row === paddedRows - 1 || column === paddedColumns - 1) return false;
    const index = (row - 1) * board.columns + (column - 1);
    return board.cells[index] != null;
  }

  const queue = [{ ...start, direction: -1, turns: 0, path: [publicPoint(start)] }];
  const visited = new Map();

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor];
    for (let direction = 0; direction < directions.length; direction += 1) {
      const turns = state.direction === -1 || state.direction === direction
        ? state.turns
        : state.turns + 1;
      if (turns > 2) continue;

      const row = state.row + directions[direction].row;
      const column = state.column + directions[direction].column;
      if (row < 0 || column < 0 || row >= paddedRows || column >= paddedColumns || isBlocked(row, column)) continue;

      const path = state.direction !== -1 && state.direction !== direction
        ? [...state.path, publicPoint(state)]
        : state.path;
      if (row === target.row && column === target.column) {
        return [...path, publicPoint(target)];
      }

      const key = `${row}:${column}:${direction}`;
      const previousTurns = visited.get(key);
      if (previousTurns != null && previousTurns <= turns) continue;
      visited.set(key, turns);
      queue.push({ row, column, direction, turns, path });
    }
  }

  return null;
}

export function removeLinkedPair(board, firstIndex, secondIndex) {
  const path = findLinkPath(board, firstIndex, secondIndex);
  if (!path) return { board, matched: false, path: null };

  const cells = [...board.cells];
  cells[firstIndex] = null;
  cells[secondIndex] = null;
  return { board: { ...board, cells }, matched: true, path };
}

export function findAvailablePair(board) {
  for (let first = 0; first < board.cells.length; first += 1) {
    if (!board.cells[first]) continue;
    for (let second = first + 1; second < board.cells.length; second += 1) {
      if (findLinkPath(board, first, second)) return [first, second];
    }
  }
  return null;
}

export function shuffleRemaining(board, random = Math.random) {
  const remaining = shuffled(board.cells.filter(Boolean), random);
  let cursor = 0;
  return {
    ...board,
    cells: board.cells.map((cell) => cell == null ? null : remaining[cursor++]),
  };
}
