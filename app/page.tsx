/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';

import {
  CONTROLLER_CHOICES,
  CONTROLLER_PALETTES,
  CONTROLLER_PALETTE_STORAGE_KEY,
  CONTROLLER_STORAGE_KEY,
  controllerAsset,
  controllerPaletteFilter,
  resolveControllerChoice,
  resolveControllerPalette,
} from '@/lib/controller-choice.mjs';
import type { ControllerChoiceId, ControllerPaletteId } from '@/lib/controller-choice.mjs';
import { COUNTDOWN_START, getCountdownState, splitDuration } from '@/lib/countdown.mjs';
import { INTERVIEW_MODEL_LABEL } from '@/lib/interview-model.mjs';
import { LATEST_RELEASE } from '@/lib/site-ui.mjs';
import { pickTapParticle } from '@/lib/tap-particle.mjs';

type TapParticle = {
  id: number;
  kind: 'blossom' | 'charm';
  x: number;
  y: number;
  rotation: number;
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
  const [controllerChoice, setControllerChoice] = useState<ControllerChoiceId>('pull');
  const [controllerPalette, setControllerPalette] = useState<ControllerPaletteId>('original');
  const nextTapParticleId = useRef(0);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const state = getCountdownState(now);
  const time = splitDuration(state.remainingMs);
  const isReunited = state.phase === 'reunited';
  const controllerSource = controllerAsset(controllerChoice);
  const controllerTone = controllerPaletteFilter(controllerPalette);
  const selectedController = CONTROLLER_CHOICES.find((choice) => choice.id === controllerChoice) ?? CONTROLLER_CHOICES[0];
  const sceneStyle = {
    '--toni-position': `${7 + state.progress * 23}%`,
    '--rosalie-position': `${5 + state.progress * 24}%`,
    '--toni-mobile-position': `${7 + state.progress * 20}%`,
    '--rosalie-mobile-position': `${5 + state.progress * 22}%`,
    '--progress': state.progress,
    '--thread-width': `${52 - state.progress * 43}%`,
    '--controller-tone': controllerTone,
  } as CSSProperties;

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let storedChoice: string | null = null;
    let storedPalette: string | null = null;
    try {
      storedChoice = window.localStorage.getItem(CONTROLLER_STORAGE_KEY);
      storedPalette = window.localStorage.getItem(CONTROLLER_PALETTE_STORAGE_KEY);
    } catch { /* Use the default style. */ }
    const timer = window.setTimeout(() => {
      setControllerChoice(resolveControllerChoice(storedChoice));
      setControllerPalette(resolveControllerPalette(storedPalette));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function plantTapParticle(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.home-utility-bar')) return;

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

  function moveCursor(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !cursorRef.current) return;
    cursorRef.current.style.setProperty('--cursor-x', `${event.clientX}px`);
    cursorRef.current.style.setProperty('--cursor-y', `${event.clientY}px`);
    cursorRef.current.dataset.visible = 'true';
  }

  function selectController(id: ControllerChoiceId) {
    setControllerChoice(id);
    try { window.localStorage.setItem(CONTROLLER_STORAGE_KEY, id); } catch { /* The current selection still applies. */ }
    window.dispatchEvent(new CustomEvent('rosalie-controller-change', { detail: { id, palette: controllerPalette } }));
  }

  function selectControllerPalette(id: ControllerPaletteId) {
    setControllerPalette(id);
    try { window.localStorage.setItem(CONTROLLER_PALETTE_STORAGE_KEY, id); } catch { /* The current selection still applies. */ }
    window.dispatchEvent(new CustomEvent('rosalie-controller-change', { detail: { id: controllerChoice, palette: id } }));
  }

  return (
    <main
      className={`reunion ${isReunited ? 'is-reunited' : ''}`}
      style={sceneStyle}
      onPointerDown={plantTapParticle}
      onPointerMove={moveCursor}
      onPointerLeave={() => cursorRef.current?.removeAttribute('data-visible')}
    >
      <span className="custom-cursor" ref={cursorRef} aria-hidden="true">
        <i className="cursor-hotspot" />
        <img src={controllerSource} alt="" />
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
          <img src={controllerSource} alt="" key={index} />
        ))}
      </div>

      <header className="intro">
        <p className="whisper">从来都是负距离</p>
        <p className="home-date">2026.08.19 - 08.29</p>
        <div className="release-note" role="note" aria-label={`${LATEST_RELEASE.date} 发布信息`}>
          <time dateTime={LATEST_RELEASE.date}>{LATEST_RELEASE.label} 更新</time>
          <p>{LATEST_RELEASE.items.join('，')}</p>
        </div>
      </header>

      <nav className="home-utility-bar" aria-label="首页工具">
        <details className="controller-drawer">
          <summary>
            <img src={controllerSource} alt="" />
            <span>控制器</span>
            <i aria-hidden="true" />
          </summary>
          <div className="controller-popover">
            <div className="controller-options" role="radiogroup" aria-label="控制器样式">
              {CONTROLLER_CHOICES.map((choice) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={controllerChoice === choice.id}
                  className={`controller-choice ${controllerChoice === choice.id ? 'is-selected' : ''}`}
                  key={choice.id}
                  onClick={() => selectController(choice.id)}
                >
                  <img
                    src={choice.asset}
                    alt=""
                    style={{ '--preview-tone': controllerChoice === choice.id ? controllerTone : 'none' } as CSSProperties}
                  />
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
            <fieldset className="controller-palette">
              <legend>配色</legend>
              <div role="radiogroup" aria-label={`${selectedController.label}配色`}>
                {CONTROLLER_PALETTES.map((palette) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={controllerPalette === palette.id}
                    className={`palette-choice ${controllerPalette === palette.id ? 'is-selected' : ''}`}
                    key={palette.id}
                    onClick={() => selectControllerPalette(palette.id)}
                  >
                    <i style={{ background: `linear-gradient(135deg, ${palette.colors[0]}, ${palette.colors[1]})` }} aria-hidden="true" />
                    <span>{palette.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </details>

        <Link
          className="home-utility-link utility-interview"
          href="/interview"
          aria-label={`${INTERVIEW_MODEL_LABEL} 面试官 Agent`}
          title={`${INTERVIEW_MODEL_LABEL} 面试官 Agent`}
        >
          <span className="utility-interview-mark" aria-hidden="true"><i /><i /></span>
          <strong>{INTERVIEW_MODEL_LABEL.replace('GPT-', '')} 面试</strong>
        </Link>

        <Link className="home-utility-link utility-game" href="/play" aria-label="进入小游戏">
          <img src={controllerSource} alt="" aria-hidden="true" />
          <strong>游戏</strong>
        </Link>
      </nav>

      <section className="meeting-scene" aria-label="Toni 和 Rosalie 的十日倒计时">
        <div className="glow-arc" aria-hidden="true" />
        <div className="closing-thread" aria-hidden="true">
          <span className="thread-traveller traveller-toni" />
          <span className="thread-center" />
          <span className="thread-traveller traveller-rosalie" />
        </div>
        <span className="center-pull-ring" aria-hidden="true" />
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

      </section>

      <section className="countdown" aria-atomic="true">
        <p className="reunion-copy" aria-live="polite">
          {isReunited ? '已归队' : (
            <span className="countdown-copy-content">
              <span><span className="work-emphasis">干</span>活倒计时</span>
              <img className="countdown-charm" src={controllerSource} alt="" aria-hidden="true" />
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
              {index < 3 ? <i aria-hidden="true" /> : null}
            </span>
          ))}
        </div>
        <p className="tap-hint">戳屏幕</p>
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
            <img className="tap-charm" src={controllerSource} alt="" />
          )}
        </span>
      ))}
    </main>
  );
}
