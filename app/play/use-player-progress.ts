'use client';

import { useCallback, useEffect, useState } from 'react';

import { GAME_IDS, mergeProgress, normalizeProgressUpdate } from '@/lib/player-progress.mjs';
import type { GameId, GameProgress } from '@/lib/player-progress.mjs';

const CACHE_KEY = 'rosalie_arcade_progress_v1';

export type ProgressMap = Partial<Record<GameId, GameProgress>>;
export type ProgressState = 'loading' | 'saved' | 'saving' | 'offline';

function readCache(): ProgressMap {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(GAME_IDS.flatMap((gameId) => {
      const candidate = (parsed as Record<string, unknown>)[gameId];
      const normalized = normalizeProgressUpdate(candidate);
      return normalized.ok ? [[gameId, normalized.value]] : [];
    })) as ProgressMap;
  } catch {
    return {};
  }
}

function writeCache(progress: ProgressMap) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(progress));
  } catch {
    // The signed server copy remains authoritative when local storage is unavailable.
  }
}

function mergeMaps(first: ProgressMap, second: ProgressMap) {
  const merged: ProgressMap = { ...first };
  for (const gameId of GAME_IDS) {
    const incoming = second[gameId];
    if (incoming) merged[gameId] = mergeProgress(merged[gameId], incoming);
  }
  return merged;
}

async function sendProgress(progress: GameProgress) {
  const response = await fetch('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress),
  });
  if (!response.ok) throw new Error('progress save failed');
}

export function usePlayerProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [state, setState] = useState<ProgressState>('loading');

  useEffect(() => {
    let current = true;
    const cached = readCache();
    const warmTimer = window.setTimeout(() => {
      if (!current) return;
      setProgress(cached);
      setState('saved');
    }, 0);

    void fetch('/api/progress', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json() as { ok?: boolean; progress?: ProgressMap };
        if (!response.ok || !data.ok || !data.progress) throw new Error('progress load failed');
        const merged = mergeMaps(data.progress, cached);
        if (!current) return;
        window.clearTimeout(warmTimer);
        setProgress(merged);
        writeCache(merged);
        setState('saved');

        const pending = GAME_IDS.flatMap((gameId) => {
          const local = cached[gameId];
          const remote = data.progress?.[gameId];
          return local && (!remote || local.level > remote.level || local.bestScore > remote.bestScore)
            ? [sendProgress(local)]
            : [];
        });
        if (pending.length) void Promise.allSettled(pending);
      })
      .catch(() => {
        if (current) {
          window.clearTimeout(warmTimer);
          setProgress(cached);
          setState('offline');
        }
      });

    return () => {
      current = false;
      window.clearTimeout(warmTimer);
    };
  }, []);

  const saveProgress = useCallback((gameId: GameId, level: number, bestScore = 0) => {
    const normalized = normalizeProgressUpdate({ gameId, level, bestScore });
    if (!normalized.ok) return;
    setState('saving');
    setProgress((current) => {
      const next = { ...current, [gameId]: mergeProgress(current[gameId], normalized.value) };
      writeCache(next);
      return next;
    });
    void sendProgress(normalized.value)
      .then(() => setState('saved'))
      .catch(() => setState('offline'));
  }, []);

  return {
    progress,
    state,
    ready: state !== 'loading',
    saveProgress,
  };
}
