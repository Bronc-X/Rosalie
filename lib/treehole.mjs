export const TREEHOLE_MAX_LENGTH = 180;

export function normalizeTreeholeMessage(input) {
  if (typeof input !== 'string') return { ok: false, error: '树洞没听懂。' };
  const value = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!value) return { ok: false, error: '空白不算秘密。' };
  if (Array.from(value).length > TREEHOLE_MAX_LENGTH) {
    return { ok: false, error: `树洞一次只能吞下 ${TREEHOLE_MAX_LENGTH} 个字。` };
  }
  return { ok: true, value };
}

