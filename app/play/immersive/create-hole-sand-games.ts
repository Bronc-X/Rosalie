import Phaser from 'phaser';

import { createHighDpiGameConfig, logicalPointer, prepareHighDpiScene } from './game-rendering';
import { addMotifGlyph } from './game-visual-motifs';

export type ImmersiveGameOptions = {
  initialLevel: number;
  muted: boolean;
  reducedMotion: boolean;
  onLevelChange: (level: number, score: number) => void;
  onStatus: (copy: string) => void;
};

type StatusCard = {
  layer: Phaser.GameObjects.Container;
  title: Phaser.GameObjects.Text;
  note: Phaser.GameObjects.Text;
};

class ToneKit {
  private context: AudioContext | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  unlock() {
    if (this.context) return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) this.context = new AudioContextConstructor();
  }

  play(frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = 'sine') {
    if (this.scene.sound.mute || !this.context) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  destroy() {
    void this.context?.close();
    this.context = null;
  }
}

function addBackdrop(scene: Phaser.Scene, tint: 'peach' | 'lilac') {
  const art = scene.add.graphics();
  art.fillStyle(tint === 'peach' ? 0xffd6bb : 0xd7d5ff, 0.45).fillCircle(380, 115, 192);
  art.fillStyle(tint === 'peach' ? 0xf2d5ef : 0xf4d3e7, 0.55).fillCircle(10, 650, 210);
  art.fillStyle(0xffffff, 0.68).fillRoundedRect(18, 74, 354, 632, 42);
  art.lineStyle(1, 0xffffff, 0.92).strokeRoundedRect(18, 74, 354, 632, 42);

  for (let index = 0; index < 20; index += 1) {
    const x = 28 + ((index * 83) % 334);
    const y = 96 + ((index * 107) % 584);
    art.fillStyle(index % 3 === 0 ? 0xde81a3 : 0xf0b77e, index % 4 === 0 ? 0.36 : 0.2)
      .fillCircle(x, y, index % 5 === 0 ? 2.3 : 1.25);
  }
}

function createStatusCard(scene: Phaser.Scene): StatusCard {
  const cardShadow = scene.add.rectangle(0, 8, 290, 166, 0x9c687c, 0.12);
  const card = scene.add.rectangle(0, 0, 290, 166, 0xfffbf8, 0.97).setStrokeStyle(1, 0xffffff, 1);
  const shine = scene.add.ellipse(-58, -60, 110, 14, 0xffffff, 0.62);
  const title = scene.add.text(0, -20, '', {
    color: '#76525f',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '28px',
  }).setOrigin(0.5);
  const note = scene.add.text(0, 24, '', {
    color: '#a77987',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '12px',
    letterSpacing: 1.6,
    align: 'center',
  }).setOrigin(0.5);
  const layer = scene.add.container(195, 392, [cardShadow, card, shine, title, note])
    .setDepth(50)
    .setVisible(false);
  return { layer, title, note };
}

function revealStatus(scene: Phaser.Scene, status: StatusCard, title: string, note: string, reducedMotion: boolean) {
  status.title.setText(title);
  status.note.setText(note);
  status.layer.setVisible(true).setAlpha(0).setScale(0.9);
  scene.tweens.add({
    targets: status.layer,
    alpha: 1,
    scale: 1,
    duration: reducedMotion ? 1 : 260,
    ease: 'Back.Out',
  });
}

function hideStatus(status: StatusCard) {
  status.layer.setVisible(false);
}

function vibrate(pattern: number | number[], reducedMotion: boolean) {
  if (reducedMotion || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate?.(pattern);
}

function hitStop(scene: Phaser.Scene, reducedMotion: boolean, duration = 48) {
  if (reducedMotion) return;
  const tweenScale = scene.tweens.timeScale;
  const clockScale = scene.time.timeScale;
  scene.tweens.timeScale = 0.06;
  scene.time.timeScale = 0.06;
  window.setTimeout(() => {
    if (!scene.sys.isActive()) return;
    scene.tweens.timeScale = tweenScale;
    scene.time.timeScale = clockScale;
  }, duration);
}

function gameConfig(parent: HTMLElement, scene: Phaser.Scene): Phaser.Types.Core.GameConfig {
  return createHighDpiGameConfig(parent, scene, '#fff5ef');
}

// ---------------------------------------------------------------------------
// Black hole

type HoleLevel = {
  target: number;
  objects: number;
  blockers: number;
  seconds: number;
  startRadius: number;
  growth: number;
  drift: number;
};

const HOLE_LEVELS: HoleLevel[] = [
  { target: 8, objects: 11, blockers: 2, seconds: 34, startRadius: 25, growth: 1.55, drift: 0 },
  { target: 10, objects: 13, blockers: 3, seconds: 32, startRadius: 24, growth: 1.48, drift: 8 },
  { target: 12, objects: 15, blockers: 4, seconds: 30, startRadius: 23, growth: 1.42, drift: 13 },
  { target: 14, objects: 17, blockers: 5, seconds: 28, startRadius: 22, growth: 1.36, drift: 18 },
];

type HoleObject = {
  view: Phaser.GameObjects.Container;
  radius: number;
  vx: number;
  vy: number;
  consumed: boolean;
  blocker: boolean;
};

const HOLE_OBJECT_COLORS = [0xf4a7bf, 0xf3bd78, 0xbec7f1, 0xaed9c0, 0xf8d8a5];

class HoleScene extends Phaser.Scene {
  private readonly options: ImmersiveGameOptions;
  private readonly toneKit: ToneKit;
  private level: number;
  private score = 0;
  private eaten = 0;
  private remaining = 0;
  private radius = 25;
  private dragging = false;
  private locked = false;
  private awaitingRetry = false;
  private obstacleCooldown = 0;
  private hole!: Phaser.GameObjects.Container;
  private holeCore!: Phaser.GameObjects.Arc;
  private holeRim!: Phaser.GameObjects.Arc;
  private controller!: Phaser.GameObjects.Image;
  private target = new Phaser.Math.Vector2(195, 585);
  private objects: HoleObject[] = [];
  private objectLayer!: Phaser.GameObjects.Container;
  private levelCopy!: Phaser.GameObjects.Text;
  private countCopy!: Phaser.GameObjects.Text;
  private timerCopy!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Rectangle;
  private instruction!: Phaser.GameObjects.Text;
  private status!: StatusCard;

  constructor(options: ImmersiveGameOptions) {
    super('hole');
    this.options = options;
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, HOLE_LEVELS.length - 1);
    this.toneKit = new ToneKit(this);
  }

  preload() {
    this.load.image('hole-controller', '/soft-pull-controller.webp');
  }

  create() {
    prepareHighDpiScene(this);
    this.sound.mute = this.options.muted;
    this.cameras.main.setBackgroundColor('#fff4ee');
    addBackdrop(this, 'peach');
    this.drawPlayfield();
    this.objectLayer = this.add.container(0, 0).setDepth(5);
    this.createHole();
    this.createHud();
    this.status = createStatusCard(this);
    this.startLevel(this.level);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.toneKit.unlock();
      if (this.awaitingRetry) {
        this.startLevel(this.level);
        return;
      }
      if (this.locked) return;
      this.dragging = true;
      const position = logicalPointer(this, pointer);
      this.setTarget(position.x, position.y);
      this.controller.setAlpha(1);
      this.toneKit.play(310, 0.035, 0.02);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragging && !this.locked) {
        const position = logicalPointer(this, pointer);
        this.setTarget(position.x, position.y);
      }
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
      this.controller.setAlpha(0.9);
    });
    this.input.on('pointerupoutside', () => {
      this.dragging = false;
      this.controller.setAlpha(0.9);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.toneKit.destroy());
  }

  update(_time: number, delta: number) {
    if (this.locked) return;
    const frame = Math.min(delta, 36) / 1_000;
    this.remaining = Math.max(0, this.remaining - frame);
    this.obstacleCooldown = Math.max(0, this.obstacleCooldown - frame);
    this.updateTimer();
    if (this.remaining <= 0) {
      this.failLevel();
      return;
    }

    const follow = this.options.reducedMotion ? 0.34 : 0.2;
    const nextX = Phaser.Math.Linear(this.hole.x, this.target.x, follow);
    const nextY = Phaser.Math.Linear(this.hole.y, this.target.y, follow);
    this.hole.setPosition(nextX, nextY);

    const bounds = { left: 42, right: 348, top: 156, bottom: 654 };
    for (const object of this.objects) {
      if (object.consumed) continue;
      if (object.vx || object.vy) {
        object.view.x += object.vx * frame;
        object.view.y += object.vy * frame;
        if (object.view.x < bounds.left + object.radius || object.view.x > bounds.right - object.radius) object.vx *= -1;
        if (object.view.y < bounds.top + object.radius || object.view.y > bounds.bottom - object.radius) object.vy *= -1;
        object.view.x = Phaser.Math.Clamp(object.view.x, bounds.left + object.radius, bounds.right - object.radius);
        object.view.y = Phaser.Math.Clamp(object.view.y, bounds.top + object.radius, bounds.bottom - object.radius);
      }

      const dx = object.view.x - this.hole.x;
      const dy = object.view.y - this.hole.y;
      const distance = Math.max(0.01, Math.hypot(dx, dy));
      const canEat = !object.blocker && object.radius <= this.radius * 0.75;
      if (canEat && distance < this.radius * 0.68) {
        this.swallow(object);
      } else if ((!canEat || object.blocker) && distance < this.radius * 0.72 + object.radius) {
        this.bumpFrom(object, dx, dy, distance);
      }
    }
  }

  private drawPlayfield() {
    const field = this.add.graphics();
    field.fillStyle(0xfffbf7, 0.42).fillRoundedRect(34, 138, 322, 536, 34);
    field.lineStyle(1, 0xd8a9b8, 0.18).strokeRoundedRect(34, 138, 322, 536, 34);
    field.fillStyle(0x8f6071, 0.08).fillEllipse(195, 663, 250, 21);
    for (let index = 0; index < 8; index += 1) {
      const ring = this.add.circle(195, 590, 52 + index * 22, 0xffffff, 0)
        .setStrokeStyle(1, index % 2 ? 0xefac83 : 0xdc8da9, 0.07)
        .setDepth(1);
      if (!this.options.reducedMotion) {
        this.tweens.add({
          targets: ring,
          alpha: { from: 0.18, to: 0.7 },
          scale: { from: 0.96, to: 1.04 },
          duration: 1_500 + index * 130,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  private createHole() {
    const shadow = this.add.ellipse(2, 13, 75, 28, 0x5b3850, 0.18);
    const glow = this.add.circle(0, 0, 38, 0xf3a9c4, 0.16).setStrokeStyle(2, 0xffffff, 0.78);
    this.holeRim = this.add.circle(0, 0, 32, 0x8e6178, 0.94).setStrokeStyle(4, 0xe8b1c2, 0.72);
    this.holeCore = this.add.circle(0, 0, 24, 0x2f2430, 0.98);
    const gleam = this.add.ellipse(-9, -11, 18, 7, 0xffffff, 0.16).setRotation(-0.35);
    this.controller = this.add.image(0, 1, 'hole-controller').setDisplaySize(50, 50).setAlpha(0.9);
    this.hole = this.add.container(195, 585, [shadow, glow, this.holeRim, this.holeCore, gleam, this.controller]).setDepth(20);
    if (!this.options.reducedMotion) {
      this.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.42 }, scale: { from: 0.9, to: 1.1 }, duration: 1_050, yoyo: true, repeat: -1 });
    }
  }

  private createHud() {
    const serif = { color: '#76515f', fontFamily: 'Georgia, "Times New Roman", serif' };
    this.levelCopy = this.add.text(43, 96, '', { ...serif, fontSize: '13px', letterSpacing: 2 }).setDepth(30);
    this.countCopy = this.add.text(195, 96, '', { ...serif, fontSize: '13px', letterSpacing: 1 }).setOrigin(0.5, 0).setDepth(30);
    this.timerCopy = this.add.text(347, 96, '', { ...serif, fontSize: '13px' }).setOrigin(1, 0).setDepth(30);
    this.add.rectangle(195, 122, 302, 5, 0xe7cbd3, 0.42).setOrigin(0.5).setDepth(30);
    this.timeBar = this.add.rectangle(44, 122, 302, 5, 0xd986a3, 0.82).setOrigin(0, 0.5).setDepth(31);
    this.instruction = this.add.text(195, 719, '按住图标，拖动黑洞', {
      color: '#8d6673',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      letterSpacing: 1.8,
    }).setOrigin(0.5).setDepth(30);
  }

  private startLevel(level: number) {
    this.level = Phaser.Math.Clamp(level, 0, HOLE_LEVELS.length - 1);
    const config = HOLE_LEVELS[this.level];
    this.locked = false;
    this.awaitingRetry = false;
    this.dragging = false;
    this.score = 0;
    this.eaten = 0;
    this.remaining = config.seconds;
    this.radius = config.startRadius;
    this.target.set(195, 585);
    this.hole.setPosition(195, 585).setScale(this.radius / 25).setVisible(true).setAlpha(1);
    this.controller.setAlpha(0.9);
    this.objectLayer.removeAll(true);
    this.objects = [];
    hideStatus(this.status);
    this.spawnObjects(config);
    this.levelCopy.setText(`第 ${this.level + 1} 关`);
    this.countCopy.setText(`0 / ${config.target}`);
    this.instruction.setText('按住图标，拖动黑洞');
    this.options.onStatus('');
    this.updateTimer();
  }

  private spawnObjects(config: HoleLevel) {
    const slots = [
      [82, 198], [162, 180], [274, 205], [319, 282], [97, 292], [202, 273], [276, 353], [80, 390],
      [165, 382], [322, 445], [105, 480], [232, 473], [294, 548], [65, 559], [176, 535], [330, 615],
      [132, 630], [244, 617], [57, 244], [341, 188], [52, 452], [345, 364],
    ];
    const shuffled = Phaser.Utils.Array.Shuffle([...slots]);
    const total = config.objects + config.blockers;
    for (let index = 0; index < total; index += 1) {
      const blocker = index >= config.objects;
      const slot = shuffled[index % shuffled.length];
      const radius = blocker
        ? 35 + ((index * 7) % 15)
        : 8 + ((index * 5 + this.level * 2) % 11);
      const view = this.makeWorldObject(radius, blocker, index);
      view.setPosition(slot[0] + Phaser.Math.Between(-6, 6), slot[1] + Phaser.Math.Between(-5, 5));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = config.drift ? config.drift * Phaser.Math.FloatBetween(0.55, 1.15) : 0;
      const object: HoleObject = {
        view,
        radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        consumed: false,
        blocker,
      };
      this.objects.push(object);
      this.objectLayer.add(view);
    }
  }

  private makeWorldObject(radius: number, blocker: boolean, index: number) {
    const shadow = this.add.ellipse(2, radius * 0.56, radius * 1.8, radius * 0.62, 0x76505f, blocker ? 0.17 : 0.11);
    const base = this.add.circle(0, 0, radius, blocker ? 0xc4b0d9 : HOLE_OBJECT_COLORS[index % HOLE_OBJECT_COLORS.length], 1)
      .setStrokeStyle(blocker ? 4 : 2, 0xffffff, blocker ? 0.72 : 0.86);
    const lowlight = this.add.ellipse(radius * 0.16, radius * 0.25, radius * 1.18, radius * 0.72, blocker ? 0x846d9e : 0xb56f86, blocker ? 0.2 : 0.1);
    const shine = this.add.ellipse(-radius * 0.3, -radius * 0.34, radius * 0.74, radius * 0.34, 0xffffff, 0.56).setRotation(-0.25);
    const motif = addMotifGlyph(this, blocker ? 2 : index, radius * (blocker ? 0.82 : 0.9), 0xffffff, blocker ? 0.78 : 0.58);
    return this.add.container(0, 0, [shadow, base, lowlight, shine, motif]);
  }

  private setTarget(x: number, y: number) {
    this.target.set(Phaser.Math.Clamp(x, 48, 342), Phaser.Math.Clamp(y, 158, 650));
  }

  private updateTimer() {
    const config = HOLE_LEVELS[this.level];
    const ratio = Phaser.Math.Clamp(this.remaining / config.seconds, 0, 1);
    this.timerCopy.setText(`${Math.ceil(this.remaining)}s`);
    this.timeBar.displayWidth = 302 * ratio;
    this.timeBar.setFillStyle(ratio < 0.25 ? 0xd2607f : 0xd986a3, 0.82);
  }

  private swallow(object: HoleObject) {
    if (object.consumed || this.locked) return;
    object.consumed = true;
    this.eaten += 1;
    const comboBonus = Math.round(object.radius * 7 + this.remaining * 0.5);
    this.score += comboBonus;
    this.radius = Math.min(52, this.radius + HOLE_LEVELS[this.level].growth);
    const newScale = this.radius / 25;
    this.countCopy.setText(`${this.eaten} / ${HOLE_LEVELS[this.level].target}`);
    this.toneKit.play(430 + this.eaten * 24, 0.07, 0.035, 0, 'triangle');
    hitStop(this, this.options.reducedMotion, 38);
    this.tweens.add({
      targets: object.view,
      x: this.hole.x,
      y: this.hole.y,
      scale: 0,
      angle: object.view.angle + 120,
      alpha: 0,
      duration: this.options.reducedMotion ? 90 : 260,
      ease: 'Quad.In',
      onComplete: () => object.view.destroy(),
    });
    this.tweens.add({
      targets: this.hole,
      scale: newScale * 1.08,
      duration: this.options.reducedMotion ? 1 : 100,
      yoyo: true,
      onComplete: () => this.hole.setScale(newScale),
    });
    this.suctionSpark(object.view.x, object.view.y);
    if (this.eaten >= HOLE_LEVELS[this.level].target) this.completeLevel();
  }

  private bumpFrom(object: HoleObject, dx: number, dy: number, distance: number) {
    if (this.obstacleCooldown > 0 || this.locked) return;
    this.obstacleCooldown = 0.5;
    const push = this.radius * 0.82 + object.radius - distance + 8;
    const nextX = Phaser.Math.Clamp(this.hole.x - (dx / distance) * push, 48, 342);
    const nextY = Phaser.Math.Clamp(this.hole.y - (dy / distance) * push, 158, 650);
    this.hole.setPosition(nextX, nextY);
    this.target.set(nextX, nextY);
    this.remaining = Math.max(0, this.remaining - 1.2);
    this.instruction.setText(object.blocker ? '大件。现在吞不下' : '先去吃更小的');
    this.toneKit.play(145, 0.1, 0.035, 0, 'square');
    vibrate(18, this.options.reducedMotion);
    if (!this.options.reducedMotion) {
      this.cameras.main.shake(90, 0.0035);
      this.tweens.add({ targets: object.view, scale: 1.08, duration: 70, yoyo: true });
    }
  }

  private suctionSpark(x: number, y: number) {
    const count = this.options.reducedMotion ? 3 : 7;
    for (let index = 0; index < count; index += 1) {
      const dot = this.add.circle(x, y, 2 + (index % 2), index % 2 ? 0xf1b478 : 0xe38aa8, 0.86).setDepth(25);
      this.tweens.add({
        targets: dot,
        x: this.hole.x,
        y: this.hole.y,
        alpha: 0,
        scale: 0.3,
        delay: index * 18,
        duration: this.options.reducedMotion ? 100 : 280,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private completeLevel() {
    if (this.locked) return;
    this.locked = true;
    this.dragging = false;
    const finalScore = this.score + Math.round(this.remaining * 18) + this.level * 180;
    const nextLevel = Math.min(this.level + 1, HOLE_LEVELS.length - 1);
    this.options.onLevelChange(nextLevel, finalScore);
    this.options.onStatus(`${finalScore} 分`);
    this.toneKit.play(720, 0.12, 0.05, 0, 'triangle');
    this.toneKit.play(960, 0.13, 0.045, 0.09, 'triangle');
    vibrate([16, 28, 25], this.options.reducedMotion);
    if (!this.options.reducedMotion) this.cameras.main.shake(130, 0.004);
    const isLast = this.level === HOLE_LEVELS.length - 1;
    revealStatus(this, this.status, isLast ? '全吞了' : '胃口升级', isLast ? `${finalScore} 分，点一下再来` : `${finalScore} 分，下一关`, this.options.reducedMotion);
    if (isLast) {
      this.awaitingRetry = true;
      return;
    }
    this.time.delayedCall(this.options.reducedMotion ? 420 : 1_050, () => this.startLevel(nextLevel));
  }

  private failLevel() {
    if (this.locked) return;
    this.locked = true;
    this.dragging = false;
    this.awaitingRetry = true;
    this.options.onStatus('本关重试');
    this.toneKit.play(160, 0.14, 0.035, 0, 'square');
    revealStatus(this, this.status, '没吃饱', '不扣存档，点一下重试', this.options.reducedMotion);
  }
}

export function createHoleGame(parent: HTMLElement, options: ImmersiveGameOptions) {
  return new Phaser.Game(gameConfig(parent, new HoleScene(options)));
}

// ---------------------------------------------------------------------------
// Sand match

type SandLevel = {
  colors: number;
  moves: number;
  goal: number;
  comboWindow: number;
};

const SAND_LEVELS: SandLevel[] = [
  { colors: 4, moves: 16, goal: 620, comboWindow: 2_500 },
  { colors: 5, moves: 17, goal: 900, comboWindow: 2_350 },
  { colors: 5, moves: 18, goal: 1_260, comboWindow: 2_150 },
  { colors: 6, moves: 20, goal: 1_700, comboWindow: 1_950 },
];

const SAND_COLORS = [0xe792ad, 0xf2b772, 0xa7c9b3, 0xaebae9, 0xd6a9d2, 0x8ecbd0];
const SAND_ROWS = 8;
const SAND_COLS = 6;
const SAND_CELL = 49;
const SAND_LEFT = 73;
const SAND_TOP = 186;

type SandTile = {
  row: number;
  col: number;
  color: number;
  view: Phaser.GameObjects.Container;
};

class SandScene extends Phaser.Scene {
  private readonly options: ImmersiveGameOptions;
  private readonly toneKit: ToneKit;
  private level: number;
  private score = 0;
  private moves = 0;
  private combo = 0;
  private lastClearAt = -10_000;
  private locked = false;
  private awaitingRetry = false;
  private grid: Array<Array<SandTile | null>> = [];
  private tileLayer!: Phaser.GameObjects.Container;
  private controller!: Phaser.GameObjects.Image;
  private controllerScale = 1;
  private levelCopy!: Phaser.GameObjects.Text;
  private moveCopy!: Phaser.GameObjects.Text;
  private scoreCopy!: Phaser.GameObjects.Text;
  private comboCopy!: Phaser.GameObjects.Text;
  private goalBar!: Phaser.GameObjects.Rectangle;
  private instruction!: Phaser.GameObjects.Text;
  private status!: StatusCard;

  constructor(options: ImmersiveGameOptions) {
    super('sand');
    this.options = options;
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, SAND_LEVELS.length - 1);
    this.toneKit = new ToneKit(this);
  }

  preload() {
    this.load.image('sand-controller', '/soft-pull-controller.webp');
  }

  create() {
    prepareHighDpiScene(this);
    this.sound.mute = this.options.muted;
    this.cameras.main.setBackgroundColor('#fff5ef');
    addBackdrop(this, 'lilac');
    this.drawBoardFrame();
    this.tileLayer = this.add.container(0, 0).setDepth(6);
    this.createHud();
    this.controller = this.add.image(333, 658, 'sand-controller').setDisplaySize(66, 66).setAlpha(0.86).setDepth(35);
    this.controllerScale = this.controller.scaleX;
    this.status = createStatusCard(this);
    this.startLevel(this.level);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.toneKit.unlock();
      if (this.awaitingRetry) {
        this.startLevel(this.level);
        return;
      }
      if (this.locked) return;
      const position = logicalPointer(this, pointer);
      const cell = this.cellAt(position.x, position.y);
      if (!cell) return;
      this.moveController(cell.row, cell.col);
      this.clearGroupAt(cell.row, cell.col);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.toneKit.destroy());
  }

  private drawBoardFrame() {
    const frame = this.add.graphics();
    frame.fillStyle(0x866073, 0.1).fillRoundedRect(45, 164, 300, 430, 32);
    frame.fillStyle(0xfffcf8, 0.83).fillRoundedRect(42, 158, 306, 430, 32);
    frame.lineStyle(1, 0xffffff, 1).strokeRoundedRect(42, 158, 306, 430, 32);
    frame.fillStyle(0xd6b0c5, 0.12).fillRoundedRect(58, 174, 274, 398, 24);
    frame.fillStyle(0x8f6071, 0.09).fillEllipse(195, 590, 260, 18);
  }

  private createHud() {
    const serif = { color: '#76515f', fontFamily: 'Georgia, "Times New Roman", serif' };
    this.levelCopy = this.add.text(43, 94, '', { ...serif, fontSize: '13px', letterSpacing: 2 }).setDepth(30);
    this.scoreCopy = this.add.text(195, 94, '', { ...serif, fontSize: '13px' }).setOrigin(0.5, 0).setDepth(30);
    this.moveCopy = this.add.text(347, 94, '', { ...serif, fontSize: '13px' }).setOrigin(1, 0).setDepth(30);
    this.add.rectangle(195, 121, 302, 5, 0xdacbdc, 0.5).setOrigin(0.5).setDepth(30);
    this.goalBar = this.add.rectangle(44, 121, 302, 5, 0xdb83a5, 0.88).setOrigin(0, 0.5).setDepth(31);
    this.comboCopy = this.add.text(57, 612, '', {
      color: '#d8779b',
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      fontStyle: 'italic',
    }).setDepth(30);
    this.instruction = this.add.text(195, 718, '点同色相连的沙糖块', {
      color: '#8d6673',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      letterSpacing: 1.8,
    }).setOrigin(0.5).setDepth(30);
  }

  private startLevel(level: number) {
    this.level = Phaser.Math.Clamp(level, 0, SAND_LEVELS.length - 1);
    const config = SAND_LEVELS[this.level];
    this.score = 0;
    this.moves = config.moves;
    this.combo = 0;
    this.lastClearAt = -10_000;
    this.locked = false;
    this.awaitingRetry = false;
    this.tileLayer.removeAll(true);
    this.grid = Array.from({ length: SAND_ROWS }, () => Array<SandTile | null>(SAND_COLS).fill(null));
    hideStatus(this.status);
    this.populateBoard(false);
    this.levelCopy.setText(`第 ${this.level + 1} 关`);
    this.instruction.setText('点同色相连的沙糖块');
    this.comboCopy.setText('');
    this.controller.setPosition(333, 658).setAlpha(0.86).setScale(this.controllerScale);
    this.options.onStatus('');
    this.refreshHud();
  }

  private tilePosition(row: number, col: number) {
    return {
      x: SAND_LEFT + col * SAND_CELL,
      y: SAND_TOP + row * SAND_CELL,
    };
  }

  private cellAt(x: number, y: number) {
    const col = Math.round((x - SAND_LEFT) / SAND_CELL);
    const row = Math.round((y - SAND_TOP) / SAND_CELL);
    if (row < 0 || row >= SAND_ROWS || col < 0 || col >= SAND_COLS) return null;
    const center = this.tilePosition(row, col);
    if (Math.abs(x - center.x) > SAND_CELL / 2 || Math.abs(y - center.y) > SAND_CELL / 2) return null;
    return { row, col };
  }

  private populateBoard(animated: boolean) {
    for (let row = SAND_ROWS - 1; row >= 0; row -= 1) {
      for (let col = 0; col < SAND_COLS; col += 1) {
        if (this.grid[row][col]) continue;
        const color = this.chooseColor(row, col);
        const destination = this.tilePosition(row, col);
        const startY = animated ? SAND_TOP - (SAND_ROWS - row) * 34 : destination.y;
        const tile = this.makeTile(row, col, color, destination.x, startY);
        this.grid[row][col] = tile;
        if (animated) {
          this.tweens.add({
            targets: tile.view,
            y: destination.y,
            duration: this.options.reducedMotion ? 80 : 280 + row * 17,
            ease: 'Back.Out',
          });
        }
      }
    }
    if (!this.hasValidGroup()) this.forcePair();
  }

  private chooseColor(row: number, col: number) {
    const colorCount = SAND_LEVELS[this.level].colors;
    const below = row + 1 < SAND_ROWS ? this.grid[row + 1][col] : null;
    const left = col > 0 ? this.grid[row][col - 1] : null;
    if (below && Phaser.Math.FloatBetween(0, 1) < 0.2) return below.color;
    if (left && Phaser.Math.FloatBetween(0, 1) < 0.18) return left.color;
    return Phaser.Math.Between(0, colorCount - 1);
  }

  private makeTile(row: number, col: number, color: number, x: number, y: number) {
    const size = 41;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x76505f, 0.11).fillRoundedRect(-size / 2 + 2, -size / 2 + 5, size, size, 13);
    graphics.fillStyle(SAND_COLORS[color], 0.98).fillRoundedRect(-size / 2, -size / 2, size, size, 13);
    graphics.lineStyle(1.5, 0xffffff, 0.76).strokeRoundedRect(-size / 2, -size / 2, size, size, 13);
    graphics.fillStyle(0xffffff, 0.42).fillEllipse(-7, -9, 15, 7);
    graphics.fillStyle(0xffffff, 0.2).fillCircle(9, 9, 2.2);
    graphics.fillStyle(0x8e6276, 0.1).fillCircle(-9, 10, 1.4);
    const motif = addMotifGlyph(this, color + 2, 15, 0xffffff, 0.34);
    const view = this.add.container(x, y, [graphics, motif]).setDepth(7);
    this.tileLayer.add(view);
    if (!this.options.reducedMotion && (row + col) % 5 === 0) {
      this.tweens.add({ targets: view, angle: { from: -0.8, to: 0.8 }, duration: 1_200 + row * 80, yoyo: true, repeat: -1 });
    }
    return { row, col, color, view } satisfies SandTile;
  }

  private moveController(row: number, col: number) {
    const position = this.tilePosition(row, col);
    this.controller.setAlpha(1);
    this.tweens.killTweensOf(this.controller);
    this.tweens.add({
      targets: this.controller,
      x: position.x + 18,
      y: position.y + 20,
      scale: this.controllerScale * 0.82,
      duration: this.options.reducedMotion ? 1 : 120,
      ease: 'Quad.Out',
      yoyo: true,
    });
  }

  private clearGroupAt(row: number, col: number) {
    const tile = this.grid[row][col];
    if (!tile) return;
    const group = this.findGroup(row, col);
    if (group.length < 2) {
      this.combo = 0;
      this.comboCopy.setText('');
      this.instruction.setText('一粒不算一伙');
      this.toneKit.play(165, 0.08, 0.025, 0, 'square');
      if (!this.options.reducedMotion) {
        this.tweens.add({ targets: tile.view, x: tile.view.x + 5, duration: 48, yoyo: true, repeat: 2 });
      }
      return;
    }

    this.locked = true;
    this.moves -= 1;
    const config = SAND_LEVELS[this.level];
    this.combo = this.time.now - this.lastClearAt <= config.comboWindow ? Math.min(5, this.combo + 1) : 1;
    this.lastClearAt = this.time.now;
    const gained = group.length * group.length * 11 * this.combo;
    this.score += gained;
    this.comboCopy.setText(this.combo > 1 ? `连击 ×${this.combo}` : `+${gained}`);
    this.instruction.setText(group.length >= 6 ? '这一把很大' : '继续接上');
    this.options.onStatus(this.combo > 1 ? `连击 ×${this.combo}` : `+${gained}`);
    this.toneKit.play(390 + group.length * 24, 0.075, 0.04, 0, 'triangle');
    hitStop(this, this.options.reducedMotion, group.length >= 6 ? 64 : 42);
    if (this.combo > 1) this.toneKit.play(610 + this.combo * 55, 0.08, 0.03, 0.055, 'sine');
    vibrate(this.combo > 2 ? [12, 22, 18] : 12, this.options.reducedMotion);

    for (const member of group) {
      this.grid[member.row][member.col] = null;
      this.popTile(member, tile.view.x, tile.view.y);
    }
    this.refreshHud();
    this.time.delayedCall(this.options.reducedMotion ? 90 : 250, () => this.collapseAndRefill());
  }

  private findGroup(startRow: number, startCol: number) {
    const start = this.grid[startRow][startCol];
    if (!start) return [];
    const found: SandTile[] = [];
    const queue: Array<[number, number]> = [[startRow, startCol]];
    const visited = new Set<string>();
    while (queue.length) {
      const [row, col] = queue.shift()!;
      const key = `${row}:${col}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const tile = this.grid[row]?.[col];
      if (!tile || tile.color !== start.color) continue;
      found.push(tile);
      if (row > 0) queue.push([row - 1, col]);
      if (row + 1 < SAND_ROWS) queue.push([row + 1, col]);
      if (col > 0) queue.push([row, col - 1]);
      if (col + 1 < SAND_COLS) queue.push([row, col + 1]);
    }
    return found;
  }

  private popTile(tile: SandTile, originX: number, originY: number) {
    this.tweens.add({
      targets: tile.view,
      scale: 0,
      alpha: 0,
      angle: Phaser.Math.Between(-18, 18),
      delay: Phaser.Math.Between(0, this.options.reducedMotion ? 12 : 90),
      duration: this.options.reducedMotion ? 75 : 190,
      ease: 'Back.In',
      onComplete: () => tile.view.destroy(),
    });
    const particles = this.options.reducedMotion ? 1 : 3;
    for (let index = 0; index < particles; index += 1) {
      const grain = this.add.circle(tile.view.x, tile.view.y, 2 + index, SAND_COLORS[tile.color], 0.82).setDepth(28);
      this.tweens.add({
        targets: grain,
        x: originX + Phaser.Math.Between(-34, 34),
        y: originY + Phaser.Math.Between(-30, 30),
        alpha: 0,
        scale: 0.2,
        duration: this.options.reducedMotion ? 100 : 320,
        onComplete: () => grain.destroy(),
      });
    }
  }

  private collapseAndRefill() {
    for (let col = 0; col < SAND_COLS; col += 1) {
      const survivors: SandTile[] = [];
      for (let row = SAND_ROWS - 1; row >= 0; row -= 1) {
        const tile = this.grid[row][col];
        if (tile) survivors.push(tile);
        this.grid[row][col] = null;
      }
      survivors.forEach((tile, index) => {
        const targetRow = SAND_ROWS - 1 - index;
        const destination = this.tilePosition(targetRow, col);
        tile.row = targetRow;
        tile.col = col;
        this.grid[targetRow][col] = tile;
        this.tweens.add({
          targets: tile.view,
          y: destination.y,
          duration: this.options.reducedMotion ? 70 : 250,
          ease: 'Bounce.Out',
        });
      });
    }
    this.populateBoard(true);
    this.time.delayedCall(this.options.reducedMotion ? 120 : 430, () => {
      const config = SAND_LEVELS[this.level];
      if (this.score >= config.goal) {
        this.completeLevel();
      } else if (this.moves <= 0) {
        this.failLevel();
      } else {
        this.locked = false;
        if (!this.hasValidGroup()) {
          this.instruction.setText('自动搅匀一次');
          this.reshuffle();
        }
      }
    });
  }

  private hasValidGroup() {
    for (let row = 0; row < SAND_ROWS; row += 1) {
      for (let col = 0; col < SAND_COLS; col += 1) {
        const tile = this.grid[row][col];
        if (!tile) continue;
        if (col + 1 < SAND_COLS && this.grid[row][col + 1]?.color === tile.color) return true;
        if (row + 1 < SAND_ROWS && this.grid[row + 1][col]?.color === tile.color) return true;
      }
    }
    return false;
  }

  private forcePair() {
    const first = this.grid[SAND_ROWS - 1][0];
    const second = this.grid[SAND_ROWS - 1][1];
    if (!first || !second) return;
    second.view.destroy();
    const position = this.tilePosition(second.row, second.col);
    const replacement = this.makeTile(second.row, second.col, first.color, position.x, position.y);
    this.grid[second.row][second.col] = replacement;
  }

  private reshuffle() {
    this.locked = true;
    this.tileLayer.removeAll(true);
    this.grid = Array.from({ length: SAND_ROWS }, () => Array<SandTile | null>(SAND_COLS).fill(null));
    this.populateBoard(true);
    this.time.delayedCall(this.options.reducedMotion ? 120 : 440, () => {
      this.locked = false;
      this.instruction.setText('点同色相连的沙糖块');
    });
  }

  private refreshHud() {
    const config = SAND_LEVELS[this.level];
    this.scoreCopy.setText(`${this.score} / ${config.goal}`);
    this.moveCopy.setText(`${this.moves} 手`);
    this.goalBar.displayWidth = 302 * Phaser.Math.Clamp(this.score / config.goal, 0, 1);
  }

  private completeLevel() {
    if (this.locked && this.awaitingRetry) return;
    this.locked = true;
    const finalScore = this.score + this.moves * 35 + this.level * 160;
    const nextLevel = Math.min(this.level + 1, SAND_LEVELS.length - 1);
    this.options.onLevelChange(nextLevel, finalScore);
    this.options.onStatus(`${finalScore} 分`);
    this.toneKit.play(690, 0.12, 0.045, 0, 'triangle');
    this.toneKit.play(920, 0.13, 0.04, 0.085, 'triangle');
    vibrate([14, 24, 22], this.options.reducedMotion);
    if (!this.options.reducedMotion) this.cameras.main.shake(120, 0.003);
    const isLast = this.level === SAND_LEVELS.length - 1;
    revealStatus(this, this.status, isLast ? '沙都懂了' : '这幅成了', isLast ? `${finalScore} 分，点一下再来` : `${finalScore} 分，下一幅`, this.options.reducedMotion);
    if (isLast) {
      this.awaitingRetry = true;
      return;
    }
    this.time.delayedCall(this.options.reducedMotion ? 420 : 1_050, () => this.startLevel(nextLevel));
  }

  private failLevel() {
    this.locked = true;
    this.awaitingRetry = true;
    this.combo = 0;
    this.comboCopy.setText('');
    this.options.onStatus('本关重试');
    this.toneKit.play(160, 0.14, 0.03, 0, 'square');
    revealStatus(this, this.status, '手数用完', '不扣存档，点一下重试', this.options.reducedMotion);
  }
}

export function createSandGame(parent: HTMLElement, options: ImmersiveGameOptions) {
  return new Phaser.Game(gameConfig(parent, new SandScene(options)));
}
