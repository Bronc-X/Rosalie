/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import Link from 'next/link';

import { MiniGame } from '../mini-game';
import { ArrowGame } from './arrow-game';
import { RouteGame } from './route-game';
import { TimingGame } from './timing-game';

type GameId = 'catch' | 'route' | 'timing' | 'arrow';

const GAMES: Array<{ id: GameId; index: string; label: string; note: string }> = [
  { id: 'catch', index: '01', label: '抓紧拉扯', note: '接花，躲活' },
  { id: 'route', index: '02', label: '一笔撤回', note: '画线，绕活' },
  { id: 'timing', index: '03', label: '卡点拉近', note: '卡点，别急' },
  { id: 'arrow', index: '04', label: '箭有去处', note: '放箭，进洞' },
];

export function GameLab() {
  const [activeGame, setActiveGame] = useState<GameId>('catch');

  return (
    <main className="play-lab">
      <div className="lab-glow lab-glow-one" aria-hidden="true" />
      <div className="lab-glow lab-glow-two" aria-hidden="true" />
      <div className="lab-dots" aria-hidden="true" />

      <header className="lab-header">
        <Link className="lab-back" href="/">← 回倒计时</Link>
        <div>
          <p>TONI × ROSALIE · WAITING ROOM</p>
          <h1>拉扯实验室</h1>
          <span>这里的输赢，不进入人事档案。</span>
        </div>
        <div className="lab-header-side">
          <Link className="lab-treehole-link" href="/treehole">去树洞 ↗</Link>
          <img src="/soft-pull-cursor.png" alt="" width={86} height={86} aria-hidden="true" />
        </div>
      </header>

      <nav className="game-switcher" aria-label="选择小游戏">
        {GAMES.map((game) => (
          <button
            className={activeGame === game.id ? 'is-active' : ''}
            type="button"
            key={game.id}
            aria-pressed={activeGame === game.id}
            onClick={() => setActiveGame(game.id)}
          >
            <small>{game.index}</small>
            <strong>{game.label}</strong>
            <span>{game.note}</span>
          </button>
        ))}
      </nav>

      <div className="game-cartridge" key={activeGame}>
        <span className="cartridge-notch" aria-hidden="true" />
        {activeGame === 'catch' ? <MiniGame /> : null}
        {activeGame === 'route' ? <RouteGame /> : null}
        {activeGame === 'timing' ? <TimingGame /> : null}
        {activeGame === 'arrow' ? <ArrowGame /> : null}
      </div>

      <footer className="lab-footer">
        <span>2026 TEST FLIGHT</span>
        <i>♥</i>
        <span>NO KPI ATTACHED</span>
      </footer>
    </main>
  );
}
