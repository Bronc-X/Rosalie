import { get, list, put } from '@vercel/blob';

import { mergeProgress } from '@/lib/player-progress.mjs';
import type { GameProgress } from '@/lib/player-progress.mjs';

export type SharedMessage = { id: string; text: string; createdAt: string };

function isMessage(value: unknown): value is SharedMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SharedMessage>;
  return typeof candidate.id === 'string'
    && typeof candidate.text === 'string'
    && typeof candidate.createdAt === 'string';
}

async function readJson(pathname: string) {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json() as Promise<unknown>;
}

export function usesVercelBlob() {
  return process.env.VERCEL === '1' && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function listVercelMessages() {
  const result = await list({ prefix: 'treehole/', limit: 24 });
  const messages = await Promise.all(result.blobs.map(async (blob) => {
    try {
      const value = await readJson(blob.pathname);
      return isMessage(value) ? value : null;
    } catch {
      return null;
    }
  }));
  return messages
    .filter((message): message is SharedMessage => message !== null)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function insertVercelMessage(message: SharedMessage) {
  const reverseTimestamp = String(9_999_999_999_999 - Date.parse(message.createdAt)).padStart(13, '0');
  await put(`treehole/${reverseTimestamp}-${message.id}.json`, JSON.stringify(message), {
    access: 'private',
    contentType: 'application/json; charset=utf-8',
  });
}

type ProgressDocument = Record<string, GameProgress>;

export async function readVercelProgress(playerId: string): Promise<ProgressDocument> {
  try {
    const value = await readJson(`player-progress/${playerId}.json`);
    return value && typeof value === 'object' ? value as ProgressDocument : {};
  } catch {
    return {};
  }
}

export async function writeVercelProgress(playerId: string, incoming: GameProgress) {
  const current = await readVercelProgress(playerId);
  const next = { ...current, [incoming.gameId]: mergeProgress(current[incoming.gameId], incoming) };
  await put(`player-progress/${playerId}.json`, JSON.stringify(next), {
    access: 'private',
    contentType: 'application/json; charset=utf-8',
    allowOverwrite: true,
  });
  return next[incoming.gameId];
}
