export const TREEHOLE_MAX_LENGTH: number;
export type NormalizedTreeholeMessage =
  | { ok: true; value: string }
  | { ok: false; error: string };
export function normalizeTreeholeMessage(input: unknown): NormalizedTreeholeMessage;

