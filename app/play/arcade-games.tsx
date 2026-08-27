/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import {
  canCarExit,
  clearSandGroup,
  nextHoleSize,
  pourWater,
  swallowObject,
  trayAfterPick,
  waterPuzzleSolved,
} from '@/lib/arcade-games.mjs';
import type { ParkingCar, SandBoard } from '@/lib/arcade-games.mjs';

type GameStatus = 'playing' | 'won' | 'lost';
type GameProgressProps = {
  initialLevel?: number;
  onProgress?: (level: number, bestScore?: number) => void;
};

function GameIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lab-game-heading">
      <h2>{title}</h2>
      <span>{children}</span>
    </div>
  );
}

function ResultSheet({ status, onRestart, children }: { status: GameStatus; onRestart: () => void; children: ReactNode }) {
  if (status === 'playing') return null;
  return (
    <div className={`arcade-result arcade-result-${status}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      <strong>{status === 'won' ? '本关通过' : '卡住了'}</strong>
      <p>{children}</p>
      <button type="button" onClick={onRestart}>{status === 'won' ? '下一关' : '重新来'}</button>
    </div>
  );
}

type HoleObject = { id: string; x: number; y: number; size: number; kind: string; tone: string; eaten?: boolean };

const HOLE_LEVELS: HoleObject[][] = [
  [
    { id: 'a', x: 20, y: 24, size: 7, kind: 'pearl', tone: 'rose' },
    { id: 'b', x: 72, y: 18, size: 8, kind: 'pearl', tone: 'lilac' },
    { id: 'c', x: 82, y: 54, size: 9, kind: 'sweet', tone: 'peach' },
    { id: 'd', x: 35, y: 66, size: 8, kind: 'sweet', tone: 'mint' },
    { id: 'e', x: 55, y: 35, size: 11, kind: 'cup', tone: 'rose' },
    { id: 'f', x: 17, y: 52, size: 12, kind: 'cup', tone: 'peach' },
    { id: 'g', x: 70, y: 72, size: 14, kind: 'chair', tone: 'lilac' },
    { id: 'h', x: 48, y: 79, size: 16, kind: 'cake', tone: 'rose' },
  ],
  [
    { id: 'a', x: 15, y: 22, size: 7, kind: 'pearl', tone: 'mint' },
    { id: 'b', x: 35, y: 18, size: 7, kind: 'pearl', tone: 'rose' },
    { id: 'c', x: 79, y: 27, size: 8, kind: 'sweet', tone: 'lilac' },
    { id: 'd', x: 60, y: 52, size: 9, kind: 'sweet', tone: 'peach' },
    { id: 'e', x: 28, y: 47, size: 11, kind: 'cup', tone: 'rose' },
    { id: 'f', x: 84, y: 67, size: 12, kind: 'cup', tone: 'mint' },
    { id: 'g', x: 48, y: 72, size: 14, kind: 'chair', tone: 'peach' },
    { id: 'h', x: 16, y: 75, size: 17, kind: 'cake', tone: 'lilac' },
    { id: 'i', x: 68, y: 16, size: 20, kind: 'planet', tone: 'rose' },
  ],
];

export function HoleGame({ initialLevel = 0, onProgress }: GameProgressProps = {}) {
  const startingLevel = Math.min(HOLE_LEVELS.length - 1, Math.max(0, initialLevel));
  const [level, setLevel] = useState(startingLevel);
  const [objects, setObjects] = useState(() => HOLE_LEVELS[startingLevel].map((object) => ({ ...object })));
  const [hole, setHole] = useState({ x: 50, y: 88, size: 14 });
  const [status, setStatus] = useState<GameStatus>('playing');
  const [bump, setBump] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const swallowed = objects.filter((object) => object.eaten).length;

  function reset(nextLevel = level) {
    const safeLevel = Math.min(HOLE_LEVELS.length - 1, Math.max(0, nextLevel));
    onProgress?.(safeLevel, objects.length);
    setLevel(safeLevel);
    setObjects(HOLE_LEVELS[safeLevel].map((object) => ({ ...object })));
    setHole({ x: 50, y: 88, size: 14 });
    setStatus('playing');
    setBump(null);
  }

  function move(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || status !== 'playing') return;
    moveTo(
      Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)),
      Math.max(8, Math.min(94, ((clientY - rect.top) / rect.height) * 100)),
    );
  }

  function moveTo(x: number, y: number) {
    if (status !== 'playing') return;
    const nextHole = { ...hole, x, y };
    let grownHole = nextHole;
    let didEat = false;
    const nextObjects = objects.map((object) => {
      if (object.eaten) return object;
      if (swallowObject(grownHole, object)) {
        grownHole = { ...grownHole, size: nextHoleSize(grownHole.size, object.size) };
        didEat = true;
        return { ...object, eaten: true };
      }
      const distance = Math.hypot(grownHole.x - object.x, grownHole.y - object.y);
      if (distance < grownHole.size * 0.64 && object.size > grownHole.size * 0.9) {
        setBump(object.id);
        window.setTimeout(() => setBump(null), 220);
      }
      return object;
    });
    setHole(grownHole);
    if (didEat) {
      setObjects(nextObjects);
      if (nextObjects.every((object) => object.eaten)) window.setTimeout(() => setStatus('won'), 300);
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event.clientX, event.clientY);
  }

  return (
    <section className="arcade-game hole-game">
      <GameIntro title="黑洞降临">拖动黑洞，先小后大</GameIntro>
      <div
        className="arcade-stage hole-stage"
        ref={stageRef}
        onPointerDown={startDrag}
        onPointerMove={(event) => pointerRef.current === event.pointerId && move(event.clientX, event.clientY)}
        onPointerUp={(event) => {
          pointerRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { pointerRef.current = null; }}
        onLostPointerCapture={() => { pointerRef.current = null; }}
        role="button"
        tabIndex={0}
        aria-label="拖动黑洞吞下物体；也可以用方向键移动"
        onKeyDown={(event) => {
          const movement: Record<string, [number, number]> = {
            ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5],
          };
          const delta = movement[event.key];
          if (!delta) return;
          event.preventDefault();
          moveTo(Math.max(5, Math.min(95, hole.x + delta[0])), Math.max(8, Math.min(94, hole.y + delta[1])));
        }}
      >
        <div className="arcade-hud"><span>第 {level + 1} 关</span><b>{swallowed} / {objects.length}</b></div>
        <div className="hole-floor" aria-hidden="true" />
        {objects.map((object) => (
          <span
            className={`hole-object object-${object.kind} tone-${object.tone} ${object.eaten ? 'is-eaten' : ''} ${bump === object.id ? 'is-bumped' : ''}`}
            key={object.id}
            style={{ left: `${object.x}%`, top: `${object.y}%`, '--object-size': `${object.size * 2.35}px` } as CSSProperties}
          ><i /></span>
        ))}
        <span className="player-hole" style={{ left: `${hole.x}%`, top: `${hole.y}%`, '--hole-size': `${hole.size * 2.3}px` } as CSSProperties}>
          <img src="/soft-pull-cursor.webp" alt="拖动控制器" draggable="false" />
        </span>
        <ResultSheet status={status} onRestart={() => reset(level + 1)}>场地已清空</ResultSheet>
      </div>
    </section>
  );
}

const SAND_LEVELS: SandBoard[] = [
  [
    ['rose', 'rose', 'mint', 'lilac', 'lilac', 'peach', 'peach'],
    ['rose', 'mint', 'mint', 'lilac', 'peach', 'peach', 'rose'],
    ['mint', 'mint', 'rose', 'rose', 'peach', 'lilac', 'rose'],
    ['peach', 'lilac', 'rose', 'mint', 'mint', 'lilac', 'lilac'],
    ['peach', 'peach', 'mint', 'mint', 'rose', 'rose', 'lilac'],
    ['lilac', 'peach', 'peach', 'rose', 'rose', 'mint', 'mint'],
    ['lilac', 'lilac', 'rose', 'peach', 'mint', 'mint', 'rose'],
    ['rose', 'lilac', 'lilac', 'peach', 'peach', 'rose', 'rose'],
  ],
  [
    ['mint', 'rose', 'rose', 'peach', 'peach', 'lilac', 'lilac'],
    ['mint', 'mint', 'rose', 'peach', 'lilac', 'lilac', 'rose'],
    ['rose', 'mint', 'mint', 'rose', 'rose', 'peach', 'peach'],
    ['peach', 'peach', 'lilac', 'lilac', 'mint', 'mint', 'rose'],
    ['lilac', 'rose', 'lilac', 'mint', 'mint', 'rose', 'rose'],
    ['lilac', 'lilac', 'peach', 'peach', 'rose', 'rose', 'mint'],
    ['rose', 'peach', 'peach', 'mint', 'lilac', 'lilac', 'mint'],
    ['rose', 'rose', 'mint', 'mint', 'lilac', 'peach', 'peach'],
  ],
];

function hasSandMove(board: SandBoard) {
  return board.some((row, rowIndex) => row.some((color, columnIndex) => color && clearSandGroup(board, rowIndex, columnIndex).removed >= 3));
}

export function SandGame({ initialLevel = 0, onProgress }: GameProgressProps = {}) {
  const startingLevel = Math.min(SAND_LEVELS.length - 1, Math.max(0, initialLevel));
  const [level, setLevel] = useState(startingLevel);
  const [board, setBoard] = useState<SandBoard>(() => SAND_LEVELS[startingLevel].map((row) => [...row]));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [wrongCell, setWrongCell] = useState('');

  function reset(nextLevel = level) {
    const safeLevel = Math.min(SAND_LEVELS.length - 1, Math.max(0, nextLevel));
    onProgress?.(safeLevel, score);
    setLevel(safeLevel);
    setBoard(SAND_LEVELS[safeLevel].map((row) => [...row]));
    setScore(0);
    setCombo(0);
    setStatus('playing');
  }

  function tap(row: number, column: number) {
    if (status !== 'playing') return;
    const result = clearSandGroup(board, row, column);
    if (!result.removed) {
      const key = `${row}:${column}`;
      setWrongCell(key);
      setCombo(0);
      window.setTimeout(() => setWrongCell(''), 240);
      return;
    }
    const nextCombo = combo + 1;
    const nextScore = score + result.removed * 10 * Math.min(3, nextCombo);
    setBoard(result.board);
    setCombo(nextCombo);
    setScore(nextScore);
    const remaining = result.board.flat().filter(Boolean).length;
    if (remaining === 0 || nextScore >= 420) window.setTimeout(() => setStatus('won'), 350);
    else if (!hasSandMove(result.board)) window.setTimeout(() => setStatus('lost'), 350);
  }

  return (
    <section className="arcade-game sand-game">
      <GameIntro title="沙画消消">点击三个以上相连色块</GameIntro>
      <div className="arcade-stage sand-stage">
        <div className="arcade-hud"><span>第 {level + 1} 关</span><b>{score} / 420</b></div>
        <div className="sand-glass">
          <div className="sand-board" style={{ '--sand-rows': board.length, '--sand-columns': board[0].length } as CSSProperties}>
            {board.map((row, rowIndex) => row.map((color, columnIndex) => (
              <button
                type="button"
                aria-label={color ? `${color}色沙粒` : '空位'}
                disabled={!color}
                className={`sand-cell ${color ? `sand-${color}` : 'is-empty'} ${wrongCell === `${rowIndex}:${columnIndex}` ? 'is-wrong' : ''}`}
                key={`${rowIndex}:${columnIndex}`}
                onClick={() => tap(rowIndex, columnIndex)}
              ><i /><b /><em /></button>
            ))) }
          </div>
          <span className="sand-combo">{combo > 1 ? `连击 ×${combo}` : '轻点沙团'}</span>
        </div>
        <ResultSheet status={status} onRestart={() => reset(status === 'won' ? level + 1 : level)}>
          {status === 'won' ? `得分 ${score}` : '没有可消除的沙团'}
        </ResultSheet>
      </div>
    </section>
  );
}

const PARKING_LEVELS: ParkingCar[][] = [
  [
    { id: 'a', row: 0, column: 0, length: 2, horizontal: true },
    { id: 'b', row: 0, column: 3, length: 2, horizontal: false },
    { id: 'c', row: 2, column: 0, length: 3, horizontal: true },
    { id: 'd', row: 1, column: 5, length: 2, horizontal: false },
    { id: 'e', row: 3, column: 1, length: 2, horizontal: false, direction: 'backward' },
    { id: 'f', row: 4, column: 2, length: 2, horizontal: true },
    { id: 'g', row: 4, column: 5, length: 2, horizontal: false },
    { id: 'h', row: 5, column: 0, length: 2, horizontal: true, direction: 'backward' },
  ],
  [
    { id: 'a', row: 0, column: 2, length: 2, horizontal: false, direction: 'backward' },
    { id: 'b', row: 0, column: 4, length: 2, horizontal: true },
    { id: 'c', row: 2, column: 0, length: 3, horizontal: true, direction: 'backward' },
    { id: 'd', row: 2, column: 3, length: 2, horizontal: false },
    { id: 'e', row: 3, column: 0, length: 2, horizontal: true, direction: 'backward' },
    { id: 'f', row: 4, column: 1, length: 2, horizontal: false },
    { id: 'g', row: 4, column: 3, length: 3, horizontal: true },
    { id: 'h', row: 2, column: 5, length: 2, horizontal: false },
  ],
];

export function ParkingGame({ initialLevel = 0, onProgress }: GameProgressProps = {}) {
  const startingLevel = Math.min(PARKING_LEVELS.length - 1, Math.max(0, initialLevel));
  const [level, setLevel] = useState(startingLevel);
  const [cars, setCars] = useState(() => PARKING_LEVELS[startingLevel].map((car) => ({ ...car })));
  const [moves, setMoves] = useState(0);
  const [blocked, setBlocked] = useState('');
  const [status, setStatus] = useState<GameStatus>('playing');

  function reset(nextLevel = level) {
    const safeLevel = Math.min(PARKING_LEVELS.length - 1, Math.max(0, nextLevel));
    onProgress?.(safeLevel, Math.max(0, 10_000 - moves * 100));
    setLevel(safeLevel);
    setCars(PARKING_LEVELS[safeLevel].map((car) => ({ ...car })));
    setMoves(0);
    setBlocked('');
    setStatus('playing');
  }

  function moveCar(car: ParkingCar) {
    if (status !== 'playing' || car.removed) return;
    if (!canCarExit(car, cars)) {
      setBlocked(car.id);
      window.setTimeout(() => setBlocked(''), 260);
      return;
    }
    const next = cars.map((candidate) => candidate.id === car.id ? { ...candidate, removed: true } : candidate);
    setCars(next);
    setMoves((current) => current + 1);
    if (next.every((candidate) => candidate.removed)) window.setTimeout(() => setStatus('won'), 450);
  }

  return (
    <section className="arcade-game parking-game">
      <GameIntro title="挪了下车">点击车辆，按箭头驶出</GameIntro>
      <div className="arcade-stage parking-stage">
        <div className="arcade-hud"><span>第 {level + 1} 关</span><b>{moves} 步</b></div>
        <div className="parking-board">
          {Array.from({ length: 36 }, (_, index) => <i className="parking-tile" key={index} />)}
          {cars.map((car, index) => (
            <button
              type="button"
              key={car.id}
              aria-label={`移动车辆 ${car.id}`}
              className={`parking-car car-tone-${index % 5} ${car.horizontal ? 'is-horizontal' : 'is-vertical'} ${car.direction === 'backward' ? 'is-backward' : ''} ${car.removed ? 'is-leaving' : ''} ${blocked === car.id ? 'is-blocked' : ''}`}
              style={{
                '--car-row': car.row,
                '--car-column': car.column,
                '--car-length': car.length,
              } as CSSProperties}
              onClick={() => moveCar(car)}
            ><i /><b>{car.direction === 'backward' ? '‹' : '›'}</b></button>
          ))}
        </div>
        <div className="parking-controller"><img src="/soft-pull-cursor.webp" alt="" /><span>点车放行</span></div>
        <ResultSheet status={status} onRestart={() => reset(level + 1)}>共用 {moves} 步</ResultSheet>
      </div>
    </section>
  );
}

type Screw = { id: string; x: number; y: number; color: string; layer: number; removed?: boolean };

const SCREWS: Screw[] = [
  { id: 'a', x: 17, y: 25, color: 'rose', layer: 0 }, { id: 'b', x: 50, y: 19, color: 'mint', layer: 0 },
  { id: 'c', x: 82, y: 28, color: 'rose', layer: 0 }, { id: 'd', x: 30, y: 52, color: 'mint', layer: 0 },
  { id: 'e', x: 67, y: 49, color: 'rose', layer: 0 }, { id: 'f', x: 49, y: 70, color: 'mint', layer: 0 },
  { id: 'g', x: 15, y: 68, color: 'peach', layer: 1 }, { id: 'h', x: 86, y: 67, color: 'lilac', layer: 1 },
  { id: 'i', x: 35, y: 31, color: 'peach', layer: 1 }, { id: 'j', x: 65, y: 31, color: 'lilac', layer: 1 },
  { id: 'k', x: 36, y: 73, color: 'peach', layer: 1 }, { id: 'l', x: 66, y: 72, color: 'lilac', layer: 1 },
];

export function ScrewGame() {
  const [screws, setScrews] = useState(() => SCREWS.map((screw) => ({ ...screw })));
  const [tray, setTray] = useState<string[]>([]);
  const [unlockedLayer, setUnlockedLayer] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [lastClear, setLastClear] = useState(false);

  function reset() {
    setScrews(SCREWS.map((screw) => ({ ...screw })));
    setTray([]);
    setUnlockedLayer(0);
    setStatus('playing');
  }

  function pick(screw: Screw) {
    if (status !== 'playing' || screw.removed || screw.layer > unlockedLayer) return;
    const nextScrews = screws.map((candidate) => candidate.id === screw.id ? { ...candidate, removed: true } : candidate);
    const result = trayAfterPick(tray, screw.color);
    setScrews(nextScrews);
    setTray(result.tray);
    setLastClear(result.cleared);
    window.setTimeout(() => setLastClear(false), 300);
    if (result.overflow) {
      window.setTimeout(() => setStatus('lost'), 250);
      return;
    }
    if (nextScrews.filter((candidate) => candidate.layer === unlockedLayer).every((candidate) => candidate.removed)) {
      setUnlockedLayer((current) => current + 1);
    }
    if (nextScrews.every((candidate) => candidate.removed)) window.setTimeout(() => setStatus('won'), 400);
  }

  return (
    <section className="arcade-game screw-game">
      <GameIntro title="打个螺丝">三枚同色自动清空</GameIntro>
      <div className="arcade-stage screw-stage">
        <div className="arcade-hud"><span>第 {Math.min(2, unlockedLayer + 1)} / 2 层</span><b>{screws.filter((screw) => screw.removed).length} / {screws.length}</b></div>
        <div className={`metal-plates layer-${unlockedLayer}`} aria-hidden="true"><i /><i /><i /></div>
        {screws.map((screw) => (
          <button
            type="button"
            key={screw.id}
            disabled={screw.removed || screw.layer > unlockedLayer}
            className={`toy-screw screw-${screw.color} ${screw.removed ? 'is-removed' : ''} ${screw.layer > unlockedLayer ? 'is-locked' : ''}`}
            style={{ left: `${screw.x}%`, top: `${screw.y}%` }}
            onClick={() => pick(screw)}
            aria-label={`拆下${screw.color}色螺丝`}
          ><i>×</i></button>
        ))}
        <div className={`match-tray ${lastClear ? 'is-clearing' : ''}`} aria-label={`托盘已有${tray.length}个螺丝`}>
          {Array.from({ length: 7 }, (_, index) => <i className={tray[index] ? `tray-${tray[index]}` : ''} key={index}>{tray[index] ? '×' : ''}</i>)}
        </div>
        <ResultSheet status={status} onRestart={reset}>{status === 'won' ? '已拆完' : '托盘已满'}</ResultSheet>
      </div>
    </section>
  );
}

const WATER_LEVELS = [
  [
    ['rose', 'mint', 'peach', 'rose'], ['mint', 'peach', 'rose', 'mint'],
    ['peach', 'rose', 'mint', 'peach'], [], [],
  ],
  [
    ['rose', 'lilac', 'mint', 'peach'], ['mint', 'peach', 'rose', 'lilac'],
    ['peach', 'mint', 'lilac', 'rose'], ['lilac', 'rose', 'peach', 'mint'], [], [],
  ],
];

export function WaterGame({ initialLevel = 0, onProgress }: GameProgressProps = {}) {
  const startingLevel = Math.min(WATER_LEVELS.length - 1, Math.max(0, initialLevel));
  const [level, setLevel] = useState(startingLevel);
  const [tubes, setTubes] = useState<string[][]>(() => WATER_LEVELS[startingLevel].map((tube) => [...tube]));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [invalid, setInvalid] = useState<number | null>(null);

  function reset(nextLevel = level) {
    const safeLevel = Math.min(WATER_LEVELS.length - 1, Math.max(0, nextLevel));
    onProgress?.(safeLevel, Math.max(0, 10_000 - moves * 100));
    setLevel(safeLevel);
    setTubes(WATER_LEVELS[safeLevel].map((tube) => [...tube]));
    setSelected(null);
    setMoves(0);
    setStatus('playing');
  }

  function tapTube(index: number) {
    if (status !== 'playing') return;
    if (selected === null) {
      if (tubes[index].length) setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    const next = pourWater(tubes, selected, index);
    if (next === tubes) {
      setInvalid(index);
      window.setTimeout(() => setInvalid(null), 250);
      setSelected(null);
      return;
    }
    setTubes(next);
    setSelected(null);
    setMoves((current) => current + 1);
    if (waterPuzzleSolved(next)) window.setTimeout(() => setStatus('won'), 500);
  }

  return (
    <section className="arcade-game water-game">
      <GameIntro title="倒水挑战">先选来源，再选目标</GameIntro>
      <div className="arcade-stage water-stage">
        <div className="arcade-hud"><span>第 {level + 1} 关</span><b>{moves} 次倾倒</b></div>
        <div className="tube-rack">
          {tubes.map((tube, index) => (
            <button
              type="button"
              key={index}
              className={`water-tube ${selected === index ? 'is-selected' : ''} ${invalid === index ? 'is-invalid' : ''}`}
              onClick={() => tapTube(index)}
              aria-label={`试管 ${index + 1}`}
            >
              <span className="tube-glass">
                {tube.map((color, liquidIndex) => <i className={`water-${color}`} key={`${color}:${liquidIndex}`} style={{ '--liquid-index': liquidIndex } as CSSProperties} />)}
              </span>
            </button>
          ))}
        </div>
        <div className="water-controller"><img src="/soft-pull-cursor.webp" alt="" /><span>{selected === null ? '选一只杯' : '再选目标杯'}</span></div>
        <ResultSheet status={status} onRestart={() => reset(level + 1)}>共倾倒 {moves} 次</ResultSheet>
      </div>
    </section>
  );
}

type Yarn = { id: string; color: string; path: string; dependencies: string[]; removed?: boolean };

const YARNS: Yarn[] = [
  { id: 'a', color: 'rose', path: 'M8 22 C35 2, 55 49, 92 18', dependencies: [] },
  { id: 'b', color: 'rose', path: 'M5 43 C28 70, 72 3, 95 37', dependencies: [] },
  { id: 'c', color: 'rose', path: 'M10 64 C35 31, 70 83, 92 56', dependencies: [] },
  { id: 'd', color: 'mint', path: 'M4 79 C32 91, 58 34, 96 76', dependencies: [] },
  { id: 'e', color: 'mint', path: 'M18 8 C42 37, 42 63, 20 92', dependencies: ['a'] },
  { id: 'f', color: 'mint', path: 'M43 5 C69 31, 22 68, 49 95', dependencies: ['b'] },
  { id: 'g', color: 'peach', path: 'M70 6 C45 34, 91 64, 72 94', dependencies: ['c'] },
  { id: 'h', color: 'peach', path: 'M91 10 C61 39, 38 60, 89 91', dependencies: ['d'] },
  { id: 'i', color: 'peach', path: 'M13 49 C39 23, 62 78, 88 48', dependencies: ['e', 'f'] },
  { id: 'j', color: 'lilac', path: 'M22 15 C70 23, 28 79, 81 86', dependencies: ['f', 'g'] },
  { id: 'k', color: 'lilac', path: 'M9 88 C42 52, 62 47, 91 13', dependencies: ['g', 'h'] },
  { id: 'l', color: 'lilac', path: 'M8 12 C47 52, 63 52, 94 88', dependencies: ['e', 'h'] },
];

function CatFace({ free }: { free: boolean }) {
  return <span className={`rescue-cat ${free ? 'is-free' : ''}`} aria-label="小猫"><i /><i /><b /><em /></span>;
}

export function RescueGame() {
  const [yarns, setYarns] = useState(() => YARNS.map((yarn) => ({ ...yarn })));
  const [tray, setTray] = useState<string[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const removedIds = useMemo(() => new Set(yarns.filter((yarn) => yarn.removed).map((yarn) => yarn.id)), [yarns]);

  function reset() {
    setYarns(YARNS.map((yarn) => ({ ...yarn })));
    setTray([]);
    setStatus('playing');
  }

  function pull(yarn: Yarn) {
    const unlocked = yarn.dependencies.every((id) => removedIds.has(id));
    if (!unlocked || yarn.removed || status !== 'playing') return;
    const result = trayAfterPick(tray, yarn.color);
    const next = yarns.map((candidate) => candidate.id === yarn.id ? { ...candidate, removed: true } : candidate);
    setYarns(next);
    setTray(result.tray);
    if (result.overflow) window.setTimeout(() => setStatus('lost'), 250);
    else if (next.every((candidate) => candidate.removed)) window.setTimeout(() => setStatus('won'), 500);
  }

  return (
    <section className="arcade-game rescue-game">
      <GameIntro title="营救小猫">先抽最上层毛线</GameIntro>
      <div className="arcade-stage rescue-stage">
        <div className="arcade-hud"><span>剩 {yarns.filter((yarn) => !yarn.removed).length} 根</span><b>托盘 {tray.length} / 7</b></div>
        <div className="yarn-field">
          <CatFace free={status === 'won'} />
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {yarns.map((yarn) => {
              const unlocked = yarn.dependencies.every((id) => removedIds.has(id));
              return <path key={yarn.id} d={yarn.path} className={`yarn-${yarn.color} ${yarn.removed ? 'is-removed' : ''} ${unlocked ? 'is-free' : 'is-locked'}`} />;
            })}
          </svg>
          {yarns.map((yarn, index) => {
            const unlocked = yarn.dependencies.every((id) => removedIds.has(id));
            return (
              <button
                type="button"
                key={yarn.id}
                disabled={!unlocked || yarn.removed}
                className={`yarn-pull yarn-${yarn.color} ${yarn.removed ? 'is-removed' : ''}`}
                style={{ '--yarn-button-x': `${8 + (index % 4) * 28}%`, '--yarn-button-y': `${18 + Math.floor(index / 4) * 31}%` } as CSSProperties}
                onClick={() => pull(yarn)}
                aria-label={`抽走${yarn.color}色毛线`}
              ><i /></button>
            );
          })}
        </div>
        <div className="match-tray yarn-tray">
          {Array.from({ length: 7 }, (_, index) => <i className={tray[index] ? `tray-${tray[index]}` : ''} key={index}>{tray[index] ? '●' : ''}</i>)}
        </div>
        <ResultSheet status={status} onRestart={reset}>{status === 'won' ? '小猫出来了' : '托盘已满'}</ResultSheet>
      </div>
    </section>
  );
}

const ARROW_LEVELS = [
  { x: 26, y: 27, radius: 6, speed: 0, axis: 'none', restingAngle: -21 },
  { x: 70, y: 24, radius: 5, speed: 0.0012, axis: 'x', restingAngle: 17 },
  { x: 34, y: 18, radius: 4.5, speed: 0.0015, axis: 'y', restingAngle: -12 },
  { x: 76, y: 35, radius: 4, speed: 0.0018, axis: 'x', restingAngle: 24 },
];

type ArrowFlight = { id: number; angle: number; hit: boolean };

export function PrecisionArrowGame() {
  const [level, setLevel] = useState(0);
  const [aim, setAim] = useState(-35);
  const [targetOffset, setTargetOffset] = useState(0);
  const [shots, setShots] = useState<Array<'hit' | 'miss'>>([]);
  const [flight, setFlight] = useState<ArrowFlight | null>(null);
  const [status, setStatus] = useState<GameStatus>('playing');
  const startedAt = useRef(0);
  const flightId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const aimHistory = useRef<Array<{ time: number; angle: number }>>([]);
  const target = ARROW_LEVELS[level];

  useEffect(() => {
    if (status !== 'playing') return;
    aimHistory.current = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const reducedMotionTimer = window.setTimeout(() => {
        setAim(target.restingAngle);
        setTargetOffset(0);
        aimHistory.current = [{ time: performance.now(), angle: target.restingAngle }];
      }, 0);
      return () => window.clearTimeout(reducedMotionTimer);
    }
    startedAt.current = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt.current;
      const nextAim = -52 + ((Math.sin(elapsed * 0.00085) + 1) / 2) * 104;
      const sampleTime = performance.now();
      aimHistory.current = [...aimHistory.current.filter((sample) => sampleTime - sample.time < 150), { time: sampleTime, angle: nextAim }];
      setAim(nextAim);
      setTargetOffset(target.speed ? Math.sin(elapsed * target.speed) * 14 : 0);
    }, 24);
    return () => window.clearInterval(timer);
  }, [level, status, target.restingAngle, target.speed]);

  const targetX = target.x + (target.axis === 'x' ? targetOffset : 0);
  const targetY = target.y + (target.axis === 'y' ? targetOffset * 0.65 : 0);

  function reset(nextLevel = level) {
    const safeLevel = nextLevel % ARROW_LEVELS.length;
    setLevel(safeLevel);
    setShots([]);
    setFlight(null);
    setStatus('playing');
    startedAt.current = performance.now();
  }

  function fire() {
    if (status !== 'playing' || flight) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const toTarget = {
      x: stage.width * (targetX / 100 - 0.5),
      y: stage.height * (targetY / 100 - 0.91),
    };
    const candidates = [...aimHistory.current.map((sample) => sample.angle), aim];
    const judged = candidates.map((candidateAngle) => {
      const radians = candidateAngle * Math.PI / 180;
      const direction = { x: Math.sin(radians), y: -Math.cos(radians) };
      return {
        angle: candidateAngle,
        projection: toTarget.x * direction.x + toTarget.y * direction.y,
        perpendicular: Math.abs(toTarget.x * direction.y - toTarget.y * direction.x),
      };
    }).sort((first, second) => first.perpendicular - second.perpendicular)[0];
    const targetRadiusPx = target.radius * 2;
    const hit = judged.projection > 0 && judged.perpendicular < targetRadiusPx + 3;
    const shotAngle = hit ? judged.angle : aim;
    const nextShots = [...shots, hit ? 'hit' as const : 'miss' as const];
    setShots(nextShots);
    setFlight({ id: flightId.current += 1, angle: shotAngle, hit });
    window.setTimeout(() => {
      setFlight(null);
      if (hit) setStatus('won');
      else if (nextShots.length >= 6) setStatus('lost');
    }, 720);
  }

  return (
    <section className="arcade-game precision-arrow-game">
      <GameIntro title="一箭又一箭">洞口对准虚线时点击</GameIntro>
      <div className="arcade-stage precision-arrow-stage" ref={stageRef} style={{ '--precision-angle': `${aim}deg` } as CSSProperties}>
        <button className="arrow-fire-surface" type="button" aria-label="放箭" disabled={status !== 'playing' || Boolean(flight)} onClick={fire} />
        <div className="arcade-hud"><span>第 {level + 1} 关</span><b>{shots.length} / 6 箭</b></div>
        <span className="moving-hole" style={{ left: `${targetX}%`, top: `${targetY}%`, '--target-radius': `${target.radius * 4}px` } as CSSProperties}><i /><b /></span>
        <span className="arrow-guide" aria-hidden="true" />
        <span className="arrow-bow" aria-hidden="true"><img src="/soft-pull-cursor.webp" alt="" /><i /></span>
        {flight ? <span key={flight.id} className={`precision-flight ${flight.hit ? 'is-hit' : 'is-miss'}`} style={{ '--flight-angle': `${flight.angle}deg` } as CSSProperties}><i /><b /></span> : null}
        <div className="shot-record">{Array.from({ length: 6 }, (_, index) => <i className={shots[index] ? `shot-${shots[index]}` : ''} key={index}>↑</i>)}</div>
        <p className="arrow-instruction">{flight ? (flight.hit ? '命中' : '未命中') : '戳屏幕放箭'}</p>
        <ResultSheet status={status} onRestart={() => reset(status === 'won' ? level + 1 : level)}>{status === 'won' ? `第 ${shots.length} 箭命中` : '六箭用完'}</ResultSheet>
      </div>
    </section>
  );
}
