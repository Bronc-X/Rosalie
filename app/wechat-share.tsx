'use client';

import { useEffect, useState } from 'react';

type SharePayload = {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
};

type WechatSdk = {
  config(options: {
    debug: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }): void;
  ready(callback: () => void): void;
  error(callback: () => void): void;
  updateAppMessageShareData(payload: SharePayload): void;
  updateTimelineShareData(payload: Omit<SharePayload, 'desc'>): void;
};

declare global {
  interface Window {
    wx?: WechatSdk;
  }
}

export function WechatShare() {
  const [status, setStatus] = useState<'idle' | 'ready' | 'fallback'>('idle');

  useEffect(() => {
    if (!/MicroMessenger/i.test(navigator.userAgent) || window.location.hostname !== 'rosalie.toni.asia') {
      return;
    }

    let cancelled = false;
    const pageUrl = window.location.href.split('#')[0];
    const shareData: SharePayload = {
      title: '就差最后一步了',
      desc: '点开，时间会告诉你答案。',
      link: 'https://rosalie.toni.asia/',
      imgUrl: 'https://rosalie.toni.asia/og.png',
    };

    void (async () => {
      try {
        const response = await fetch(`/api/wechat-signature?url=${encodeURIComponent(pageUrl)}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('WeChat sharing is unavailable');

        const config = (await response.json()) as {
          appId: string;
          timestamp: number;
          nonceStr: string;
          signature: string;
        };

        if (!window.wx) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('WeChat SDK failed to load'));
            document.head.append(script);
          });
        }

        if (cancelled || !window.wx) return;
        window.wx.config({
          debug: false,
          appId: config.appId,
          timestamp: config.timestamp,
          nonceStr: config.nonceStr,
          signature: config.signature,
          jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
        });
        window.wx.ready(() => {
          if (cancelled || !window.wx) return;
          window.wx.updateAppMessageShareData(shareData);
          window.wx.updateTimelineShareData({
            title: shareData.title,
            link: shareData.link,
            imgUrl: shareData.imgUrl,
          });
          setStatus('ready');
        });
        window.wx.error(() => {
          if (!cancelled) setStatus('fallback');
        });
      } catch {
        if (!cancelled) setStatus('fallback');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <span className="sr-only" data-wechat-share={status}>微信分享状态：{status}</span>;
}
