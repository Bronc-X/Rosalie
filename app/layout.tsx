import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, ZCOOL_XiaoWei } from 'next/font/google';

import './globals.css';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const chineseFont = ZCOOL_XiaoWei({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-chinese',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rosalie.toni.asia'),
  title: '就差最后一步了',
  description: '点开，时间会告诉你答案。',
  alternates: { canonical: '/' },
  robots: { index: false, follow: false },
  openGraph: {
    title: '就差最后一步了',
    description: '点开，时间会告诉你答案。',
    url: 'https://rosalie.toni.asia/',
    siteName: 'Rosalie',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '就差最后一步了' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '就差最后一步了',
    description: '点开，时间会告诉你答案。',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#fffaf7',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${displayFont.variable} ${chineseFont.variable}`}>{children}</body>
    </html>
  );
}
