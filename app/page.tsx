'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';

import { COUNTDOWN_START, getCountdownState, splitDuration } from '@/lib/countdown.mjs';
import { getDropChoice } from '@/lib/drag-choice.mjs';
import { INITIAL_INVITATION, respondToInvitation } from '@/lib/invitation.mjs';
import { pickTapParticle } from '@/lib/tap-particle.mjs';
import { WechatShare } from './wechat-share';

type TapParticle = {
  id: number;
  kind: 'blossom' | 'charm';
  x: number;
  y: number;
  rotation: number;
};

type CharmDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function BlossomShape({ className = '' }: { className?: string }) {
  return (
    <span className={`blossom-shape ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      <b />
    </span>
  );
}

export default function Home() {
  const [now, setNow] = useState(COUNTDOWN_START);
  const [tapParticles, setTapParticles] = useState<TapParticle[]>([]);
  const [invitation, setInvitation] = useState({ ...INITIAL_INVITATION });
  const [mobileCharmBurst, setMobileCharmBurst] = useState(0);
  const [isCharmDragging, setIsCharmDragging] = useState(false);
  const [dragOverChoice, setDragOverChoice] = useState<'yes' | 'no' | null>(null);
  const nextTapParticleId = useRef(0);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const mobileCharmRef = useRef<HTMLButtonElement>(null);
  const charmDragRef = useRef<CharmDrag | null>(null);
  const suppressCharmClickRef = useRef(false);
  const state = getCountdownState(now);
  const time = splitDuration(state.remainingMs);
  const isReunited = state.phase === 'reunited';
  const hasSaidYes = invitation.choice === 'yes';
  const sceneStyle = {
    '--toni-position': `${7 + state.progress * 33}%`,
    '--rosalie-position': `${5 + state.progress * 33}%`,
    '--progress': state.progress,
    '--thread-width': `${52 - state.progress * 43}%`,
  } as CSSProperties;

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  function plantTapParticle(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.invitation, .mobile-charm-stage, .game-entry')) return;

    const id = nextTapParticleId.current++;
    setTapParticles((current) => [
      ...current.slice(-9),
      {
        id,
        kind: pickTapParticle(Math.random()),
        x: event.clientX,
        y: event.clientY,
        rotation: (id * 31) % 48 - 24,
      },
    ]);
  }

  function choose(answer: 'yes' | 'no') {
    setInvitation((current) => respondToInvitation(current, answer));
  }

  function moveCursor(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !cursorRef.current) return;
    cursorRef.current.style.setProperty('--cursor-x', `${event.clientX}px`);
    cursorRef.current.style.setProperty('--cursor-y', `${event.clientY}px`);
    cursorRef.current.dataset.visible = 'true';
  }

  function getChoiceAt(x: number, y: number) {
    const yesButton = document.querySelector<HTMLButtonElement>('.yes-choice');
    const noButton = document.querySelector<HTMLButtonElement>('.no-choice');
    if (!yesButton || !noButton) return null;

    return getDropChoice(
      { x, y },
      { yes: yesButton.getBoundingClientRect(), no: noButton.getBoundingClientRect() },
    );
  }

  function resetCharmPosition() {
    mobileCharmRef.current?.style.setProperty('--drag-x', '0px');
    mobileCharmRef.current?.style.setProperty('--drag-y', '0px');
    mobileCharmRef.current?.removeAttribute('data-dragging');
    setIsCharmDragging(false);
    setDragOverChoice(null);
  }

  function startCharmDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;

    event.currentTarget.dataset.dragging = 'true';
    charmDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    suppressCharmClickRef.current = false;
    setIsCharmDragging(true);
  }

  function moveCharmDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = charmDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const x = event.clientX - drag.startX;
    const y = event.clientY - drag.startY;
    if (Math.hypot(x, y) > 6) drag.moved = true;

    mobileCharmRef.current?.style.setProperty('--drag-x', `${x}px`);
    mobileCharmRef.current?.style.setProperty('--drag-y', `${y}px`);
    const nextChoice = getChoiceAt(event.clientX, event.clientY);
    setDragOverChoice((current) => current === nextChoice ? current : nextChoice);
  }

  function finishCharmDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = charmDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const choice = drag.moved ? getChoiceAt(event.clientX, event.clientY) : null;
    suppressCharmClickRef.current = drag.moved;
    charmDragRef.current = null;
    resetCharmPosition();

    if (choice) {
      setMobileCharmBurst((current) => current + 1);
      choose(choice);
    }
  }

  function cancelCharmDrag(event: ReactPointerEvent<HTMLElement>) {
    if (charmDragRef.current?.pointerId !== event.pointerId) return;
    suppressCharmClickRef.current = true;
    charmDragRef.current = null;
    resetCharmPosition();
  }

  function tapMobileCharm() {
    if (suppressCharmClickRef.current) {
      suppressCharmClickRef.current = false;
      return;
    }
    setMobileCharmBurst((current) => current + 1);
  }

  const noLabel = invitation.noCount === 0
    ? '否'
    : invitation.noCount === 1
      ? '重新提交'
      : invitation.noCount === 2
        ? '继续申诉'
        : '我有异议';

  return (
    <main
      className={`reunion ${isReunited ? 'is-reunited' : ''} ${hasSaidYes ? 'has-said-yes' : ''} ${isCharmDragging ? 'is-dragging-charm' : ''} ${dragOverChoice ? `is-over-${dragOverChoice}` : ''}`}
      style={sceneStyle}
      onPointerDown={plantTapParticle}
      onPointerMove={(event) => {
        moveCursor(event);
        moveCharmDrag(event);
      }}
      onPointerUp={finishCharmDrag}
      onPointerCancel={cancelCharmDrag}
      onPointerLeave={() => cursorRef.current?.removeAttribute('data-visible')}
    >
      <WechatShare />

      <span className="custom-cursor" ref={cursorRef} aria-hidden="true">
        <i className="cursor-hotspot" />
        <img src="/soft-pull-cursor.png" alt="" />
      </span>

      <div className="aurora aurora-pink" aria-hidden="true" />
      <div className="aurora aurora-peach" aria-hidden="true" />
      <div className="sparkles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
      </div>
      <div className="falling-petals" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>
      <div className="falling-charms" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <img src="/soft-pull-cursor.png" alt="" key={index} />
        ))}
      </div>

      <header className="intro">
        <p className="eyebrow">19 — 29 · AUGUST · 2026</p>
        <p className="whisper">从来都是负距离，这次离得太遥远</p>
      </header>

      <section className="meeting-scene" aria-label="Toni 和 Rosalie 正在随着倒计时逐渐靠近">
        <div className="glow-arc" aria-hidden="true" />
        <div className="closing-thread" aria-hidden="true">
          <span className="thread-traveller traveller-toni" />
          <span className="thread-heart">♥</span>
          <span className="thread-traveller traveller-rosalie" />
        </div>
        <span className="center-pull-ring" aria-hidden="true" />
        <p className="closing-whisper" aria-hidden="true">
          <i className="pull-arrow pull-arrow-left">→</i>
          <span>抓紧拉扯</span>
          <i className="pull-arrow pull-arrow-right">←</i>
        </p>
        <div className="orbit-dot orbit-dot-one" aria-hidden="true" />
        <div className="orbit-dot orbit-dot-two" aria-hidden="true" />

        <article className="person person-toni">
          <h2>Toni</h2>
          <div className="character potato" role="img" aria-label="一颗微笑的蜂蜜色小土豆">
            <span className="potato-sprout" aria-hidden="true"><i /><i /></span>
            <span className="potato-freckles" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="face"><i /><i /><b /></span>
          </div>
        </article>

        <span className="meeting-heart" aria-hidden="true">♥</span>

        <article className="person person-rosalie">
          <h2>Rosalie</h2>
          <div className="character sakura" role="img" aria-label="一朵微笑的樱花粉小樱花">
            <span className="petal petal-1" />
            <span className="petal petal-2" />
            <span className="petal petal-3" />
            <span className="petal petal-4" />
            <span className="petal petal-5" />
            <span className="flower-core"><span className="face"><i /><i /><b /></span></span>
          </div>
        </article>

        {hasSaidYes ? (
          <div className="departure-burst" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <BlossomShape className="departure-blossom" key={index} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="countdown" aria-atomic="true">
        <p className="reunion-copy" aria-live="polite">
          {isReunited ? '系统提示：人员已归队。' : (
            <span className="countdown-copy-content">
              <span><span className="work-emphasis">干</span>活倒计时</span>
              <img className="countdown-charm" src="/soft-pull-cursor.png" alt="" aria-hidden="true" />
            </span>
          )}
        </p>
        <div className="time-grid" role="timer" aria-label={`${time.days}天${time.hours}小时${time.minutes}分${time.seconds}秒`}>
          {[
            ['天', time.days],
            ['时', time.hours],
            ['分', time.minutes],
            ['秒', time.seconds],
          ].map(([label, value], index) => (
            <span className="time-unit" key={label}>
              <strong>{Number(value).toString().padStart(2, '0')}</strong>
              <small>{label}</small>
              {index < 3 ? <i aria-hidden="true">·</i> : null}
            </span>
          ))}
        </div>
        <p className="tap-hint">戳屏幕看看</p>
        <div className="mobile-charm-stage">
          <button
            className="mobile-charm"
            type="button"
            ref={mobileCharmRef}
            aria-label="拖拽它去选择下面的选项，轻点会掉落彩蛋"
            onClick={tapMobileCharm}
            onPointerDown={startCharmDrag}
          >
            <img src="/soft-pull-cursor.png" alt="" />
            <span>{isCharmDragging ? '拖到按钮上松手' : '拖拽它去选择'}</span>
          </button>
          {mobileCharmBurst > 0 ? (
            <div className="mobile-charm-burst" key={mobileCharmBurst} aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <img src="/soft-pull-cursor.png" alt="" key={index} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Link className="game-entry" href="/play" aria-label="进入拉扯实验室，玩三个等待小游戏">
        <span className="game-entry-charm" aria-hidden="true">
          <img src="/soft-pull-cursor.png" alt="" />
        </span>
        <span className="game-entry-copy">
          <small>WAITING ROOM · 3 GAMES</small>
          <strong>进去玩点没用的</strong>
          <em>首页不负责这些。</em>
        </span>
        <i aria-hidden="true">↗</i>
      </Link>

      <section
        className={`invitation no-step-${Math.min(invitation.noCount, 4)}`}
        aria-labelledby="invitation-title"
        key={`invitation-${invitation.noCount}-${invitation.choice}`}
      >
        <BlossomShape className="invitation-seal" />
        <p className="invitation-kicker">PENDING APPROVAL</p>
        <h2 id="invitation-title">{invitation.message}</h2>

        {hasSaidYes ? (
          <div className="yes-result" aria-live="polite">
            <div className="departure-route" aria-hidden="true"><i /><span>♥</span><i /></div>
            <p>本次申请无需审批，到点自动执行。</p>
          </div>
        ) : (
          <>
            <div className="choice-row">
              <div className="yes-wrap">
                {invitation.noCount > 0 ? (
                  <span className="yes-arrow" aria-hidden="true">
                    <em>正确选项在这</em>
                    <svg viewBox="0 0 58 38">
                      <path d="M3 4c20 0 33 7 39 23" />
                      <path d="m35 23 8 5 2-10" />
                    </svg>
                  </span>
                ) : null}
                <button className="yes-choice" type="button" onClick={() => choose('yes')}>是</button>
              </div>
              <button className="no-choice" type="button" onClick={() => choose('no')}>
                {noLabel}
                {invitation.noCount >= 2 ? <BlossomShape className="no-button-blossom" /> : null}
              </button>
            </div>
            <p className="invitation-reason" aria-live="polite">
              {invitation.reason ?? '这是一个没有 KPI 的确认项。'}
            </p>
          </>
        )}
      </section>

      {tapParticles.map((particle) => (
        <span
          aria-hidden="true"
          className={`tap-particle-anchor tap-${particle.kind}-anchor`}
          key={particle.id}
          style={{ left: particle.x, top: particle.y, '--rotation': `${particle.rotation}deg` } as CSSProperties}
          onAnimationEnd={() => setTapParticles((current) => current.filter((item) => item.id !== particle.id))}
        >
          {particle.kind === 'blossom' ? (
            <BlossomShape className="tap-blossom" />
          ) : (
            <img className="tap-charm" src="/soft-pull-cursor.png" alt="" />
          )}
        </span>
      ))}
    </main>
  );
}
