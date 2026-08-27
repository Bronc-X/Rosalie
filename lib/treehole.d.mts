export const TREEHOLE_MAX_LENGTH: number;
export const TREEHOLE_REPLY_MAX_LENGTH: number;
export type NormalizedTreeholeMessage =
  | { ok: true; value: string }
  | { ok: false; error: string };
export function normalizeTreeholeMessage(input: unknown): NormalizedTreeholeMessage;
export type NormalizedTreeholeReply =
  | { ok: true; value: { messageId: string; text: string } }
  | { ok: false; error: string };
export function normalizeTreeholeReply(messageId: unknown, input: unknown): NormalizedTreeholeReply;
