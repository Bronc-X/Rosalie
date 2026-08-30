import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../../app/FoodAtlas.tsx', import.meta.url);

test('the old food-log recovery action is not shown in the main workspace', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.doesNotMatch(source, />找回以前的食后记 ↗<\/button>/);
});

test('the create entry sits immediately before the All filter', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const ribbonStart = source.indexOf('<section className="filter-ribbon"');
  const createEntry = source.indexOf('<button className="filter-add-button"', ribbonStart);
  const allFilters = source.indexOf('<div className="state-tabs"', ribbonStart);

  assert.ok(ribbonStart >= 0, 'filter ribbon should exist');
  assert.ok(createEntry > ribbonStart, 'create entry should be inside the filter ribbon');
  assert.ok(createEntry < allFilters, 'create entry should be immediately before All/Wishlist/Footprints');
  assert.match(source.slice(createEntry, allFilters), />＋ 新增<\/button>/);
  assert.doesNotMatch(source, /list-add-button/);
});

test('visited cards can add another visit and each visit can be deleted', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /experience\.state === 'footprint' \? '再记一次' : '记下去过'/);
  assert.match(source, /async function deleteFootprint\(recordId: string\)/);
  assert.match(source, /method: 'DELETE'.*'x-csrf-token': csrfToken/s);
  assert.match(source, /deletingFootprintId === record\.id \? '删除中…' : '删除这次'/);
});

