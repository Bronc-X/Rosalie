'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  applyHoldemAction,
  chooseHoldemAiAction,
  createHoldemGame,
  grantHoldemChips,
  getHoldemAiThinkDelay,
  getHoldemLegalActions,
  normalizeHoldemState,
  startNextHoldemHand,
} from '@/lib/holdem-game.mjs';
import type {
  HoldemAction,
  HoldemDifficulty,
  HoldemLegalAction,
  HoldemPlayer,
  HoldemPlayerCount,
  HoldemState,
} from '@/lib/holdem-game.mjs';
import { HOLDEM_WECHAT_BONUS, SITE_WECHAT_ACTION_EVENT } from '@/lib/holdem-ui.mjs';
import { usePlayerProgress } from '../use-player-progress';

const STORAGE_KEY = 'rosalie_holdem_state_v1';
const ACTIVE_PHASES = new Set<HoldemState['phase']>(['preflop', 'flop', 'turn', 'river']);
const SUIT_LABELS = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const SUIT_NAMES = { s: '黑桃', h: '红桃', d: '方片', c: '梅花' } as const;
const PHASE_LABELS: Record<HoldemState['phase'], string> = {
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  'hand-over': '本手结束',
  'session-over': '牌局结束',
};
const DIFFICULTY_LABELS: Record<HoldemDifficulty, string> = {
  easy: '简单',
  standard: '标准',
  hard: '困难',
};
const OPPONENT_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const DIFFICULTIES: HoldemDifficulty[] = ['easy', 'standard', 'hard'];

type SeatPoint = readonly [x: number, y: number];
type OrbitSeatStyle = CSSProperties & {
  '--seat-x': string;
  '--seat-y': string;
};

const OPPONENT_LAYOUTS: Record<number, readonly SeatPoint[]> = {
  1: [[50, 12]],
  2: [[32, 12], [68, 12]],
  3: [[21, 20], [50, 12], [79, 20]],
  4: [[9.5, 38], [38, 10], [62, 10], [90.5, 38]],
  5: [[9, 39], [21, 20], [50, 10], [79, 20], [91, 39]],
  6: [[10, 48], [20, 20], [40, 10], [60, 10], [80, 20], [90, 48]],
  7: [[12, 59], [9, 40], [21, 18], [50, 10], [79, 18], [91, 40], [88, 59]],
  8: [[12, 59], [9, 40], [20, 19], [39, 10], [61, 10], [80, 19], [91, 40], [88, 59]],
};

type SaveState = 'opening' | 'saved' | 'restored' | 'memory';

function formatChips(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function cardRank(card: string) {
  return card[0] === 'T' ? '10' : card[0];
}

function PokerCard({
  card,
  hidden = false,
  placeholder = false,
  compact = false,
}: {
  card?: string;
  hidden?: boolean;
  placeholder?: boolean;
  compact?: boolean;
}) {
  if (placeholder || !card) {
    return <span className={`poker-card is-empty${compact ? ' is-compact' : ''}`} aria-hidden="true" />;
  }
  if (hidden) {
    return (
      <span
        className={`poker-card is-back${compact ? ' is-compact' : ''}`}
        role="img"
        aria-label="暗牌"
      >
        <i aria-hidden="true">R</i>
      </span>
    );
  }
  const suit = card[1] as keyof typeof SUIT_LABELS;
  const red = suit === 'h' || suit === 'd';
  return (
    <span
      className={`poker-card${red ? ' is-red' : ''}${compact ? ' is-compact' : ''}`}
      role="img"
      aria-label={`${SUIT_NAMES[suit]}${cardRank(card)}`}
    >
      <b>{cardRank(card)}</b>
      <i aria-hidden="true">{SUIT_LABELS[suit]}</i>
      <small aria-hidden="true">{SUIT_LABELS[suit]}</small>
    </span>
  );
}

function seatMarks(game: HoldemState, index: number) {
  const marks: Array<{ short: string; long: string }> = [];
  if (index === game.dealerIndex) marks.push({ short: 'D', long: '庄家' });
  if (index === game.smallBlindIndex) marks.push({ short: 'SB', long: '小盲' });
  if (index === game.bigBlindIndex) marks.push({ short: 'BB', long: '大盲' });
  return marks;
}

function opponentSeatStyle(count: number, index: number): OrbitSeatStyle {
  const point = OPPONENT_LAYOUTS[count]?.[index] ?? OPPONENT_LAYOUTS[1][0];
  return {
    '--seat-x': `${point[0]}%`,
    '--seat-y': `${point[1]}%`,
  };
}

function SeatAvatar({ player }: { player: HoldemPlayer }) {
  return (
    <span className="seat-avatar" data-avatar={player.id} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PlayerSeat({
  player,
  game,
  index,
  hero = false,
  style,
}: {
  player: HoldemPlayer;
  game: HoldemState;
  index: number;
  hero?: boolean;
  style?: CSSProperties;
}) {
  const active = game.actorIndex === index && ACTIVE_PHASES.has(game.phase);
  const reveal = hero || (game.showdown && !player.folded);
  return (
    <section
      className={`holdem-seat seat-${player.id}${active ? ' is-acting' : ''}${player.folded ? ' is-folded' : ''}${player.allIn ? ' is-all-in' : ''}`}
      aria-label={`${player.name}，筹码 ${player.stack}`}
      style={style}
    >
      <header>
        <SeatAvatar player={player} />
        <div className="seat-meta">
          <div className="seat-name-line">
            <strong>{player.name}</strong>
          </div>
          <span className="seat-stack"><i aria-hidden="true" />{formatChips(player.stack)}</span>
        </div>
        <span className="seat-marks">
          {seatMarks(game, index).map((mark) => (
            <abbr key={mark.short} title={mark.long}>{mark.short}</abbr>
          ))}
        </span>
      </header>
      <div className="seat-cards" aria-label={`${player.name}的手牌`}>
        {player.cards.map((card, cardIndex) => (
          <PokerCard key={`${card}-${cardIndex}`} card={card} hidden={!reveal} compact={!hero} />
        ))}
      </div>
      <footer>
        {player.folded ? <span>已弃牌</span> : player.allIn ? <span>全下</span> : player.streetBet > 0 ? <span>本轮 {formatChips(player.streetBet)}</span> : <span>{active ? '行动中' : '等待'}</span>}
      </footer>
    </section>
  );
}

function legalByType(actions: HoldemLegalAction[], type: HoldemAction['type']) {
  return actions.find((action) => action.type === type);
}

function fallbackAiAction(actions: HoldemLegalAction[]): HoldemAction | null {
  if (legalByType(actions, 'check')) return { type: 'check' };
  if (legalByType(actions, 'call')) return { type: 'call' };
  if (legalByType(actions, 'fold')) return { type: 'fold' };
  if (legalByType(actions, 'all-in')) return { type: 'all-in' };
  return null;
}

function clampRaise(value: number, option: HoldemLegalAction) {
  return Math.max(option.minTo ?? 0, Math.min(option.maxTo ?? 0, Math.round(value / 10) * 10));
}

export function HoldemTable() {
  const [game, setGame] = useState<HoldemState>(() => createHoldemGame(20260829, {
    playerCount: 3,
    difficulty: 'standard',
  }));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('opening');
  const [inputLocked, setInputLocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPlayerCount, setDraftPlayerCount] = useState<HoldemPlayerCount>(3);
  const [draftDifficulty, setDraftDifficulty] = useState<HoldemDifficulty>('standard');
  const actionLockRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);
  const lastSavedHandRef = useRef(0);
  const gameRef = useRef(game);
  const playerProgress = usePlayerProgress();
  const saveProgress = playerProgress.saveProgress;

  const actor = game.actorIndex === null ? null : game.players[game.actorIndex];
  const hero = game.players[0];
  const heroTurn = actor?.id === 'hero' && ACTIVE_PHASES.has(game.phase);
  const aiThinking = actor && actor.id !== 'hero' && ACTIVE_PHASES.has(game.phase) ? actor.name : '';
  const legalActions = useMemo(
    () => (heroTurn ? getHoldemLegalActions(game, 'hero') : []),
    [game, heroTurn],
  );
  const foldAction = legalByType(legalActions, 'fold');
  const checkAction = legalByType(legalActions, 'check');
  const callAction = legalByType(legalActions, 'call');
  const raiseAction = legalByType(legalActions, 'raise');
  const allInAction = legalByType(legalActions, 'all-in');

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const normalized = normalizeHoldemState(JSON.parse(stored));
          if (normalized.ok) {
            setGame(normalized.value);
            setSaveState('restored');
          } else {
            setSaveState('saved');
          }
        } else {
          setSaveState('saved');
        }
      } catch {
        setSaveState('memory');
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let memoryTimer: number | undefined;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {
      memoryTimer = window.setTimeout(() => setSaveState('memory'), 0);
    }
    return () => {
      if (memoryTimer !== undefined) window.clearTimeout(memoryTimer);
    };
  }, [game, ready]);

  useEffect(() => {
    if (!ready || !playerProgress.ready || game.phase !== 'hand-over' || lastSavedHandRef.current === game.handNumber) return;
    lastSavedHandRef.current = game.handNumber;
    saveProgress('holdem', Math.min(99, game.handNumber), hero.stack);
  }, [game.handNumber, game.phase, hero.stack, playerProgress.ready, ready, saveProgress]);

  useEffect(() => {
    if (!ready || !actor || actor.id === 'hero' || !ACTIVE_PHASES.has(game.phase)) return undefined;
    const actorId = actor.id;
    const delay = getHoldemAiThinkDelay(game.difficulty, game.aiSeed);
    const timer = window.setTimeout(() => {
      setGame((current) => {
        const currentActor = current.actorIndex === null ? null : current.players[current.actorIndex];
        if (!currentActor || currentActor.id !== actorId) return current;
        try {
          const action = chooseHoldemAiAction(current);
          setNotice('');
          return applyHoldemAction(current, action);
        } catch {
          try {
            const fallback = fallbackAiAction(getHoldemLegalActions(current, currentActor.id));
            if (!fallback) throw new Error('No safe AI fallback');
            setNotice(`${currentActor.name} 使用保底行动`);
            return applyHoldemAction(current, fallback);
          } catch {
            setNotice('牌局暂停，请重新开桌');
            return current;
          }
        }
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [actor, game.aiSeed, game.difficulty, game.phase, ready]);

  useEffect(() => {
    function receiveWechatBonus() {
      const next = grantHoldemChips(gameRef.current, HOLDEM_WECHAT_BONUS);
      gameRef.current = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        setSaveState('memory');
      }
      setGame(next);
      setNotice('到账 100,000');
      navigator.vibrate?.([10, 35, 10]);
    }
    window.addEventListener(SITE_WECHAT_ACTION_EVENT, receiveWechatBonus);
    return () => window.removeEventListener(SITE_WECHAT_ACTION_EVENT, receiveWechatBonus);
  }, []);

  useEffect(() => () => {
    if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
  }, []);

  function unlockInputSoon() {
    if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      actionLockRef.current = false;
      setInputLocked(false);
    }, 260);
  }

  function performAction(action: HoldemAction) {
    if (actionLockRef.current || !heroTurn) return;
    actionLockRef.current = true;
    setInputLocked(true);
    setRaiseOpen(false);
    setGame((current) => {
      try {
        setNotice('');
        return applyHoldemAction(current, action);
      } catch {
        setNotice('这一手已经过去了');
        return current;
      }
    });
    navigator.vibrate?.(8);
    unlockInputSoon();
  }

  function openRaiseSheet() {
    if (!raiseAction || inputLocked) return;
    setRaiseTo(raiseAction.minTo ?? 0);
    setRaiseOpen(true);
  }

  function startNextHand() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setNotice('');
    setGame((current) => startNextHoldemHand(current));
    unlockInputSoon();
  }

  function restartSession() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setNotice('');
    setRaiseOpen(false);
    setGame(createHoldemGame(Date.now(), {
      playerCount: game.playerCount,
      difficulty: game.difficulty,
    }));
    unlockInputSoon();
  }

  function openSettings() {
    setDraftPlayerCount(game.playerCount);
    setDraftDifficulty(game.difficulty);
    setSettingsOpen(true);
  }

  function applySettings() {
    const bankroll = Math.max(20, hero.stack + hero.totalBet);
    const stacks = Array.from({ length: draftPlayerCount }, (_, index) => (index === 0 ? bankroll : 1_000));
    const next = createHoldemGame(Date.now(), {
      playerCount: draftPlayerCount,
      difficulty: draftDifficulty,
      stacks,
    });
    gameRef.current = next;
    setGame(next);
    setNotice('新桌已开');
    setRaiseOpen(false);
    setSettingsOpen(false);
  }

  const statusText = notice
    || (game.phase === 'hand-over'
      ? game.resultText
      : game.phase === 'session-over'
        ? game.resultText
        : aiThinking
          ? `${aiThinking} 正在思考`
          : heroTurn
            ? '轮到你'
            : '正在发牌');
  const lastLog = game.log.at(-1) ?? '牌桌已准备';
  const halfPotRaise = raiseAction ? clampRaise(game.currentBet + Math.max(game.minRaise, Math.floor(game.pot * 0.5)), raiseAction) : 0;
  const potRaise = raiseAction ? clampRaise(game.currentBet + Math.max(game.minRaise, game.pot), raiseAction) : 0;

  if (!ready) {
    return (
      <main className="holdem-room is-opening" data-holdem-table>
        <div className="holdem-opening-mark" aria-hidden="true"><span>R</span></div>
        <p>正在开桌</p>
      </main>
    );
  }

  return (
    <main className="holdem-room" data-holdem-table>
      <header className="holdem-room-header">
        <div className="holdem-room-title">
          <span>PRIVATE TABLE</span>
          <h1>德州</h1>
          <p>求你爸爸，给你多点筹码。</p>
        </div>
        <button type="button" className="holdem-settings-trigger" onClick={openSettings} aria-haspopup="dialog">
          <span>{game.playerCount - 1} 位对手 · {DIFFICULTY_LABELS[game.difficulty]}</span>
          <small>{PHASE_LABELS[game.phase]} · {String(game.handNumber).padStart(2, '0')}</small>
        </button>
      </header>

      <section className="holdem-table" aria-label={`${game.playerCount}人德州牌桌`}>
        <div className="holdem-table-inlay" aria-hidden="true" />
        <div className="holdem-opponents" data-count={game.players.length - 1}>
          {game.players.slice(1).map((player, offset) => (
            <PlayerSeat
              key={player.id}
              player={player}
              game={game}
              index={offset + 1}
              style={opponentSeatStyle(game.players.length - 1, offset)}
            />
          ))}
        </div>

        <div className="holdem-center">
          <div className="holdem-pot" aria-label={`底池 ${game.pot}`}>
            <span>底池</span>
            <strong><i aria-hidden="true" />{formatChips(game.pot)}</strong>
          </div>
          <div className="holdem-board" aria-label="公共牌">
            {Array.from({ length: 5 }, (_, index) => (
              <PokerCard key={index} card={game.board[index]} placeholder={!game.board[index]} />
            ))}
          </div>
          <div className="holdem-turn" role="status" aria-live="polite">
            <strong>{statusText}</strong>
            <span>{lastLog}</span>
          </div>
        </div>

        <PlayerSeat player={hero} game={game} index={0} hero />
      </section>

      {game.phase === 'hand-over' ? (
        <section className="holdem-result-actions" aria-label="本手结果">
          {game.hands.hero && !hero.folded && <span>{game.hands.hero.label}</span>}
          <button type="button" onClick={startNextHand} disabled={inputLocked}>下一手</button>
        </section>
      ) : game.phase === 'session-over' ? (
        <section className="holdem-result-actions" aria-label="牌局结果">
          <span>本轮筹码已用完</span>
          <button type="button" onClick={restartSession} disabled={inputLocked}>重新开桌</button>
        </section>
      ) : (
        <section className="holdem-actions" aria-label="下注操作">
          {foldAction && <button type="button" className="is-quiet" onClick={() => performAction({ type: 'fold' })} disabled={!heroTurn || inputLocked}>弃牌</button>}
          {checkAction && <button type="button" onClick={() => performAction({ type: 'check' })} disabled={!heroTurn || inputLocked}>过牌</button>}
          {callAction && <button type="button" onClick={() => performAction({ type: 'call' })} disabled={!heroTurn || inputLocked}>跟注 <b>{formatChips(callAction.amount ?? 0)}</b></button>}
          {raiseAction && <button type="button" className="is-gold" onClick={openRaiseSheet} disabled={!heroTurn || inputLocked}>加注</button>}
          {allInAction && <button type="button" className="is-quiet" onClick={() => performAction({ type: 'all-in' })} disabled={!heroTurn || inputLocked}>全下</button>}
          {!heroTurn && <div className="holdem-waiting" aria-hidden="true"><i /><i /><i /></div>}
        </section>
      )}

      <details className="holdem-log">
        <summary>
          <span>行动记录</span>
          <small>{game.log.length} 条 · {saveState === 'memory' ? '仅本局' : saveState === 'restored' ? '已恢复' : '已保存'}</small>
        </summary>
        <ol>
          {game.log.map((entry, index) => <li key={`${index}-${entry}`}><span>{String(index + 1).padStart(2, '0')}</span>{entry}</li>)}
        </ol>
      </details>

      {raiseOpen && raiseAction && (
        <div className="raise-layer" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setRaiseOpen(false);
        }}>
          <section className="raise-sheet" role="dialog" aria-modal="true" aria-labelledby="raise-title">
            <header>
              <div><span>RAISE TO</span><h2 id="raise-title">加注至 {formatChips(raiseTo)}</h2></div>
              <button type="button" aria-label="关闭加注面板" onClick={() => setRaiseOpen(false)}>×</button>
            </header>
            <input
              type="range"
              aria-label="加注筹码"
              min={raiseAction.minTo}
              max={raiseAction.maxTo}
              step={10}
              value={raiseTo}
              onChange={(event) => setRaiseTo(Number(event.target.value))}
            />
            <div className="raise-presets">
              <button type="button" className={raiseTo === raiseAction.minTo ? 'is-selected' : ''} onClick={() => setRaiseTo(raiseAction.minTo ?? 0)}>最小<b>{formatChips(raiseAction.minTo ?? 0)}</b></button>
              <button type="button" className={raiseTo === halfPotRaise ? 'is-selected' : ''} onClick={() => setRaiseTo(halfPotRaise)}>半池<b>{formatChips(halfPotRaise)}</b></button>
              <button type="button" className={raiseTo === potRaise ? 'is-selected' : ''} onClick={() => setRaiseTo(potRaise)}>一池<b>{formatChips(potRaise)}</b></button>
              <button type="button" onClick={() => performAction({ type: 'all-in' })}>全下<b>{formatChips(hero.streetBet + hero.stack)}</b></button>
            </div>
            <button type="button" className="raise-confirm" onClick={() => performAction({ type: 'raise', raiseTo })} disabled={inputLocked}>确认加注</button>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="holdem-settings-layer" role="presentation" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSettingsOpen(false);
        }}>
          <section className="holdem-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="holdem-settings-title">
            <header>
              <div><span>TABLE SETUP</span><h2 id="holdem-settings-title">牌桌设置</h2></div>
              <button type="button" aria-label="关闭设置" onClick={() => setSettingsOpen(false)}>×</button>
            </header>
            <fieldset>
              <legend>对手人数</legend>
              <div className="holdem-choice-grid is-players">
                {OPPONENT_COUNTS.map((opponentCount) => {
                  const totalPlayers = (opponentCount + 1) as HoldemPlayerCount;
                  return (
                    <button key={opponentCount} type="button" className={draftPlayerCount === totalPlayers ? 'is-selected' : ''} onClick={() => setDraftPlayerCount(totalPlayers)}>
                      <b>{opponentCount}</b><span>名</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend>难度</legend>
              <div className="holdem-choice-grid">
                {DIFFICULTIES.map((difficulty) => (
                  <button key={difficulty} type="button" className={draftDifficulty === difficulty ? 'is-selected' : ''} onClick={() => setDraftDifficulty(difficulty)}>
                    {DIFFICULTY_LABELS[difficulty]}
                  </button>
                ))}
              </div>
            </fieldset>
            <p>切换后从新的一手开始，现有筹码保留。</p>
            <button type="button" className="holdem-settings-confirm" onClick={applySettings}>应用并开新桌</button>
          </section>
        </div>
      )}
    </main>
  );
}
