import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const siteUi = await import('../lib/site-ui.mjs').catch(() => ({}));

test('nested game routes keep the global game destination active', () => {
  assert.equal(siteUi.isPrimaryNavActive?.('/play', '/play'), true);
  assert.equal(siteUi.isPrimaryNavActive?.('/play/snake', '/play'), true);
  assert.equal(siteUi.isPrimaryNavActive?.('/schedule', '/play'), false);
  assert.equal(siteUi.isPrimaryNavActive?.('/', '/'), true);
  assert.equal(siteUi.isPrimaryNavActive?.('/treehole', '/'), false);
});

test('the mobile dock allocates six equal columns without reducing touch height', async () => {
  const source = await readFile(new URL('../app/site-chrome.css', import.meta.url), 'utf8');
  assert.match(source, /grid-template-columns:\s*repeat\(6,\s*1fr\)/);
  assert.match(source, /\.site-dock a\s*\{[^}]*min-height:\s*56px/s);
});

test('feature headers do not duplicate cross-feature navigation', async () => {
  const files = [
    'app/schedule/schedule-board.tsx',
    'app/treehole/treehole-board.tsx',
    'app/play/game-lab.tsx',
  ];

  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /<Link[^>]+href="\/(?:play|treehole|schedule|)"/);
  }
});
