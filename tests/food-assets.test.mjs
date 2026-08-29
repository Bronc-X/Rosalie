import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedCategories = [
  '甜品小食', '生腌', '肠粉', '牛肉火锅', '粿条面', '白粥大排档',
  '小炒', '私房菜', '异国料理', '早茶', '烧腊简餐', '截图补充',
];

test('food atlas keeps its atmospheric hero local and removes legacy map thumbnails', async () => {
  const source = await readFile(new URL('../app/food/food-atlas.tsx', import.meta.url), 'utf8');
  const config = await readFile(new URL('../next.config.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /tile\.openstreetmap\.de/);
  assert.match(source, /\/food\/shantou-qilou-food-v1\.webp/);
  assert.doesNotMatch(source, /map-thumbnail-image/);
  assert.match(config, /\/food\/shantou-qilou-food-v1\.webp/);
});

test('every food category resolves to a local visual motif', async () => {
  const moduleUrl = new URL('../lib/food-visuals.mjs', import.meta.url);
  assert.equal(existsSync(moduleUrl), true, 'food visual registry must exist');

  const { FOOD_VISUAL_CATEGORIES, getFoodVisual } = await import(moduleUrl.href);
  assert.deepEqual(Object.keys(FOOD_VISUAL_CATEGORIES).sort(), expectedCategories.sort());

  for (const [index, category] of expectedCategories.entries()) {
    const visual = getFoodVisual(category, index + 1);
    assert.equal(typeof visual.kind, 'string');
    assert.ok(visual.kind.length > 0);
    assert.match(visual.tone, /^#[0-9a-f]{6}$/i);
    assert.ok(visual.variant >= 0 && visual.variant <= 3);
  }

  assert.equal(getFoodVisual('未知品类', 99).kind, 'market');
});

test('food cards distinguish confirmed photos from stylized placeholders', async () => {
  const source = await readFile(new URL('../app/food/food-atlas.tsx', import.meta.url), 'utf8');

  assert.match(source, /FoodPlaceholder/);
  assert.match(source, />实拍</);
  assert.match(source, />风格图</);
});
