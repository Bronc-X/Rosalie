import Phaser from 'phaser';

import { getGameBackingSize } from '@/lib/game-render-quality.mjs';

export const LOGICAL_GAME_WIDTH = 390;
export const LOGICAL_GAME_HEIGHT = 780;

export function createHighDpiGameConfig(
  parent: HTMLElement,
  scene: Phaser.Scene,
  backgroundColor: string,
): Phaser.Types.Core.GameConfig {
  const backing = getGameBackingSize(
    LOGICAL_GAME_WIDTH,
    LOGICAL_GAME_HEIGHT,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    parent.clientWidth,
    parent.clientHeight,
  );

  return {
    type: Phaser.AUTO,
    parent,
    width: backing.width,
    height: backing.height,
    transparent: true,
    backgroundColor,
    autoFocus: false,
    input: { activePointers: 1 },
    render: { antialias: true, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
  };
}

export function prepareHighDpiScene(scene: Phaser.Scene) {
  const renderScale = scene.scale.gameSize.width / LOGICAL_GAME_WIDTH;
  const camera = scene.cameras.main;
  camera.setZoom(renderScale);
  camera.centerOn(LOGICAL_GAME_WIDTH / 2, LOGICAL_GAME_HEIGHT / 2);

  const sharpenText = (gameObject: Phaser.GameObjects.GameObject) => {
    if (gameObject instanceof Phaser.GameObjects.Text) gameObject.setResolution(renderScale);
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, sharpenText);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, sharpenText);
  });
  return renderScale;
}

export function logicalPointer(scene: Phaser.Scene, pointer: Phaser.Input.Pointer) {
  const position = pointer.positionToCamera(scene.cameras.main) as { x: number; y: number };
  return { x: position.x, y: position.y };
}
