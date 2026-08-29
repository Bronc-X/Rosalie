import Phaser from 'phaser';

import { aimFromPoint, segmentHitsCircle } from '@/lib/precision-arrow-engine.mjs';

import { createHighDpiGameConfig, logicalPointer, prepareHighDpiScene } from '../immersive/game-rendering';
import { ARROW_LEVELS } from './levels';

export type ArrowGameOptions = {
  initialLevel: number;
  muted: boolean;
  reducedMotion: boolean;
  onLevelChange: (level: number, score: number) => void;
  onStatus: (copy: string) => void;
};

type FlyingArrow = {
  view: Phaser.GameObjects.Container;
  velocityX: number;
  velocityY: number;
  lastX: number;
  lastY: number;
};

class ArrowScene extends Phaser.Scene {
  private options: ArrowGameOptions;
  private level = 0;
  private shots = 0;
  private dragging = false;
  private aim = { angle: 0, power: 0.58 };
  private arrow: FlyingArrow | null = null;
  private target!: Phaser.GameObjects.Container;
  private targetGlow!: Phaser.GameObjects.Arc;
  private guide!: Phaser.GameObjects.Graphics;
  private launcher!: Phaser.GameObjects.Image;
  private levelCopy!: Phaser.GameObjects.Text;
  private shotCopy!: Phaser.GameObjects.Text;
  private instruction!: Phaser.GameObjects.Text;
  private statusLayer!: Phaser.GameObjects.Container;
  private startedAt = 0;
  private locked = false;
  private audioContext: AudioContext | null = null;
  private darkStage = false;

  constructor(options: ArrowGameOptions) {
    super('arrow');
    this.options = options;
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, ARROW_LEVELS.length - 1);
  }

  preload() {
    this.load.image('controller', '/soft-pull-controller.webp');
  }

  create() {
    prepareHighDpiScene(this);
    this.darkStage = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
    this.cameras.main.setBackgroundColor(this.darkStage ? '#080e17' : '#e8ddd2');
    this.drawWorld();
    this.createTarget();
    this.createLauncher();
    this.createHud();
    this.startedAt = this.time.now;
    this.refreshLevel();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.locked || this.arrow) return;
      this.unlockAudio();
      this.dragging = true;
      const position = logicalPointer(this, pointer);
      this.setAim(position.x, position.y);
      this.tone(310, 0.035, 0.025);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragging) {
        const position = logicalPointer(this, pointer);
        this.setAim(position.x, position.y);
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      const position = logicalPointer(this, pointer);
      this.setAim(position.x, position.y);
      this.fire();
    });
    this.input.on('pointerupoutside', () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.fire();
    });
  }

  update(time: number, delta: number) {
    const level = ARROW_LEVELS[this.level];
    const phase = (time - this.startedAt) * level.speed;
    const targetX = level.targetX + Math.sin(phase) * level.moveX;
    const targetY = level.targetY + Math.sin(phase * 0.73 + 1.1) * level.moveY;
    this.target.setPosition(targetX, targetY);
    this.targetGlow.setPosition(targetX, targetY);

    if (!this.arrow) return;
    const seconds = Math.min(delta, 34) / 1_000;
    const previous = { x: this.arrow.lastX, y: this.arrow.lastY };
    this.arrow.velocityX += level.wind * seconds;
    this.arrow.velocityY += level.gravity * seconds;
    const next = {
      x: previous.x + this.arrow.velocityX * seconds,
      y: previous.y + this.arrow.velocityY * seconds,
    };
    this.arrow.view.setPosition(next.x, next.y);
    this.arrow.view.setRotation(Math.atan2(this.arrow.velocityY, this.arrow.velocityX));
    this.arrow.lastX = next.x;
    this.arrow.lastY = next.y;

    if (segmentHitsCircle(previous, next, { x: targetX, y: targetY, radius: level.radius })) {
      this.hit(targetX, targetY);
    } else if (next.y < -45 || next.y > 830 || next.x < -55 || next.x > 445) {
      this.miss();
    }
  }

  private drawWorld() {
    const dusk = this.add.graphics();
    dusk.fillStyle(0x0f1727, 0.2).fillRoundedRect(20, 84, 350, 619, 39);
    dusk.fillStyle(this.darkStage ? 0x101827 : 0x29354a, 1).fillRoundedRect(16, 78, 358, 620, 39);
    dusk.lineStyle(1, this.darkStage ? 0x7182a8 : 0xffffff, this.darkStage ? 0.24 : 0.46)
      .strokeRoundedRect(16, 78, 358, 620, 39);

    const skyBands = this.darkStage
      ? [0x111a2a, 0x172238, 0x25304a, 0x4b3e58, 0x705263]
      : [0x27344d, 0x3d4d69, 0x77728c, 0xc98b8c, 0xe6ab80];
    skyBands.forEach((color, index) => {
      dusk.fillStyle(color, 0.92).fillRect(25, 87 + index * 65, 340, 66);
    });
    dusk.fillStyle(this.darkStage ? 0xcbbd99 : 0xffd39a, this.darkStage ? 0.5 : 0.78).fillCircle(302, 172, 28);
    dusk.fillStyle(this.darkStage ? 0x111a2a : 0x27344d, 0.7).fillCircle(313, 163, 27);

    dusk.fillStyle(0x263044, 0.94).fillTriangle(25, 408, 112, 298, 202, 408);
    dusk.fillStyle(0x313a4b, 0.98).fillTriangle(126, 408, 247, 276, 365, 408);
    dusk.fillStyle(0x182331, 0.98).fillTriangle(25, 434, 159, 326, 272, 434);
    dusk.fillStyle(this.darkStage ? 0x13231f : 0x293b32, 1).fillRoundedRect(25, 403, 340, 286, 0);
    dusk.fillStyle(this.darkStage ? 0x1b3028 : 0x354c3c, 0.9).fillEllipse(90, 430, 190, 68);
    dusk.fillStyle(this.darkStage ? 0x1a2a25 : 0x425a45, 0.86).fillEllipse(292, 438, 230, 82);

    dusk.fillStyle(0xd4b37f, 0.08).fillTriangle(195, 250, 86, 675, 304, 675);
    dusk.lineStyle(1, 0xf4d19f, 0.16)
      .beginPath().moveTo(195, 250).lineTo(86, 675).strokePath();
    dusk.lineStyle(1, 0xf4d19f, 0.16)
      .beginPath().moveTo(195, 250).lineTo(304, 675).strokePath();
    for (let y = 482; y < 666; y += 49) {
      const halfWidth = 42 + (y - 482) * 0.44;
      dusk.lineStyle(1, 0xf4d19f, 0.08).lineBetween(195 - halfWidth, y, 195 + halfWidth, y);
    }

    dusk.lineStyle(1, 0xf2c190, 0.16)
      .beginPath().moveTo(38, 253).lineTo(87, 238).lineTo(132, 235).lineTo(177, 241)
      .lineTo(222, 248).lineTo(264, 259).lineTo(304, 257).lineTo(352, 238).strokePath();
    dusk.lineStyle(1, 0xb9c9eb, 0.12)
      .beginPath().moveTo(52, 285).lineTo(101, 298).lineTo(151, 302).lineTo(198, 293)
      .lineTo(242, 278).lineTo(282, 267).lineTo(319, 270).lineTo(348, 287).strokePath();

    for (let index = 0; index < 22; index += 1) {
      const x = 32 + ((index * 71) % 326);
      const y = 102 + ((index * 97) % 518);
      const firefly = this.add.circle(x, y, index % 5 === 0 ? 2.4 : 1.2, index % 3 === 0 ? 0xffcf83 : 0xe7edf9, y > 410 ? 0.48 : 0.24).setDepth(1);
      if (!this.options.reducedMotion && index % 3 === 0) {
        this.tweens.add({
          targets: firefly,
          x: x + (index % 2 ? 7 : -7),
          y: y - 10,
          alpha: { from: 0.12, to: 0.78 },
          duration: 1_420 + index * 61,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }
  }

  private createTarget() {
    const outer = this.add.circle(0, 0, 35, 0x765046, 0.94).setStrokeStyle(3, 0xd9a86f, 0.8);
    const middle = this.add.circle(0, 0, 25, 0xf1dfbd, 0.98).setStrokeStyle(5, 0xc97762, 0.78);
    const hole = this.add.circle(0, 0, 14, 0x111722, 0.98).setStrokeStyle(2, 0xf2bf78, 0.42);
    const shine = this.add.ellipse(-5, -6, 8, 5, 0xffffff, 0.36);
    this.target = this.add.container(195, 205, [outer, middle, hole, shine]);
    this.targetGlow = this.add.circle(195, 205, 38, 0xffffff, 0).setStrokeStyle(2, 0xe682a6, 0.3);
    if (!this.options.reducedMotion) {
      this.tweens.add({ targets: this.targetGlow, scale: { from: 0.82, to: 1.28 }, alpha: { from: 0.5, to: 0 }, duration: 1400, repeat: -1 });
    }
  }

  private createLauncher() {
    this.guide = this.add.graphics().setDepth(4);
    this.launcher = this.add.image(195, 642, 'controller').setDisplaySize(90, 90).setDepth(7);
    this.launcher.setOrigin(0.5, 0.65);
    this.launcher.setInteractive({ useHandCursor: true });
    this.setAim(195, 340);
  }

  private createHud() {
    const textStyle = { color: '#f4e8dc', fontFamily: 'Georgia, serif' };
    this.levelCopy = this.add.text(43, 104, '', { ...textStyle, fontSize: '13px', letterSpacing: 2 }).setDepth(8);
    this.shotCopy = this.add.text(347, 104, '', { ...textStyle, fontSize: '12px' }).setOrigin(1, 0).setDepth(8);
    this.instruction = this.add.text(195, 718, '按住图标，拉开后松手', {
      color: '#f0dec8', fontFamily: 'system-ui, sans-serif', fontSize: '12px', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(8);
    this.statusLayer = this.add.container(195, 390).setDepth(20).setVisible(false);
    const card = this.add.rectangle(0, 0, 280, 154, 0x17202d, 0.94).setStrokeStyle(1, 0xe9caa4, 0.42);
    const title = this.add.text(0, -22, '', { color: '#f8e8d5', fontFamily: 'Georgia, serif', fontSize: '28px' }).setOrigin(0.5);
    const note = this.add.text(0, 22, '', { color: '#d8bfa8', fontFamily: 'system-ui, sans-serif', fontSize: '11px', letterSpacing: 2 }).setOrigin(0.5);
    this.statusLayer.add([card, title, note]);
    this.statusLayer.setData({ title, note });
  }

  private refreshLevel() {
    this.shots = 0;
    this.locked = false;
    this.startedAt = this.time.now;
    this.levelCopy.setText(`第 ${this.level + 1} 关`);
    this.shotCopy.setText('○ ○ ○ ○ ○ ○');
    this.instruction.setText('按住图标，拉开后松手');
    this.statusLayer.setVisible(false);
    this.options.onStatus('');
    const radius = ARROW_LEVELS[this.level].radius;
    const [outer, middle, hole] = this.target.list as Phaser.GameObjects.Arc[];
    outer.setRadius(radius + 13);
    middle.setRadius(radius + 4);
    hole.setRadius(radius);
  }

  private setAim(x: number, y: number) {
    if (this.arrow || this.locked) return;
    this.aim = aimFromPoint({ x: 195, y: 642 }, { x, y }, 330);
    const radians = Phaser.Math.DegToRad(this.aim.angle - 90);
    const guideLength = 190 + this.aim.power * 145;
    this.guide.clear();
    this.guide.lineStyle(2, 0xd8789c, 0.38);
    for (let distance = 62; distance < guideLength; distance += 18) {
      const startX = 195 + Math.cos(radians) * distance;
      const startY = 642 + Math.sin(radians) * distance;
      const endX = 195 + Math.cos(radians) * (distance + 8);
      const endY = 642 + Math.sin(radians) * (distance + 8);
      this.guide.beginPath().moveTo(startX, startY).lineTo(endX, endY).strokePath();
    }
    this.launcher.setRotation(Phaser.Math.DegToRad(this.aim.angle) * 0.54);
    this.launcher.setScale(0.9 + this.aim.power * 0.12, 1.08 - this.aim.power * 0.1);
  }

  private fire() {
    if (this.arrow || this.locked) return;
    this.shots += 1;
    const radians = Phaser.Math.DegToRad(this.aim.angle - 90);
    const speed = 610 + this.aim.power * 330;
    const shaft = this.add.rectangle(-25, 0, 52, 4, 0xbe7b8e, 1).setStrokeStyle(1, 0xffffff, 0.65);
    const tip = this.add.triangle(5, 0, -2, -7, -2, 7, 11, 0, 0xe689a8, 1);
    const feather = this.add.triangle(-50, 0, 0, -7, 0, 7, 12, 0, 0xf7c68e, 0.9);
    const view = this.add.container(195, 612, [shaft, tip, feather]).setDepth(9).setRotation(radians);
    this.arrow = {
      view,
      velocityX: Math.cos(radians) * speed,
      velocityY: Math.sin(radians) * speed,
      lastX: 195,
      lastY: 612,
    };
    this.guide.clear();
    this.launcher.setScale(1.08, 0.92);
    this.tweens.add({ targets: this.launcher, scaleX: 1, scaleY: 1, duration: 170, ease: 'Back.Out' });
    this.shotCopy.setText(`${'● '.repeat(this.shots)}${'○ '.repeat(6 - this.shots)}`.trim());
    this.instruction.setText('飞着呢');
    this.tone(540, 0.08, 0.045);
    if (!this.options.reducedMotion) this.cameras.main.shake(70, 0.0014);
  }

  private hit(x: number, y: number) {
    if (!this.arrow) return;
    this.locked = true;
    this.arrow.view.setPosition(x, y).setScale(0.78);
    this.tone(880, 0.13, 0.06);
    this.tone(1_180, 0.09, 0.04, 0.07);
    if ('vibrate' in navigator) navigator.vibrate?.([18, 28, 30]);
    if (!this.options.reducedMotion) this.cameras.main.shake(150, 0.006);
    this.burst(x, y);
    const score = Math.max(100, 760 - (this.shots - 1) * 95 + this.level * 35);
    const nextLevel = Math.min(this.level + 1, ARROW_LEVELS.length - 1);
    this.options.onLevelChange(nextLevel, score);
    this.showStatus(this.level === ARROW_LEVELS.length - 1 ? '全通了' : '进了', `第 ${this.shots} 箭，${score} 分`);
    this.time.delayedCall(1_250, () => {
      this.arrow?.view.destroy();
      this.arrow = null;
      this.level = nextLevel;
      this.refreshLevel();
      this.setAim(195, 340);
    });
  }

  private miss() {
    if (!this.arrow) return;
    this.arrow.view.destroy();
    this.arrow = null;
    this.tone(170, 0.1, 0.03);
    if (this.shots >= 6) {
      this.locked = true;
      this.showStatus('差一点', '不扣存档，再来');
      this.time.delayedCall(1_050, () => this.refreshLevel());
    } else {
      this.instruction.setText('没进。再拉一次');
      this.setAim(195, 340);
    }
  }

  private burst(x: number, y: number) {
    const glyphs = ['●', '○', '·', '●', '○'];
    glyphs.forEach((glyph, index) => {
      const particle = this.add.text(x, y, glyph, {
        color: index % 2 ? '#efaa72' : '#df789e',
        fontSize: index % 2 ? '20px' : '16px',
      }).setOrigin(0.5).setDepth(18);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(index * 1.27) * (58 + index * 7),
        y: y + Math.sin(index * 1.27) * (48 + index * 5),
        alpha: 0,
        scale: 1.6,
        duration: this.options.reducedMotion ? 220 : 650,
        onComplete: () => particle.destroy(),
      });
    });
  }

  private showStatus(title: string, note: string) {
    const titleObject = this.statusLayer.getData('title') as Phaser.GameObjects.Text;
    const noteObject = this.statusLayer.getData('note') as Phaser.GameObjects.Text;
    titleObject.setText(title);
    noteObject.setText(note);
    this.statusLayer.setVisible(true).setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: this.statusLayer, alpha: 1, scale: 1, duration: this.options.reducedMotion ? 1 : 260, ease: 'Back.Out' });
  }

  private unlockAudio() {
    if (this.options.muted || this.audioContext) return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) this.audioContext = new AudioContextConstructor();
  }

  private tone(frequency: number, duration: number, volume: number, delay = 0) {
    if (this.options.muted || !this.audioContext) return;
    const start = this.audioContext.currentTime + delay;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

export function createArrowGame(parent: HTMLElement, options: ArrowGameOptions) {
  return new Phaser.Game(createHighDpiGameConfig(parent, new ArrowScene(options), '#fff5ef'));
}
