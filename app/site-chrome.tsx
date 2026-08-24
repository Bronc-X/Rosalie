'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  getShareMode,
  nextTheme,
  PRIMARY_NAV,
  resolveTheme,
  THEME_STORAGE_KEY,
} from '@/lib/site-ui.mjs';
import type { SiteTheme } from '@/lib/site-ui.mjs';

const SHARE_PAYLOAD = {
  title: '就差最后一步了',
  text: '点开，时间会告诉你答案。',
  url: 'https://rosalie.toni.asia/',
};

function NavIcon({ label }: { label: string }) {
  const paths: Record<string, React.ReactNode> = {
    首页: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5M10 20v-6h4v6" /></>,
    留言: <><path d="M5 5.5h14v10H10l-4.5 3v-3H5z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></>,
    日历: <><rect x="4.5" y="6" width="15" height="14" rx="3" /><path d="M8 4v4M16 4v4M4.5 10h15M8 14h.01M12 14h.01M16 14h.01" /></>,
    游戏: <><path d="M7 9h10a4 4 0 0 1 3.6 5.7l-1.1 2.2a2 2 0 0 1-3.1.6L14.8 16H9.2l-1.6 1.5a2 2 0 0 1-3.1-.6l-1.1-2.2A4 4 0 0 1 7 9Z" /><path d="M8 11.5v4M6 13.5h4M16.5 12.5h.01M18 14.5h.01" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[label]}</svg>;
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

  if (pathname === '/unlock' || pathname.startsWith('/play/')) return null;

  function toggleTheme() {
    const value = nextTheme(theme);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    setTheme(value);
  }

  async function shareToWechat() {
    const mode = getShareMode({
      userAgent: navigator.userAgent,
      canNativeShare: typeof navigator.share === 'function',
    });

    if (mode === 'wechat-menu') {
      setShareNotice('已准备好卡片 · 点右上角发送给朋友');
      return;
    }

    if (mode === 'wechat-launch') {
      void copyText(SHARE_PAYLOAD.url);
      setShareNotice('链接已复制 · 正在打开微信');
      window.location.href = 'weixin://';
      return;
    }

    if (mode === 'native-share') {
      try {
        await navigator.share(SHARE_PAYLOAD);
        setShareNotice('分享面板已打开');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    const copied = await copyText(SHARE_PAYLOAD.url);
    setShareNotice(copied ? '链接已复制 · 打开微信粘贴即可' : '复制失败 · 请从地址栏分享');
  }

  return (
    <>
      <div className="site-quick-actions" aria-label="页面显示与分享">
        <button type="button" onClick={toggleTheme} aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}模式`}>
          <span aria-hidden="true">{theme === 'light' ? '☾' : '☼'}</span>
          <b>{theme === 'light' ? 'Dark' : 'Light'}</b>
        </button>
        <button type="button" className="site-wechat-action" onClick={() => void shareToWechat()}>
          <span aria-hidden="true">↗</span>
          <b>微信</b>
        </button>
      </div>

      <nav className="site-dock" aria-label="主要功能">
        {PRIMARY_NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname === item.href;
          return (
            <Link href={item.href} key={item.href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
              <NavIcon label={item.label} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={`site-share-toast${shareNotice ? ' is-visible' : ''}`} role="status" aria-live="polite">
        <i aria-hidden="true">✦</i>{shareNotice}
      </div>
    </>
  );
}
