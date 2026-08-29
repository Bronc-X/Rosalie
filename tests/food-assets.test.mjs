import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const generatedPhotoNumbers = [11, 15, 16, 19, 22, 26, 27, 29, 31, 33, 34, 53];

test('food atlas keeps its atmospheric hero local and removes legacy map thumbnails', async () => {
  const source = await readFile(new URL('../app/food/food-atlas.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../app/food/food.css', import.meta.url), 'utf8');
  const config = await readFile(new URL('../next.config.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /tile\.openstreetmap\.de/);
  assert.match(source, /\/food\/shantou-qilou-food-v1\.webp/);
  assert.doesNotMatch(source, /map-thumbnail-image/);
  assert.match(config, /\/food\/shantou-qilou-food-v1\.webp/);
  assert.match(config, /img-src[^;]+https:\/\/a\.tile\.openstreetmap\.fr/);
  assert.doesNotMatch(styles, /\.map-frame[^}]+shantou-qilou-food-v1\.webp/);
  assert.match(source, /const initialViewPoints = isUnfiltered/);
  assert.match(source, /latitude > 23\.33/);
});

test('all 53 restaurants resolve to local photos and never render style placeholders', async () => {
  const atlasSource = await readFile(new URL('../app/food/food-atlas.tsx', import.meta.url), 'utf8');
  const restaurantSource = await readFile(new URL('../app/food/restaurants.ts', import.meta.url), 'utf8');
  const placeholderModule = new URL('../app/food/food-placeholder.tsx', import.meta.url);

  assert.equal((restaurantSource.match(/^\s*item\(/gm) ?? []).length, 53);
  for (let number = 5; number <= 53; number += 1) {
    const filename = `food-${String(number).padStart(2, '0')}.webp`;
    assert.equal(existsSync(new URL(`../public/food/restaurants/${filename}`, import.meta.url)), true, `${filename} is missing`);
  }
  assert.doesNotMatch(atlasSource, /FoodPlaceholder|风格图/);
  assert.equal(existsSync(placeholderModule), false, 'legacy placeholder component must be removed');
  assert.match(atlasSource, />实拍</);
  assert.match(atlasSource, />生成图</);
});

test('generated restaurant photos are explicit and limited to the reviewed set', async () => {
  const source = await readFile(new URL('../app/food/restaurants.ts', import.meta.url), 'utf8');

  for (const number of generatedPhotoNumbers) {
    assert.match(source, new RegExp(`\\b${number}\\b`));
  }
  assert.match(source, /imageKind:\s*generatedPhotoNumbers\.has\(number\)\s*\?\s*'generated'\s*:\s*'real'/);
});
