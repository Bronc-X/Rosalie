import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('food cards use one local cached fallback instead of foreign map thumbnails', async () => {
  const source = await readFile(new URL('../app/food/food-atlas.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /tile\.openstreetmap\.de/);
  assert.match(source, /\/food\/shantou-qilou-food-v1\.webp/);
  assert.match(source, /restaurant\.coordinates \? \(/);
});
