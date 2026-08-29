import test from 'node:test';
import assert from 'node:assert/strict';

const siteUi = await import('../lib/site-ui.mjs').catch(() => ({}));

test('the global function bar exposes food as a primary destination', () => {
  assert.deepEqual(siteUi.PRIMARY_NAV, [
    { href: '/', label: '首页' },
    { href: '/treehole', label: '留言' },
    { href: '/interview', label: '面试' },
    { href: '/schedule', label: '日历' },
    { href: '/food', label: '食路' },
    { href: '/play', label: '游戏' },
  ]);
});

test('the interview route activates its own primary destination', () => {
  assert.equal(siteUi.isPrimaryNavActive('/interview', '/interview'), true);
  assert.equal(siteUi.isPrimaryNavActive('/interview', '/play'), false);
});

test('the food route activates the new food destination', () => {
  assert.equal(siteUi.isPrimaryNavActive('/food', '/food'), true);
  assert.equal(siteUi.isPrimaryNavActive('/food', '/play'), false);
});

test('the homepage release note exposes the current mobile release highlights', () => {
  assert.deepEqual(siteUi.LATEST_RELEASE, {
    date: '2026-08-29',
    label: '08.29',
    items: ['汕头食路', '德州围桌', '抽象头像'],
  });
});

test('stored theme wins and system preference is the fallback', () => {
  assert.equal(siteUi.resolveTheme('dark', false), 'dark');
  assert.equal(siteUi.resolveTheme('light', true), 'light');
  assert.equal(siteUi.resolveTheme(null, true), 'dark');
  assert.equal(siteUi.resolveTheme('unknown', false), 'light');
  assert.equal(siteUi.nextTheme('light'), 'dark');
  assert.equal(siteUi.nextTheme('dark'), 'light');
});

test('share mode respects WeChat, mobile launch, native share, and copy fallback', () => {
  assert.equal(siteUi.getShareMode({ userAgent: 'MicroMessenger iPhone', canNativeShare: true }), 'wechat-menu');
  assert.equal(siteUi.getShareMode({ userAgent: 'Mozilla Android', canNativeShare: true }), 'wechat-launch');
  assert.equal(siteUi.getShareMode({ userAgent: 'Mozilla Desktop', canNativeShare: true }), 'native-share');
  assert.equal(siteUi.getShareMode({ userAgent: 'Mozilla Desktop', canNativeShare: false }), 'copy');
});
