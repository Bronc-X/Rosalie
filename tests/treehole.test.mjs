import test from 'node:test';
import assert from 'node:assert/strict';

const treehole = await import('../lib/treehole.mjs').catch(() => ({}));

test('a short anonymous message is normalized for storage', () => {
  assert.equal(typeof treehole.normalizeTreeholeMessage, 'function');
  assert.deepEqual(treehole.normalizeTreeholeMessage('  今天也抓紧拉扯。\n\n\n\n收到。  '), {
    ok: true,
    value: '今天也抓紧拉扯。\n\n收到。',
  });
});

test('empty and overlong messages are rejected', () => {
  assert.equal(treehole.normalizeTreeholeMessage('   ').ok, false);
  assert.equal(treehole.normalizeTreeholeMessage('啊'.repeat(181)).ok, false);
});

test('markup brackets and control characters never reach shared storage', () => {
  assert.deepEqual(treehole.normalizeTreeholeMessage('<b>秘密</b>\u0000'), {
    ok: true,
    value: 'b秘密/b',
  });
});

