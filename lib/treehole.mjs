export const TREEHOLE_MAX_LENGTH = 180;
export const TREEHOLE_REPLY_MAX_LENGTH = 120;

const MESSAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function normalizeTreeholeMessage(input) {
  return normalizeText(
    input,
    TREEHOLE_MAX_LENGTH,
    '空白不算留言。',
    `留言最多 ${TREEHOLE_MAX_LENGTH} 个字。`,
  );
}

export function normalizeTreeholeReply(messageId, input) {
  if (typeof messageId !== 'string' || !MESSAGE_ID_PATTERN.test(messageId)) {
    return { ok: false, error: '找不到这条留言。' };
  }
  const normalized = normalizeText(
    input,
    TREEHOLE_REPLY_MAX_LENGTH,
    '回复不能为空。',
    `回复最多 ${TREEHOLE_REPLY_MAX_LENGTH} 个字。`,
  );
  if (!normalized.ok) return normalized;
  return { ok: true, value: { messageId, text: normalized.value } };
}
