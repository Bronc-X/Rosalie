import type { Metadata } from 'next';

import { GameLab } from './game-lab';
import './play.css';

export const metadata: Metadata = {
  title: '拉扯实验室',
  description: '三个不计入绩效的等待小游戏。',
  alternates: { canonical: '/play' },
  robots: { index: false, follow: false },
};

export default function PlayPage() {
  return <GameLab />;
}
