import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the gate consistently calls the password an 暗号', async () => {
  const form = await readFile(new URL('../app/unlock/unlock-form.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/unlock/page.tsx', import.meta.url), 'utf8');

  assert.match(form, /<h1 id="unlock-title">暗号<\/h1>/);
  assert.doesNotMatch(form, /健康度|检测中/);
  assert.match(page, /title: '暗号'/);
  assert.doesNotMatch(page, /健康度/);
});
