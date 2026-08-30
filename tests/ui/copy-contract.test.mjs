import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function readUiCopy() {
  const [experience, calendar] = await Promise.all([
    readFile(new URL('app/FoodAtlas.tsx', root), 'utf8'),
    readFile(new URL('app/calendar/SharedCalendar.tsx', root), 'utf8'),
  ]);
  return `${experience}\n${calendar}`;
}

test('couple-facing pages do not explain the product to Toni and Rosalie', async () => {
  const copy = await readUiCopy();
  const forbidden = [
    'Experience 是地点与活动本身',
    '真实发生的 Footprint 才进入共享日历',
    '同一筛选 · 地图与清单同步',
    '共同计划与足迹正在归档',
    'Experience 读取失败',
    '返回 Experience',
    '留空，或手动校对',
    'Footprint ${record.visitedOn}',
    '足迹记录读取失败',
    '旧版足迹',
    'OUR DAYS · 我们的日子',
    'WHO\'S HERE',
    'INVITATIONS',
    '两人的汕头',
    '一起去过',
    '可以先看右边的清单',
    '图片 URL',
    '位置核验说明',
    '为什么想去、值得记住什么',
    '正在翻以前的日子',
    '这次没有留下文字',
    '约好这一天',
    '条可识别的“已经食过”记录',
  ];

  for (const phrase of forbidden) {
    assert.equal(copy.includes(phrase), false, `remove product explanation: ${phrase}`);
  }
});

test('the two main pages speak about the couple instead of the feature model', async () => {
  const copy = await readUiCopy();

  assert.match(copy, /我们一起走过的地方/);
  assert.match(copy, /不思量，自难忘/);
  assert.doesNotMatch(copy, /和你见面的日子/);
  assert.doesNotMatch(copy, /都想记住/);
});

test('the NTO gate is only one terse passcode field', async () => {
  const source = await readFile(new URL('app/FoodAtlas.tsx', root), 'utf8');

  assert.match(source, /<h2>暗号<\/h2>/);
  assert.equal((source.match(/<input\b(?=[^>]*type="password")/g) ?? []).length, 1);
  assert.match(source, /aria-label="暗号"/);
  assert.match(source, /暗号不对/);
  assert.match(source, /请稍后再试/);
  assert.doesNotMatch(source, /confirmKey|再输入一次|我们的暗号/);
  assert.doesNotMatch(source, /ONLY OURS|只给我们|欢迎回来|先定一个只有我们知道的暗号|打开我们的手账|想去的地方，去过的日子/);
});
