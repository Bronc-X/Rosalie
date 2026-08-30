'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarDots,
  ChatCircleText,
  GameController,
  House,
  MapPinLine,
  MicrophoneStage,
  MoonStars,
  SunDim,
  WechatLogo,
} from '@phosphor-icons/react';

import {
  getShareMode,
  isPrimaryNavActive,
  nextTheme,
  PRIMARY_NAV,
  resolveTheme,
  THEME_STORAGE_KEY,
} from '@/lib/site-ui.mjs';
import type { SiteTheme } from '@/lib/site-ui.mjs';
import { HOLDEM_WECHAT_BONUS, SITE_WECHAT_ACTION_EVENT } from '@/lib/holdem-ui.mjs';

const SHARE_PAYLOAD = {
  title: '祝你成功喝到嘉士伯',
  text: '点开，时间会告诉你答案。',
  url: 'https://rosalie.toni.asia/',
};

const HOLDEM_SHARE_PAYLOAD = {
  title: '求你爸爸，给你多点筹码',
  text: '点开微信，给我多点筹码。',
  url: 'https://rosalie.toni.asia/play/holdem',
};

const NTO_SHARE_PAYLOAD = {
  title: 'Toni & Rosalie NTO',
  text: '想留下的记忆。',
  url: 'https://rosalie.toni.asia/experiences',
};

function NavIcon({ label }: { label: string }) {
  const props = { 'aria-hidden': true, size: 23, weight: 'regular' as const };
  if (label === '首页') return <House {...props} />;
  if (label === '留言') return <ChatCircleText {...props} />;
  if (label === '面试') return <MicrophoneStage {...props} />;
  if (label === '日历') return <CalendarDots {...props} />;
  if (label === 'NTO') return <MapPinLine {...props} />;
  return <GameController {...props} />;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

export function SiteChrome() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<SiteTheme>('light');
  const [shareNotice, setShareNotice] = useState('');

  useEffect(() => {
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = resolveTheme(document.documentElement.dataset.theme, preferred);
    document.documentElement.dataset.theme = current;
    const frame = window.requestAnimationFrame(() => setTheme(current));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!shareNotice) return undefined;
    const timer = window.setTimeout(() => setShareNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  if (pathname === '/unlock') return null;
  const isGameDetail = pathname.startsWith('/play/');
  const isHoldem = pathname === '/play/holdem';
  const isExperience = pathname === '/calendar' || pathname.startsWith('/calendar/')
    || pathname === '/experiences' || pathname.startsWith('/experiences/');
  const showQuickActions = !isExperience && (!isGameDetail || isHoldem);
  const sharePayload = isHoldem ? HOLDEM_SHARE_PAYLOAD : isExperience ? NTO_SHARE_PAYLOAD : SHARE_PAYLOAD;
  const activeIndex = PRIMARY_NAV.findIndex((item) => isPrimaryNavActive(pathname, item.href));

  function toggleTheme() {
    const value = nextTheme(theme);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    setTheme(value);
  }

  async function shareToWechat() {
    const bonusPrefix = isHoldem ? '到账 100,000，' : '';
    if (isHoldem) {
      window.dispatchEvent(new CustomEvent(SITE_WECHAT_ACTION_EVENT, {
        detail: { amount: HOLDEM_WECHAT_BONUS },
      }));
      setShareNotice('到账 100,000');
    }
    const mode = getShareMode({
      userAgent: navigator.userAgent,
      canNativeShare: typeof navigator.share === 'function',
    });

    if (mode === 'wechat-menu') {
      setShareNotice(`${bonusPrefix}点右上角分享`);
      return;
    }

    if (mode === 'wechat-launch') {
      void copyText(sharePayload.url);
      setShareNotice(`${bonusPrefix}链接已复制，正在打开微信`);
      window.location.href = 'weixin://';
      return;
    }

    if (mode === 'native-share') {
      try {
        await navigator.share(sharePayload);
        setShareNotice(`${bonusPrefix}已打开分享`);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    const copied = await copyText(sharePayload.url);
    setShareNotice(`${bonusPrefix}${copied ? '链接已复制' : '请从地址栏分享'}`);
  }

  return (
    <>
      {showQuickActions && <div className="site-quick-actions" aria-label={isHoldem ? '微信筹码' : '页面显示与分享'}>
        {!isGameDetail && <button type="button" onClick={toggleTheme} aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}模式`}>
          {theme === 'light' ? <MoonStars aria-hidden="true" /> : <SunDim aria-hidden="true" />}
          <b>{theme === 'light' ? '深色' : '浅色'}</b>
        </button>}
        <button type="button" className="site-wechat-action" aria-label={isHoldem ? '微信求筹码并领取十万' : '微信分享'} onClick={() => void shareToWechat()}>
          <WechatLogo aria-hidden="true" />
          <b>{isHoldem ? '求筹码' : '微信'}</b>
        </button>
      </div>}

      <nav className={`site-dock${isExperience ? ' is-experience' : ''}`} data-active-index={Math.max(0, activeIndex)} aria-label="主要功能">
        <span className="site-dock-indicator" aria-hidden="true" />
        {PRIMARY_NAV.map((item) => {
          const active = isPrimaryNavActive(pathname, item.href);
          return (
            <Link href={item.href} key={item.href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
              <NavIcon label={item.label} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`site-share-toast${shareNotice ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {shareNotice}
      </div>
    </>
  );
}
