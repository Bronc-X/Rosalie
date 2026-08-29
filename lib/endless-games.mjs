const WIDTH = 390;
const HEIGHT = 620;

export const ENDLESS_GAME_IDS = Object.freeze([
  'snake',
  'bubble',
  'merge',
  'breakout',
  'hop',
  'stack',
  'drift',
  'wave',
  'slice',
  'orbit',
]);

export const ENDLESS_GAME_WORLDS = Object.freeze({
  snake: Object.freeze({
    id: 'orchard-ribbon', motif: 'orchard',
    light: ['#fff4df', '#d9edcf', '#f6a8bd'], dark: ['#17251d', '#263b2b', '#532d3a'],
    shell: ['#e7f0d4', '#fff1da'], shellDark: ['#101b15', '#261a20'], accent: '#cf476f',
    phaseNames: ['果园晨雾', '枝叶醒来', '金果时刻', '夜行盛宴'],
    challenges: ['连续吃下 3 颗果实', '别让身体打结', '追上限时金果', '在加速中保持路线'],
  }),
  bubble: Object.freeze({
    id: 'prism-lagoon', motif: 'lagoon',
    light: ['#e8fbff', '#bde5ee', '#d8c7ff'], dark: ['#071c27', '#103243', '#292047'],
    shell: ['#d8f3f6', '#e7ddff'], shellDark: ['#071923', '#211a36'], accent: '#578fc9',
    phaseNames: ['浅水层', '折光带', '潮汐层', '深海棱镜'],
    challenges: ['维持 4 次连击', '优先击破小泡泡', '找到棱镜泡泡', '守住最后一次容错'],
  }),
  merge: Object.freeze({
    id: 'candy-archive', motif: 'archive',
    light: ['#fff8e8', '#f0d7b6', '#ddaed1'], dark: ['#241b17', '#3b2923', '#42253a'],
    shell: ['#f5dfbf', '#f4d8e9'], shellDark: ['#231912', '#321c2a'], accent: '#b66e8f',
    phaseNames: ['编号入库', '成对归档', '稀有藏品', '馆藏之夜'],
    challenges: ['先做出 16', '留出一个空角', '连续两步产生合并', '向 256 发起冲刺'],
  }),
  breakout: Object.freeze({
    id: 'lunar-gallery', motif: 'moon',
    light: ['#12192d', '#293766', '#d1bde8'], dark: ['#070a12', '#12182b', '#2b2340'],
    shell: ['#222e56', '#6f5a91'], shellDark: ['#070a11', '#171426'], accent: '#f2c969',
    phaseNames: ['月廊初亮', '星砖回声', '满月加速', '无重力夜'],
    challenges: ['连续命中 5 块砖', '守住剩余生命', '控制反弹角度', '清空高耐久砖'],
  }),
  hop: Object.freeze({
    id: 'cloud-atlas', motif: 'clouds',
    light: ['#e8f5ff', '#bad4f4', '#ffe0c9'], dark: ['#101b2c', '#1b2d49', '#443040'],
    shell: ['#cce5fa', '#ffe1cf'], shellDark: ['#0c1726', '#30202b'], accent: '#5c83bc',
    phaseNames: ['低空航线', '风层入口', '移动云门', '平流层'],
    challenges: ['穿过 3 道云门', '让起伏更小', '贴近门心通过', '跟上移动气流'],
  }),
  stack: Object.freeze({
    id: 'sunset-foundry', motif: 'foundry',
    light: ['#fff0cc', '#ed9c72', '#7a5b79'], dark: ['#23170f', '#42241c', '#302337'],
    shell: ['#f5b777', '#9b718f'], shellDark: ['#24150e', '#281c2c'], accent: '#db754f',
    phaseNames: ['落日地基', '高塔余晖', '侧风层', '灯火天际'],
    challenges: ['完成 2 次完美落点', '保住塔身宽度', '适应反向入场', '在高速中继续向上'],
  }),
  drift: Object.freeze({
    id: 'nocturne-garden', motif: 'night-road',
    light: ['#1d1930', '#3e2850', '#b55f85'], dark: ['#08070e', '#1b1225', '#3c1831'],
    shell: ['#302443', '#7d365e'], shellDark: ['#08070e', '#251122'], accent: '#f09cc1',
    phaseNames: ['花路入夜', '灯带加速', '逆风花潮', '午夜疾驰'],
    challenges: ['接住 2 枚花瓣', '连续避开 5 个障碍', '走高风险中线', '在花潮里保持节奏'],
  }),
  wave: Object.freeze({
    id: 'signal-reef', motif: 'signal',
    light: ['#071b29', '#0d4752', '#7bd0c7'], dark: ['#030c12', '#07252d', '#164b4c'],
    shell: ['#123845', '#4e938e'], shellDark: ['#030c11', '#0b3132'], accent: '#68e2d3',
    phaseNames: ['静默频道', '信号起伏', '窄门脉冲', '满频穿梭'],
    challenges: ['稳定穿过 3 道光门', '减少大幅升降', '从门心穿过', '在高频中保持波形'],
  }),
  slice: Object.freeze({
    id: 'velvet-orchard', motif: 'velvet',
    light: ['#2a101d', '#6d183c', '#d75e78'], dark: ['#0d070a', '#2f0c1e', '#64142f'],
    shell: ['#57152f', '#b23d59'], shellDark: ['#0d070a', '#3b0d24'], accent: '#ffbd83',
    phaseNames: ['幕布升起', '花束登场', '双切节拍', '午夜谢幕'],
    challenges: ['一划切开 2 朵花', '保住全部机会', '辨认暗色炸点', '维持连续切花'],
  }),
  orbit: Object.freeze({
    id: 'eclipse-observatory', motif: 'eclipse',
    light: ['#0a1025', '#24245a', '#bc7ee5'], dark: ['#040610', '#12132f', '#3c2358'],
    shell: ['#1b1f4c', '#704895'], shellDark: ['#040610', '#221531'], accent: '#dfb4ff',
    phaseNames: ['近地轨道', '双星交会', '引力乱流', '日蚀边缘'],
    challenges: ['收集一圈光点', '少用一次反转', '读清尖刺位置', '在高速轨道保持判断'],
  }),
});

export const ENDLESS_GAME_CATALOG = Object.freeze([
  Object.freeze({ id: 'snake', worldId: 'orchard-ribbon', objective: '金果会短暂出现', label: '樱桃长长', note: '滑动转弯', instruction: '滑动转弯，吃掉果实，别撞到自己。', glyph: '⌁', endless: true }),
  Object.freeze({ id: 'bubble', worldId: 'prism-lagoon', objective: '连击打开棱镜潮', label: '泡泡爆破', note: '戳破连击', instruction: '戳中下落泡泡，连击越久分越高。', glyph: '○', endless: true }),
  Object.freeze({ id: 'merge', worldId: 'candy-archive', objective: '连续合并提高倍率', label: '软糖合成', note: '滑动合并', instruction: '上下左右滑动，把同样编号归档。', glyph: '＋', endless: true }),
  Object.freeze({ id: 'breakout', worldId: 'lunar-gallery', objective: '每轮砖阵都会加深', label: '打碎月光', note: '接球破砖', instruction: '拖动控制器接球，清完一层继续下一层。', glyph: '◇', endless: true }),
  Object.freeze({ id: 'hop', worldId: 'cloud-atlas', objective: '门心通过获得连击', label: '云缝跳跃', note: '轻点起飞', instruction: '轻点向上跃，穿过越来越活跃的云门。', glyph: '↑', endless: true }),
  Object.freeze({ id: 'stack', worldId: 'sunset-foundry', objective: '完美落点保住宽度', label: '叠叠乐', note: '看准落下', instruction: '看准重合时落下，完美落点会连续加分。', glyph: '▰', endless: true }),
  Object.freeze({ id: 'drift', worldId: 'nocturne-garden', objective: '花瓣与闪避共享节奏', label: '花路漂移', note: '拖动闪避', instruction: '拖动控制器，避开障碍，接住高分花瓣。', glyph: '↝', endless: true }),
  Object.freeze({ id: 'wave', worldId: 'signal-reef', objective: '门心通过维持信号', label: '波形穿梭', note: '按住上升', instruction: '按住上升，松手下落，稳定穿过脉冲门。', glyph: '∿', endless: true }),
  Object.freeze({ id: 'slice', worldId: 'velvet-orchard', objective: '一划多切形成连击', label: '切开花期', note: '划开花朵', instruction: '一划可以切开多朵花，避开深色炸点。', glyph: '╱', endless: true }),
  Object.freeze({ id: 'orbit', worldId: 'eclipse-observatory', objective: '每圈速度与布局都会变化', label: '反向引力', note: '轻点反转', instruction: '轻点反转轨道，吃光点，避开尖刺。', glyph: '◎', endless: true }),
]);

export function getEndlessGameRunMeta(state) {
  const world = ENDLESS_GAME_WORLDS[state?.id] ?? ENDLESS_GAME_WORLDS.snake;
  const score = Math.max(0, Number(state?.score) || 0);
  const phase = score >= 42 ? 3 : score >= 20 ? 2 : score >= 7 ? 1 : 0;
  const combo = Math.max(0, Math.floor(Number(state?.combo) || 0));
  return {
    phase,
    phaseName: world.phaseNames[phase],
    challenge: world.challenges[phase],
    combo,
    multiplier: Math.min(4, 1 + Math.floor(combo / 4)),
  };
}

export function isEndlessGameId(value) {
  return ENDLESS_GAME_IDS.includes(value);
}

export function mergeTileLine(values) {
  const compact = values.filter(Boolean);
  const merged = [];
  let score = 0;
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const value = compact[index] * 2;
      merged.push(value);
      score += value;
      index += 1;
    } else {
      merged.push(compact[index]);
    }
  }
  const line = [...merged, ...Array(Math.max(0, values.length - merged.length)).fill(0)];
  return { line, score, moved: line.some((value, index) => value !== values[index]) };
}

export function getStackOverlap(base, moving) {
  const x = Math.max(base.x, moving.x);
  const right = Math.min(base.x + base.width, moving.x + moving.width);
  return right <= x ? null : { x, width: right - x };
}

function nextRandom(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function randomBetween(state, minimum, maximum) {
  return minimum + nextRandom(state) * (maximum - minimum);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function circleHit(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y) <= first.radius + second.radius;
}

function rectHit(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  return Math.hypot(circle.x - closestX, circle.y - closestY) <= circle.radius;
}

function makeBase(id, seed) {
  return {
    id,
    score: 0,
    combo: 0,
    alive: true,
    elapsed: 0,
    seed: Number.isSafeInteger(seed) ? seed >>> 0 : 1212,
    flash: 0,
  };
}

function addMergeTile(state) {
  const empty = state.board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return;
  const position = empty[Math.floor(nextRandom(state) * empty.length)];
  state.board[position] = nextRandom(state) > 0.88 ? 4 : 2;
}

function makeBricks(state, rows = 3) {
  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      if (nextRandom(state) > 0.91) continue;
      bricks.push({ x: 15 + column * 52, y: 62 + row * 28, width: 45, height: 18, tone: (row + column) % 4 });
    }
  }
  return bricks;
}

function makeOrbitItems(state) {
  return Array.from({ length: 7 }, (_, index) => ({
    angle: (Math.PI * 2 * index) / 7 + randomBetween(state, -0.13, 0.13),
    spike: index === 3 || (state.score > 8 && index === 6),
    done: false,
  }));
}

export function createEndlessGameState(id, seed = 1212) {
  if (!isEndlessGameId(id)) throw new Error('Unknown endless game');
  const state = makeBase(id, seed);
  if (id === 'snake') {
    Object.assign(state, {
      snake: [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }, { x: 5, y: 9 }],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      food: { x: 14, y: 9 },
      accumulator: 0,
      speed: 145,
    });
  } else if (id === 'bubble') {
    Object.assign(state, { bubbles: [], spawnMs: 0, misses: 0, combo: 0 });
  } else if (id === 'merge') {
    Object.assign(state, { board: Array(16).fill(0), lastDirection: 'left' });
    addMergeTile(state);
    addMergeTile(state);
  } else if (id === 'breakout') {
    Object.assign(state, {
      paddleX: WIDTH / 2,
      ball: { x: WIDTH / 2, y: 470, vx: 155, vy: -205, radius: 8 },
      bricks: [],
      lives: 3,
      wave: 1,
    });
    state.bricks = makeBricks(state, 3);
  } else if (id === 'hop') {
    Object.assign(state, { player: { x: 92, y: 300, vy: 0, radius: 20 }, gates: [], spawnMs: 0 });
  } else if (id === 'stack') {
    Object.assign(state, {
      blocks: [{ x: 95, y: 555, width: 200, height: 29, tone: 0 }],
      moving: { x: 0, y: 518, width: 200, height: 29, vx: 135, tone: 1 },
    });
  } else if (id === 'drift') {
    Object.assign(state, { player: { x: WIDTH / 2, y: 535, radius: 22 }, hazards: [], petals: [], spawnMs: 0, scoreMs: 0 });
  } else if (id === 'wave') {
    Object.assign(state, { player: { x: 82, y: 310, vy: 0, radius: 17 }, gates: [], spawnMs: 0, holding: false });
  } else if (id === 'slice') {
    Object.assign(state, { objects: [], spawnMs: 0, lives: 3, trail: [] });
  } else if (id === 'orbit') {
    Object.assign(state, { angle: 0, direction: 1, speed: 1.65, radius: 112, items: [] });
    state.items = makeOrbitItems(state);
  }
  return state;
}

function setSnakeDirection(state, direction) {
  if (!direction) return;
  if (direction.x + state.direction.x === 0 && direction.y + state.direction.y === 0) return;
  state.nextDirection = direction;
}

function moveMergeBoard(state, direction) {
  const before = [...state.board];
  const result = Array(16).fill(0);
  let gained = 0;
  const indexesFor = (line) => {
    const direct = [0, 1, 2, 3].map((step) => {
      if (direction === 'left') return line * 4 + step;
      if (direction === 'right') return line * 4 + (3 - step);
      if (direction === 'up') return step * 4 + line;
      return (3 - step) * 4 + line;
    });
    return direct;
  };
  for (let line = 0; line < 4; line += 1) {
    const indexes = indexesFor(line);
    const merged = mergeTileLine(indexes.map((index) => before[index]));
    gained += merged.score;
    indexes.forEach((index, position) => { result[index] = merged.line[position]; });
  }
  const moved = result.some((value, index) => value !== before[index]);
  if (!moved) {
    state.combo = 0;
    state.lastGain = 0;
    return;
  }
  state.board = result;
  state.score += gained;
  state.lastGain = gained;
  state.combo = gained > 0 ? state.combo + 1 : 0;
  state.lastDirection = direction;
  addMergeTile(state);
  const empty = state.board.includes(0);
  const mergeAvailable = state.board.some((value, index) => (
    (index % 4 < 3 && value === state.board[index + 1])
    || (index < 12 && value === state.board[index + 4])
  ));
  if (!empty && !mergeAvailable) state.alive = false;
}

function segmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function controlEndlessGame(state, input) {
  if (!state.alive) return state;
  if (state.id === 'snake') {
    const keyDirections = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const swipeDirections = {
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    };
    setSnakeDirection(state, input.type === 'key' ? keyDirections[input.key] : swipeDirections[input.direction]);
  } else if (state.id === 'bubble' && input.type === 'tap') {
    const hit = [...state.bubbles].reverse().find((bubble) => circleHit({ x: input.x, y: input.y, radius: 8 }, bubble));
    if (hit) {
      const burst = hit.prism
        ? state.bubbles.filter((bubble) => !bubble.popped && Math.hypot(bubble.x - hit.x, bubble.y - hit.y) <= 96)
        : [hit];
      burst.forEach((bubble) => { bubble.popped = true; });
      state.combo += burst.length;
      state.score += Math.min(12, state.combo + Math.max(0, burst.length - 1) * 2);
      state.flash = 1;
    } else {
      state.combo = 0;
    }
  } else if (state.id === 'merge' && input.type === 'swipe') {
    moveMergeBoard(state, input.direction);
  } else if (state.id === 'breakout' && (input.type === 'move' || input.type === 'tap')) {
    state.paddleX = clamp(input.x, 50, WIDTH - 50);
  } else if (state.id === 'hop' && (input.type === 'tap' || input.type === 'down')) {
    state.player.vy = -325;
  } else if (state.id === 'stack' && input.type === 'tap') {
    const base = state.blocks[state.blocks.length - 1];
    const overlap = getStackOverlap(base, state.moving);
    if (!overlap) {
      state.alive = false;
    } else {
      const error = Math.abs(overlap.width - base.width);
      const perfect = error <= 5;
      const snapped = perfect ? { x: base.x, width: base.width } : overlap;
      state.combo = perfect ? state.combo + 1 : 0;
      const block = { ...snapped, y: base.y - 37, height: 29, tone: (state.score + 1) % 4, perfect };
      state.blocks.push(block);
      state.score += perfect ? 2 : 1;
      if (state.blocks.length > 9) state.blocks = state.blocks.slice(-9).map((candidate) => ({ ...candidate, y: candidate.y + 37 }));
      const fromLeft = nextRandom(state) > 0.5;
      state.moving = {
        x: fromLeft ? 0 : WIDTH - snapped.width,
        y: state.blocks[state.blocks.length - 1].y - 37,
        width: snapped.width,
        height: 29,
        vx: (fromLeft ? 1 : -1) * Math.min(260, 135 + state.score * 8),
        tone: (state.score + 1) % 4,
      };
    }
  } else if (state.id === 'drift' && (input.type === 'move' || input.type === 'tap')) {
    state.player.x = clamp(input.x, 28, WIDTH - 28);
    state.player.y = clamp(input.y, 300, HEIGHT - 36);
  } else if (state.id === 'wave') {
    if (input.type === 'down') state.holding = true;
    if (input.type === 'up') state.holding = false;
    if (input.type === 'tap') state.holding = !state.holding;
  } else if (state.id === 'slice' && input.type === 'move') {
    const start = { x: input.previousX ?? input.x, y: input.previousY ?? input.y };
    const end = { x: input.x, y: input.y };
    state.trail = [...state.trail.slice(-7), { ...end, life: 1 }];
    for (const object of state.objects) {
      if (object.cut || segmentDistance(object, start, end) > object.radius + 6) continue;
      object.cut = true;
      if (object.bomb) {
        state.alive = false;
      } else {
        state.combo += 1;
        state.score += 1;
        state.flash = 1;
      }
    }
  } else if (state.id === 'orbit' && input.type === 'tap') {
    state.direction *= -1;
  }
  return state;
}

function advanceSnake(state, elapsedMs) {
  state.accumulator += elapsedMs;
  while (state.accumulator >= state.speed && state.alive) {
    state.accumulator -= state.speed;
    state.direction = state.nextDirection;
    const head = state.snake[0];
    const next = {
      x: (head.x + state.direction.x + 20) % 20,
      y: (head.y + state.direction.y + 28) % 28,
    };
    if (state.snake.some((segment) => segment.x === next.x && segment.y === next.y)) {
      state.alive = false;
      return;
    }
    state.snake.unshift(next);
    if (next.x === state.food.x && next.y === state.food.y) {
      state.combo += 1;
      const golden = state.food.golden === true;
      state.score += golden ? 3 : 1;
      state.speed = Math.max(72, state.speed - 2);
      let attempts = 0;
      do {
        state.food = {
          x: Math.floor(nextRandom(state) * 20),
          y: Math.floor(nextRandom(state) * 28),
          golden: state.score >= 5 && nextRandom(state) > 0.76,
        };
        attempts += 1;
      } while (attempts < 50 && state.snake.some((segment) => segment.x === state.food.x && segment.y === state.food.y));
    } else {
      state.snake.pop();
    }
  }
}

function advanceBubble(state, elapsedMs, dt) {
  state.spawnMs -= elapsedMs;
  if (state.spawnMs <= 0) {
    state.bubbles.push({
      x: randomBetween(state, 32, WIDTH - 32), y: -30, radius: randomBetween(state, 17, 29),
      vy: randomBetween(state, 80, 125) + state.score * 0.8,
      tone: Math.floor(nextRandom(state) * 4),
      prism: state.score >= 6 && nextRandom(state) > 0.86,
      popped: false,
    });
    state.spawnMs = Math.max(300, 780 - state.score * 8);
  }
  for (const bubble of state.bubbles) bubble.y += bubble.vy * dt;
  const missed = state.bubbles.filter((bubble) => !bubble.popped && bubble.y - bubble.radius > HEIGHT).length;
  state.misses += missed;
  if (missed) state.combo = 0;
  state.bubbles = state.bubbles.filter((bubble) => !bubble.popped && bubble.y - bubble.radius <= HEIGHT);
  if (state.misses >= 5) state.alive = false;
}

function resetBreakoutBall(state) {
  state.ball = { x: WIDTH / 2, y: 470, vx: nextRandom(state) > 0.5 ? 165 : -165, vy: -215, radius: 8 };
}

function advanceBreakout(state, dt) {
  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.x < ball.radius || ball.x > WIDTH - ball.radius) {
    ball.x = clamp(ball.x, ball.radius, WIDTH - ball.radius);
    ball.vx *= -1;
  }
  if (ball.y < 44) { ball.y = 44; ball.vy = Math.abs(ball.vy); }
  const paddle = { x: state.paddleX - 48, y: 548, width: 96, height: 17 };
  if (ball.vy > 0 && rectHit(ball, paddle)) {
    ball.y = paddle.y - ball.radius;
    ball.vy = -Math.abs(ball.vy) * 1.01;
    ball.vx += (ball.x - state.paddleX) * 3.1;
  }
  const brick = state.bricks.find((candidate) => rectHit(ball, candidate));
  if (brick) {
    state.bricks = state.bricks.filter((candidate) => candidate !== brick);
    state.score += 1;
    state.combo += 1;
    ball.vy *= -1;
  }
  if (ball.y > HEIGHT + 20) {
    state.combo = 0;
    state.lives -= 1;
    if (state.lives <= 0) state.alive = false;
    else resetBreakoutBall(state);
  }
  if (!state.bricks.length) {
    state.wave += 1;
    state.bricks = makeBricks(state, Math.min(6, 3 + Math.floor(state.wave / 2)));
    resetBreakoutBall(state);
  }
}

function advanceHop(state, elapsedMs, dt) {
  state.player.vy += 760 * dt;
  state.player.y += state.player.vy * dt;
  state.player.y = clamp(state.player.y, 22, HEIGHT - 22);
  if (state.player.y >= HEIGHT - 22) state.alive = false;
  state.spawnMs -= elapsedMs;
  if (state.spawnMs <= 0) {
    const gap = Math.max(132, 205 - state.score * 3);
    const center = randomBetween(state, 145, HEIGHT - 145);
    state.gates.push({ x: WIDTH + 34, width: 48, center, gap, passed: false });
    state.spawnMs = Math.max(900, 1500 - state.score * 12);
  }
  const speed = Math.min(245, 145 + state.score * 4);
  for (const gate of state.gates) {
    gate.x -= speed * dt;
    if (!gate.passed && gate.x + gate.width < state.player.x) {
      gate.passed = true;
      const centered = Math.abs(state.player.y - gate.center) < gate.gap * 0.16;
      state.combo = centered ? state.combo + 1 : 0;
      state.score += centered ? 2 : 1;
    }
    const withinX = state.player.x + state.player.radius > gate.x && state.player.x - state.player.radius < gate.x + gate.width;
    if (withinX && (state.player.y - state.player.radius < gate.center - gate.gap / 2 || state.player.y + state.player.radius > gate.center + gate.gap / 2)) state.alive = false;
  }
  state.gates = state.gates.filter((gate) => gate.x + gate.width > -10);
}

function advanceDrift(state, elapsedMs, dt) {
  state.spawnMs -= elapsedMs;
  state.scoreMs += elapsedMs;
  if (state.scoreMs >= 1000) { state.score += 1; state.scoreMs -= 1000; }
  if (state.spawnMs <= 0) {
    const petal = nextRandom(state) > 0.72;
    const item = { x: randomBetween(state, 28, WIDTH - 28), y: -30, radius: petal ? 11 : randomBetween(state, 17, 25), vy: randomBetween(state, 145, 210) + state.score * 1.5, tone: Math.floor(nextRandom(state) * 4) };
    (petal ? state.petals : state.hazards).push(item);
    state.spawnMs = Math.max(250, 620 - state.score * 5);
  }
  for (const item of [...state.hazards, ...state.petals]) item.y += item.vy * dt;
  if (state.hazards.some((item) => circleHit(state.player, item))) state.alive = false;
  for (const petal of state.petals) {
    if (!petal.collected && circleHit(state.player, petal)) {
      petal.collected = true;
      state.combo += 1;
      state.score += 3;
    }
  }
  state.hazards = state.hazards.filter((item) => item.y < HEIGHT + 40);
  state.petals = state.petals.filter((item) => !item.collected && item.y < HEIGHT + 40);
}

function advanceWave(state, elapsedMs, dt) {
  state.player.vy += (state.holding ? -690 : 520) * dt;
  state.player.vy *= 0.985;
  state.player.y += state.player.vy * dt;
  if (state.player.y < 20 || state.player.y > HEIGHT - 20) state.alive = false;
  state.spawnMs -= elapsedMs;
  if (state.spawnMs <= 0) {
    const gap = Math.max(118, 185 - state.score * 2.4);
    state.gates.push({ x: WIDTH + 20, center: randomBetween(state, 135, HEIGHT - 135), gap, width: 38, passed: false });
    state.spawnMs = Math.max(800, 1350 - state.score * 14);
  }
  const speed = Math.min(290, 170 + state.score * 5);
  for (const gate of state.gates) {
    gate.x -= speed * dt;
    if (!gate.passed && gate.x + gate.width < state.player.x) {
      gate.passed = true;
      const centered = Math.abs(state.player.y - gate.center) < gate.gap * 0.14;
      state.combo = centered ? state.combo + 1 : 0;
      state.score += centered ? 2 : 1;
    }
    const withinX = state.player.x + state.player.radius > gate.x && state.player.x - state.player.radius < gate.x + gate.width;
    if (withinX && (state.player.y < gate.center - gate.gap / 2 || state.player.y > gate.center + gate.gap / 2)) state.alive = false;
  }
  state.gates = state.gates.filter((gate) => gate.x > -60);
}

function advanceSlice(state, elapsedMs, dt) {
  state.spawnMs -= elapsedMs;
  if (state.spawnMs <= 0) {
    state.objects.push({
      x: randomBetween(state, 40, WIDTH - 40), y: HEIGHT + 24,
      vx: randomBetween(state, -38, 38), vy: randomBetween(state, -460, -360),
      radius: randomBetween(state, 18, 27), bomb: nextRandom(state) < Math.min(0.24, 0.1 + state.score * 0.003),
      tone: Math.floor(nextRandom(state) * 4), cut: false,
    });
    state.spawnMs = Math.max(300, 700 - state.score * 5);
  }
  for (const object of state.objects) {
    object.vy += 650 * dt;
    object.x += object.vx * dt;
    object.y += object.vy * dt;
  }
  const missed = state.objects.filter((object) => !object.bomb && !object.cut && object.y - object.radius > HEIGHT).length;
  state.lives -= missed;
  if (missed) state.combo = 0;
  state.objects = state.objects.filter((object) => !object.cut && object.y - object.radius <= HEIGHT + 20);
  state.trail = state.trail.map((point) => ({ ...point, life: point.life - dt * 2.6 })).filter((point) => point.life > 0);
  if (state.lives <= 0) state.alive = false;
}

function angularDistance(first, second) {
  return Math.abs(Math.atan2(Math.sin(first - second), Math.cos(first - second)));
}

function advanceOrbit(state, dt) {
  state.angle = (state.angle + state.direction * state.speed * dt + Math.PI * 2) % (Math.PI * 2);
  for (const item of state.items) {
    if (item.done || angularDistance(state.angle, item.angle) > 0.075) continue;
    item.done = true;
    if (item.spike) state.alive = false;
    else {
      state.combo += 1;
      state.score += 1;
    }
  }
  if (state.items.every((item) => item.done || item.spike)) {
    state.speed = Math.min(3.6, state.speed + 0.12);
    state.items = makeOrbitItems(state);
  }
}

export function advanceEndlessGame(state, elapsedMs) {
  if (!state.alive) return state;
  const safeMs = clamp(Number(elapsedMs) || 0, 0, 120);
  const dt = safeMs / 1000;
  state.elapsed += safeMs;
  state.flash = Math.max(0, state.flash - dt * 3.5);
  if (state.id === 'snake') advanceSnake(state, safeMs);
  else if (state.id === 'bubble') advanceBubble(state, safeMs, dt);
  else if (state.id === 'breakout') advanceBreakout(state, dt);
  else if (state.id === 'hop') advanceHop(state, safeMs, dt);
  else if (state.id === 'stack') {
    state.moving.x += state.moving.vx * dt;
    if (state.moving.x <= 0 || state.moving.x + state.moving.width >= WIDTH) {
      state.moving.x = clamp(state.moving.x, 0, WIDTH - state.moving.width);
      state.moving.vx *= -1;
    }
  } else if (state.id === 'drift') advanceDrift(state, safeMs, dt);
  else if (state.id === 'wave') advanceWave(state, safeMs, dt);
  else if (state.id === 'slice') advanceSlice(state, safeMs, dt);
  else if (state.id === 'orbit') advanceOrbit(state, dt);
  return state;
}

function roundedPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

export function isDrawableControllerSource(image) {
  if (!image || typeof image !== 'object') return false;
  if ('complete' in image) {
    return image.complete === true && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0;
  }
  return Number(image.width) > 0 && Number(image.height) > 0;
}

function drawController(context, image, x, y, size = 46, rotation = 0) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  if (isDrawableControllerSource(image)) {
    context.shadowColor = 'rgba(91,52,72,.18)';
    context.shadowBlur = 14;
    context.drawImage(image, -size / 2, -size / 2, size, size);
  } else {
    const gradient = context.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#ffe2a8');
    gradient.addColorStop(1, '#a9c8b4');
    context.fillStyle = gradient;
    roundedPath(context, -size / 2, -size / 2, size, size, size * 0.34);
    context.fill();
  }
  context.restore();
}

function fillWorldGradient(context, colors) {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.52, colors[1]);
  gradient.addColorStop(1, colors[2]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawOrchardWorld(context, state, dark) {
  context.save();
  context.globalAlpha = dark ? 0.2 : 0.28;
  context.strokeStyle = dark ? '#9bd59f' : '#4f9d67';
  context.lineWidth = 2;
  for (let lane = 0; lane < 5; lane += 1) {
    context.beginPath();
    context.moveTo(-24, 102 + lane * 108);
    context.bezierCurveTo(110, 64 + lane * 112, 260, 148 + lane * 92, 430, 86 + lane * 110);
    context.stroke();
  }
  const sway = Math.sin(state.elapsed * 0.0012) * 7;
  for (let index = 0; index < 12; index += 1) {
    const x = ((index * 89 + 27) % 430) - 20 + sway * (index % 2 ? 1 : -1);
    const y = 42 + ((index * 131) % 540);
    context.fillStyle = index % 4 === 0 ? '#db5b78' : dark ? '#426e4c' : '#83bd75';
    context.beginPath(); context.ellipse(x, y, index % 4 === 0 ? 6 : 18, index % 4 === 0 ? 6 : 9, index * 0.7, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawLagoonWorld(context, state, dark) {
  const shimmer = (state.elapsed * 0.025) % 54;
  context.save();
  context.globalAlpha = dark ? 0.2 : 0.3;
  context.strokeStyle = dark ? '#7ad5df' : '#fff';
  context.lineWidth = 2;
  for (let y = -20; y < HEIGHT + 40; y += 54) {
    context.beginPath();
    for (let x = -20; x <= WIDTH + 20; x += 12) {
      const pointY = y + shimmer + Math.sin((x + state.elapsed * 0.04) * 0.035) * 9;
      if (x === -20) context.moveTo(x, pointY); else context.lineTo(x, pointY);
    }
    context.stroke();
  }
  for (let index = 0; index < 13; index += 1) {
    const radius = 3 + (index % 4) * 2.4;
    const x = 22 + ((index * 73) % 350);
    const y = HEIGHT - ((index * 97 + state.elapsed * (0.008 + index * 0.0004)) % 690);
    context.globalAlpha = 0.18 + (index % 3) * 0.08;
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.stroke();
  }
  context.restore();
}

function drawArchiveWorld(context, state, dark) {
  context.save();
  context.globalAlpha = dark ? 0.24 : 0.34;
  context.strokeStyle = dark ? '#d8aa82' : '#a16d51';
  context.lineWidth = 1;
  const drift = (state.elapsed * 0.006) % 88;
  for (let y = -88 + drift; y < HEIGHT + 90; y += 88) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y); context.stroke();
    for (let x = 18; x < WIDTH; x += 62) {
      roundedPath(context, x, y + 14, 43, 58, 9);
      context.fillStyle = (x / 62) % 2 > 1 ? 'rgba(196,128,154,.18)' : 'rgba(255,255,255,.17)';
      context.fill();
    }
  }
  context.fillStyle = dark ? 'rgba(255,209,151,.09)' : 'rgba(255,255,255,.3)';
  context.fillRect(0, 0, 28, HEIGHT);
  context.fillRect(WIDTH - 28, 0, 28, HEIGHT);
  context.restore();
}

function drawMoonWorld(context, state, dark) {
  context.save();
  const glow = context.createRadialGradient(306, 112, 4, 306, 112, 128);
  glow.addColorStop(0, dark ? 'rgba(255,224,154,.72)' : 'rgba(255,231,174,.92)');
  glow.addColorStop(0.34, 'rgba(239,202,131,.18)');
  glow.addColorStop(1, 'rgba(239,202,131,0)');
  context.fillStyle = glow; context.fillRect(170, -20, 230, 270);
  context.fillStyle = '#f4d68f'; context.beginPath(); context.arc(306, 112, 42, 0, Math.PI * 2); context.fill();
  context.fillStyle = dark ? '#10182b' : '#1c294d'; context.beginPath(); context.arc(323, 98, 42, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#f7de92';
  for (let index = 0; index < 38; index += 1) {
    const x = (index * 83 + 19) % WIDTH;
    const y = (index * 127 + 31) % HEIGHT;
    const pulse = 0.3 + (Math.sin(state.elapsed * 0.002 + index) + 1) * 0.22;
    context.globalAlpha = pulse; context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
  }
  context.globalAlpha = 0.16;
  context.strokeStyle = '#c7b6f1';
  for (let x = 36; x < WIDTH; x += 82) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x - 22, HEIGHT); context.stroke(); }
  context.restore();
}

function drawCloudWorld(context, state, dark) {
  context.save();
  const drift = state.elapsed * 0.006;
  for (let layer = 0; layer < 4; layer += 1) {
    const y = 98 + layer * 146;
    const speed = 0.45 + layer * 0.16;
    for (let index = -1; index < 4; index += 1) {
      const x = ((index * 150 + drift * speed + layer * 51) % 560) - 100;
      context.globalAlpha = (dark ? 0.11 : 0.28) + layer * 0.03;
      context.fillStyle = layer % 2 ? '#fff0df' : '#ffffff';
      context.beginPath();
      context.ellipse(x, y, 58, 19, 0, 0, Math.PI * 2);
      context.ellipse(x + 38, y - 9, 34, 25, 0, 0, Math.PI * 2);
      context.ellipse(x - 34, y - 5, 30, 22, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 0.22;
  context.strokeStyle = dark ? '#9ec9e9' : '#5f8ebd';
  for (let y = 65; y < HEIGHT; y += 74) { context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y - 18); context.stroke(); }
  context.restore();
}

function drawFoundryWorld(context, state, dark) {
  context.save();
  const sun = context.createRadialGradient(90, 142, 4, 90, 142, 104);
  sun.addColorStop(0, 'rgba(255,235,176,.9)'); sun.addColorStop(1, 'rgba(255,181,102,0)');
  context.fillStyle = sun; context.fillRect(0, 25, 220, 240);
  context.globalAlpha = dark ? 0.38 : 0.48;
  context.fillStyle = dark ? '#17121c' : '#5e4459';
  const lift = (state.score % 8) * 3;
  for (let index = 0; index < 11; index += 1) {
    const width = 24 + (index % 3) * 9;
    const height = 80 + ((index * 47) % 150) + lift;
    context.fillRect(index * 39 - 8, HEIGHT - height, width, height);
    context.globalAlpha *= 0.99;
  }
  context.globalAlpha = 0.2;
  context.strokeStyle = '#ffe1b0'; context.lineWidth = 2;
  context.beginPath(); context.moveTo(20, 92); context.lineTo(344, 40); context.lineTo(344, 174); context.stroke();
  context.restore();
}

function drawNightRoadWorld(context, state) {
  context.save();
  context.fillStyle = 'rgba(8,7,17,.5)';
  context.beginPath(); context.moveTo(136, 0); context.lineTo(40, HEIGHT); context.lineTo(350, HEIGHT); context.lineTo(254, 0); context.closePath(); context.fill();
  context.strokeStyle = 'rgba(255,184,215,.48)'; context.lineWidth = 2;
  const dash = (state.elapsed * 0.08) % 56;
  context.setLineDash([18, 38]); context.lineDashOffset = dash;
  context.beginPath(); context.moveTo(195, 0); context.lineTo(195, HEIGHT); context.stroke();
  context.setLineDash([]);
  for (let index = 0; index < 18; index += 1) {
    const y = ((index * 67 + state.elapsed * 0.04) % 700) - 40;
    const side = index % 2 ? 1 : -1;
    const spread = 84 + y * 0.16;
    context.globalAlpha = 0.28 + (index % 4) * 0.08;
    context.fillStyle = index % 3 ? '#f08bb7' : '#f6c675';
    context.beginPath(); context.arc(195 + side * spread, y, 2 + y / 220, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function drawSignalWorld(context, state, dark) {
  context.save();
  context.globalAlpha = dark ? 0.18 : 0.25;
  context.strokeStyle = '#68e2d3'; context.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 26) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, HEIGHT); context.stroke(); }
  for (let y = 0; y < HEIGHT; y += 26) { context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y); context.stroke(); }
  context.globalAlpha = 0.35;
  context.lineWidth = 2.5;
  for (let band = 0; band < 3; band += 1) {
    context.beginPath();
    for (let x = 0; x <= WIDTH; x += 5) {
      const y = 155 + band * 150 + Math.sin((x + state.elapsed * (0.06 + band * 0.02)) * 0.035) * (18 + band * 7);
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawVelvetWorld(context, state) {
  context.save();
  const beam = context.createRadialGradient(WIDTH / 2, 55, 10, WIDTH / 2, 55, 390);
  beam.addColorStop(0, 'rgba(255,230,180,.36)'); beam.addColorStop(1, 'rgba(255,185,150,0)');
  context.fillStyle = beam; context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = 'rgba(69,7,30,.58)';
  context.beginPath(); context.moveTo(0, 0); context.bezierCurveTo(94, 95, 36, 330, 80, HEIGHT); context.lineTo(0, HEIGHT); context.closePath(); context.fill();
  context.beginPath(); context.moveTo(WIDTH, 0); context.bezierCurveTo(296, 95, 354, 330, 310, HEIGHT); context.lineTo(WIDTH, HEIGHT); context.closePath(); context.fill();
  context.strokeStyle = 'rgba(255,195,159,.18)'; context.lineWidth = 2;
  for (let index = 0; index < 6; index += 1) {
    const offset = index * 13 + Math.sin(state.elapsed * 0.001 + index) * 4;
    context.beginPath(); context.moveTo(offset, 0); context.bezierCurveTo(70 + offset, 190, 20 + offset, 420, 72 + offset, HEIGHT); context.stroke();
    context.beginPath(); context.moveTo(WIDTH - offset, 0); context.bezierCurveTo(WIDTH - 70 - offset, 190, WIDTH - 20 - offset, 420, WIDTH - 72 - offset, HEIGHT); context.stroke();
  }
  context.restore();
}

function drawEclipseWorld(context, state) {
  context.save();
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, 18, WIDTH / 2, HEIGHT / 2, 170);
  glow.addColorStop(0, 'rgba(232,184,255,.28)'); glow.addColorStop(0.45, 'rgba(94,78,183,.09)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow; context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = '#050713'; context.beginPath(); context.arc(WIDTH / 2, HEIGHT / 2, 58, 0, Math.PI * 2); context.fill();
  context.strokeStyle = 'rgba(215,181,255,.24)'; context.lineWidth = 1;
  for (let radius = 88; radius < 245; radius += 38) { context.beginPath(); context.ellipse(WIDTH / 2, HEIGHT / 2, radius, radius * 0.72, -0.2, 0, Math.PI * 2); context.stroke(); }
  context.fillStyle = '#f1dcff';
  for (let index = 0; index < 48; index += 1) {
    const x = (index * 97 + 11) % WIDTH;
    const y = (index * 61 + 43) % HEIGHT;
    context.globalAlpha = 0.18 + (Math.sin(index + state.elapsed * 0.0018) + 1) * 0.28;
    context.fillRect(x, y, index % 9 === 0 ? 2 : 1, index % 9 === 0 ? 2 : 1);
  }
  context.restore();
}

function drawBackdrop(context, state) {
  const world = ENDLESS_GAME_WORLDS[state.id] ?? ENDLESS_GAME_WORLDS.snake;
  const dark = state.dark === true;
  fillWorldGradient(context, dark ? world.dark : world.light);
  if (world.motif === 'orchard') drawOrchardWorld(context, state, dark);
  else if (world.motif === 'lagoon') drawLagoonWorld(context, state, dark);
  else if (world.motif === 'archive') drawArchiveWorld(context, state, dark);
  else if (world.motif === 'moon') drawMoonWorld(context, state, dark);
  else if (world.motif === 'clouds') drawCloudWorld(context, state, dark);
  else if (world.motif === 'foundry') drawFoundryWorld(context, state, dark);
  else if (world.motif === 'night-road') drawNightRoadWorld(context, state);
  else if (world.motif === 'signal') drawSignalWorld(context, state, dark);
  else if (world.motif === 'velvet') drawVelvetWorld(context, state);
  else drawEclipseWorld(context, state);
  if (state.flash > 0) {
    context.fillStyle = `rgba(255,255,255,${Math.min(0.18, state.flash * 0.16)})`;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

const WORLD_TONES = Object.freeze({
  snake: ['#dc5279', '#f2b74d', '#7bb873', '#efd9a4'],
  bubble: ['#6cc7dc', '#7c9fe2', '#b68fe5', '#76d5bc'],
  merge: ['#c7809f', '#d89c63', '#9a765e', '#e2c19c'],
  breakout: ['#f1cb72', '#8da9e8', '#bd8fdd', '#65c4ca'],
  hop: ['#6f9bcf', '#efad92', '#b9ddec', '#f2d49c'],
  stack: ['#e67655', '#f2b26e', '#8d6c96', '#cf7894'],
  drift: ['#e56fa8', '#f3c36e', '#8268c8', '#67c8aa'],
  wave: ['#5ce0cf', '#6a9ee8', '#a177d2', '#e3c66b'],
  slice: ['#e45271', '#f2a357', '#be456c', '#f5c47d'],
  orbit: ['#d5a5ff', '#7ba7ef', '#f4cc74', '#8be0d0'],
});

function tonesFor(id) {
  return WORLD_TONES[id] ?? WORLD_TONES.snake;
}

function drawSnake(context, state, image) {
  const tones = tonesFor(state.id);
  const cellW = WIDTH / 20;
  const cellH = HEIGHT / 28;
  const foodX = (state.food.x + 0.5) * cellW;
  const foodY = (state.food.y + 0.5) * cellH;
  context.shadowColor = state.food.golden ? '#ffd66f' : tones[0];
  context.shadowBlur = state.food.golden ? 20 : 8;
  context.fillStyle = state.food.golden ? '#ffd76e' : tones[0];
  context.beginPath(); context.arc(foodX, foodY, state.food.golden ? 10 : 8, 0, Math.PI * 2); context.fill();
  context.shadowBlur = 0;
  context.fillStyle = tones[1];
  context.beginPath(); context.arc(foodX + 3, foodY - 4, 3, 0, Math.PI * 2); context.fill();
  state.snake.slice(1).forEach((segment, index) => {
    context.fillStyle = index % 2 ? '#b8cbb6' : '#f1c990';
    context.beginPath(); context.arc((segment.x + 0.5) * cellW, (segment.y + 0.5) * cellH, 8.2, 0, Math.PI * 2); context.fill();
  });
  const head = state.snake[0];
  drawController(context, image, (head.x + 0.5) * cellW, (head.y + 0.5) * cellH, 34, Math.atan2(state.direction.y, state.direction.x) + Math.PI / 2);
}

function drawBubble(context, state, image) {
  const tones = tonesFor(state.id);
  for (const bubble of state.bubbles) {
    const gradient = context.createRadialGradient(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.35, 2, bubble.x, bubble.y, bubble.radius);
    gradient.addColorStop(0, '#fff'); gradient.addColorStop(0.2, `${tones[bubble.tone]}cc`); gradient.addColorStop(1, `${tones[bubble.tone]}66`);
    context.fillStyle = gradient; context.beginPath(); context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = bubble.prism ? '#ffe49b' : 'rgba(255,255,255,.72)'; context.lineWidth = bubble.prism ? 3 : 2; context.stroke();
    if (bubble.prism) {
      context.save();
      context.translate(bubble.x, bubble.y);
      context.rotate(state.elapsed * 0.0018);
      context.strokeStyle = 'rgba(255,255,255,.68)';
      context.lineWidth = 1.5;
      context.setLineDash([7, 6]);
      context.beginPath(); context.arc(0, 0, bubble.radius + 6, 0, Math.PI * 2); context.stroke();
      context.restore();
    }
  }
  drawController(context, image, WIDTH / 2, HEIGHT - 48, 64, -0.08);
}

function drawMerge(context, state, image) {
  const tones = tonesFor(state.id);
  const size = 76; const gap = 8; const startX = (WIDTH - (size * 4 + gap * 3)) / 2; const startY = 130;
  state.board.forEach((value, index) => {
    const x = startX + (index % 4) * (size + gap); const y = startY + Math.floor(index / 4) * (size + gap);
    context.fillStyle = value ? tones[Math.min(3, Math.log2(value) % 4)] : 'rgba(255,255,255,.38)';
    roundedPath(context, x, y, size, size, 22); context.fill();
    context.strokeStyle = 'rgba(255,255,255,.75)'; context.stroke();
    if (value) { context.fillStyle = '#604951'; context.font = '600 22px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(value), x + size / 2, y + size / 2); }
  });
  drawController(context, image, WIDTH / 2, 62, 54, 0);
}

function drawBreakout(context, state, image) {
  const tones = tonesFor(state.id);
  for (const brick of state.bricks) {
    context.fillStyle = tones[brick.tone]; roundedPath(context, brick.x, brick.y, brick.width, brick.height, 8); context.fill();
    context.fillStyle = 'rgba(255,255,255,.4)'; roundedPath(context, brick.x + 5, brick.y + 3, brick.width - 10, 4, 2); context.fill();
  }
  context.fillStyle = '#fff'; context.shadowColor = '#d46f95'; context.shadowBlur = 14; context.beginPath(); context.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  drawController(context, image, state.paddleX, 557, 74, 0);
}

function drawGates(context, gates) {
  context.fillStyle = 'rgba(184,154,210,.54)';
  for (const gate of gates) {
    roundedPath(context, gate.x, 0, gate.width, gate.center - gate.gap / 2, 16); context.fill();
    roundedPath(context, gate.x, gate.center + gate.gap / 2, gate.width, HEIGHT - (gate.center + gate.gap / 2), 16); context.fill();
  }
}

function drawHop(context, state, image) {
  drawGates(context, state.gates);
  drawController(context, image, state.player.x, state.player.y, 52, clamp(state.player.vy / 900, -0.35, 0.35));
}

function drawStack(context, state, image) {
  const tones = tonesFor(state.id);
  const blocks = [...state.blocks, state.moving];
  for (const block of blocks) {
    context.fillStyle = tones[block.tone]; roundedPath(context, block.x, block.y, block.width, block.height, 11); context.fill();
    context.fillStyle = 'rgba(255,255,255,.36)'; roundedPath(context, block.x + 7, block.y + 4, Math.max(1, block.width - 14), 5, 2); context.fill();
  }
  drawController(context, image, state.moving.x + state.moving.width / 2, state.moving.y - 22, 38, 0);
}

function drawPetal(context, x, y, radius, tone = 0, palette = WORLD_TONES.snake) {
  context.save(); context.translate(x, y); context.fillStyle = palette[tone] ?? palette[0];
  for (let index = 0; index < 5; index += 1) { context.rotate(Math.PI * 2 / 5); context.beginPath(); context.ellipse(0, -radius * 0.55, radius * 0.42, radius * 0.7, 0, 0, Math.PI * 2); context.fill(); }
  context.fillStyle = '#f4c45f'; context.beginPath(); context.arc(0, 0, radius * 0.25, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawDrift(context, state, image) {
  const tones = tonesFor(state.id);
  context.fillStyle = 'rgba(255,255,255,.42)'; roundedPath(context, 45, 0, 300, HEIGHT, 48); context.fill();
  context.strokeStyle = 'rgba(210,139,165,.28)'; context.setLineDash([12, 16]); context.beginPath(); context.moveTo(WIDTH / 2, 0); context.lineTo(WIDTH / 2, HEIGHT); context.stroke(); context.setLineDash([]);
  state.hazards.forEach((item) => { context.fillStyle = tones[item.tone]; roundedPath(context, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2, 8); context.fill(); });
  state.petals.forEach((item) => drawPetal(context, item.x, item.y, item.radius, item.tone, tones));
  drawController(context, image, state.player.x, state.player.y, 58, 0);
}

function drawWave(context, state, image) {
  drawGates(context, state.gates);
  context.strokeStyle = 'rgba(217,119,155,.34)'; context.lineWidth = 2; context.beginPath();
  for (let x = 0; x <= WIDTH; x += 8) { const y = state.player.y + Math.sin((x + state.elapsed * 0.1) * 0.03) * 22; if (x === 0) context.moveTo(x, y); else context.lineTo(x, y); } context.stroke();
  drawController(context, image, state.player.x, state.player.y, 48, clamp(state.player.vy / 700, -0.45, 0.45));
}

function drawSlice(context, state, image) {
  const tones = tonesFor(state.id);
  state.objects.forEach((object) => {
    if (object.bomb) { context.fillStyle = '#4f3c48'; context.beginPath(); context.arc(object.x, object.y, object.radius, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#e4b764'; context.lineWidth = 3; context.beginPath(); context.arc(object.x, object.y, object.radius * 0.45, 0, Math.PI * 2); context.stroke(); }
    else drawPetal(context, object.x, object.y, object.radius, object.tone, tones);
  });
  if (state.trail.length > 1) { context.strokeStyle = 'rgba(255,255,255,.88)'; context.lineWidth = 8; context.lineCap = 'round'; context.beginPath(); state.trail.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); const tip = state.trail[state.trail.length - 1]; drawController(context, image, tip.x, tip.y, 34, -0.4); }
}

function drawOrbit(context, state, image) {
  const tones = tonesFor(state.id);
  const center = { x: WIDTH / 2, y: HEIGHT / 2 + 10 };
  context.strokeStyle = 'rgba(196,125,154,.3)'; context.lineWidth = 2; context.setLineDash([7, 11]); context.beginPath(); context.arc(center.x, center.y, state.radius, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
  state.items.forEach((item) => {
    if (item.done) return;
    const x = center.x + Math.cos(item.angle) * state.radius; const y = center.y + Math.sin(item.angle) * state.radius;
    if (item.spike) { context.fillStyle = '#65505b'; context.save(); context.translate(x, y); context.rotate(item.angle); context.beginPath(); context.moveTo(14, 0); context.lineTo(-10, -10); context.lineTo(-5, 0); context.lineTo(-10, 10); context.closePath(); context.fill(); context.restore(); }
    else drawPetal(context, x, y, 10, Math.abs(Math.floor(item.angle * 10)) % 4, tones);
  });
  const playerX = center.x + Math.cos(state.angle) * state.radius; const playerY = center.y + Math.sin(state.angle) * state.radius;
  drawController(context, image, playerX, playerY, 46, state.angle + Math.PI / 2);
  context.fillStyle = '#fff'; context.beginPath(); context.arc(center.x, center.y, 20, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#d67c9d'; context.font = '20px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(state.direction > 0 ? '↻' : '↺', center.x, center.y);
}

export function drawEndlessGame(context, state, controllerImage) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackdrop(context, state);
  if (state.id === 'snake') drawSnake(context, state, controllerImage);
  else if (state.id === 'bubble') drawBubble(context, state, controllerImage);
  else if (state.id === 'merge') drawMerge(context, state, controllerImage);
  else if (state.id === 'breakout') drawBreakout(context, state, controllerImage);
  else if (state.id === 'hop') drawHop(context, state, controllerImage);
  else if (state.id === 'stack') drawStack(context, state, controllerImage);
  else if (state.id === 'drift') drawDrift(context, state, controllerImage);
  else if (state.id === 'wave') drawWave(context, state, controllerImage);
  else if (state.id === 'slice') drawSlice(context, state, controllerImage);
  else if (state.id === 'orbit') drawOrbit(context, state, controllerImage);
}
