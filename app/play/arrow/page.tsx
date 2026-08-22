import type { Metadata } from 'next';

import { ImmersiveGameScreen } from '../immersive/game-screen';
import './arrow.css';

export const metadata: Metadata = {
  title: '一箭又一箭',
  description: '按住，拉开，松手。',
  robots: { index: false, follow: false },
};

export default function ArrowGamePage() {
  return <ImmersiveGameScreen gameId="arrow" />;
}
