'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { ArrowCounterClockwise, Lightbulb, Shuffle } from '@phosphor-icons/react';

import {
  createLinkBoard,
  findAvailablePair,
  removeLinkedPair,
  shuffleRemaining,
} from '@/lib/link-match.mjs';
import type { LinkBoard, LinkIconType, LinkPoint } from '@/lib/link-match.mjs';
import { usePlayerProgress } from '../use-player-progress';

const ICON_LABELS: Record<LinkIconType, string> = {
  pull: '软拉扯',
  sakura: '樱花',
  rosette: '酒红花',
  charm: '蜜金护符',
};

const INITIAL_BOARD = createLinkBoard(() => 0.42);

function MatchIcon({ type }: { type: LinkIconType }) {
  if (type === 'sakura') {
    return (
      <span className="link-sakura" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
        <b />
      </span>
    );
  }

  const source = type === 'pull'
    ? '/soft-pull-controller.webp'
    : type === 'rosette'
      ? '/match-rosette.webp'
      : '/match-charm.webp';

  return <img src={source} alt="" width={112} height={112} draggable={false} />;
}

function pathPoints(path: LinkPoint[] | null, board: LinkBoard) {
  if (!path) return '';
  return path.map((point) => {
    const x = ((point.column + .5) / board.columns) * 100;
    const y = ((point.row + .5) / board.rows) * 100;
    return `${x},${y}`;
  }).join(' ');
}

function playableBoard(board: LinkBoard) {
  let next = board;
  for (let attempt = 0; attempt < 24 && !findAvailablePair(next); attempt += 1) {
    next = shuffleRemaining(next);
  }
  return next;
}

export function LinkMatchGame() {
  const playerProgress = usePlayerProgress();
  const [board, setBoard] = useState<LinkBoard>(() => playableBoard(INITIAL_BOARD));
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<number[]>([]);
  const [mismatch, setMismatch] = useState<number[]>([]);
  const [path, setPath] = useState<LinkPoint[] | null>(null);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won'>('playing');

  const remaining = board.cells.filter(Boolean).length;
  const matchedPairs = (board.cells.length - remaining) / 2;
  const score = Math.max(0, matchedPairs * 100 - mistakes * 15);
  const level = (playerProgress.progress.connect?.level ?? 0) + 1;
  const linePoints = useMemo(() => pathPoints(path, board), [path, board]);

  function restart() {
    setBoard(playableBoard(createLinkBoard()));
    setSelected(null);
    setHint([]);
    setMismatch([]);
    setPath(null);
    setMoves(0);
    setMistakes(0);
    setStatus('playing');
  }

  function shuffleBoard() {
    setBoard((current) => playableBoard(shuffleRemaining(current)));
    setSelected(null);
    setHint([]);
    setPath(null);
  }

  function showHint() {
    const pair = findAvailablePair(board);
    if (!pair) {
      shuffleBoard();
      return;
    }
    setHint(pair);
    window.setTimeout(() => setHint([]), 1000);
  }

  function selectCell(index: number) {
    if (status !== 'playing' || !board.cells[index]) return;
    setHint([]);
    if (selected == null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }

    setMoves((current) => current + 1);
    const result = removeLinkedPair(board, selected, index);
    if (!result.matched) {
      setMismatch([selected, index]);
      setMistakes((current) => current + 1);
      setSelected(null);
      window.setTimeout(() => setMismatch([]), 420);
      navigator.vibrate?.(18);
      return;
    }

    setPath(result.path);
    setBoard(result.board);
    setSelected(null);
    navigator.vibrate?.([12, 28, 12]);
    window.setTimeout(() => setPath(null), 420);

    const isComplete = result.board.cells.every((cell) => cell == null);
    if (isComplete) {
      const finalScore = Math.max(0, (matchedPairs + 1) * 100 - mistakes * 15);
      setStatus('won');
      playerProgress.saveProgress('connect', Math.min(level, 99), finalScore);
      return;
    }

    if (!findAvailablePair(result.board)) {
      window.setTimeout(() => setBoard((current) => playableBoard(shuffleRemaining(current))), 460);
    }
  }

  return (
    <main className="link-game-page">
      <div className="link-game-glow" aria-hidden="true">
        <i /><i /><i />
      </div>
      <header className="link-game-header">
        <div>
          <small>第 {level} 关</small>
          <h1>连一下</h1>
          <p>同类，最多拐两次</p>
        </div>
        <button type="button" onClick={restart} aria-label="重新开始">
          <ArrowCounterClockwise size={23} weight="bold" />
        </button>
      </header>

      <section className="link-game-card" aria-label="四枚护符连连看">
        <div className="link-game-stats">
          <span><small>剩余</small><b>{String(remaining / 2).padStart(2, '0')}</b></span>
          <span><small>步数</small><b>{String(moves).padStart(2, '0')}</b></span>
          <span><small>分数</small><b>{String(score).padStart(4, '0')}</b></span>
        </div>

        <div className="link-board-wrap">
          <div className="link-board" style={{ '--link-columns': board.columns, '--link-rows': board.rows } as React.CSSProperties}>
            {board.cells.map((cell, index) => cell ? (
              <button
                type="button"
                key={cell.id}
                className={`${selected === index ? 'is-selected ' : ''}${hint.includes(index) ? 'is-hint ' : ''}${mismatch.includes(index) ? 'is-mismatch' : ''}`}
                onClick={() => selectCell(index)}
                aria-label={`${ICON_LABELS[cell.type]}，第 ${index + 1} 格`}
                aria-pressed={selected === index}
              >
                <span className={`link-icon link-icon-${cell.type}`}><MatchIcon type={cell.type} /></span>
              </button>
            ) : <span className="link-empty" key={`empty-${index}`} aria-hidden="true" />)}
          </div>

          <svg className={`link-path${linePoints ? ' is-visible' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={linePoints} pathLength="1" />
          </svg>

          {status === 'won' && (
            <div className="link-win" role="status">
              <div className="link-win-icons" aria-hidden="true">
                <MatchIcon type="rosette" /><MatchIcon type="charm" />
              </div>
              <h2>全接走了</h2>
              <p>{moves} 步，{score} 分</p>
              <button type="button" onClick={restart}>再来一盘</button>
            </div>
          )}
        </div>

        <div className="link-game-controls">
          <button type="button" onClick={showHint}><Lightbulb size={21} weight="duotone" /><span>提示</span></button>
          <p>{playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '自动存档'}</p>
          <button type="button" onClick={shuffleBoard}><Shuffle size={21} weight="duotone" /><span>洗牌</span></button>
        </div>
      </section>
    </main>
  );
}
