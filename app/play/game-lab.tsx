/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useState } from 'react';

import { usePlayerProgress } from './use-player-progress';

type GameId = 'hole' | 'sand' | 'parking' | 'screw' | 'water' | 'rescue' | 'arrow';

const GAMES: Array<{ id: GameId; index: string; label: string; note: string; action: string; glyph: string }> = [
  { id: 'hole', index: '01', label: '黑洞降临', note: '吞小，吃大', action: '拖住控制器，把场景吃干净。', glyph: '●' },
  { id: 'sand', index: '02', label: '沙画消消', note: '成团，落沙', action: '点开色团，看沙粒重新落位。', glyph: '✣' },
  { id: 'parking', index: '03', label: '挪了下车', note: '找路，放行', action: '按顺序放车，清空整座玩具场。', glyph: '▰' },
  { id: 'screw', index: '04', label: '打个螺丝', note: '拆下，三消', action: '拆掉层板，别把托盘塞满。', glyph: '×' },
  { id: 'water', index: '05', label: '倒水挑战', note: '分色，归位', action: '选杯、倾倒，让颜色各回各家。', glyph: '◒' },
  { id: 'rescue', index: '06', label: '营救小猫', note: '抽线，解围', action: '顺着遮挡抽线，把猫放出来。', glyph: '⌁' },
  { id: 'arrow', index: '07', label: '一箭又一箭', note: '瞄准，进洞', action: '按住、拉开、松手。', glyph: '↗' },
];

export function GameLab() {
  const [activeGame, setActiveGame] = useState<GameId>('hole');
  const playerProgress = usePlayerProgress();
  const active = GAMES.find((game) => game.id === activeGame) ?? GAMES[0];
  const activeLevel = (playerProgress.progress[activeGame]?.level ?? 0) + 1;

  return (
    <main className="play-lab">
      <div className="lab-glow lab-glow-one" aria-hidden="true" />
      <div className="lab-glow lab-glow-two" aria-hidden="true" />
      <div className="lab-dots" aria-hidden="true" />

      <header className="lab-header">
        <Link className="lab-back" href="/">← 返回</Link>
        <div>
          <p>TONI × ROSALIE · WAITING ROOM</p>
          <h1>小游戏</h1>
          <span>七盒卡带。</span>
        </div>
        <div className="lab-header-side">
          <div className="lab-utility-links">
            <Link className="lab-treehole-link" href="/treehole">树洞</Link>
            <Link className="lab-treehole-link" href="/schedule">日程板 ↗</Link>
          </div>
          <span className={`lab-sync-state is-${playerProgress.state}`}>
            {playerProgress.state === 'loading' ? '读取存档' : playerProgress.state === 'saving' ? '保存中' : playerProgress.state === 'offline' ? '本机存档' : '已保存'}
          </span>
          <img src="/soft-pull-controller.webp" alt="" width={86} height={86} aria-hidden="true" />
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

      <div className="game-cartridge" key={`${activeGame}:${playerProgress.ready}`}>
        <span className="cartridge-notch" aria-hidden="true" />
        {playerProgress.ready ? (
          <section className={`arrow-portal game-portal portal-${active.id}`}>
            <p>FULL SCREEN · LEVEL {String(activeLevel).padStart(2, '0')}</p>
            <div className="arrow-portal-orbit" aria-hidden="true"><i /><i /><span>{active.glyph}</span></div>
            <h2>{active.label}</h2>
            <span>{active.action}</span>
            <Link href={`/play/${active.id}`}>进入游戏 <b>→</b></Link>
          </section>
        ) : <div className="game-save-loading" role="status"><i /><p>正在接回上次进度</p></div>}
      </div>

      <footer className="lab-footer">
        <span>2026 TEST FLIGHT</span>
        <i>♥</i>
        <span>NO KPI ATTACHED</span>
      </footer>
    </main>
  );
}
