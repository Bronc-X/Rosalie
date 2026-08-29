import type { Metadata } from 'next';

import { HoldemTable } from './holdem-table';
import './holdem.css';

export const metadata: Metadata = {
  title: '求你爸爸，给你多点筹码',
  description: '进牌桌，给我多点筹码。',
  robots: { index: false, follow: false },
  alternates: { canonical: '/play/holdem' },
  openGraph: {
    title: '求你爸爸，给你多点筹码',
    description: '进牌桌，给我多点筹码。',
    url: 'https://rosalie.toni.asia/play/holdem',
    siteName: 'Rosalie',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '求你爸爸，给你多点筹码' }],
  },
};

export default function HoldemPage() {
  return <HoldemTable />;
}
