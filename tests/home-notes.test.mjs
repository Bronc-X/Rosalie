import test from 'node:test';
import assert from 'node:assert/strict';

const notes = await import('../lib/home-notes.mjs').catch(() => ({}));

test('a homepage note is normalized before public storage', () => {
  assert.equal(typeof notes.normalizeHomeNote, 'function');
  assert.deepEqual(notes.normalizeHomeNote('  我在这里留一句。\n\n\n收到。  '), {
    ok: true,
    value: '我在这里留一句。\n\n收到。',
  });
});

test('homepage notes reject blank, markup and oversized content safely', () => {
  assert.equal(notes.normalizeHomeNote('   ').ok, false);
  assert.deepEqual(notes.normalizeHomeNote('<b>记住</b>\u0000'), {
    ok: true,
    value: 'b记住/b',
  });
  assert.equal(notes.normalizeHomeNote('字'.repeat(161)).ok, false);
});

test('a homepage reply is bound to a real note and normalized', () => {
  assert.equal(typeof notes.normalizeHomeNoteReply, 'function');
  assert.deepEqual(
    notes.normalizeHomeNoteReply('66f2bb53-7689-4f08-87c4-e7abc9a3ef14', '  我也记得。  '),
    {
      ok: true,
      value: {
        noteId: '66f2bb53-7689-4f08-87c4-e7abc9a3ef14',
        text: '我也记得。',
      },
    },
  );
});

test('homepage replies reject unknown notes, blanks and excess length', () => {
  assert.equal(notes.normalizeHomeNoteReply('missing', '收到').ok, false);
  assert.equal(notes.normalizeHomeNoteReply('66f2bb53-7689-4f08-87c4-e7abc9a3ef14', ' ').ok, false);
  assert.equal(
    notes.normalizeHomeNoteReply('66f2bb53-7689-4f08-87c4-e7abc9a3ef14', '回'.repeat(101)).ok,
    false,
  );
});
