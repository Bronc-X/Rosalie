import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { GameId } from '@/lib/player-progress.mjs';

import { GAME_LABELS, ImmersiveGameScreen } from '../immersive/game-screen';
import '../arrow/arrow.css';

const GAME_IDS = ['hole', 'sand', 'parking', 'screw', 'water', 'rescue'] as const;

function isGameId(value: string): value is Exclude<GameId, 'arrow'> {
  return GAME_IDS.includes(value as typeof GAME_IDS[number]);
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  if (!isGameId(gameId)) return {};
  return {
    title: GAME_LABELS[gameId],
    description: '手机沉浸模式。',
    robots: { index: false, follow: false },
  };
}

export default async function ImmersiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isGameId(gameId)) notFound();
  return <ImmersiveGameScreen gameId={gameId} />;
}
