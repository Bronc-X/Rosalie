'use client';

import {
  ArrowUpRight,
  ArrowsClockwise,
  BowlFood,
  CarProfile,
  Cat,
  CirclesThree,
  CloudArrowUp,
  Drop,
  Flower,
  GridFour,
  Infinity,
  Knife,
  LinkSimpleHorizontal,
  Planet,
  Screwdriver,
  Sparkle,
  SquaresFour,
  Stack,
  SteeringWheel,
  Target,
  WaveSine,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import type { GameId } from '@/lib/player-progress.mjs';

const GAME_ICONS: Record<GameId, Icon> = {
  hole: CirclesThree,
  sand: GridFour,
  parking: CarProfile,
  screw: Screwdriver,
  water: Drop,
  rescue: Cat,
  arrow: Target,
  connect: LinkSimpleHorizontal,
  snake: Infinity,
  bubble: CirclesThree,
  merge: SquaresFour,
  breakout: Sparkle,
  hop: CloudArrowUp,
  stack: Stack,
  drift: SteeringWheel,
  wave: WaveSine,
  slice: Knife,
  orbit: Planet,
};

const GAME_ACCENTS: Record<GameId, string> = {
  hole: 'ink',
  sand: 'apricot',
  parking: 'lilac',
  screw: 'sage',
  water: 'blue',
  rescue: 'apricot',
  arrow: 'rose',
  connect: 'wine',
  snake: 'sage',
  bubble: 'blue',
  merge: 'lilac',
  breakout: 'gold',
  hop: 'blue',
  stack: 'apricot',
  drift: 'rose',
  wave: 'lilac',
  slice: 'wine',
  orbit: 'ink',
};

export function GameIcon({ gameId, size = 28 }: { gameId: GameId; size?: number }) {
  const Glyph = GAME_ICONS[gameId] ?? BowlFood;
  return (
    <span className={`game-icon game-icon-${GAME_ACCENTS[gameId]}`} aria-hidden="true">
      <Glyph size={size} weight="duotone" />
    </span>
  );
}

export function GameLaunchIcon() {
  return <ArrowUpRight size={19} weight="bold" aria-hidden="true" />;
}

export function GameResetIcon() {
  return <ArrowsClockwise size={21} weight="bold" aria-hidden="true" />;
}

export function GameFlowerIcon() {
  return <Flower size={22} weight="duotone" aria-hidden="true" />;
}
