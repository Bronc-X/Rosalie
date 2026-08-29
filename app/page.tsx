/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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
import { gsap, useGSAP } from '@/lib/gsap-client';

const HomeLetterNotes = dynamic(
  () => import('./home-letter-notes').then((module) => module.HomeLetterNotes),
  {
    ssr: false,
    loading: () => (
      <div className="home-letter-notes">
        <button type="button" className="letter-discussion-bar" disabled>
          <span className="letter-discussion-icon" aria-hidden="true"><i className="letter-note-glyph" /></span>
          <span><strong>写旁注</strong><small>正在打开</small></span>
          <b>稍候</b>
        </button>
      </div>
    ),
  },
);

type TapParticle = {
  id: number;
  kind: 'blossom' | 'charm';
  x: number;
  y: number;
  rotation: number;
};

const HOME_LETTER_PARAGRAPHS = [
  '日历你要加上，我在期待你会在里头增加什么；但一页一页地翻，总会翻到这一天。',
  '离别既然这样要紧，总该事先有一点声响。其实未必。它常常就站在欢笑的背后，等人一回头，才肯让人看见。我们太恰如其分地快乐，于是忽略了它，也忘了替后来预备些什么。',
  '快乐的时光短。这话说得太多，几乎已经不像一句真话了。可它是真的。更短的还不是那些日子，是回味。许多事情刚刚发生，还没来得及看清，便已经成了从前。',
  '不过，消散并不等于没有发生。一起笑过的事，那些疯野的念头，你都肯陪我去做，它们便不会真的丢失。人能做的，大约也只是把美好记住，一笔一画地篆刻下来，再安静地陈放在那里。',
  '我们还有许多事情没有一起经历。可我只要轻轻抬头，眉间一动，便能想起你的神情，想起你的一颦一笑。一个人能被另一个人这样记住，想到这里，足矣~',
] as const;

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
  const [notesReady, setNotesReady] = useState(false);
  const nextTapParticleId = useRef(0);
  const pageRef = useRef<HTMLElement>(null);
  const state = getCountdownState(now);
  const time = splitDuration(state.remainingMs);
  const isReunited = state.phase === 'reunited';
  const controllerSource = controllerAsset(controllerChoice);
  const controllerTone = controllerPaletteFilter(controllerPalette);
  const selectedController = CONTROLLER_CHOICES.find((choice) => choice.id === controllerChoice) ?? CONTROLLER_CHOICES[0];
  const sceneStyle = {
    '--toni-shift': `${state.progress * 16}%`,
    '--rosalie-shift': `${state.progress * -16}%`,
    '--progress': state.progress,
    '--thread-width': `${64 - state.progress * 10}%`,
    '--controller-tone': controllerTone,
  } as CSSProperties;

  useGSAP(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
      entrance
        .fromTo('.home-hidden-trigger', { autoAlpha: 0, y: -12 }, {
          autoAlpha: 1,
          y: 0,
          duration: .52,
          ease: 'power4.out',
          clearProps: 'opacity,visibility,transform',
        })
        .from('.intro > *', { autoAlpha: 0, y: 8, stagger: .06, duration: .4 }, '-=.28')
        .from('.person-toni .character, .person-toni h2', {
          autoAlpha: 0,
          x: -24,
          stagger: .05,
          duration: .72,
          ease: 'expo.out',
        }, .18)
        .from('.person-rosalie .character, .person-rosalie h2', {
          autoAlpha: 0,
          x: 24,
          stagger: .05,
          duration: .72,
          ease: 'expo.out',
        }, .24)
        .from('.closing-thread', { autoAlpha: 0, scaleX: .72, duration: .52 }, .34);

      gsap.to('.person-toni .character', {
        y: -3,
        rotation: -1.2,
        duration: 2.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      gsap.to('.person-rosalie .character', {
        y: -4,
        rotation: 1.3,
        duration: 3.1,
        delay: .55,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      const pull = gsap.timeline({ repeat: -1, repeatDelay: 6.4, delay: 2.8 });
      pull
        .to('.person-toni .character', { x: 5, rotation: 1, duration: .4, ease: 'sine.inOut' })
        .to('.person-rosalie .character', { x: -5, rotation: -1, duration: .4, ease: 'sine.inOut' }, '<')
        .to('.closing-thread', { scaleX: .95, duration: .4, ease: 'sine.inOut' }, '<')
        .to('.thread-center', { scale: 1.34, duration: .34, ease: 'back.out(2)' }, '<')
        .to('.person-toni .character, .person-rosalie .character', { x: 0, duration: .58, ease: 'power2.out' })
        .to('.closing-thread', { scaleX: 1, duration: .58, ease: 'power2.out' }, '<')
        .to('.thread-center', { scale: 1, duration: .42, ease: 'power2.out' }, '<');

      const cleanups: Array<() => void> = [];
      const disclosures = root.querySelectorAll<HTMLDetailsElement>('.home-hidden-drawer, .countdown-drawer');
      disclosures.forEach((details) => {
        const summary = details.querySelector<HTMLElement>(':scope > summary');
        const panel = details.classList.contains('home-hidden-drawer')
          ? details.querySelector<HTMLElement>(':scope > .home-hidden-panel')
          : details.querySelector<HTMLElement>(':scope > .countdown');
        if (!summary || !panel) return;

        const handleToggle = () => {
          if (!details.open) return;
          gsap.killTweensOf(panel);
          const timeline = gsap.timeline();
          timeline
            .fromTo(panel, {
              autoAlpha: 0,
              y: -12,
              clipPath: 'inset(0 0 100% 0 round 28px)',
              transformOrigin: '50% 0%',
            }, {
              autoAlpha: 1,
              y: 0,
              clipPath: 'inset(0 0 0% 0 round 28px)',
              duration: .42,
              ease: 'power4.out',
              clearProps: 'clipPath,opacity,visibility,transform',
            })
            .from(details.classList.contains('home-hidden-drawer')
              ? panel.querySelectorAll('.home-utility-bar > *, .release-note, .countdown-drawer')
              : panel.querySelectorAll('.reunion-copy, .time-unit, .tap-hint'), {
              autoAlpha: 0,
              y: 8,
              duration: .28,
              stagger: .035,
              ease: 'power3.out',
            }, .1);
        };

        const handleClick = (event: MouseEvent) => {
          if (!details.open) return;
          event.preventDefault();
          gsap.killTweensOf(panel);
          gsap.to(panel, {
            autoAlpha: 0,
            y: -10,
            duration: .22,
            ease: 'power2.in',
            onComplete: () => {
              details.open = false;
              gsap.set(panel, { clearProps: 'opacity,visibility,transform' });
            },
          });
        };

        details.addEventListener('toggle', handleToggle);
        summary.addEventListener('click', handleClick);
        cleanups.push(() => {
          details.removeEventListener('toggle', handleToggle);
          summary.removeEventListener('click', handleClick);
        });
      });

      const controller = root.querySelector<HTMLDetailsElement>('.controller-drawer');
      const controllerPanel = controller?.querySelector<HTMLElement>(':scope > .controller-popover');
      const openController = () => {
        if (!controller?.open || !controllerPanel) return;
        gsap.fromTo(controllerPanel, { autoAlpha: 0, y: -9 }, {
          autoAlpha: 1,
          y: 0,
          duration: .34,
          ease: 'power4.out',
          clearProps: 'opacity,visibility,transform',
        });
      };
      controller?.addEventListener('toggle', openController);
      cleanups.push(() => controller?.removeEventListener('toggle', openController));

      const letter = root.querySelector<HTMLElement>('.home-letter');
      const letterCopy = letter?.querySelectorAll(':scope > p');
      if (letter && letterCopy?.length) {
        gsap.set(letterCopy, { autoAlpha: 0, y: 14 });
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting) return;
          gsap.to(letterCopy, {
            autoAlpha: 1,
            y: 0,
            duration: .55,
            stagger: .08,
            ease: 'power3.out',
          });
          observer.disconnect();
        }, { threshold: .22 });
        observer.observe(letter);
        cleanups.push(() => observer.disconnect());
      }

      const pressSelector = '.home-hidden-trigger, .home-utility-bar a, .home-utility-bar summary, .countdown-drawer > summary, .letter-discussion-bar';
      const press = (event: PointerEvent) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(pressSelector);
        if (target) gsap.to(target, { y: 1, duration: .1, ease: 'power2.out' });
      };
      const release = (event: PointerEvent) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(pressSelector);
        if (target) {
          gsap.to(target, {
            y: 0,
            duration: .22,
            ease: 'power2.out',
            onComplete: () => gsap.set(target, { clearProps: 'transform' }),
          });
        }
      };
      root.addEventListener('pointerdown', press);
      root.addEventListener('pointerup', release);
      root.addEventListener('pointercancel', release);
      cleanups.push(() => {
        root.removeEventListener('pointerdown', press);
        root.removeEventListener('pointerup', release);
        root.removeEventListener('pointercancel', release);
      });

      return () => {
        cleanups.forEach((cleanup) => cleanup());
        if (controllerPanel) gsap.killTweensOf(controllerPanel);
      };
    });

    return () => {
      motion.revert();
    };
  }, { scope: pageRef });

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
    if ((event.target as HTMLElement).closest('.home-hidden-drawer, .home-letter, .home-letter-notes')) return;

    const id = nextTapParticleId.current++;
    setTapParticles((current) => [
      ...current.slice(-5),
      {
        id,
        kind: pickTapParticle(Math.random()),
        x: event.clientX,
        y: event.clientY,
        rotation: (id * 31) % 48 - 24,
      },
    ]);
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
      ref={pageRef}
      className={`reunion ${isReunited ? 'is-reunited' : ''}`}
      style={sceneStyle}
      onPointerDown={plantTapParticle}
    >
      <details className="home-hidden-drawer">
        <summary className="home-hidden-trigger" aria-label="首页隐藏栏">
          <img src={controllerSource} alt="" aria-hidden="true" />
          <span><strong>隐藏栏</strong><small>工具与倒计时</small></span>
          <i aria-hidden="true" />
        </summary>
        <div className="home-hidden-panel">
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

          <div className="release-note" role="note" aria-label={`${LATEST_RELEASE.date} 发布信息`}>
            <time dateTime={LATEST_RELEASE.date}>{LATEST_RELEASE.label}</time>
            <p>{LATEST_RELEASE.items.join('，')}</p>
          </div>

          <details className="countdown-drawer">
            <summary>
              <span>倒计时</span>
              <small>{isReunited ? '已结束' : '展开查看'}</small>
              <i aria-hidden="true" />
            </summary>
            <section className="countdown" aria-atomic="true">
              <p className="reunion-copy" aria-live="polite">
                {isReunited ? '已结束' : (
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
          </details>
        </div>
      </details>

      <header className="intro">
        <p className="whisper">多余的</p>
      </header>

      <section className="meeting-scene" aria-label="Toni 和 Rosalie 的十日倒计时">
        <div className="glow-arc" aria-hidden="true" />
        <div className="closing-thread" aria-hidden="true">
          <span className="thread-center" />
        </div>

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

      <section className="home-letter" aria-label="写给 Rosalie 的话">
        {HOME_LETTER_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      {notesReady ? <HomeLetterNotes /> : (
        <div className="home-letter-notes">
          <button type="button" className="letter-discussion-bar" onClick={() => setNotesReady(true)}>
            <span className="letter-discussion-icon" aria-hidden="true"><i className="letter-note-glyph" /></span>
            <span><strong>写旁注</strong><small>也可以回复</small></span>
            <b>打开</b>
          </button>
        </div>
      )}

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
