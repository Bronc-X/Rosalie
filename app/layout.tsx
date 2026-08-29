import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Noto_Sans_SC } from 'next/font/google';

import './globals.css';
import './site-chrome.css';
import './pocket-stage.css';
import './transmit-ui.css';
import { SiteChrome } from './site-chrome';
import { WechatShare } from './wechat-share';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const chineseFont = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-chinese-ui',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rosalie.toni.asia'),
  title: '祝你成功喝到嘉士伯',
  description: '点开，时间会告诉你答案。',
  alternates: { canonical: '/' },
  robots: { index: false, follow: false },
  openGraph: {
    title: '祝你成功喝到嘉士伯',
    description: '点开，时间会告诉你答案。',
    url: 'https://rosalie.toni.asia/',
    siteName: 'Rosalie',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '祝你成功喝到嘉士伯' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '祝你成功喝到嘉士伯',
    description: '点开，时间会告诉你答案。',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f16' },
  ],
};

const themeBoot = `(() => { try { const saved = localStorage.getItem('rosalie-theme'); const dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch { document.documentElement.dataset.theme = 'light'; } })();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBoot }} /></head>
      <body className={`${displayFont.variable} ${chineseFont.variable}`}>
        <WechatShare />
        {children}
        <SiteChrome />
      </body>
    </html>
  );
}
