'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ENDLESS_GAME_CATALOG } from '@/lib/endless-games.mjs';
import type { GameId } from '@/lib/player-progress.mjs';
import { usePlayerProgress } from './use-player-progress';

type GameCard = { id: GameId; label: string; action: string; glyph: string; endless?: boolean };

const CORE_GAMES: GameCard[] = [
  { id: 'hole', label: '黑洞降临', action: '拖动控制器，吞下更小的物体', glyph: '●' },
  { id: 'sand', label: '沙画消消', action: '点开同色方块，让沙粒落下', glyph: '▦' },
  { id: 'parking', label: '挪了下车', action: '按顺序移动车辆，清空场地', glyph: '▰' },
  { id: 'screw', label: '打个螺丝', action: '拆掉层板，别塞满托盘', glyph: '×' },
  { id: 'water', label: '倒水挑战', action: '选杯倾倒，让颜色归位', glyph: '◒' },
  { id: 'rescue', label: '营救小猫', action: '按遮挡顺序抽线', glyph: '⌁' },
  { id: 'arrow', label: '一箭又一箭', action: '按住、拉开、松手', glyph: '◉' },
  { id: 'connect', label: '四枚护符', action: '最多拐两次，配对相同图标', glyph: '◇' },
];

const GAMES: GameCard[] = [
  ...CORE_GAMES,
  ...ENDLESS_GAME_CATALOG.map((game) => ({
    id: game.id,
    label: game.label,
    action: game.instruction,
    glyph: game.glyph,
    endless: true,
  })),
];

export function GameLab() {
  const [activeGame, setActiveGame] = useState<GameId>('hole');
  const playerProgress = usePlayerProgress();
  const active = GAMES.find((game) => game.id === activeGame) ?? GAMES[0];
  const activeLevel = (playerProgress.progress[activeGame]?.level ?? 0) + 1;
  const bestScore = playerProgress.progress[activeGame]?.bestScore ?? 0;

  return (
    <main className="play-lab">
      <div className="lab-glow lab-glow-one" aria-hidden="true" />
      <div className="lab-glow lab-glow-two" aria-hidden="true" />
      <div className="lab-dots" aria-hidden="true" />

      <header className="lab-header">
        <div>
          <h1>小游戏</h1>
        </div>
        <div className="lab-header-side">
          <span className={`lab-sync-state is-${playerProgress.state}`}>
            {playerProgress.state === 'loading' ? '读取存档' : playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '已保存'}
          </span>
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
            <strong>{game.label}</strong>
          </button>
        ))}
      </nav>

      <div className="game-cartridge" key={`${activeGame}:${playerProgress.ready}`}>
        <span className="cartridge-notch" aria-hidden="true" />
        {playerProgress.ready ? (
          <section className={`arrow-portal game-portal portal-${active.id}`}>
            <p>{active.endless ? `最高 ${bestScore} 分` : `第 ${activeLevel} 关`}</p>
            <div className="arrow-portal-orbit" aria-hidden="true"><i /><i /><span>{active.glyph}</span></div>
            <h2>{active.label}</h2>
            <span>{active.action}</span>
            <Link href={`/play/${active.id}`}>开始</Link>
          </section>
        ) : <div className="game-save-loading" role="status"><i /><p>读取进度</p></div>}
      </div>

    </main>
  );
}
