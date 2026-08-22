import Phaser from 'phaser';

import { motifForIndex } from '@/lib/visual-motifs.mjs';

export function addMotifGlyph(
  scene: Phaser.Scene,
  index: number,
  size: number,
  color = 0xffffff,
  alpha = 0.72,
) {
  const motif = motifForIndex(index);
  const graphics = scene.add.graphics();
  const radius = size / 2;
  graphics.fillStyle(color, alpha);
  graphics.lineStyle(Math.max(1, size * 0.085), color, alpha);

  switch (motif.id) {
    case 'sakura': {
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = -Math.PI / 2 + petal * (Math.PI * 2 / 5);
        graphics.fillCircle(Math.cos(angle) * radius * 0.45, Math.sin(angle) * radius * 0.45, radius * 0.33);
      }
      graphics.fillStyle(0xffd58b, alpha).fillCircle(0, 0, radius * 0.18);
      break;
    }
    case 'potato':
      graphics.fillRoundedRect(-radius * 0.72, -radius * 0.52, radius * 1.44, radius * 1.08, radius * 0.45);
      graphics.fillStyle(color, alpha * 0.42).fillCircle(-radius * 0.2, -radius * 0.08, radius * 0.08);
      graphics.fillCircle(radius * 0.24, radius * 0.16, radius * 0.06);
      break;
    case 'star':
      graphics.fillPoints([
        new Phaser.Math.Vector2(0, -radius), new Phaser.Math.Vector2(radius * 0.2, -radius * 0.2),
        new Phaser.Math.Vector2(radius, 0), new Phaser.Math.Vector2(radius * 0.2, radius * 0.2),
        new Phaser.Math.Vector2(0, radius), new Phaser.Math.Vector2(-radius * 0.2, radius * 0.2),
        new Phaser.Math.Vector2(-radius, 0), new Phaser.Math.Vector2(-radius * 0.2, -radius * 0.2),
      ], true);
      break;
    case 'heart':
      graphics.fillCircle(-radius * 0.32, -radius * 0.2, radius * 0.42);
      graphics.fillCircle(radius * 0.32, -radius * 0.2, radius * 0.42);
      graphics.fillTriangle(-radius * 0.72, -radius * 0.04, radius * 0.72, -radius * 0.04, 0, radius * 0.92);
      break;
    case 'moon':
      graphics.beginPath();
      graphics.arc(-radius * 0.08, 0, radius * 0.72, -Math.PI * 0.58, Math.PI * 0.58, true);
      graphics.arc(radius * 0.34, 0, radius * 0.58, Math.PI * 0.58, -Math.PI * 0.58, false);
      graphics.closePath();
      graphics.fillPath();
      break;
    case 'cloud':
      graphics.fillCircle(-radius * 0.42, radius * 0.04, radius * 0.38);
      graphics.fillCircle(0, -radius * 0.2, radius * 0.5);
      graphics.fillCircle(radius * 0.43, radius * 0.05, radius * 0.34);
      graphics.fillRoundedRect(-radius * 0.72, 0, radius * 1.44, radius * 0.52, radius * 0.22);
      break;
    case 'bow':
      graphics.fillTriangle(-radius * 0.12, 0, -radius, -radius * 0.54, -radius * 0.88, radius * 0.58);
      graphics.fillTriangle(radius * 0.12, 0, radius, -radius * 0.54, radius * 0.88, radius * 0.58);
      graphics.fillCircle(0, 0, radius * 0.28);
      break;
    case 'leaf':
      graphics.fillEllipse(0, 0, radius * 1.1, radius * 1.75);
      graphics.lineStyle(Math.max(1, size * 0.07), 0xffffff, alpha * 0.7).lineBetween(0, -radius * 0.55, 0, radius * 0.55);
      graphics.setRotation(Math.PI / 4);
      break;
    case 'sun':
      graphics.fillCircle(0, 0, radius * 0.47);
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = ray * Math.PI / 4;
        graphics.lineBetween(
          Math.cos(angle) * radius * 0.64,
          Math.sin(angle) * radius * 0.64,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        );
      }
      break;
    default:
      graphics.fillCircle(0, 0, radius * 0.84);
      graphics.fillStyle(0xffffff, alpha * 0.7).fillEllipse(-radius * 0.25, -radius * 0.28, radius * 0.48, radius * 0.24);
  }

  return scene.add.container(0, 0, [graphics]).setName(`motif-${motif.id}`);
}
