import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PRIMARY_SURFACES = [
  'app/site-chrome.tsx',
  'app/page.tsx',
  'app/treehole/treehole-board.tsx',
  'app/schedule/schedule-board.tsx',
  'app/interview/interview-room.tsx',
  'app/play/game-lab.tsx',
];

test('primary mobile surfaces avoid decorative emoji and ornamental separators', async () => {
  for (const file of PRIMARY_SURFACES) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /[☾☼✦✓♥♡↗…—–]| · /, file);
  }
});

test('the interview setup presents each instruction once', async () => {
  const source = await readFile(new URL('../app/interview/interview-room.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, />INTERVIEW</);
  assert.doesNotMatch(source, /一次一问/);
  assert.doesNotMatch(source, />0\{index \+ 1\}</);
});

test('the homepage folds secondary tools into the top and removes the invitation flow', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /className="home-utility-bar"/);
  assert.match(source, /<details className="controller-drawer">/);
  assert.match(source, /href="\/interview"/);
  assert.match(source, /href="\/play"/);
  assert.doesNotMatch(source, /INITIAL_INVITATION|respondToInvitation|getDropChoice/);
  assert.doesNotMatch(source, /className=\{`invitation|mobile-charm-stage|想我就点右上方发信息给我/);
});
