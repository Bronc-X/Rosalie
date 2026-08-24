import type { Metadata } from 'next';

import { GameLab } from './game-lab';
import './play.css';

export const metadata: Metadata = {
  title: '小游戏',
  description: '八个沉浸式手机小游戏。',
  alternates: { canonical: '/play' },
  robots: { index: false, follow: false },
};

export default function PlayPage() {
  return <GameLab />;
}
