import test from 'node:test';
import assert from 'node:assert/strict';

const linkMatch = await import('../lib/link-match.mjs').catch(() => ({}));

function board(rows, columns, values) {
  return {
    rows,
    columns,
    cells: values.map((type, index) => type == null ? null : ({ id: `${type}-${index}`, type })),
  };
}

test('a new board contains four icon types and an even number of each', () => {
  const created = linkMatch.createLinkBoard(() => 0.42);
  assert.equal(created.rows, 6);
  assert.equal(created.columns, 4);
  assert.equal(created.cells.length, 24);
  const counts = Object.fromEntries(linkMatch.ICON_TYPES.map((type) => [type, 0]));
  for (const cell of created.cells) counts[cell.type] += 1;
  assert.deepEqual(counts, { pull: 6, sakura: 6, rosette: 6, charm: 6 });
});

test('identical icons connect in a straight line or around the outside with at most two turns', () => {
  const straight = board(2, 2, ['pull', 'pull', 'sakura', 'sakura']);
  assert.ok(linkMatch.findLinkPath(straight, 0, 1));

  const outside = board(3, 3, [
    'pull', 'sakura', 'pull',
    'rosette', 'charm', 'sakura',
    'charm', 'rosette', 'charm',
  ]);
  const path = linkMatch.findLinkPath(outside, 0, 2);
  assert.ok(path);
  assert.ok(path.length <= 4);
});

test('mismatched icons never connect and a valid pair is removed together', () => {
  const created = board(2, 2, ['pull', 'pull', 'sakura', 'sakura']);
  assert.equal(linkMatch.findLinkPath(created, 0, 2), null);

  const result = linkMatch.removeLinkedPair(created, 0, 1);
  assert.equal(result.matched, true);
  assert.equal(result.board.cells[0], null);
  assert.equal(result.board.cells[1], null);
  assert.equal(result.board.cells[2].type, 'sakura');
});

test('remaining icons can be shuffled without reviving cleared cells', () => {
  const created = board(2, 3, [null, 'pull', 'sakura', null, 'pull', 'sakura']);
  const shuffled = linkMatch.shuffleRemaining(created, () => 0.25);
  assert.equal(shuffled.cells[0], null);
  assert.equal(shuffled.cells[3], null);
  assert.deepEqual(
    shuffled.cells.filter(Boolean).map((cell) => cell.type).sort(),
    ['pull', 'pull', 'sakura', 'sakura'],
  );
});

test('the engine can surface one currently playable pair for hints', () => {
  const created = board(2, 2, ['pull', 'pull', 'sakura', 'sakura']);
  assert.deepEqual(linkMatch.findAvailablePair(created), [0, 1]);
  assert.equal(linkMatch.findAvailablePair(board(1, 2, ['pull', 'sakura'])), null);
});
