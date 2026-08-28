import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ENDLESS_GAME_CATALOG, isEndlessGameId } from '@/lib/endless-games.mjs';
import type { EndlessGameId } from '@/lib/endless-games.mjs';

import { EndlessGameScreen } from '../endless-game-screen';
import { ImmersiveGameScreen } from '../immersive/game-screen';
import '../arrow/arrow.css';
import '../game-icon.css';
import '../endless-games.css';

const IMMERSIVE_GAME_IDS = ['hole', 'sand', 'parking', 'screw', 'water', 'rescue'] as const;
type ImmersiveRouteGameId = typeof IMMERSIVE_GAME_IDS[number];
const IMMERSIVE_GAME_LABELS: Record<ImmersiveRouteGameId, string> = {
  hole: '黑洞吞吞',
  sand: '沙画消消',
  parking: '花径出库',
  screw: '螺丝收纳',
  water: '颜色倒水',
  rescue: '拉针营救',
};

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
    title: IMMERSIVE_GAME_LABELS[gameId],
    description: IMMERSIVE_GAME_LABELS[gameId],
    robots: { index: false, follow: false },
  };
}

export default async function ImmersiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (isEndlessGameId(gameId)) return <EndlessGameScreen gameId={gameId as EndlessGameId} />;
  if (!isImmersiveGameId(gameId)) notFound();
  return <ImmersiveGameScreen gameId={gameId} />;
}
