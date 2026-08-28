export const HOME_NOTE_MAX_LENGTH = 160;
export const HOME_NOTE_REPLY_MAX_LENGTH = 100;

const NOTE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {{ ok: true, value: string } | { ok: false, error: string }} NormalizedText
 */

/**
 * @param {unknown} input
 * @param {number} maxLength
 * @param {string} emptyError
 * @param {string} longError
 * @returns {NormalizedText}
 */
function normalizeText(input, maxLength, emptyError, longError) {
  if (typeof input !== 'string') return { ok: false, error: emptyError };
  const value = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!value) return { ok: false, error: emptyError };
  if (Array.from(value).length > maxLength) return { ok: false, error: longError };
  return { ok: true, value };
}

/**
 * @param {unknown} input
 * @returns {NormalizedText}
 */
export function normalizeHomeNote(input) {
  return normalizeText(
    input,
    HOME_NOTE_MAX_LENGTH,
    '旁注不能为空。',
    `旁注最多 ${HOME_NOTE_MAX_LENGTH} 个字。`,
  );
}

/**
 * @param {unknown} noteId
 * @param {unknown} input
 * @returns {{ ok: true, value: { noteId: string, text: string } } | { ok: false, error: string }}
 */
export function normalizeHomeNoteReply(noteId, input) {
  if (typeof noteId !== 'string' || !NOTE_ID_PATTERN.test(noteId)) {
    return { ok: false, error: '找不到这条旁注。' };
  }
  const normalized = normalizeText(
    input,
    HOME_NOTE_REPLY_MAX_LENGTH,
    '回复不能为空。',
    `回复最多 ${HOME_NOTE_REPLY_MAX_LENGTH} 个字。`,
  );
  if (!normalized.ok) return normalized;
  return { ok: true, value: { noteId, text: normalized.value } };
}
