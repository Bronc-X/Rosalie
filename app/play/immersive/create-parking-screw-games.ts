import Phaser from 'phaser';

export type ImmersiveToyGameOptions = {
  initialLevel: number;
  muted: boolean;
  reducedMotion: boolean;
  onLevelChange: (level: number, score: number) => void;
  onStatus: (copy: string) => void;
};

const GAME_WIDTH = 390;
const GAME_HEIGHT = 780;
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const SANS = 'ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif';

class ToyScene extends Phaser.Scene {
  protected readonly options: ImmersiveToyGameOptions;
  private audioContext: AudioContext | null = null;

  constructor(key: string, options: ImmersiveToyGameOptions) {
    super(key);
    this.options = options;
  }

  protected motion(duration: number) {
    return this.options.reducedMotion ? 1 : duration;
  }

  protected unlockAudio() {
    if (this.options.muted || this.sound.mute || this.audioContext) return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) this.audioContext = new AudioContextConstructor();
  }

  protected tone(frequency: number, duration: number, volume: number, delay = 0) {
    if (this.options.muted || this.sound.mute || !this.audioContext) return;
    const start = this.audioContext.currentTime + delay;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.035, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  protected haptic(pattern: number | number[]) {
    if (this.options.reducedMotion || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    navigator.vibrate?.(pattern);
  }

  protected impact(intensity = 0.003) {
    if (this.options.reducedMotion) return;
    this.cameras.main.shake(90, intensity);
    this.cameras.main.zoomTo(1.012, 45, 'Quad.Out', true);
    this.time.delayedCall(58, () => this.cameras.main.zoomTo(1, 100, 'Quad.Out', true));
  }

  protected drawBackdrop(accent: number, warm: number) {
    this.cameras.main.setBackgroundColor('#fff7f2');
    const background = this.add.graphics();
    background.fillStyle(accent, 0.16).fillCircle(-8, 95, 170);
    background.fillStyle(warm, 0.2).fillCircle(402, 292, 190);
    background.fillStyle(0xbfc9ff, 0.12).fillCircle(24, 760, 210);
    background.fillStyle(0xffffff, 0.58).fillRoundedRect(16, 76, 358, 650, 44);
    background.lineStyle(1, 0xffffff, 0.9).strokeRoundedRect(16, 76, 358, 650, 44);

    for (let index = 0; index < 17; index += 1) {
      const x = 28 + ((index * 67) % 335);
      const y = 98 + ((index * 103) % 605);
      const dot = this.add.circle(x, y, index % 4 === 0 ? 2.2 : 1.25, index % 3 === 0 ? accent : warm, 0.3);
      if (!this.options.reducedMotion) {
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.12, to: 0.55 },
          duration: 1_250 + index * 47,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  protected sparkleBurst(x: number, y: number, colors: number[]) {
    const count = this.options.reducedMotion ? 3 : 9;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + 0.2;
      const distance = 28 + (index % 4) * 10;
      const particle = this.add.circle(x, y, index % 3 === 0 ? 4 : 2.5, colors[index % colors.length], 0.88).setDepth(30);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.25,
        alpha: 0,
        duration: this.motion(430 + (index % 3) * 80),
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy(),
      });
    }
  }
}

type Direction = 'left' | 'right' | 'up' | 'down';

type ParkingCarConfig = {
  id: string;
  x: number;
  y: number;
  length: 2 | 3;
  direction: Direction;
  color: number;
};

type ParkingCar = ParkingCarConfig & {
  view: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  removed: boolean;
};

type ParkingDrag = {
  car: ParkingCar;
  startX: number;
  startY: number;
};

const ROSE = 0xe99bb5;
const PEACH = 0xf4b57f;
const MINT = 0xaecfb8;
const LILAC = 0xb8addb;
const BUTTER = 0xe9ca75;
const SKY = 0x9fc6d8;
const BERRY = 0xcb7f9e;

const PARKING_LEVELS: ParkingCarConfig[][] = [
  [
    { id: 'a', x: 1, y: 1, length: 2, direction: 'right', color: ROSE },
    { id: 'b', x: 4, y: 0, length: 2, direction: 'down', color: MINT },
    { id: 'c', x: 3, y: 3, length: 2, direction: 'left', color: PEACH },
    { id: 'd', x: 1, y: 5, length: 2, direction: 'up', color: LILAC },
  ],
  [
    { id: 'a', x: 0, y: 4, length: 2, direction: 'up', color: PEACH },
    { id: 'b', x: 3, y: 5, length: 3, direction: 'left', color: LILAC },
    { id: 'c', x: 5, y: 1, length: 3, direction: 'down', color: MINT },
    { id: 'd', x: 2, y: 2, length: 2, direction: 'right', color: ROSE },
    { id: 'e', x: 2, y: 6, length: 2, direction: 'up', color: BUTTER },
  ],
  [
    { id: 'a', x: 1, y: 1, length: 2, direction: 'right', color: ROSE },
    { id: 'b', x: 4, y: 1, length: 2, direction: 'down', color: SKY },
    { id: 'c', x: 2, y: 4, length: 3, direction: 'left', color: PEACH },
    { id: 'd', x: 0, y: 3, length: 2, direction: 'down', color: MINT },
    { id: 'e', x: 0, y: 6, length: 2, direction: 'right', color: LILAC },
    { id: 'f', x: 3, y: 5, length: 2, direction: 'down', color: BUTTER },
    { id: 'g', x: 4, y: 0, length: 2, direction: 'left', color: BERRY },
  ],
  [
    { id: 'a', x: 0, y: 1, length: 2, direction: 'right', color: ROSE },
    { id: 'b', x: 3, y: 0, length: 2, direction: 'down', color: SKY },
    { id: 'c', x: 2, y: 3, length: 2, direction: 'left', color: PEACH },
    { id: 'd', x: 0, y: 3, length: 2, direction: 'down', color: MINT },
    { id: 'e', x: 1, y: 6, length: 2, direction: 'right', color: LILAC },
    { id: 'f', x: 4, y: 5, length: 2, direction: 'up', color: BUTTER },
    { id: 'g', x: 4, y: 4, length: 2, direction: 'left', color: BERRY },
    { id: 'h', x: 1, y: 4, length: 2, direction: 'up', color: 0xb7c99f },
  ],
];

const PARKING_GRID = {
  x: 54,
  y: 156,
  cell: 47,
  columns: 6,
  rows: 8,
};

function directionVector(direction: Direction) {
  if (direction === 'left') return { x: -1, y: 0 };
  if (direction === 'right') return { x: 1, y: 0 };
  if (direction === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function isHorizontal(direction: Direction) {
  return direction === 'left' || direction === 'right';
}

class ParkingScene extends ToyScene {
  private level = 0;
  private cars = new Map<string, ParkingCar>();
  private carsLayer!: Phaser.GameObjects.Container;
  private levelCopy!: Phaser.GameObjects.Text;
  private remainingCopy!: Phaser.GameObjects.Text;
  private hintCopy!: Phaser.GameObjects.Text;
  private statusCard!: Phaser.GameObjects.Container;
  private handHint!: Phaser.GameObjects.Image;
  private drag: ParkingDrag | null = null;
  private locked = false;
  private moves = 0;

  constructor(options: ImmersiveToyGameOptions) {
    super('parking', options);
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, PARKING_LEVELS.length - 1);
  }

  preload() {
    this.load.image('parking-controller', '/soft-pull-controller.webp');
  }

  create() {
    this.drawBackdrop(ROSE, PEACH);
    this.drawBoard();
    this.createHud();
    this.carsLayer = this.add.container(0, 0).setDepth(8);
    this.loadLevel();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.dragCar(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.releaseCar(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.releaseCar(pointer));
  }

  private drawBoard() {
    const { x, y, cell, columns, rows } = PARKING_GRID;
    const width = cell * columns;
    const height = cell * rows;
    const shadow = this.add.graphics().setDepth(2);
    shadow.fillStyle(0x9c7181, 0.12).fillRoundedRect(x - 11, y - 7, width + 22, height + 22, 30);
    const board = this.add.graphics().setDepth(3);
    board.fillStyle(0xfffdf9, 0.82).fillRoundedRect(x - 8, y - 10, width + 16, height + 16, 28);
    board.lineStyle(1, 0xc98aa0, 0.22).strokeRoundedRect(x - 8, y - 10, width + 16, height + 16, 28);
    for (let column = 1; column < columns; column += 1) {
      board.lineStyle(1, 0xd8a7b8, 0.12).lineBetween(x + column * cell, y + 9, x + column * cell, y + height - 9);
    }
    for (let row = 1; row < rows; row += 1) {
      board.lineStyle(1, 0xd8a7b8, 0.12).lineBetween(x + 9, y + row * cell, x + width - 9, y + row * cell);
    }

    const exits = this.add.graphics().setDepth(4);
    exits.fillStyle(0xf7d4e1, 0.42).fillRoundedRect(x + 92, y - 22, 98, 13, 7);
    exits.fillStyle(0xffd9b8, 0.38).fillRoundedRect(x + width - 4, y + 128, 22, 108, 8);
    exits.fillStyle(0xcadfd3, 0.45).fillRoundedRect(x + 95, y + height - 1, 92, 20, 8);
    exits.fillStyle(0xcac3e8, 0.4).fillRoundedRect(x - 18, y + 132, 22, 102, 8);
  }

  private createHud() {
    this.add.text(40, 98, 'CLEAR THE LOT', {
      color: '#b87c91', fontFamily: SANS, fontSize: '10px', letterSpacing: 3,
    }).setDepth(12);
    this.add.text(40, 116, '挪了下车', {
      color: '#76515f', fontFamily: SERIF, fontSize: '27px', letterSpacing: 2,
    }).setDepth(12);
    this.levelCopy = this.add.text(350, 105, '', {
      color: '#8e6875', fontFamily: SANS, fontSize: '12px', letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(12);
    this.remainingCopy = this.add.text(350, 126, '', {
      color: '#b58694', fontFamily: SANS, fontSize: '11px',
    }).setOrigin(1, 0).setDepth(12);

    this.handHint = this.add.image(114, 672, 'parking-controller').setDisplaySize(72, 72).setDepth(13).setOrigin(0.5, 0.62);
    this.hintCopy = this.add.text(157, 659, '点一下\n或顺箭头轻扫', {
      color: '#906a76', fontFamily: SANS, fontSize: '11px', lineSpacing: 6, letterSpacing: 1,
    }).setDepth(13);
    if (!this.options.reducedMotion) {
      this.tweens.add({ targets: this.handHint, x: 126, angle: 4, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    const card = this.add.rectangle(0, 0, 258, 78, 0xfffbf7, 0.96).setStrokeStyle(1, 0xffffff, 1);
    const title = this.add.text(0, -9, '', { color: '#76515f', fontFamily: SERIF, fontSize: '22px' }).setOrigin(0.5);
    const note = this.add.text(0, 19, '', { color: '#b17b8c', fontFamily: SANS, fontSize: '10px', letterSpacing: 1.5 }).setOrigin(0.5);
    this.statusCard = this.add.container(195, 365, [card, title, note]).setDepth(40).setVisible(false);
    this.statusCard.setData({ title, note });
  }

  private loadLevel() {
    this.carsLayer.removeAll(true);
    this.cars.clear();
    this.drag = null;
    this.locked = false;
    this.moves = 0;
    this.statusCard.setVisible(false);
    PARKING_LEVELS[this.level].forEach((config) => this.createCar(config));
    this.levelCopy.setText(`LEVEL ${String(this.level + 1).padStart(2, '0')}`);
    this.refreshRemaining();
    this.hintCopy.setText('点一下\n或顺箭头轻扫');
    this.options.onStatus(`挪车 · 第 ${this.level + 1} 关`);
  }

  private createCar(config: ParkingCarConfig) {
    const horizontal = isHorizontal(config.direction);
    const width = horizontal ? config.length * PARKING_GRID.cell - 10 : PARKING_GRID.cell - 11;
    const height = horizontal ? PARKING_GRID.cell - 11 : config.length * PARKING_GRID.cell - 10;
    const centerX = PARKING_GRID.x + (config.x + (horizontal ? config.length / 2 : 0.5)) * PARKING_GRID.cell;
    const centerY = PARKING_GRID.y + (config.y + (horizontal ? 0.5 : config.length / 2)) * PARKING_GRID.cell;

    const shell = this.add.graphics();
    shell.fillStyle(0x6e4d59, 0.13).fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 14);
    shell.fillStyle(config.color, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    shell.lineStyle(2, 0xffffff, 0.6).strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 13);
    shell.fillStyle(0xffffff, 0.22).fillRoundedRect(-width / 2 + 7, -height / 2 + 6, horizontal ? width * 0.46 : width - 14, horizontal ? height - 15 : height * 0.45, 8);

    const wheelOffsetX = horizontal ? width * 0.27 : width * 0.37;
    const wheelOffsetY = horizontal ? height * 0.39 : height * 0.27;
    const wheelWidth = horizontal ? 14 : 5;
    const wheelHeight = horizontal ? 5 : 14;
    const wheels = [
      this.add.ellipse(-wheelOffsetX, -wheelOffsetY, wheelWidth, wheelHeight, 0x674f59, 0.72),
      this.add.ellipse(wheelOffsetX, -wheelOffsetY, wheelWidth, wheelHeight, 0x674f59, 0.72),
      this.add.ellipse(-wheelOffsetX, wheelOffsetY, wheelWidth, wheelHeight, 0x674f59, 0.72),
      this.add.ellipse(wheelOffsetX, wheelOffsetY, wheelWidth, wheelHeight, 0x674f59, 0.72),
    ];

    const vector = directionVector(config.direction);
    const arrow = this.add.triangle(
      vector.x * Math.max(10, width / 2 - 13),
      vector.y * Math.max(10, height / 2 - 13),
      -7, -6, -7, 6, 8, 0,
      0xffffff, 0.82,
    ).setRotation(config.direction === 'down' ? Math.PI / 2 : config.direction === 'left' ? Math.PI : config.direction === 'up' ? -Math.PI / 2 : 0);
    const view = this.add.container(centerX, centerY, [shell, ...wheels, arrow]).setSize(width, height);
    view.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    const car: ParkingCar = { ...config, view, homeX: centerX, homeY: centerY, removed: false };
    this.cars.set(config.id, car);
    this.carsLayer.add(view);
    view.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.beginDrag(car, pointer));
  }

  private beginDrag(car: ParkingCar, pointer: Phaser.Input.Pointer) {
    if (this.locked || car.removed) return;
    this.unlockAudio();
    this.drag = { car, startX: pointer.x, startY: pointer.y };
    car.view.setDepth(20);
    this.tweens.killTweensOf(car.view);
    this.tweens.add({ targets: car.view, scale: 1.035, duration: this.motion(90), ease: 'Quad.Out' });
    this.tone(340, 0.035, 0.018);
  }

  private dragCar(pointer: Phaser.Input.Pointer) {
    if (!this.drag || this.locked) return;
    const { car, startX, startY } = this.drag;
    const vector = directionVector(car.direction);
    const projected = Phaser.Math.Clamp((pointer.x - startX) * vector.x + (pointer.y - startY) * vector.y, 0, 34);
    car.view.setPosition(car.homeX + vector.x * projected, car.homeY + vector.y * projected);
  }

  private releaseCar(pointer: Phaser.Input.Pointer) {
    if (!this.drag) return;
    const { car, startX, startY } = this.drag;
    this.drag = null;
    if (this.locked || car.removed) return;
    const vector = directionVector(car.direction);
    const dx = pointer.x - startX;
    const dy = pointer.y - startY;
    const forward = dx * vector.x + dy * vector.y;
    const cross = Math.abs(dx * vector.y - dy * vector.x);
    const isTap = Math.hypot(dx, dy) < 15;
    if (isTap || (forward > 23 && cross < Math.max(28, forward * 0.85))) {
      this.tryExit(car);
      return;
    }
    this.hintCopy.setText('顺着箭头\n再轻轻推一下');
    this.resetCar(car, true);
  }

  private tryExit(car: ParkingCar) {
    const blockers = this.findBlockers(car);
    this.moves += 1;
    if (blockers.length > 0) {
      this.tone(165, 0.07, 0.025);
      this.haptic(12);
      this.hintCopy.setText('这辆被挡着\n先挪前面的');
      this.resetCar(car, true);
      blockers.forEach((blocker) => {
        this.tweens.add({
          targets: blocker.view,
          scale: { from: 1, to: 1.055 },
          duration: this.motion(110),
          yoyo: true,
          repeat: this.options.reducedMotion ? 0 : 1,
        });
      });
      return;
    }

    this.locked = true;
    car.removed = true;
    car.view.disableInteractive();
    const vector = directionVector(car.direction);
    this.tone(430, 0.06, 0.035);
    this.tone(690, 0.08, 0.025, 0.045);
    this.haptic(16);
    this.impact(0.0022);
    this.sparkleBurst(car.view.x, car.view.y, [car.color, 0xffffff, PEACH]);
    this.tweens.add({
      targets: car.view,
      x: car.homeX + vector.x * 480,
      y: car.homeY + vector.y * 620,
      angle: vector.x === 0 ? vector.y * 2 : -vector.x * 2,
      scale: 0.96,
      duration: this.motion(440),
      ease: 'Cubic.In',
      onComplete: () => {
        car.view.destroy();
        this.locked = false;
        this.refreshRemaining();
        if ([...this.cars.values()].every((item) => item.removed)) this.completeLevel();
      },
    });
  }

  private resetCar(car: ParkingCar, bump: boolean) {
    const vector = directionVector(car.direction);
    const crossX = vector.y * (bump ? 4 : 0);
    const crossY = -vector.x * (bump ? 4 : 0);
    this.tweens.add({
      targets: car.view,
      x: bump ? car.homeX + crossX : car.homeX,
      y: bump ? car.homeY + crossY : car.homeY,
      scale: 1,
      duration: this.motion(90),
      yoyo: bump && !this.options.reducedMotion,
      repeat: bump && !this.options.reducedMotion ? 2 : 0,
      onComplete: () => car.view.setPosition(car.homeX, car.homeY).setDepth(0).setScale(1),
    });
  }

  private occupiedCells(car: ParkingCar) {
    const cells: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < car.length; index += 1) {
      cells.push({
        x: car.x + (isHorizontal(car.direction) ? index : 0),
        y: car.y + (isHorizontal(car.direction) ? 0 : index),
      });
    }
    return cells;
  }

  private findBlockers(car: ParkingCar) {
    const occupied = new Map<string, ParkingCar>();
    this.cars.forEach((candidate) => {
      if (candidate.removed || candidate.id === car.id) return;
      this.occupiedCells(candidate).forEach((cell) => occupied.set(`${cell.x}:${cell.y}`, candidate));
    });

    const blockers = new Set<ParkingCar>();
    if (car.direction === 'right') {
      for (let x = car.x + car.length; x < PARKING_GRID.columns; x += 1) {
        const blocker = occupied.get(`${x}:${car.y}`);
        if (blocker) blockers.add(blocker);
      }
    } else if (car.direction === 'left') {
      for (let x = car.x - 1; x >= 0; x -= 1) {
        const blocker = occupied.get(`${x}:${car.y}`);
        if (blocker) blockers.add(blocker);
      }
    } else if (car.direction === 'down') {
      for (let y = car.y + car.length; y < PARKING_GRID.rows; y += 1) {
        const blocker = occupied.get(`${car.x}:${y}`);
        if (blocker) blockers.add(blocker);
      }
    } else {
      for (let y = car.y - 1; y >= 0; y -= 1) {
        const blocker = occupied.get(`${car.x}:${y}`);
        if (blocker) blockers.add(blocker);
      }
    }
    return [...blockers];
  }

  private refreshRemaining() {
    const remaining = [...this.cars.values()].filter((car) => !car.removed).length;
    this.remainingCopy.setText(`还剩 ${remaining} 辆`);
  }

  private completeLevel() {
    this.locked = true;
    const score = Math.max(180, 1_050 + this.level * 120 - Math.max(0, this.moves - PARKING_LEVELS[this.level].length) * 55);
    const nextLevel = Math.min(this.level + 1, PARKING_LEVELS.length - 1);
    // Persist before any transition so a refresh during the celebration cannot lose progress.
    this.options.onLevelChange(nextLevel, score);
    this.options.onStatus(this.level === PARKING_LEVELS.length - 1 ? '停车场全清' : `第 ${this.level + 2} 关已解锁`);
    this.showStatus(this.level === PARKING_LEVELS.length - 1 ? '收工' : '清场', `${score} 分 · 存档完成`);
    this.tone(740, 0.12, 0.045);
    this.tone(980, 0.13, 0.035, 0.09);
    this.haptic([18, 32, 24]);
    this.time.delayedCall(this.motion(1_180), () => {
      this.level = nextLevel;
      this.loadLevel();
    });
  }

  private showStatus(titleCopy: string, noteCopy: string) {
    const title = this.statusCard.getData('title') as Phaser.GameObjects.Text;
    const note = this.statusCard.getData('note') as Phaser.GameObjects.Text;
    title.setText(titleCopy);
    note.setText(noteCopy);
    this.statusCard.setVisible(true).setAlpha(0).setScale(0.9);
    this.tweens.add({ targets: this.statusCard, alpha: 1, scale: 1, duration: this.motion(240), ease: 'Back.Out' });
  }
}

type ScrewColor = 'rose' | 'peach' | 'mint' | 'lilac' | 'sky';

type ScrewLevel = {
  layers: ScrewColor[][];
};

type ScrewPiece = {
  id: string;
  color: ScrewColor;
  view: Phaser.GameObjects.Container;
};

const SCREW_COLORS: Record<ScrewColor, { fill: number; dark: number; mark: string }> = {
  rose: { fill: 0xe89ab4, dark: 0x9e5f78, mark: '×' },
  peach: { fill: 0xf0b077, dark: 0xa66f45, mark: '—' },
  mint: { fill: 0xaacdb5, dark: 0x668f76, mark: '+' },
  lilac: { fill: 0xb9acd9, dark: 0x746a9b, mark: '◇' },
  sky: { fill: 0x9dc6d8, dark: 0x5e8294, mark: '•' },
};

const SCREW_LEVELS: ScrewLevel[] = [
  {
    layers: [
      ['rose', 'peach', 'rose', 'peach', 'rose', 'peach'],
      ['mint', 'lilac', 'mint', 'lilac', 'mint', 'lilac'],
    ],
  },
  {
    layers: [
      ['rose', 'mint', 'peach', 'rose', 'mint', 'peach'],
      ['lilac', 'rose', 'lilac', 'mint', 'lilac', 'peach'],
      ['mint', 'rose', 'mint', 'rose', 'mint', 'rose'],
    ],
  },
  {
    layers: [
      ['rose', 'peach', 'mint', 'rose', 'peach', 'mint'],
      ['lilac', 'rose', 'lilac', 'peach', 'lilac', 'mint', 'sky'],
      ['sky', 'rose', 'sky', 'peach', 'rose', 'peach', 'rose', 'peach'],
    ],
  },
  {
    layers: [
      ['rose', 'peach', 'mint', 'rose', 'peach', 'mint'],
      ['lilac', 'sky', 'rose', 'peach', 'mint', 'lilac'],
      ['lilac', 'sky', 'sky', 'rose', 'peach', 'rose', 'peach', 'rose', 'peach'],
      ['mint', 'lilac', 'sky', 'mint', 'lilac', 'sky', 'mint', 'lilac', 'sky'],
    ],
  },
];

const BOLT_POSITIONS = [
  { x: 108, y: 225 },
  { x: 195, y: 205 },
  { x: 282, y: 225 },
  { x: 126, y: 315 },
  { x: 195, y: 302 },
  { x: 264, y: 315 },
  { x: 108, y: 405 },
  { x: 195, y: 423 },
  { x: 282, y: 405 },
];

class ScrewScene extends ToyScene {
  private level = 0;
  private currentLayer = 0;
  private tray: ScrewColor[] = [];
  private pieces: ScrewPiece[] = [];
  private boardLayer!: Phaser.GameObjects.Container;
  private trayLayer!: Phaser.GameObjects.Container;
  private levelCopy!: Phaser.GameObjects.Text;
  private layerCopy!: Phaser.GameObjects.Text;
  private hintCopy!: Phaser.GameObjects.Text;
  private statusCard!: Phaser.GameObjects.Container;
  private locked = false;
  private moves = 0;
  private failures = 0;

  constructor(options: ImmersiveToyGameOptions) {
    super('screw', options);
    this.level = Phaser.Math.Clamp(options.initialLevel, 0, SCREW_LEVELS.length - 1);
  }

  preload() {
    this.load.image('screw-controller', '/soft-pull-controller.webp');
  }

  create() {
    this.drawBackdrop(LILAC, PEACH);
    this.createHud();
    this.drawTray();
    this.boardLayer = this.add.container(0, 0).setDepth(7);
    this.trayLayer = this.add.container(0, 0).setDepth(16);
    this.loadLevel();
  }

  private createHud() {
    this.add.text(40, 98, 'LAYER BY LAYER', {
      color: '#9a80ae', fontFamily: SANS, fontSize: '10px', letterSpacing: 3,
    }).setDepth(20);
    this.add.text(40, 116, '打个螺丝', {
      color: '#72546b', fontFamily: SERIF, fontSize: '27px', letterSpacing: 2,
    }).setDepth(20);
    this.levelCopy = this.add.text(350, 104, '', {
      color: '#896d83', fontFamily: SANS, fontSize: '12px', letterSpacing: 1,
    }).setOrigin(1, 0).setDepth(20);
    this.layerCopy = this.add.text(350, 125, '', {
      color: '#ad849b', fontFamily: SANS, fontSize: '11px',
    }).setOrigin(1, 0).setDepth(20);

    const hand = this.add.image(112, 696, 'screw-controller').setDisplaySize(68, 68).setDepth(20).setOrigin(0.5, 0.64);
    this.hintCopy = this.add.text(154, 683, '点螺丝 · 三颗同色自动收走', {
      color: '#8d6a7c', fontFamily: SANS, fontSize: '10px', letterSpacing: 1,
    }).setDepth(20);
    if (!this.options.reducedMotion) {
      this.tweens.add({ targets: hand, angle: { from: -5, to: 7 }, y: { from: 694, to: 700 }, duration: 920, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    const card = this.add.rectangle(0, 0, 264, 82, 0xfffbf7, 0.97).setStrokeStyle(1, 0xffffff, 1);
    const title = this.add.text(0, -10, '', { color: '#72546b', fontFamily: SERIF, fontSize: '22px' }).setOrigin(0.5);
    const note = this.add.text(0, 19, '', { color: '#a97990', fontFamily: SANS, fontSize: '10px', letterSpacing: 1.4 }).setOrigin(0.5);
    this.statusCard = this.add.container(195, 372, [card, title, note]).setDepth(50).setVisible(false);
    this.statusCard.setData({ title, note });
  }

  private drawTray() {
    const tray = this.add.graphics().setDepth(14);
    tray.fillStyle(0x755668, 0.1).fillRoundedRect(42, 566, 306, 76, 25);
    tray.fillStyle(0xfffdf9, 0.88).fillRoundedRect(40, 561, 306, 76, 25);
    tray.lineStyle(1, 0xc795a9, 0.22).strokeRoundedRect(40, 561, 306, 76, 25);
    for (let index = 0; index < 7; index += 1) {
      tray.fillStyle(0xd9bdc8, 0.13).fillCircle(65 + index * 43, 599, 15);
      tray.lineStyle(1, 0xc89aab, 0.18).strokeCircle(65 + index * 43, 599, 15);
    }
    this.add.text(195, 650, '槽满就重来', {
      color: '#b28a9a', fontFamily: SANS, fontSize: '9px', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(14);
  }

  private loadLevel() {
    this.currentLayer = 0;
    this.tray = [];
    this.moves = 0;
    this.locked = false;
    this.statusCard.setVisible(false);
    this.levelCopy.setText(`LEVEL ${String(this.level + 1).padStart(2, '0')}`);
    this.renderTray();
    this.renderLayer();
    this.options.onStatus(`螺丝 · 第 ${this.level + 1} 关`);
  }

  private renderLayer() {
    this.boardLayer.removeAll(true);
    this.pieces = [];
    const level = SCREW_LEVELS[this.level];
    this.layerCopy.setText(`第 ${this.currentLayer + 1} / ${level.layers.length} 层`);

    for (let index = level.layers.length - 1; index >= this.currentLayer; index -= 1) {
      const relative = index - this.currentLayer;
      const width = 302 - relative * 12;
      const height = 326 - relative * 11;
      const x = 195 + relative * 3;
      const y = 334 + relative * 5;
      const plate = this.add.graphics();
      plate.fillStyle(0x725667, 0.08).fillRoundedRect(x - width / 2 + 3, y - height / 2 + 5, width, height, 42);
      plate.fillStyle(relative === 0 ? 0xfff8f4 : 0xf1e9f1, relative === 0 ? 0.96 : 0.74)
        .fillRoundedRect(x - width / 2, y - height / 2, width, height, 42);
      plate.lineStyle(2, relative === 0 ? 0xffffff : 0xc7b6cb, relative === 0 ? 0.92 : 0.25)
        .strokeRoundedRect(x - width / 2 + 1, y - height / 2 + 1, width - 2, height - 2, 41);
      if (relative === 0) {
        plate.fillStyle(0xe6bfd0, 0.15).fillEllipse(x - 64, y - 94, 118, 25);
        plate.fillStyle(0xc7cfed, 0.13).fillEllipse(x + 73, y + 91, 94, 22);
      }
      this.boardLayer.add(plate);
    }

    SCREW_LEVELS[this.level].layers[this.currentLayer].forEach((color, index) => {
      const position = BOLT_POSITIONS[index % BOLT_POSITIONS.length];
      this.createBolt(`${this.currentLayer}-${index}`, color, position.x, position.y);
    });
  }

  private createBolt(id: string, color: ScrewColor, x: number, y: number) {
    const palette = SCREW_COLORS[color];
    const shadow = this.add.circle(3, 5, 21, 0x66505c, 0.18);
    const rim = this.add.circle(0, 0, 21, palette.fill, 1).setStrokeStyle(2, 0xffffff, 0.72);
    const cap = this.add.circle(-3, -4, 13, 0xffffff, 0.22);
    const inner = this.add.circle(0, 0, 14, palette.fill, 0.9).setStrokeStyle(1, palette.dark, 0.26);
    const mark = this.add.text(0, -1, palette.mark, {
      color: `#${palette.dark.toString(16).padStart(6, '0')}`,
      fontFamily: SANS,
      fontSize: color === 'sky' ? '22px' : '17px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const view = this.add.container(x, y, [shadow, rim, cap, inner, mark]).setSize(48, 48);
    view.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
    const piece: ScrewPiece = { id, color, view };
    this.pieces.push(piece);
    this.boardLayer.add(view);
    view.on('pointerdown', () => this.takeBolt(piece));
    if (!this.options.reducedMotion) {
      this.tweens.add({ targets: cap, alpha: { from: 0.13, to: 0.36 }, duration: 1_100 + (x % 5) * 70, yoyo: true, repeat: -1 });
    }
  }

  private takeBolt(piece: ScrewPiece) {
    if (this.locked || !this.pieces.includes(piece)) return;
    this.unlockAudio();
    this.locked = true;
    this.moves += 1;
    this.pieces = this.pieces.filter((candidate) => candidate !== piece);
    piece.view.disableInteractive().setDepth(35);
    const slotIndex = Math.min(this.tray.length, 6);
    const targetX = 65 + slotIndex * 43;
    const targetY = 599;
    this.tone(410, 0.055, 0.025);
    this.tweens.add({
      targets: piece.view,
      x: targetX,
      y: targetY,
      angle: 115,
      scale: 0.66,
      duration: this.motion(245),
      ease: 'Back.In',
      onComplete: () => {
        piece.view.destroy();
        this.tray.push(piece.color);
        this.renderTray();
        this.resolveTray(piece.color);
      },
    });
  }

  private resolveTray(color: ScrewColor) {
    const matching = this.tray
      .map((candidate, index) => ({ candidate, index }))
      .filter((entry) => entry.candidate === color)
      .slice(0, 3);
    if (matching.length === 3) {
      this.tone(690, 0.08, 0.035);
      this.tone(920, 0.09, 0.025, 0.06);
      this.haptic(18);
      this.sparkleBurst(65 + matching[1].index * 43, 599, [SCREW_COLORS[color].fill, 0xffffff, PEACH]);
      const matchingViews = matching
        .map((entry) => this.trayLayer.list[entry.index])
        .filter((view): view is Phaser.GameObjects.GameObject => Boolean(view));
      this.tweens.add({
        targets: matchingViews,
        scale: 1.35,
        alpha: 0,
        y: '-=13',
        duration: this.motion(210),
        ease: 'Cubic.Out',
        onComplete: () => {
          matching.map((entry) => entry.index).sort((a, b) => b - a).forEach((index) => this.tray.splice(index, 1));
          this.renderTray();
          this.afterBoltSettled();
        },
      });
      return;
    }

    if (this.tray.length >= 7) {
      this.failLevel();
      return;
    }
    this.afterBoltSettled();
  }

  private afterBoltSettled() {
    if (this.pieces.length > 0) {
      this.locked = false;
      return;
    }
    this.currentLayer += 1;
    const layers = SCREW_LEVELS[this.level].layers;
    if (this.currentLayer >= layers.length) {
      this.completeLevel();
      return;
    }
    this.options.onStatus(`第 ${this.currentLayer + 1} 层露出来了`);
    this.hintCopy.setText('下一层 · 先凑已有颜色');
    this.impact(0.0018);
    this.time.delayedCall(this.motion(210), () => {
      this.renderLayer();
      this.locked = false;
    });
  }

  private renderTray() {
    if (!this.trayLayer) return;
    this.trayLayer.removeAll(true);
    this.tray.forEach((color, index) => {
      const palette = SCREW_COLORS[color];
      const shadow = this.add.circle(2, 3, 14, 0x6f5260, 0.14);
      const disc = this.add.circle(0, 0, 14, palette.fill, 1).setStrokeStyle(2, 0xffffff, 0.7);
      const mark = this.add.text(0, -1, palette.mark, {
        color: `#${palette.dark.toString(16).padStart(6, '0')}`,
        fontFamily: SANS,
        fontSize: '12px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.trayLayer.add(this.add.container(65 + index * 43, 599, [shadow, disc, mark]));
    });
  }

  private failLevel() {
    this.locked = true;
    this.failures += 1;
    this.tone(150, 0.13, 0.035);
    this.haptic([24, 32, 18]);
    this.impact(0.006);
    this.options.onStatus('槽满了 · 这一层重排');
    this.showStatus('卡住了', '先凑已有颜色 · 不扣存档');
    this.time.delayedCall(this.motion(1_000), () => this.loadLevel());
  }

  private completeLevel() {
    this.locked = true;
    const score = Math.max(240, 1_260 + this.level * 140 - this.moves * 18 - this.failures * 90);
    const nextLevel = Math.min(this.level + 1, SCREW_LEVELS.length - 1);
    // Persist before switching boards; a refresh during the result card stays on the unlocked level.
    this.options.onLevelChange(nextLevel, score);
    this.options.onStatus(this.level === SCREW_LEVELS.length - 1 ? '螺丝全拆完' : `第 ${this.level + 2} 关已解锁`);
    this.showStatus(this.level === SCREW_LEVELS.length - 1 ? '拆完了' : '板开了', `${score} 分 · 存档完成`);
    this.tone(760, 0.12, 0.04);
    this.tone(1_050, 0.13, 0.035, 0.085);
    this.haptic([16, 26, 26]);
    this.time.delayedCall(this.motion(1_180), () => {
      this.level = nextLevel;
      this.failures = 0;
      this.loadLevel();
    });
  }

  private showStatus(titleCopy: string, noteCopy: string) {
    const title = this.statusCard.getData('title') as Phaser.GameObjects.Text;
    const note = this.statusCard.getData('note') as Phaser.GameObjects.Text;
    title.setText(titleCopy);
    note.setText(noteCopy);
    this.statusCard.setVisible(true).setAlpha(0).setScale(0.9);
    this.tweens.add({ targets: this.statusCard, alpha: 1, scale: 1, duration: this.motion(240), ease: 'Back.Out' });
  }
}

function createGame(parent: HTMLElement, scene: Phaser.Scene, backgroundColor: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
  });
}

export function createParkingGame(parent: HTMLElement, options: ImmersiveToyGameOptions) {
  return createGame(parent, new ParkingScene(options), '#fff7f2');
}

export function createScrewGame(parent: HTMLElement, options: ImmersiveToyGameOptions) {
  return createGame(parent, new ScrewScene(options), '#fff7f2');
}
