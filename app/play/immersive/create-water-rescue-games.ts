import Phaser from 'phaser';

import { createHighDpiGameConfig, prepareHighDpiScene } from './game-rendering';

export type WaterRescueGameOptions = {
  initialLevel: number;
  muted: boolean;
  reducedMotion: boolean;
  onLevelChange: (level: number, score: number) => void;
  onStatus: (copy: string) => void;
};

const DISPLAY_FONT = 'Georgia, "Times New Roman", serif';
const BODY_FONT = '"Avenir Next", "PingFang SC", sans-serif';

const PALETTE = {
  ink: 0x71505d,
  mutedInk: 0xa77888,
  cream: 0xfff8f2,
  paper: 0xfffcf9,
  rose: 0xe887aa,
  roseSoft: 0xf7bfd3,
  peach: 0xf1ae72,
  gold: 0xecc36e,
  mint: 0x91cdb1,
  sky: 0x92b9e6,
  plum: 0xb29ad9,
} as const;

function motionDuration(options: WaterRescueGameOptions, duration: number) {
  return options.reducedMotion ? 1 : duration;
}

function lightHaptic(pattern: number | number[], options: WaterRescueGameOptions) {
  if (options.reducedMotion || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate?.(pattern);
}

class ToyAudio {
  private context: AudioContext | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: WaterRescueGameOptions,
  ) {}

  unlock() {
    if (this.options.muted || this.context || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) this.context = new AudioContextConstructor();
  }

  tone(frequency: number, duration: number, volume: number, delay = 0) {
    if (this.options.muted || this.scene.sound.mute || !this.context) return;
    const startsAt = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.025);
  }
}

function drawToyBackdrop(scene: Phaser.Scene, accent: number) {
  scene.cameras.main.setBackgroundColor('#fff7f1');
  const wash = scene.add.graphics().setDepth(-20);
  wash.fillStyle(0xf8dfe9, 0.58).fillCircle(16, 116, 170);
  wash.fillStyle(0xffd4ae, 0.38).fillCircle(388, 285, 210);
  wash.fillStyle(0xdce4ff, 0.34).fillCircle(52, 742, 205);
  wash.fillStyle(0xffffff, 0.64).fillRoundedRect(15, 72, 360, 660, 44);
  wash.lineStyle(1, 0xffffff, 0.9).strokeRoundedRect(15, 72, 360, 660, 44);

  for (let index = 0; index < 22; index += 1) {
    const x = 28 + ((index * 83) % 334);
    const y = 92 + ((index * 113) % 610);
    const dot = scene.add.circle(x, y, index % 5 === 0 ? 2.2 : 1.2, index % 3 === 0 ? accent : PALETTE.peach, 0.22).setDepth(-19);
    if (index % 5 === 0) dot.setStrokeStyle(1, 0xffffff, 0.66);
  }
}

function createController(scene: Phaser.Scene, x = 334, y = 704) {
  const halo = scene.add.circle(x, y, 33, PALETTE.cream, 0.55)
    .setStrokeStyle(1.5, PALETTE.rose, 0.22)
    .setDepth(80);
  const image = scene.add.image(x, y, 'controller').setDisplaySize(58, 58).setDepth(81);
  return { halo, image };
}

function moveController(
  scene: Phaser.Scene,
  controller: { halo: Phaser.GameObjects.Arc; image: Phaser.GameObjects.Image },
  x: number,
  y: number,
  options: WaterRescueGameOptions,
) {
  scene.tweens.killTweensOf([controller.halo, controller.image]);
  scene.tweens.add({
    targets: [controller.halo, controller.image],
    x,
    y,
    duration: motionDuration(options, 210),
    ease: 'Sine.Out',
  });
  if (!options.reducedMotion) {
    scene.tweens.add({
      targets: controller.halo,
      scale: { from: 0.82, to: 1.2 },
      alpha: { from: 0.66, to: 0.12 },
      duration: 520,
    });
  }
}

function burstGlyphs(
  scene: Phaser.Scene,
  x: number,
  y: number,
  glyphs: string[],
  options: WaterRescueGameOptions,
) {
  glyphs.slice(0, 9).forEach((glyph, index) => {
    const angle = -Math.PI * 0.92 + (index / Math.max(1, glyphs.length - 1)) * Math.PI * 1.84;
    const particle = scene.add.text(x, y, glyph, {
      color: index % 2 ? '#ec9c70' : '#df769e',
      fontFamily: DISPLAY_FONT,
      fontSize: index % 3 === 0 ? '20px' : '14px',
    }).setOrigin(0.5).setDepth(90);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * (44 + index * 4),
      y: y + Math.sin(angle) * (42 + (index % 3) * 8),
      alpha: 0,
      scale: 1.45,
      duration: motionDuration(options, 620),
      ease: 'Cubic.Out',
      onComplete: () => particle.destroy(),
    });
  });
}

type WaterColor = 'rose' | 'peach' | 'gold' | 'mint' | 'sky';

type WaterLevel = {
  label: string;
  tubes: WaterColor[][];
};

const WATER_SWATCH: Record<WaterColor, number> = {
  rose: PALETTE.rose,
  peach: PALETTE.peach,
  gold: PALETTE.gold,
  mint: PALETTE.mint,
  sky: PALETTE.sky,
};

// Arrays are bottom-to-top. Every level was checked with the real Water Sort move rules.
const WATER_LEVELS: WaterLevel[] = [
  {
    label: '先分开三种颜色',
    tubes: [
      ['rose', 'peach', 'gold', 'rose'],
      ['peach', 'gold', 'rose', 'peach'],
      ['gold', 'rose', 'peach', 'gold'],
      [],
      [],
    ],
  },
  {
    label: '颜色开始绕弯',
    tubes: [
      ['rose', 'peach', 'gold', 'mint'],
      ['peach', 'gold', 'mint', 'rose'],
      ['gold', 'mint', 'rose', 'peach'],
      ['mint', 'rose', 'peach', 'gold'],
      [],
      [],
    ],
  },
  {
    label: '别让最上面骗你',
    tubes: [
      ['mint', 'peach', 'mint', 'gold'],
      ['peach', 'rose', 'rose', 'gold'],
      ['mint', 'peach', 'rose', 'gold'],
      ['mint', 'gold', 'peach', 'rose'],
      [],
      [],
    ],
  },
  {
    label: '五色终局',
    tubes: [
      ['rose', 'peach', 'gold', 'mint'],
      ['peach', 'gold', 'mint', 'sky'],
      ['gold', 'mint', 'sky', 'rose'],
      ['mint', 'sky', 'rose', 'peach'],
      ['sky', 'rose', 'peach', 'gold'],
      [],
      [],
    ],
  },
];

class WaterSortScene extends Phaser.Scene {
  private readonly options: WaterRescueGameOptions;
  private readonly toyAudio: ToyAudio;
  private level: number;
  private tubes: WaterColor[][] = [];
  private tubeViews: Phaser.GameObjects.Container[] = [];
  private selected = -1;
  private moves = 0;
  private animating = false;
  private resolved = false;
  private moveCopy!: Phaser.GameObjects.Text;
  private levelCopy!: Phaser.GameObjects.Text;
  private instruction!: Phaser.GameObjects.Text;
  private resultLayer: Phaser.GameObjects.Container | null = null;
  private controller!: { halo: Phaser.GameObjects.Arc; image: Phaser.GameObjects.Image };

  constructor(options: WaterRescueGameOptions) {
    super('water-sort');
    this.options = options;
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, WATER_LEVELS.length - 1);
    this.toyAudio = new ToyAudio(this, options);
  }

  preload() {
    this.load.image('controller', '/soft-pull-controller.webp');
  }

  create() {
    prepareHighDpiScene(this);
    drawToyBackdrop(this, PALETTE.sky);
    this.createHud();
    this.controller = createController(this);
    this.startLevel();
    this.input.on('pointerdown', () => this.toyAudio.unlock());
  }

  private createHud() {
    this.levelCopy = this.add.text(40, 101, '', {
      color: '#805b68',
      fontFamily: DISPLAY_FONT,
      fontSize: '13px',
      letterSpacing: 2.6,
    }).setDepth(70);
    this.moveCopy = this.add.text(350, 101, '', {
      color: '#9f7583',
      fontFamily: BODY_FONT,
      fontSize: '12px',
      letterSpacing: 1.2,
    }).setOrigin(1, 0).setDepth(70);
    this.add.text(40, 126, '倒 水 挑 战', {
      color: '#684650',
      fontFamily: DISPLAY_FONT,
      fontSize: '30px',
      letterSpacing: 5,
    }).setDepth(70);
    this.instruction = this.add.text(195, 665, '', {
      color: '#916a77',
      fontFamily: BODY_FONT,
      fontSize: '12px',
      letterSpacing: 1.7,
      align: 'center',
    }).setOrigin(0.5).setDepth(70);
  }

  private startLevel() {
    this.tubeViews.forEach((view) => view.destroy(true));
    this.tubeViews = [];
    this.resultLayer?.destroy(true);
    this.resultLayer = null;
    this.tubes = WATER_LEVELS[this.level].tubes.map((tube) => [...tube]);
    this.selected = -1;
    this.moves = 0;
    this.animating = false;
    this.resolved = false;
    this.levelCopy.setText(`第 ${this.level + 1} 关`);
    this.moveCopy.setText('0 次倾倒');
    this.instruction.setText('点一支试管，再点要倒进去的试管');
    this.options.onStatus('');
    this.redrawTubes();
    this.resetController();
  }

  private tubePositions() {
    const count = this.tubes.length;
    const topCount = count === 7 ? 4 : 3;
    const bottomCount = count - topCount;
    const row = (amount: number, y: number) => Array.from({ length: amount }, (_, index) => ({
      x: 195 + (index - (amount - 1) / 2) * (amount === 4 ? 88 : 104),
      y,
    }));
    return [...row(topCount, 305), ...row(bottomCount, 493)];
  }

  private redrawTubes() {
    this.tubeViews.forEach((view) => view.destroy(true));
    const positions = this.tubePositions();
    this.tubeViews = this.tubes.map((tube, index) => this.createTube(index, positions[index].x, positions[index].y, tube));
  }

  private createTube(index: number, x: number, y: number, tube: WaterColor[]) {
    const container = this.add.container(x, y).setDepth(20 + index);
    const shadow = this.add.ellipse(0, 68, 52, 13, 0x8e6573, 0.1);
    const glow = this.add.rectangle(0, 5, 58, 128, PALETTE.roseSoft, index === this.selected ? 0.2 : 0)
      .setStrokeStyle(index === this.selected ? 2 : 0, PALETTE.rose, index === this.selected ? 0.42 : 0);
    const glass = this.add.rectangle(0, 4, 48, 122, 0xffffff, 0.34);
    const liquidObjects: Phaser.GameObjects.GameObject[] = [];
    tube.forEach((color, slot) => {
      const layerY = 52 - slot * 25;
      const body = this.add.rectangle(0, layerY, 36, 23, WATER_SWATCH[color], 0.86);
      const shine = this.add.rectangle(-11, layerY - 3, 4, 13, 0xffffff, 0.3);
      liquidObjects.push(body, shine);
      if (slot === tube.length - 1) {
        liquidObjects.push(this.add.ellipse(0, layerY - 11, 36, 8, WATER_SWATCH[color], 0.95));
      }
    });
    const outline = this.add.graphics();
    outline.lineStyle(3, 0xffffff, 0.92);
    outline.beginPath().moveTo(-25, -59).lineTo(-25, 54).lineTo(-18, 64)
      .lineTo(18, 64).lineTo(25, 54).lineTo(25, -59).strokePath();
    outline.lineStyle(1.4, 0xbc8799, 0.34);
    outline.beginPath().moveTo(-25, -58).lineTo(-25, 54).lineTo(-18, 64)
      .lineTo(18, 64).lineTo(25, 54).lineTo(25, -58).strokePath();
    outline.lineStyle(4, 0xffffff, 0.95).beginPath().moveTo(-29, -59).lineTo(29, -59).strokePath();
    outline.lineStyle(1, 0xbc8799, 0.28).beginPath().moveTo(-29, -57).lineTo(29, -57).strokePath();
    const hit = this.add.rectangle(0, 4, 65, 142, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.tapTube(index));
    container.add([shadow, glow, glass, ...liquidObjects, outline, hit]);
    if (index === this.selected && !this.options.reducedMotion) {
      this.tweens.add({ targets: container, y: y - 8, duration: 180, ease: 'Back.Out' });
    }
    return container;
  }

  private tapTube(index: number) {
    if (this.animating || this.resolved) return;
    this.toyAudio.unlock();
    const position = this.tubePositions()[index];
    moveController(this, this.controller, position.x + 31, position.y + 42, this.options);

    if (this.selected < 0) {
      if (this.tubes[index].length === 0) {
        this.instruction.setText('空试管还倒不出东西');
        this.toyAudio.tone(180, 0.07, 0.025);
        return;
      }
      this.selected = index;
      this.instruction.setText('现在选一支能接住它的试管');
      this.toyAudio.tone(360, 0.055, 0.025);
      this.redrawTubes();
      return;
    }

    if (this.selected === index) {
      this.selected = -1;
      this.instruction.setText('取消了，再选一支');
      this.redrawTubes();
      this.resetController();
      return;
    }

    if (!this.canPour(this.selected, index)) {
      this.toyAudio.tone(145, 0.12, 0.028);
      if (this.tubes[index].length > 0) {
        this.selected = index;
        this.instruction.setText('颜色对不上，改拿这支');
        this.redrawTubes();
      } else {
        this.instruction.setText('这一支已经满了');
      }
      return;
    }

    this.animatePour(this.selected, index);
  }

  private canPour(sourceIndex: number, destinationIndex: number) {
    const source = this.tubes[sourceIndex];
    const destination = this.tubes[destinationIndex];
    if (!source.length || destination.length >= 4) return false;
    return destination.length === 0 || destination.at(-1) === source.at(-1);
  }

  private pourAmount(sourceIndex: number, destinationIndex: number) {
    const source = this.tubes[sourceIndex];
    const color = source.at(-1);
    let group = 0;
    for (let index = source.length - 1; index >= 0 && source[index] === color; index -= 1) group += 1;
    return Math.min(group, 4 - this.tubes[destinationIndex].length);
  }

  private animatePour(sourceIndex: number, destinationIndex: number) {
    this.animating = true;
    const sourceView = this.tubeViews[sourceIndex];
    const destination = this.tubePositions()[destinationIndex];
    const direction = sourceView.x < destination.x ? 1 : -1;
    const color = this.tubes[sourceIndex].at(-1) as WaterColor;
    const amount = this.pourAmount(sourceIndex, destinationIndex);
    const travelDuration = motionDuration(this.options, 330);
    this.instruction.setText('正在认真倒');
    this.toyAudio.tone(470, 0.07, 0.025);
    this.tweens.add({
      targets: sourceView,
      x: destination.x - direction * 34,
      y: destination.y - 102,
      angle: direction * 58,
      duration: travelDuration,
      ease: 'Cubic.InOut',
      onComplete: () => {
        const stream = this.add.rectangle(destination.x, destination.y - 77, 7, 92, WATER_SWATCH[color], 0.82)
          .setOrigin(0.5, 0).setDepth(57);
        const glint = this.add.rectangle(destination.x - 2, destination.y - 75, 2, 78, 0xffffff, 0.42)
          .setOrigin(0.5, 0).setDepth(58);
        this.tweens.add({ targets: [stream, glint], alpha: { from: 0.18, to: 0.9 }, duration: motionDuration(this.options, 120), yoyo: true });
        this.toyAudio.tone(620, 0.17, 0.018);
        this.time.delayedCall(motionDuration(this.options, 330), () => {
          stream.destroy();
          glint.destroy();
          const moved = this.tubes[sourceIndex].splice(-amount);
          this.tubes[destinationIndex].push(...moved);
          this.moves += 1;
          this.moveCopy.setText(`${this.moves} 次倾倒`);
          this.selected = -1;
          this.animating = false;
          this.redrawTubes();
          this.resetController();
          lightHaptic(12, this.options);
          if (this.isSolved()) this.completeLevel();
          else this.instruction.setText('继续，把同色放在一起');
        });
      },
    });
  }

  private isSolved() {
    return this.tubes.every((tube) => tube.length === 0
      || (tube.length === 4 && tube.every((color) => color === tube[0])));
  }

  private completeLevel() {
    this.resolved = true;
    const score = Math.max(120, 1_100 + this.level * 180 - this.moves * 34);
    const nextLevel = Math.min(this.level + 1, WATER_LEVELS.length - 1);
    // Persistence is notified before any victory animation or level transition.
    this.options.onLevelChange(nextLevel, score);
    this.options.onStatus(this.level === WATER_LEVELS.length - 1 ? '五色也理顺了' : `第 ${this.level + 1} 关完成`);
    this.toyAudio.tone(720, 0.12, 0.045);
    this.toyAudio.tone(980, 0.16, 0.04, 0.1);
    lightHaptic([16, 24, 26], this.options);
    if (!this.options.reducedMotion) this.cameras.main.shake(120, 0.0024);
    burstGlyphs(this, 195, 330, ['●', '○', '·', '○', '●', '◆', '·'], this.options);
    this.showResult(this.level === WATER_LEVELS.length - 1 ? '全倒明白了' : '分好了', `${this.moves} 次，${score} 分`);
    this.time.delayedCall(motionDuration(this.options, 1_300), () => {
      this.level = nextLevel;
      this.startLevel();
    });
  }

  private showResult(titleCopy: string, noteCopy: string) {
    const shade = this.add.rectangle(0, 0, 390, 780, 0x6f4b58, 0.12).setOrigin(0).setInteractive();
    const card = this.add.rectangle(0, 0, 278, 152, PALETTE.paper, 0.97)
      .setStrokeStyle(1.4, PALETTE.rose, 0.24);
    const title = this.add.text(0, -24, titleCopy, {
      color: '#6f4b58', fontFamily: DISPLAY_FONT, fontSize: '28px', letterSpacing: 2,
    }).setOrigin(0.5);
    const note = this.add.text(0, 24, noteCopy, {
      color: '#a47282', fontFamily: BODY_FONT, fontSize: '12px', letterSpacing: 1.4,
    }).setOrigin(0.5);
    this.resultLayer = this.add.container(195, 392, [shade, card, title, note]).setDepth(100).setAlpha(0).setScale(0.92);
    shade.setPosition(-195, -392);
    this.tweens.add({
      targets: this.resultLayer,
      alpha: 1,
      scale: 1,
      duration: motionDuration(this.options, 240),
      ease: 'Back.Out',
    });
  }

  private resetController() {
    this.tweens.killTweensOf([this.controller.halo, this.controller.image]);
    this.tweens.add({
      targets: [this.controller.halo, this.controller.image],
      x: 334,
      y: 704,
      duration: motionDuration(this.options, 260),
      ease: 'Sine.InOut',
    });
    if (!this.options.reducedMotion) {
      this.tweens.add({
        targets: this.controller.image,
        alpha: { from: 0.72, to: 1 },
        scale: { from: 0.92, to: 1.06 },
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
    }
  }
}

type RescueColor = 'rose' | 'peach' | 'gold' | 'mint' | 'sky' | 'plum';

type RescueLevel = {
  label: string;
  // Stages are bottom-to-top; every named color creates a three-piece cord set.
  stages: RescueColor[][];
};

type RescuePiece = {
  id: string;
  color: RescueColor;
  stage: number;
  x: number;
  y: number;
  rotation: number;
  blockers: string[];
};

const RESCUE_SWATCH: Record<RescueColor, number> = {
  rose: PALETTE.rose,
  peach: PALETTE.peach,
  gold: PALETTE.gold,
  mint: PALETTE.mint,
  sky: PALETTE.sky,
  plum: PALETTE.plum,
};

const RESCUE_GLYPH: Record<RescueColor, string> = {
  rose: '●',
  peach: '◐',
  gold: '◆',
  mint: '⌁',
  sky: '■',
  plum: '○',
};

const RESCUE_LEVELS: RescueLevel[] = [
  { label: '一层一层抽', stages: [['plum'], ['mint'], ['gold'], ['rose']] },
  { label: '两束线同时亮', stages: [['sky'], ['plum'], ['mint'], ['rose', 'gold']] },
  { label: '先看谁压着谁', stages: [['peach'], ['sky'], ['plum', 'mint'], ['rose', 'gold']] },
  { label: '七格托盘终局', stages: [['plum'], ['sky'], ['rose', 'gold', 'mint', 'peach']] },
];

function buildRescuePieces(level: RescueLevel, levelIndex: number) {
  const pieces: RescuePiece[] = [];
  const stageIds: string[][] = [];
  level.stages.forEach((colors, stage) => {
    const ids: string[] = [];
    colors.forEach((color, groupIndex) => {
      const spacing = colors.length >= 4 ? 82 : colors.length === 3 ? 106 : 132;
      const centerX = colors.length === 1
        ? 195
        : 195 + (groupIndex - (colors.length - 1) / 2) * spacing;
      for (let pieceIndex = 0; pieceIndex < 3; pieceIndex += 1) {
        const id = `${levelIndex}-${stage}-${groupIndex}-${pieceIndex}`;
        ids.push(id);
        pieces.push({
          id,
          color,
          stage,
          x: centerX + [-18, 18, 0][pieceIndex] + ((stage % 2) * 8 - 4),
          y: 438 - stage * 66 + [-15, 4, 25][pieceIndex],
          rotation: Phaser.Math.DegToRad([-12, 9, -3][pieceIndex] + (groupIndex % 2 ? 5 : -2)),
          blockers: [],
        });
      }
    });
    stageIds.push(ids);
  });
  pieces.forEach((piece) => {
    piece.blockers = stageIds[piece.stage + 1] ? [...stageIds[piece.stage + 1]] : [];
  });
  return pieces;
}

class RescueScene extends Phaser.Scene {
  private readonly options: WaterRescueGameOptions;
  private readonly toyAudio: ToyAudio;
  private level: number;
  private pieces: RescuePiece[] = [];
  private removed = new Set<string>();
  private tray: RescueColor[] = [];
  private pieceViews = new Map<string, Phaser.GameObjects.Container>();
  private trayViews: Phaser.GameObjects.Container[] = [];
  private moves = 0;
  private locked = false;
  private failed = false;
  private resolved = false;
  private levelCopy!: Phaser.GameObjects.Text;
  private moveCopy!: Phaser.GameObjects.Text;
  private instruction!: Phaser.GameObjects.Text;
  private controller!: { halo: Phaser.GameObjects.Arc; image: Phaser.GameObjects.Image };
  private cage!: Phaser.GameObjects.Container;
  private kitten!: Phaser.GameObjects.Container;
  private resultLayer: Phaser.GameObjects.Container | null = null;

  constructor(options: WaterRescueGameOptions) {
    super('rescue-cat');
    this.options = options;
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, RESCUE_LEVELS.length - 1);
    this.toyAudio = new ToyAudio(this, options);
  }

  preload() {
    this.load.image('controller', '/soft-pull-controller.webp');
  }

  create() {
    prepareHighDpiScene(this);
    drawToyBackdrop(this, PALETTE.mint);
    this.createHud();
    this.createKittenAndCage();
    this.createTrayFrame();
    this.controller = createController(this, 334, 724);
    this.startLevel();
    this.input.on('pointerdown', () => this.toyAudio.unlock());
  }

  private createHud() {
    this.levelCopy = this.add.text(40, 94, '', {
      color: '#805b68', fontFamily: DISPLAY_FONT, fontSize: '13px', letterSpacing: 2.6,
    }).setDepth(70);
    this.moveCopy = this.add.text(350, 94, '', {
      color: '#9f7583', fontFamily: BODY_FONT, fontSize: '12px', letterSpacing: 1.2,
    }).setOrigin(1, 0).setDepth(70);
    this.add.text(40, 117, '营 救 小 猫', {
      color: '#684650', fontFamily: DISPLAY_FONT, fontSize: '28px', letterSpacing: 4,
    }).setDepth(70);
    this.instruction = this.add.text(195, 560, '', {
      color: '#916a77', fontFamily: BODY_FONT, fontSize: '12px', letterSpacing: 1.5,
      align: 'center',
    }).setOrigin(0.5).setDepth(70);
  }

  private createKittenAndCage() {
    const catShadow = this.add.ellipse(0, 35, 58, 12, 0x795461, 0.12);
    const leftEar = this.add.triangle(-22, -24, -14, 4, 0, 22, 13, 3, 0xf0ad75, 1);
    const rightEar = this.add.triangle(22, -24, -13, 3, 0, 22, 14, 4, 0xf0ad75, 1);
    const head = this.add.circle(0, 0, 31, 0xf4bd86, 1).setStrokeStyle(2, 0xffffff, 0.72);
    const muzzle = this.add.ellipse(0, 10, 28, 18, 0xffead8, 0.92);
    const leftEye = this.add.arc(-11, -3, 5, 10, 170, false, 0x000000, 0).setStrokeStyle(2.6, PALETTE.ink, 1);
    const rightEye = this.add.arc(11, -3, 5, 10, 170, false, 0x000000, 0).setStrokeStyle(2.6, PALETTE.ink, 1);
    const nose = this.add.triangle(0, 7, -4, -2, 4, -2, 0, 4, PALETTE.rose, 1);
    this.kitten = this.add.container(195, 188, [catShadow, leftEar, rightEar, head, muzzle, leftEye, rightEye, nose]).setDepth(6);

    const cageGraphics = this.add.graphics();
    cageGraphics.fillStyle(0xffffff, 0.2).fillRoundedRect(-54, -48, 108, 96, 18);
    cageGraphics.lineStyle(3, PALETTE.ink, 0.34).strokeRoundedRect(-54, -48, 108, 96, 18);
    [-34, -17, 0, 17, 34].forEach((x) => cageGraphics.lineStyle(2, 0xffffff, 0.92).lineBetween(x, -42, x, 42));
    cageGraphics.lineStyle(2, 0xffffff, 0.82).lineBetween(-48, 26, 48, 26);
    const lock = this.add.circle(0, 28, 11, PALETTE.rose, 0.94).setStrokeStyle(2, 0xffffff, 0.78);
    const keyhole = this.add.circle(0, 27, 2.5, PALETTE.ink, 0.72);
    this.cage = this.add.container(195, 188, [cageGraphics, lock, keyhole]).setDepth(48);
  }

  private createTrayFrame() {
    const tray = this.add.graphics().setDepth(49);
    tray.fillStyle(0xffffff, 0.6).fillRoundedRect(28, 590, 334, 70, 23);
    tray.lineStyle(1.5, 0xffffff, 0.95).strokeRoundedRect(28, 590, 334, 70, 23);
    tray.lineStyle(1, PALETTE.rose, 0.17).strokeRoundedRect(28, 590, 334, 70, 23);
    for (let index = 1; index < 7; index += 1) {
      const x = 28 + (334 / 7) * index;
      tray.lineStyle(1, PALETTE.rose, 0.12).lineBetween(x, 603, x, 648);
    }
    this.add.text(195, 678, '三条同色自动收走，托盘七格', {
      color: '#a57787', fontFamily: BODY_FONT, fontSize: '10px', letterSpacing: 1.1,
    }).setOrigin(0.5).setDepth(70);
  }

  private startLevel() {
    this.pieceViews.forEach((view) => view.destroy(true));
    this.pieceViews.clear();
    this.trayViews.forEach((view) => view.destroy(true));
    this.trayViews = [];
    this.resultLayer?.destroy(true);
    this.resultLayer = null;
    this.pieces = buildRescuePieces(RESCUE_LEVELS[this.level], this.level);
    this.removed.clear();
    this.tray = [];
    this.moves = 0;
    this.locked = false;
    this.failed = false;
    this.resolved = false;
    this.levelCopy.setText(`第 ${this.level + 1} 关`);
    this.moveCopy.setText('0 条已抽');
    this.instruction.setText('抽发亮的线，三条同色消除');
    this.options.onStatus('');
    this.kitten.setPosition(195, 188).setScale(1).setAlpha(1).setAngle(0).setDepth(6);
    this.cage.setPosition(195, 188).setAlpha(1).setAngle(0);
    this.drawPieces();
    this.drawTray();
    this.resetController();
  }

  private drawPieces() {
    this.pieceViews.forEach((view) => view.destroy(true));
    this.pieceViews.clear();
    this.pieces.filter((piece) => !this.removed.has(piece.id)).forEach((piece, index) => {
      const available = this.activeBlockers(piece).length === 0;
      const view = this.createCord(piece, available);
      view.setDepth(12 + piece.stage * 9 + index * 0.01);
      this.pieceViews.set(piece.id, view);
    });
  }

  private createCord(piece: RescuePiece, available: boolean) {
    const swatch = RESCUE_SWATCH[piece.color];
    const shadow = this.add.rectangle(2, 4, 88, 21, PALETTE.ink, 0.12).setOrigin(0.5);
    const glow = this.add.rectangle(0, 0, 94, 28, 0xffffff, available ? 0.46 : 0.06)
      .setStrokeStyle(available ? 2 : 0, swatch, available ? 0.42 : 0);
    const cord = this.add.rectangle(0, 0, 84, 18, swatch, available ? 0.96 : 0.64).setStrokeStyle(2, 0xffffff, 0.58);
    const leftCap = this.add.circle(-42, 0, 10, swatch, available ? 1 : 0.7).setStrokeStyle(1.5, 0xffffff, 0.62);
    const rightCap = this.add.circle(42, 0, 10, swatch, available ? 1 : 0.7).setStrokeStyle(1.5, 0xffffff, 0.62);
    const shine = this.add.rectangle(-14, -4, 38, 3, 0xffffff, 0.34).setAngle(-2);
    const glyph = this.add.text(0, -1, RESCUE_GLYPH[piece.color], {
      color: '#fffaf5', fontFamily: DISPLAY_FONT, fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 102, 42, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.tapPiece(piece.id));
    const view = this.add.container(piece.x, piece.y, [shadow, glow, cord, leftCap, rightCap, shine, glyph, hit])
      .setRotation(piece.rotation);
    view.setData('glow', glow);
    if (available && !this.options.reducedMotion) {
      this.tweens.add({ targets: glow, alpha: { from: 0.24, to: 0.62 }, duration: 780, yoyo: true, repeat: -1 });
    }
    return view;
  }

  private activeBlockers(piece: RescuePiece) {
    return piece.blockers.filter((id) => !this.removed.has(id));
  }

  private tapPiece(id: string) {
    if (this.locked || this.failed || this.resolved) return;
    this.toyAudio.unlock();
    const piece = this.pieces.find((candidate) => candidate.id === id);
    const view = this.pieceViews.get(id);
    if (!piece || !view) return;
    moveController(this, this.controller, piece.x + 40, piece.y + 24, this.options);
    const blockers = this.activeBlockers(piece);
    if (blockers.length) {
      this.instruction.setText(`上面还压着 ${blockers.length} 条，先抽亮的`);
      this.toyAudio.tone(155, 0.1, 0.03);
      this.tweens.add({
        targets: view,
        x: { from: piece.x - 5, to: piece.x + 5 },
        duration: motionDuration(this.options, 55),
        yoyo: true,
        repeat: this.options.reducedMotion ? 0 : 3,
        onComplete: () => view.setX(piece.x),
      });
      blockers.slice(0, 4).forEach((blockerId) => {
        const blockerView = this.pieceViews.get(blockerId);
        const blockerGlow = blockerView?.getData('glow') as Phaser.GameObjects.Rectangle | undefined;
        if (blockerGlow) this.tweens.add({ targets: blockerGlow, alpha: 0.9, duration: 110, yoyo: true, repeat: 1 });
      });
      lightHaptic(10, this.options);
      return;
    }
    this.pullPiece(piece, view);
  }

  private pullPiece(piece: RescuePiece, view: Phaser.GameObjects.Container) {
    this.locked = true;
    this.moves += 1;
    this.moveCopy.setText(`${this.moves} 条已抽`);
    this.instruction.setText('收到托盘里');
    this.toyAudio.tone(420, 0.08, 0.028);
    lightHaptic(11, this.options);
    this.tweens.add({
      targets: view,
      x: 52 + this.tray.length * 47.5,
      y: 625,
      rotation: 0,
      scale: 0.48,
      duration: motionDuration(this.options, 360),
      ease: 'Cubic.InOut',
      onComplete: () => {
        this.removed.add(piece.id);
        this.tray.push(piece.color);
        view.destroy(true);
        this.pieceViews.delete(piece.id);
        this.drawTray();
        this.resolveTray(piece.color);
      },
    });
  }

  private drawTray() {
    this.trayViews.forEach((view) => view.destroy(true));
    this.trayViews = this.tray.map((color, index) => {
      const swatch = RESCUE_SWATCH[color];
      const shadow = this.add.ellipse(0, 5, 34, 10, PALETTE.ink, 0.08);
      const body = this.add.rectangle(0, 0, 34, 22, swatch, 0.96).setStrokeStyle(1.5, 0xffffff, 0.72);
      const left = this.add.circle(-16, 0, 6, swatch, 1).setStrokeStyle(1, 0xffffff, 0.66);
      const right = this.add.circle(16, 0, 6, swatch, 1).setStrokeStyle(1, 0xffffff, 0.66);
      const glyph = this.add.text(0, 0, RESCUE_GLYPH[color], {
        color: '#fffaf5', fontFamily: DISPLAY_FONT, fontSize: '12px', fontStyle: 'bold',
      }).setOrigin(0.5);
      return this.add.container(52 + index * 47.5, 625, [shadow, body, left, right, glyph]).setDepth(60);
    });
  }

  private resolveTray(lastColor: RescueColor) {
    const matches = this.tray.map((color, index) => color === lastColor ? index : -1).filter((index) => index >= 0);
    if (matches.length >= 3) {
      const removedIndices = matches.slice(0, 3);
      const targets = removedIndices.map((index) => this.trayViews[index]);
      this.toyAudio.tone(680, 0.1, 0.035);
      this.toyAudio.tone(940, 0.12, 0.028, 0.07);
      burstGlyphs(this, 195, 622, ['◆', '·', '●', '○', '·'], this.options);
      this.tweens.add({
        targets,
        y: 594,
        scale: 1.3,
        alpha: 0,
        duration: motionDuration(this.options, 300),
        ease: 'Back.In',
        onComplete: () => {
          const removedSet = new Set(removedIndices);
          this.tray = this.tray.filter((_, index) => !removedSet.has(index));
          this.drawTray();
          lightHaptic([10, 18, 16], this.options);
          this.afterTraySettled();
        },
      });
      return;
    }
    this.afterTraySettled();
  }

  private afterTraySettled() {
    if (this.removed.size === this.pieces.length && this.tray.length === 0) {
      this.completeLevel();
      return;
    }
    if (this.tray.length >= 7) {
      this.failLevel();
      return;
    }
    this.locked = false;
    this.drawPieces();
    this.instruction.setText('继续抽亮着的线');
    this.resetController();
  }

  private failLevel() {
    this.failed = true;
    this.locked = true;
    this.options.onStatus('托盘满了，再理一次');
    this.toyAudio.tone(145, 0.18, 0.04);
    if (!this.options.reducedMotion) this.cameras.main.shake(150, 0.004);
    lightHaptic([22, 32, 22], this.options);
    this.showResult('塞满了', '戳一下重新抽', () => this.startLevel());
  }

  private completeLevel() {
    this.resolved = true;
    this.locked = true;
    const score = Math.max(180, 1_350 + this.level * 220 - this.moves * 22);
    const nextLevel = Math.min(this.level + 1, RESCUE_LEVELS.length - 1);
    // Persistence is notified before the cage, cat or result animation starts.
    this.options.onLevelChange(nextLevel, score);
    this.options.onStatus(this.level === RESCUE_LEVELS.length - 1 ? '小猫彻底自由了' : `第 ${this.level + 1} 只救到了`);
    this.toyAudio.tone(720, 0.12, 0.045);
    this.toyAudio.tone(1_040, 0.2, 0.04, 0.09);
    lightHaptic([16, 22, 28], this.options);
    this.tweens.add({
      targets: this.cage,
      y: 40,
      angle: this.options.reducedMotion ? 0 : 8,
      alpha: 0,
      duration: motionDuration(this.options, 620),
      ease: 'Back.In',
    });
    this.tweens.add({
      targets: this.kitten,
      y: 510,
      scale: 1.45,
      duration: motionDuration(this.options, 780),
      ease: 'Bounce.Out',
      onComplete: () => burstGlyphs(this, 195, 420, ['●', '◆', '○', '●', '○', '·', '◆'], this.options),
    });
    this.kitten.setDepth(95);
    this.time.delayedCall(motionDuration(this.options, 620), () => {
      this.showResult(this.level === RESCUE_LEVELS.length - 1 ? '全救到了' : '跑出来了', `${this.moves} 条，${score} 分`);
    });
    this.time.delayedCall(motionDuration(this.options, 1_550), () => {
      this.level = nextLevel;
      this.startLevel();
    });
  }

  private showResult(titleCopy: string, noteCopy: string, onTap?: () => void) {
    this.resultLayer?.destroy(true);
    const shade = this.add.rectangle(-195, -392, 390, 780, 0x6f4b58, 0.12).setOrigin(0);
    const card = this.add.rectangle(0, 0, 278, 152, PALETTE.paper, 0.97)
      .setStrokeStyle(1.4, PALETTE.rose, 0.24);
    const title = this.add.text(0, -24, titleCopy, {
      color: '#6f4b58', fontFamily: DISPLAY_FONT, fontSize: '28px', letterSpacing: 2,
    }).setOrigin(0.5);
    const note = this.add.text(0, 24, noteCopy, {
      color: '#a47282', fontFamily: BODY_FONT, fontSize: '12px', letterSpacing: 1.4,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 300, 176, 0xffffff, 0.001);
    if (onTap) hit.setInteractive({ useHandCursor: true }).once('pointerdown', onTap);
    this.resultLayer = this.add.container(195, 392, [shade, card, title, note, hit]).setDepth(100).setAlpha(0).setScale(0.92);
    this.tweens.add({
      targets: this.resultLayer,
      alpha: 1,
      scale: 1,
      duration: motionDuration(this.options, 240),
      ease: 'Back.Out',
    });
  }

  private resetController() {
    this.tweens.killTweensOf([this.controller.halo, this.controller.image]);
    this.tweens.add({
      targets: [this.controller.halo, this.controller.image],
      x: 334,
      y: 724,
      duration: motionDuration(this.options, 260),
      ease: 'Sine.InOut',
    });
    if (!this.options.reducedMotion) {
      this.tweens.add({
        targets: this.controller.image,
        alpha: { from: 0.72, to: 1 },
        scale: { from: 0.92, to: 1.06 },
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
    }
  }
}

function createGameConfig(parent: HTMLElement, scene: Phaser.Scene) {
  return createHighDpiGameConfig(parent, scene, '#fff7f1');
}

export function createWaterGame(parent: HTMLElement, options: WaterRescueGameOptions) {
  return new Phaser.Game(createGameConfig(parent, new WaterSortScene(options)));
}

export function createRescueGame(parent: HTMLElement, options: WaterRescueGameOptions) {
  return new Phaser.Game(createGameConfig(parent, new RescueScene(options)));
}
