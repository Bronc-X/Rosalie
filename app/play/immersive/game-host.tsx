'use client';

import { useEffect, useRef } from 'react';

import type { GameId } from '@/lib/player-progress.mjs';

export type ImmersiveGameOptions = {
  initialLevel: number;
  muted: boolean;
  reducedMotion: boolean;
  onLevelChange: (level: number, score: number) => void;
  onStatus: (copy: string) => void;
};

type GameCreator = (parent: HTMLElement, options: ImmersiveGameOptions) => import('phaser').Game;
type GameHostProps = ImmersiveGameOptions & { gameId: GameId; restartKey: number };

async function loadCreator(gameId: GameId): Promise<GameCreator> {
  if (gameId === 'arrow') return (await import('../arrow/create-arrow-game')).createArrowGame;
  if (gameId === 'hole') return (await import('./create-hole-sand-games')).createHoleGame;
  if (gameId === 'sand') return (await import('./create-hole-sand-games')).createSandGame;
  if (gameId === 'parking') return (await import('./create-parking-screw-games')).createParkingGame;
  if (gameId === 'screw') return (await import('./create-parking-screw-games')).createScrewGame;
  if (gameId === 'water') return (await import('./create-water-rescue-games')).createWaterGame;
  return (await import('./create-water-rescue-games')).createRescueGame;
}

export function ImmersiveGameHost({ gameId, restartKey, ...options }: GameHostProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    let cancelled = false;
    let createdGame: import('phaser').Game | null = null;

    void loadCreator(gameId).then((createGame) => {
      if (cancelled || !mountRef.current) return;
      createdGame = createGame(mountRef.current, optionsRef.current);
      gameRef.current = createdGame;
    });

    return () => {
      cancelled = true;
      if (gameRef.current === createdGame) gameRef.current = null;
      createdGame?.destroy(true, false);
    };
  }, [gameId, restartKey]);

  useEffect(() => {
    if (gameRef.current) gameRef.current.sound.mute = options.muted;
  }, [options.muted]);

  return <div className="arrow-game-host immersive-game-host" ref={mountRef} aria-label="游戏画布" />;
}
