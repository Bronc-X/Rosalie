import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const formModel = await import('../../app/experience-form.ts').catch(() => ({}));

test('Wish List uses the requested short bilingual navigation and headings', async () => {
  const source = await readFile(new URL('app/FoodAtlas.tsx', root), 'utf8');

  assert.match(source, />Wish List<\/Link>/);
  assert.match(source, />Calendar<\/Link>/);
  assert.match(source, /className="place-selector-trigger"[\s\S]*\{currentPlace\.label\}/);
  assert.match(source, /我们一起走过的地方/);
  assert.match(source, /现在一共收录/);
  assert.match(source, /stateFilter === 'footprint' \? '去过的地方' : 'Wish List'/);

  assert.doesNotMatch(source, />一起去<\/Link>/);
  assert.doesNotMatch(source, />日历<\/Link>/);
  assert.doesNotMatch(source, /OUR SHANTOU/);
  assert.doesNotMatch(source, /我们的汕头/);
  assert.doesNotMatch(source, /我们记下的地方/);
});

test('create and edit use the same concise fields without empty preview or coordinate inputs', async () => {
  const source = await readFile(new URL('app/FoodAtlas.tsx', root), 'utf8');

  assert.match(source, /ModalShell title="记下一处"/);
  assert.match(source, />链接<input type="url"/);
  assert.match(source, /'读取中…' : '读取'/);
  assert.match(source, /previewHasContent/);
  assert.match(source, /placeholder="选填"/);
  assert.match(source, />图片</);
  assert.match(source, /type="file" accept="image\/\*" capture="environment"/);
  assert.match(source, /actionBusy \? '保存中…' : '确认'/);

  assert.doesNotMatch(source, /下一处，想和你去哪里/);
  assert.doesNotMatch(source, /先贴链接/);
  assert.doesNotMatch(source, /读一下链接/);
  assert.doesNotMatch(source, /还没写名字/);
  assert.doesNotMatch(source, /还没写地点/);
  assert.doesNotMatch(source, /图片链接/);
  assert.doesNotMatch(source, /<label>纬度/);
  assert.doesNotMatch(source, /<label>经度/);
});

test('tag select supports presets and a custom value without losing existing custom tags', () => {
  assert.ok(Array.isArray(formModel.TAG_PRESETS));
  assert.ok(formModel.TAG_PRESETS.includes('夜宵'));
  assert.equal(formModel.CUSTOM_TAG_VALUE, '__custom__');
  assert.deepEqual(formModel.tagsFromSelection('夜宵', ''), ['夜宵']);
  assert.deepEqual(formModel.tagsFromSelection('__custom__', '  约会，散步  '), ['约会', '散步']);
  assert.deepEqual(formModel.tagSelectionFromTags(['牛肉火锅']), {
    selection: '__custom__',
    customTag: '牛肉火锅',
  });
});

test('link preview is hidden until readable content was extracted', () => {
  assert.equal(formModel.previewHasContent?.({}), false);
  assert.equal(formModel.previewHasContent?.({ sourceUrl: 'https://example.com/' }), false);
  assert.equal(formModel.previewHasContent?.({ title: '小公园' }), true);
  assert.equal(formModel.previewHasContent?.({ address: '国平路' }), true);
  assert.equal(formModel.previewHasContent?.({ imageUrl: '/api/media/cover' }), true);
});

test('a captured Experience image is checked before upload', () => {
  assert.deepEqual(
    formModel.validateExperienceImage?.({ type: 'image/jpeg', size: 1024 }),
    { valid: true },
  );
  assert.deepEqual(
    formModel.validateExperienceImage?.({ type: 'image/svg+xml', size: 1024 }),
    { valid: false, message: '只支持 JPEG、PNG、WebP 图片。' },
  );
  assert.deepEqual(
    formModel.validateExperienceImage?.({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }),
    { valid: false, message: '图片不能超过 10MB。' },
  );
});

