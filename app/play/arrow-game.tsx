/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import {
  ARROW_GOAL,
  ARROW_MAX_ATTEMPTS,
  ARROW_TARGETS,
  beginArrowGame,
  createArrowGame,
  getArrowAimAngle,
  takeArrowShot,
} from '@/lib/arrow-game.mjs';
import type { ArrowJudge } from '@/lib/arrow-game.mjs';

type Flight = { id: number; angle: number; judge: ArrowJudge };

export function ArrowGame() {
  const [game, setGame] = useState(createArrowGame());
  const [aim, setAim] = useState(-38);
  const [flight, setFlight] = useState<Flight | null>(null);
  const startedAt = useRef(0);
  const flightId = useRef(0);
  const target = ARROW_TARGETS[game.targetIndex];

  useEffect(() => {
    startedAt.current = performance.now();
    const timer = window.setInterval(() => {
      setAim(getArrowAimAngle(performance.now() - startedAt.current));
    }, 32);
    return () => window.clearInterval(timer);
  }, []);

  function fire() {
    if (flight) return;
    if (game.status === 'won' || game.status === 'lost') {
      setGame(beginArrowGame());
      startedAt.current = performance.now();
      setAim(-38);
      return;
    }

    const active = game.status === 'idle' ? beginArrowGame() : game;
    const next = takeArrowShot(active, aim);
    const currentFlight = { id: flightId.current += 1, angle: aim, judge: next.shots.at(-1)?.judge ?? 'miss' };
    setFlight(currentFlight);
    window.setTimeout(() => {
      setGame(next);
      setFlight(null);
      if (currentFlight.judge === 'hit') startedAt.current = performance.now();
    }, 620);
  }

  function fireFromPointer(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    fire();
  }

  function fireFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    fire();
  }

  const copy = game.status === 'won'
    ? '三箭进洞，系统怀疑你蓄谋已久。'
    : game.status === 'lost'
      ? '箭有自己的想法，戳一下重新谈判。'
      : flight?.judge === 'hit'
        ? '这箭知道该去哪。'
        : flight
          ? '洞在装没看见。'
          : '等虚线对准小洞，戳屏幕。';

  return (
    <section className={`arrow-game arrow-${game.status} ${flight ? `arrow-flight-${flight.judge}` : ''}`} aria-labelledby="arrow-game-title">
      <div className="lab-game-heading">
        <p>ONE TAP · TINY HOLE</p>
        <h2 id="arrow-game-title">箭有箭的去处</h2>
        <span>方向会自己晃，你只负责在刚好的时候戳一下。</span>
      </div>

      <div
        className="arrow-stage"
        role="button"
        tabIndex={0}
        aria-label="点击屏幕，向小洞放箭"
        onPointerDown={fireFromPointer}
        onKeyDown={fireFromKeyboard}
        style={{ '--arrow-angle': `${aim}deg` } as CSSProperties}
      >
        <div className="arrow-hud">
          <span><b>{game.hits}</b> / {ARROW_GOAL} 洞</span>
          <span>{game.attempts} / {ARROW_MAX_ATTEMPTS} 箭</span>
        </div>

        <span
          className="arrow-hole"
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          aria-hidden="true"
        >
          <i />
          <b />
        </span>

        <span className="arrow-aim-guide" aria-hidden="true" />
        <div className="arrow-launcher" aria-hidden="true">
          <img src="/soft-pull-cursor.png" alt="" width={76} height={76} />
          <span>戳屏幕</span>
        </div>

        {flight ? (
          <span
            className="arrow-flight-path"
            key={flight.id}
            style={{ '--flight-angle': `${flight.angle}deg` } as CSSProperties}
            aria-hidden="true"
          >
            <i className="arrow-projectile">
              <img src="/soft-pull-cursor.png" alt="" />
              <b />
            </i>
          </span>
        ) : null}

        <div className="arrow-attempts" aria-hidden="true">
          {Array.from({ length: ARROW_MAX_ATTEMPTS }, (_, index) => {
            const shot = game.shots[index];
            return <i className={shot ? `arrow-mark-${shot.judge}` : ''} key={index}>↑</i>;
          })}
        </div>
        <p className="arrow-copy" aria-live="polite">{copy}</p>
      </div>
    </section>
  );
}

