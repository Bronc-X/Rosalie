'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ENDLESS_GAME_CATALOG } from '@/lib/endless-games.mjs';
import type { GameId } from '@/lib/player-progress.mjs';
import { GameIcon, GameLaunchIcon } from './game-icon';
import { usePlayerProgress } from './use-player-progress';

type GameCard = { id: GameId; label: string; action: string; endless?: boolean };

const CORE_GAMES: GameCard[] = [
  { id: 'hole', label: '黑洞降临', action: '拖动吞下更小的物体' },
  { id: 'sand', label: '沙画消消', action: '点开同色方块' },
  { id: 'parking', label: '挪了下车', action: '按顺序清空场地' },
  { id: 'screw', label: '打个螺丝', action: '拆掉层板，别塞满托盘' },
  { id: 'water', label: '倒水挑战', action: '让颜色各自归位' },
  { id: 'rescue', label: '营救小猫', action: '按遮挡顺序抽线' },
  { id: 'arrow', label: '一箭又一箭', action: '按住、拉开、松手' },
  { id: 'connect', label: '四枚护符', action: '把相同图标连起来' },
];

const GAMES: GameCard[] = [
  ...CORE_GAMES,
  ...ENDLESS_GAME_CATALOG.map((game) => ({
    id: game.id,
    label: game.label,
    action: game.instruction,
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
      <header className="lab-header">
        <div>
          <h1>小游戏</h1>
          <p>挑一个，直接开玩</p>
        </div>
        <div className="lab-header-side">
          <span className={`lab-sync-state is-${playerProgress.state}`}>
            {playerProgress.state === 'loading' ? '读取存档' : playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '已保存'}
          </span>
        </div>
      </header>

      <div className="game-cartridge" key={`${activeGame}:${playerProgress.ready}`}>
        {playerProgress.ready ? (
          <section className={`arrow-portal game-portal portal-${active.id}`}>
            <div className="game-portal-copy">
              <span className="game-progress-label">{active.endless ? `最高 ${bestScore} 分` : `第 ${activeLevel} 关`}</span>
              <h2>{active.label}</h2>
              <p>{active.action}</p>
              <Link href={`/play/${active.id}`}>开始游戏 <GameLaunchIcon /></Link>
            </div>
            <div className="game-portal-art" aria-hidden="true">
              <i />
              <GameIcon gameId={active.id} size={58} />
            </div>
          </section>
        ) : <div className="game-save-loading" role="status"><i /><p>读取进度</p></div>}
      </div>

      <section className="game-collection" aria-labelledby="game-collection-core">
        <div className="game-collection-heading">
          <h2 id="game-collection-core">闯关</h2>
          <span>{CORE_GAMES.length} 款</span>
        </div>
        <div className="game-grid" role="list">
          {CORE_GAMES.map((game) => (
            <Link
              className={activeGame === game.id ? 'is-active' : ''}
              role="listitem"
              key={game.id}
              href={`/play/${game.id}`}
              onPointerEnter={() => setActiveGame(game.id)}
              onFocus={() => setActiveGame(game.id)}
            >
              <GameIcon gameId={game.id} />
              <span><strong>{game.label}</strong><small>第 {(playerProgress.progress[game.id]?.level ?? 0) + 1} 关</small></span>
              <GameLaunchIcon />
            </Link>
          ))}
        </div>
      </section>

      <section className="game-collection" aria-labelledby="game-collection-endless">
        <div className="game-collection-heading">
          <h2 id="game-collection-endless">无尽</h2>
          <span>{GAMES.length - CORE_GAMES.length} 款</span>
        </div>
        <div className="game-grid" role="list">
          {GAMES.filter((game) => game.endless).map((game) => (
            <Link
              className={activeGame === game.id ? 'is-active' : ''}
              role="listitem"
              key={game.id}
              href={`/play/${game.id}`}
              onPointerEnter={() => setActiveGame(game.id)}
              onFocus={() => setActiveGame(game.id)}
            >
              <GameIcon gameId={game.id} />
              <span><strong>{game.label}</strong><small>最高 {playerProgress.progress[game.id]?.bestScore ?? 0}</small></span>
              <GameLaunchIcon />
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
