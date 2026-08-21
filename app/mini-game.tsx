/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import {
  GAME_DURATION_MS,
  GAME_WIN_SCORE,
  clampPlayerX,
  collectMiniGameItem,
  createFallingItem,
  createMiniGame,
  finishMiniGame,
  rectanglesOverlap,
} from '@/lib/mini-game.mjs';
import type { FallingItem, MiniGameItemKind } from '@/lib/mini-game.mjs';

type GameFeedback = {
  id: number;
  kind: MiniGameItemKind;
};

function GameBlossom() {
  return (
    <span className="game-blossom" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      <b />
    </span>
  );
}

export function MiniGame() {
  const [game, setGame] = useState(createMiniGame());
  const [items, setItems] = useState<FallingItem[]>([]);
  const [remainingMs, setRemainingMs] = useState(GAME_DURATION_MS);
  const [playerX, setPlayerX] = useState(50);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef(new Map<number, HTMLSpanElement>());
  const liveItems = useRef<FallingItem[]>([]);
  const collidedIds = useRef(new Set<number>());
  const nextItemId = useRef(0);
  const startedAt = useRef(0);
  const draggingPointer = useRef<number | null>(null);
  const nextFeedbackId = useRef(0);
  const isPlaying = game.status === 'playing';
  const timeProgress = 1 - remainingMs / GAME_DURATION_MS;

  useEffect(() => {
    liveItems.current = items;
  }, [items]);

  useEffect(() => {
    if (!isPlaying) return;

    function spawnItem() {
      const elapsed = performance.now() - startedAt.current;
      const item = createFallingItem(
        nextItemId.current++,
        Math.random(),
        Math.random(),
        elapsed,
      );
      setItems((current) => [...current.slice(-13), item]);
    }

    function checkCollisions() {
      const player = playerRef.current?.getBoundingClientRect();
      if (player) {
        for (const item of liveItems.current) {
          if (collidedIds.current.has(item.id)) continue;
          const element = itemRefs.current.get(item.id);
          if (!element || !rectanglesOverlap(player, element.getBoundingClientRect())) continue;

          collidedIds.current.add(item.id);
          itemRefs.current.delete(item.id);
          setItems((current) => current.filter((candidate) => candidate.id !== item.id));
          setGame((current) => collectMiniGameItem(current, item.kind));
          setFeedback({ id: nextFeedbackId.current++, kind: item.kind });
        }
      }
    }

    spawnItem();
    const spawnTimer = window.setInterval(spawnItem, 720);
    const clockTimer = window.setInterval(() => {
      const nextRemaining = Math.max(0, GAME_DURATION_MS - (performance.now() - startedAt.current));
      setRemainingMs(nextRemaining);
      checkCollisions();
      if (nextRemaining === 0) {
        setGame((current) => finishMiniGame(current));
      }
    }, 50);

    return () => {
      window.clearInterval(spawnTimer);
      window.clearInterval(clockTimer);
    };
  }, [isPlaying]);

  function startRound() {
    startedAt.current = performance.now();
    collidedIds.current.clear();
    itemRefs.current.clear();
    setItems([]);
    setFeedback(null);
    setRemainingMs(GAME_DURATION_MS);
    setPlayerX(50);
    setGame(createMiniGame('playing'));
  }

  function movePlayer(clientX: number) {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    setPlayerX(clampPlayerX(((clientX - stage.left) / stage.width) * 100));
  }

  function startPlayerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || !isPlaying) return;
    draggingPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    movePlayer(event.clientX);
  }

  function movePlayerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPointer.current !== event.pointerId) return;
    movePlayer(event.clientX);
  }

  function finishPlayerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPointer.current !== event.pointerId) return;
    draggingPointer.current = null;
    event.currentTarget.removeAttribute('data-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function movePlayerWithKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setPlayerX((current) => clampPlayerX(current + (event.key === 'ArrowLeft' ? -8 : 8)));
  }

  const resultCopy = game.status === 'won'
    ? `本轮抓到 ${game.score} 朵。`
    : game.hearts === 0
      ? '工作混进来了，再试一次。'
      : `本轮抓到 ${game.score} 朵。`;

  return (
    <section className={`mini-game game-${game.status} ${game.streak >= 3 ? 'has-game-streak' : ''}`} aria-labelledby="mini-game-title">
      <div className="game-heading">
        <p className="game-kicker">PULL TEST · 18 SEC</p>
        <h2 id="mini-game-title">接住樱花</h2>
        <p>接樱花，躲开工作。</p>
      </div>

      <div
        className="game-stage"
        ref={stageRef}
        style={{ '--game-time': timeProgress, '--player-x': `${playerX}%` } as CSSProperties}
      >
        <div className="game-skyline" aria-hidden="true"><i /><span>♥</span><i /></div>

        <div className="game-hud" aria-live="polite">
          <span><b>{game.score}</b> / {GAME_WIN_SCORE} 花</span>
          <span className="game-hearts" aria-label={`还可碰到工作 ${game.hearts} 次`}>
            {Array.from({ length: 3 }, (_, index) => <i key={index}>{index < game.hearts ? '♥' : '♡'}</i>)}
          </span>
          <span><b>{Math.ceil(remainingMs / 1_000)}</b> 秒</span>
        </div>
        <span className="game-time-track" aria-hidden="true"><i /></span>

        {items.map((item) => (
          <span
            className={`falling-game-item falling-${item.kind}`}
            key={item.id}
            ref={(element) => {
              if (element) itemRefs.current.set(item.id, element);
              else itemRefs.current.delete(item.id);
            }}
            style={{ left: `${item.x}%`, '--fall-duration': `${item.durationMs}ms` } as CSSProperties}
            onAnimationEnd={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
            aria-hidden="true"
          >
            {item.kind === 'blossom' ? <GameBlossom /> : <b>干</b>}
          </span>
        ))}

        {feedback ? (
          <span
            className={`game-feedback feedback-${feedback.kind}`}
            key={feedback.id}
            onAnimationEnd={() => setFeedback(null)}
            aria-hidden="true"
          >
            {feedback.kind === 'blossom' ? (game.streak >= 3 ? `连拉 ×${game.streak}` : '+ 1') : '先不干'}
          </span>
        ) : null}

        {isPlaying ? (
          <button
            className="game-controller"
            ref={playerRef}
            type="button"
            aria-label="按住小图标左右拖动，接住樱花并躲开干活"
            onPointerDown={startPlayerDrag}
            onPointerMove={movePlayerDrag}
            onPointerUp={finishPlayerDrag}
            onPointerCancel={finishPlayerDrag}
            onKeyDown={movePlayerWithKeys}
          >
            <img src="/soft-pull-cursor.png" alt="" width={82} height={82} draggable="false" />
            <span>左右拉</span>
          </button>
        ) : (
          <div className="game-curtain">
            {game.status === 'idle' ? (
              <p>限时十八秒。</p>
            ) : (
              <p className="game-result" aria-live="polite">{resultCopy}</p>
            )}
            <button className="game-start" type="button" onClick={startRound}>
              <img src="/soft-pull-cursor.png" alt="" width={82} height={82} />
              <span>{game.status === 'idle' ? '戳它开局' : '再拉一下'}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
