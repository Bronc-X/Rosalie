'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { COUNTDOWN_START, getCountdownState, splitDuration } from '@/lib/countdown.mjs';
import { WechatShare } from './wechat-share';

type TapHeart = {
  id: number;
  x: number;
  y: number;
  rotation: number;
};

export default function Home() {
  const [now, setNow] = useState(COUNTDOWN_START);
  const [hearts, setHearts] = useState<TapHeart[]>([]);
  const nextHeartId = useRef(0);
  const state = getCountdownState(now);
  const time = splitDuration(state.remainingMs);
  const isReunited = state.phase === 'reunited';
  const sceneStyle = {
    '--toni-position': `${7 + state.progress * 33}%`,
    '--rosalie-position': `${5 + state.progress * 33}%`,
    '--progress': state.progress,
  } as CSSProperties;

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main
      className={`reunion ${isReunited ? 'is-reunited' : ''}`}
      style={sceneStyle}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const id = nextHeartId.current++;
        setHearts((current) => [
          ...current.slice(-9),
          { id, x: event.clientX, y: event.clientY, rotation: (id * 29) % 36 - 18 },
        ]);
      }}
    >
      <WechatShare />

      <div className="aurora aurora-pink" aria-hidden="true" />
      <div className="aurora aurora-peach" aria-hidden="true" />
      <div className="sparkles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
      </div>
      <div className="falling-petals" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>

      <header className="intro">
        <p className="eyebrow">19 — 29 · AUGUST · 2026</p>
        <p className="whisper">有些距离，只需要交给时间</p>
      </header>

      <section className="meeting-scene" aria-label="Toni 和 Rosalie 正在随着倒计时逐渐靠近">
        <div className="glow-arc" aria-hidden="true" />
        <div className="orbit-dot orbit-dot-one" aria-hidden="true" />
        <div className="orbit-dot orbit-dot-two" aria-hidden="true" />

        <article className="person person-toni">
          <h2>Toni</h2>
          <div className="character potato" role="img" aria-label="一颗微笑的粉色土豆">
            <span className="potato-freckles" aria-hidden="true"><i /><i /><i /></span>
            <span className="face"><i /><i /><b /></span>
          </div>
        </article>

        <span className="meeting-heart" aria-hidden="true">♥</span>

        <article className="person person-rosalie">
          <h2>Rosalie</h2>
          <div className="character sakura" role="img" aria-label="一朵微笑的珊瑚色樱花">
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
          {isReunited ? '终于，时间把你带回我身边。' : '直到，再次相见'}
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
        <p className="tap-hint">轻触屏幕，让时间开一朵花</p>
      </section>

      {hearts.map((heart) => (
        <span
          aria-hidden="true"
          className="tap-heart"
          key={heart.id}
          style={{ left: heart.x, top: heart.y, '--rotation': `${heart.rotation}deg` } as CSSProperties}
          onAnimationEnd={() => setHearts((current) => current.filter((item) => item.id !== heart.id))}
        >
          ♥
        </span>
      ))}
    </main>
  );
}
