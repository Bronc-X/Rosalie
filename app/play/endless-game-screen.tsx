/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import {
  controllerAsset,
  controllerPaletteFilter,
  CONTROLLER_PALETTE_STORAGE_KEY,
  CONTROLLER_STORAGE_KEY,
  resolveControllerChoice,
  resolveControllerPalette,
} from '@/lib/controller-choice.mjs';
import type { ControllerPaletteId } from '@/lib/controller-choice.mjs';
import {
  advanceEndlessGame,
  controlEndlessGame,
  createEndlessGameState,
  drawEndlessGame,
  ENDLESS_GAME_CATALOG,
} from '@/lib/endless-games.mjs';
import type { EndlessGameId, EndlessGameInput, EndlessGameState } from '@/lib/endless-games.mjs';

import { usePlayerProgress } from './use-player-progress';

const LOGICAL_WIDTH = 390;
const LOGICAL_HEIGHT = 620;

type PointerMemory = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

export function EndlessGameScreen({ gameId }: { gameId: EndlessGameId }) {
  const catalog = useMemo(
    () => ENDLESS_GAME_CATALOG.find((game) => game.id === gameId) ?? ENDLESS_GAME_CATALOG[0],
    [gameId],
  );
  const playerProgress = usePlayerProgress();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EndlessGameState>(createEndlessGameState(gameId));
  const controllerImageRef = useRef<CanvasImageSource | null>(null);
  const pointerRef = useRef<PointerMemory | null>(null);
  const persistedScoreRef = useRef(0);
  const lastPersistedAtRef = useRef(0);
  const [runKey, setRunKey] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [controllerSource, setControllerSource] = useState('/soft-pull-controller.webp');
  const [controllerPalette, setControllerPalette] = useState<ControllerPaletteId>('original');

  const storedBest = playerProgress.progress[gameId]?.bestScore ?? 0;
  const visibleBest = Math.max(storedBest, score);
  const saveProgress = playerProgress.saveProgress;
  const controllerTone = controllerPaletteFilter(controllerPalette);
  const screenStyle = { '--controller-tone': controllerTone } as CSSProperties;

  useEffect(() => {
    let storedChoice: string | null = null;
    let storedPalette: string | null = null;
    try {
      storedChoice = window.localStorage.getItem(CONTROLLER_STORAGE_KEY);
      storedPalette = window.localStorage.getItem(CONTROLLER_PALETTE_STORAGE_KEY);
    } catch { /* Use the default style. */ }
    const choice = resolveControllerChoice(storedChoice);
    const palette = resolveControllerPalette(storedPalette);
    const source = controllerAsset(choice);
    const timer = window.setTimeout(() => {
      setControllerSource(source);
      setControllerPalette(palette);
    }, 0);
    const handleChoice = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; palette?: string }>).detail;
      setControllerSource(controllerAsset(detail?.id));
      setControllerPalette(resolveControllerPalette(detail?.palette));
    };
    window.addEventListener('rosalie-controller-change', handleChoice);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('rosalie-controller-change', handleChoice);
    };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.decoding = 'async';
    image.src = controllerSource;
    image.onload = () => {
      if (controllerTone === 'none') {
        controllerImageRef.current = image;
        return;
      }
      const tinted = document.createElement('canvas');
      tinted.width = image.naturalWidth;
      tinted.height = image.naturalHeight;
      const context = tinted.getContext('2d');
      if (!context) {
        controllerImageRef.current = image;
        return;
      }
      context.filter = controllerTone;
      context.drawImage(image, 0, 0);
      controllerImageRef.current = tinted;
    };
    return () => { image.onload = null; };
  }, [controllerSource, controllerTone]);

  useEffect(() => {
    if (!playerProgress.ready) return undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(LOGICAL_WIDTH * scale);
    canvas.height = Math.round(LOGICAL_HEIGHT * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    let animationFrame = 0;
    let previous = performance.now();
    let displayedScore = stateRef.current.score;
    let savedGameOver = false;

    const loop = (timestamp: number) => {
      const state = advanceEndlessGame(stateRef.current, timestamp - previous);
      previous = timestamp;
      drawEndlessGame(context, state, controllerImageRef.current);

      if (state.score !== displayedScore) {
        displayedScore = state.score;
        setScore(state.score);
      }

      if (state.alive && state.score > persistedScoreRef.current && timestamp - lastPersistedAtRef.current > 2800) {
        persistedScoreRef.current = state.score;
        lastPersistedAtRef.current = timestamp;
        saveProgress(gameId, 0, state.score);
      }

      if (!state.alive && !savedGameOver) {
        savedGameOver = true;
        setGameOver(true);
        persistedScoreRef.current = Math.max(persistedScoreRef.current, state.score);
        saveProgress(gameId, 0, state.score);
      }

      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);
    const saveBeforeLeaving = () => {
      const currentScore = stateRef.current.score;
      if (currentScore > persistedScoreRef.current) saveProgress(gameId, 0, currentScore);
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pagehide', saveBeforeLeaving);
      saveBeforeLeaving();
    };
  }, [gameId, playerProgress.ready, runKey, saveProgress]);

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
    };
  }

  function send(input: EndlessGameInput) {
    controlEndlessGame(stateRef.current, input);
  }

  function startPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || gameOver) return;
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { id: event.pointerId, startX: point.x, startY: point.y, lastX: point.x, lastY: point.y };

    if (gameId === 'wave') send({ type: 'down', ...point });
    else if (gameId === 'breakout' || gameId === 'drift') send({ type: 'move', ...point });
    else if (gameId === 'bubble' || gameId === 'hop' || gameId === 'stack' || gameId === 'orbit') send({ type: 'tap', ...point });
  }

  function movePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId || gameOver) return;
    const point = canvasPoint(event);
    if (gameId === 'breakout' || gameId === 'drift') send({ type: 'move', ...point });
    if (gameId === 'slice') send({ type: 'move', ...point, previousX: pointer.lastX, previousY: pointer.lastY });
    pointer.lastX = point.x;
    pointer.lastY = point.y;
  }

  function endPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const point = canvasPoint(event);
    if (gameId === 'wave') send({ type: 'up', ...point });
    if (gameId === 'snake' || gameId === 'merge') {
      const dx = point.x - pointer.startX;
      const dy = point.y - pointer.startY;
      if (Math.hypot(dx, dy) >= 14) {
        const direction = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up');
        send({ type: 'swipe', direction });
      }
    }
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function controlWithKeyboard(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const arrowDirection: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    };
    if (gameId === 'snake' && event.key in arrowDirection) {
      event.preventDefault();
      send({ type: 'key', key: event.key });
    } else if (gameId === 'merge' && event.key in arrowDirection) {
      event.preventDefault();
      send({ type: 'swipe', direction: arrowDirection[event.key] });
    } else if ((event.key === ' ' || event.key === 'Enter') && ['hop', 'stack', 'orbit', 'bubble'].includes(gameId)) {
      event.preventDefault();
      send({ type: 'tap', x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 });
    }
  }

  function restart() {
    stateRef.current = createEndlessGameState(gameId, Date.now());
    pointerRef.current = null;
    persistedScoreRef.current = storedBest;
    lastPersistedAtRef.current = 0;
    setScore(0);
    setGameOver(false);
    setRunKey((current) => current + 1);
    window.requestAnimationFrame(() => canvasRef.current?.focus());
  }

  if (!playerProgress.ready) {
    return <main className="endless-screen is-loading" style={screenStyle}><img src={controllerSource} alt="" /><p>读取进度</p></main>;
  }

  return (
    <main className={`endless-screen endless-${gameId}`} style={screenStyle}>
      <header className="endless-hud">
        <div>
          <h1>{catalog.label}</h1>
          <p>{catalog.instruction}</p>
        </div>
        <dl>
          <div><dt>本局</dt><dd>{score}</dd></div>
          <div><dt>最高</dt><dd>{visibleBest}</dd></div>
        </dl>
      </header>

      <section className="endless-stage" aria-label={`${catalog.label}游戏区`}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={catalog.instruction}
          onPointerDown={startPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={controlWithKeyboard}
        />
        {gameOver && (
          <div className="endless-result" role="status" aria-live="polite">
            <img src={controllerSource} alt="" />
            <strong>{score} 分</strong>
            <p>最高 {visibleBest}</p>
            <button type="button" onClick={restart}>再来一局</button>
          </div>
        )}
      </section>

      <p className={`endless-save-state is-${playerProgress.state}`} aria-live="polite">
        <i />{playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '已保存'}
      </p>
    </main>
  );
}
