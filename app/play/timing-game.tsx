/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  TIMING_GOAL,
  TIMING_MAX_ATTEMPTS,
  beginTimingGame,
  collectTimingHit,
  createTimingGame,
  getTimingPosition,
} from '@/lib/timing-game.mjs';

const JUDGE_COPY = {
  perfect: '完美。',
  good: '命中。',
  miss: '未命中。',
} as const;

export function TimingGame() {
  const [game, setGame] = useState(createTimingGame());
  const [position, setPosition] = useState(0);
  const startedAt = useRef(0);
  const isPlaying = game.status === 'playing';

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setPosition(getTimingPosition(performance.now() - startedAt.current));
    }, 32);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  function startRound() {
    startedAt.current = performance.now();
    setPosition(0);
    setGame(beginTimingGame());
  }

  function pullNow() {
    if (!isPlaying) {
      startRound();
      return;
    }
    setGame((current) => collectTimingHit(current, position));
  }

  const resultCopy = game.status === 'won'
    ? `卡点成功：${game.score} 格。`
    : game.status === 'lost'
      ? `本轮：${game.score} 格。`
      : '游标进入心区时点击。';

  return (
    <section className={`timing-game timing-${game.status}`} aria-labelledby="timing-game-title">
      <div className="lab-game-heading">
        <p>TAP TIMING · SEVEN TRIES</p>
        <h2 id="timing-game-title">卡点</h2>
        <span>游标进入心区时戳控制器，正中一次算两格。</span>
      </div>

      <div className="timing-stage" style={{ '--timing-position': position } as CSSProperties}>
        <div className="timing-score" aria-live="polite">
          <span><b>{game.score}</b> / {TIMING_GOAL} 格</span>
          <span>{game.attempts} / {TIMING_MAX_ATTEMPTS} 次</span>
        </div>

        <div className="timing-rail" aria-hidden="true">
          <i className="timing-good-zone" />
          <i className="timing-perfect-zone">♥</i>
          <span className="timing-runner">
            <img src="/soft-pull-cursor.png" alt="" width={58} height={58} />
          </span>
        </div>

        <div className="timing-attempts" aria-hidden="true">
          {Array.from({ length: TIMING_MAX_ATTEMPTS }, (_, index) => (
            <i className={index < game.attempts ? `attempt-${index === game.attempts - 1 ? game.lastJudge : 'used'}` : ''} key={index} />
          ))}
        </div>

        <p className={`timing-copy judge-${game.lastJudge ?? 'none'}`} aria-live="polite">
          {isPlaying && game.lastJudge ? JUDGE_COPY[game.lastJudge] : resultCopy}
        </p>

        <button className="timing-controller" type="button" onClick={pullNow}>
          <img src="/soft-pull-cursor.png" alt="" width={84} height={84} />
          <span>{game.status === 'idle' ? '戳它开局' : isPlaying ? '现在拉' : '再卡一次'}</span>
        </button>
      </div>
    </section>
  );
}
