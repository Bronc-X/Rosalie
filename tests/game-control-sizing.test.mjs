import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('image buttons keep a large touch target without stretching their artwork', async () => {
  const css = await readFile(new URL('../app/play/connect/connect.css', import.meta.url), 'utf8');

  assert.match(css, /\.link-icon img\s*\{[^}]*max-width:\s*58px;[^}]*max-height:\s*58px;/s);
  assert.doesNotMatch(css, /\.link-icon-charm img\s*\{[^}]*width:\s*93%;/s);
});
