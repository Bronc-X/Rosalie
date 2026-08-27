/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePlayerProgress } from '../use-player-progress';
import { ImmersiveGameHost } from './game-host';
import type { ImmersiveGameId } from './game-host';

const GAME_LABELS: Record<ImmersiveGameId, string> = {
  hole: '黑洞降临',
  sand: '沙画消消',
  parking: '挪了下车',
  screw: '打个螺丝',
  water: '倒水挑战',
  rescue: '营救小猫',
  arrow: '一箭又一箭',
};

export function ImmersiveGameScreen({ gameId }: { gameId: ImmersiveGameId }) {
  const playerProgress = usePlayerProgress();
  const [muted, setMuted] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const reducedMotion = useMemo(() => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const storedLevel = playerProgress.progress[gameId]?.level ?? 0;
  const visibleLevel = level ?? storedLevel;
  const saveProgress = playerProgress.saveProgress;
  const handleLevelChange = useCallback((nextLevel: number, score: number) => {
    setLevel(nextLevel);
    saveProgress(gameId, nextLevel, score);
  }, [gameId, saveProgress]);

  if (!playerProgress.ready) {
    return (
      <main className="arrow-screen arrow-screen-loading immersive-screen">
        <img src="/soft-pull-controller.webp" alt="" />
        <p>读取进度</p>
      </main>
    );
  }

  return (
    <main className={`arrow-screen immersive-screen immersive-${gameId}`}>
      <div className="arrow-screen-controls">
        <div>
          <strong>{GAME_LABELS[gameId]}</strong>
          {status && <small>{status}</small>}
        </div>
        <button type="button" onClick={() => setMuted((current) => !current)} aria-label={muted ? '打开声音' : '关闭声音'}>
          {muted ? '静' : '声'}
        </button>
        <button type="button" onClick={() => setRestartKey((current) => current + 1)} aria-label="重新开始本关">↻</button>
      </div>

      <ImmersiveGameHost
        gameId={gameId}
        restartKey={restartKey}
        initialLevel={visibleLevel}
        muted={muted}
        reducedMotion={reducedMotion}
        onLevelChange={handleLevelChange}
        onStatus={setStatus}
      />

      <div className={`arrow-save-indicator is-${playerProgress.state}`} aria-live="polite">
        <i />
        {playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '已保存'}
      </div>
    </main>
  );
}

export { GAME_LABELS };
