import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ENDLESS_GAME_CATALOG, isEndlessGameId } from '@/lib/endless-games.mjs';
import type { EndlessGameId } from '@/lib/endless-games.mjs';

import { EndlessGameScreen } from '../endless-game-screen';
import { GAME_LABELS, ImmersiveGameScreen } from '../immersive/game-screen';
import '../arrow/arrow.css';
import '../endless-games.css';

const IMMERSIVE_GAME_IDS = ['hole', 'sand', 'parking', 'screw', 'water', 'rescue'] as const;
type ImmersiveRouteGameId = typeof IMMERSIVE_GAME_IDS[number];

function isImmersiveGameId(value: string): value is ImmersiveRouteGameId {
  return IMMERSIVE_GAME_IDS.includes(value as ImmersiveRouteGameId);
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  if (isEndlessGameId(gameId)) {
    const game = ENDLESS_GAME_CATALOG.find((candidate) => candidate.id === gameId);
    return {
      title: game?.label,
      description: game?.instruction,
      robots: { index: false, follow: false },
    };
  }
  if (!isImmersiveGameId(gameId)) return {};
  return {
    title: GAME_LABELS[gameId],
    description: '手机沉浸模式。',
    robots: { index: false, follow: false },
  };
}

export default async function ImmersiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (isEndlessGameId(gameId)) return <EndlessGameScreen gameId={gameId as EndlessGameId} />;
  if (!isImmersiveGameId(gameId)) notFound();
  return <ImmersiveGameScreen gameId={gameId} />;
}
