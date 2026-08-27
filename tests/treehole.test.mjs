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

test('a reply is tied to one message and normalized before storage', () => {
  assert.equal(typeof treehole.normalizeTreeholeReply, 'function');
  assert.deepEqual(
    treehole.normalizeTreeholeReply(
      '66f2bb53-7689-4f08-87c4-e7abc9a3ef14',
      '  收到。\n\n\n我会记得。  ',
    ),
    {
      ok: true,
      value: {
        messageId: '66f2bb53-7689-4f08-87c4-e7abc9a3ef14',
        text: '收到。\n\n我会记得。',
      },
    },
  );
});

test('replies reject unknown messages, blank text and overlong text', () => {
  assert.equal(treehole.normalizeTreeholeReply('not-a-message', '收到').ok, false);
  assert.equal(treehole.normalizeTreeholeReply('66f2bb53-7689-4f08-87c4-e7abc9a3ef14', '   ').ok, false);
  assert.equal(
    treehole.normalizeTreeholeReply('66f2bb53-7689-4f08-87c4-e7abc9a3ef14', '回'.repeat(121)).ok,
    false,
  );
});
