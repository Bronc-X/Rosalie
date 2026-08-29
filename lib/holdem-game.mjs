const RANKS = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
const SUITS = Object.freeze(['s', 'h', 'd', 'c']);
const PLAYER_IDS = Object.freeze(['hero', 'mira', 'nox', 'vela', 'lyra', 'orin', 'kaia', 'sol', 'lune']);
const PLAYER_NAMES = Object.freeze(['你', 'Mira', 'Nox', 'Vela', 'Lyra', 'Orin', 'Kaia', 'Sol', 'Lune']);
const PLAYER_COUNTS = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
const DIFFICULTIES = new Set(['easy', 'standard', 'hard']);
const PHASES = new Set(['preflop', 'flop', 'turn', 'river', 'hand-over', 'session-over']);
const ACTIONS = new Set(['fold', 'check', 'call', 'raise', 'all-in']);
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const BUY_IN = 1_000;

const HAND_LABELS = Object.freeze([
  '高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺',
]);

function safeSeed(value) {
  const seed = Number.isSafeInteger(value) ? value >>> 0 : Date.now() >>> 0;
  return seed || 0x6d2b79f5;
}

function safePlayerCount(value) {
  return PLAYER_COUNTS.has(value) ? value : 3;
}

function safeDifficulty(value) {
  return DIFFICULTIES.has(value) ? value : 'standard';
}

function randomStep(seed) {
  let value = safeSeed(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const next = value >>> 0;
  return { seed: next, value: next / 0x1_0000_0000 };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rankValue(card) {
  return RANKS.indexOf(card[0]) + 2;
}

function validCard(card) {
  return typeof card === 'string'
    && card.length === 2
    && RANKS.includes(card[0])
    && SUITS.includes(card[1]);
}

function compareVectors(first, second) {
  const length = Math.max(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (first[index] ?? 0) - (second[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function straightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    if (unique[index] - unique[index + 4] === 4) return unique[index];
  }
  return 0;
}

function evaluateFive(cards) {
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card[1] === cards[0][1]);
  const highStraight = straightHigh(values);
  let vector;

  if (flush && highStraight) vector = [8, highStraight];
  else if (groups[0][1] === 4) vector = [7, groups[0][0], groups.find((group) => group[1] === 1)[0]];
  else if (groups[0][1] === 3 && groups[1]?.[1] === 2) vector = [6, groups[0][0], groups[1][0]];
  else if (flush) vector = [5, ...values];
  else if (highStraight) vector = [4, highStraight];
  else if (groups[0][1] === 3) {
    vector = [3, groups[0][0], ...groups.filter((group) => group[1] === 1).map((group) => group[0]).slice(0, 2)];
  } else if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]).sort((a, b) => b - a);
    const kicker = groups.filter((group) => group[1] === 1).map((group) => group[0]).sort((a, b) => b - a)[0];
    vector = [2, pairs[0], pairs[1], kicker];
  } else if (groups[0][1] === 2) {
    vector = [1, groups[0][0], ...groups.filter((group) => group[1] === 1).map((group) => group[0]).sort((a, b) => b - a).slice(0, 3)];
  } else vector = [0, ...values];

  return { category: vector[0], vector, cards: [...cards], label: HAND_LABELS[vector[0]] };
}

function combinations(values, count, start = 0, prefix = [], result = []) {
  if (prefix.length === count) {
    result.push(prefix);
    return result;
  }
  for (let index = start; index <= values.length - (count - prefix.length); index += 1) {
    combinations(values, count, index + 1, [...prefix, values[index]], result);
  }
  return result;
}

export function createHoldemDeck(seed = Date.now()) {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));
  let randomSeed = safeSeed(seed);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const step = randomStep(randomSeed);
    randomSeed = step.seed;
    const swapIndex = Math.floor(step.value * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function evaluateHoldemHand(cards) {
  if (!Array.isArray(cards) || cards.length < 5 || cards.length > 7 || cards.some((card) => !validCard(card))) {
    throw new Error('A poker hand needs five to seven valid cards');
  }
  let best = null;
  for (const selection of combinations(cards, 5)) {
    const evaluation = evaluateFive(selection);
    if (!best || compareVectors(evaluation.vector, best.vector) > 0) best = evaluation;
  }
  return best;
}

export function compareHoldemHands(first, second) {
  return compareVectors(first.vector, second.vector);
}

export function buildHoldemPots(players) {
  const contributions = players.map((player) => ({
    id: player.id,
    totalBet: Math.max(0, Number.isSafeInteger(player.totalBet) ? player.totalBet : 0),
    folded: Boolean(player.folded),
  }));
  const levels = [...new Set(contributions.map((player) => player.totalBet).filter(Boolean))].sort((a, b) => a - b);
  const refunds = {};
  const pots = [];
  let previous = 0;

  for (const level of levels) {
    const participants = contributions.filter((player) => player.totalBet >= level);
    const amount = (level - previous) * participants.length;
    if (participants.length === 1) {
      refunds[participants[0].id] = (refunds[participants[0].id] ?? 0) + amount;
    } else if (amount > 0) {
      pots.push({
        amount,
        cap: level,
        participants: participants.map((player) => player.id),
        eligible: participants.filter((player) => !player.folded).map((player) => player.id),
      });
    }
    previous = level;
  }
  return { pots, refunds };
}

function clockwiseIds(players, dealerIndex) {
  return players.map((_, offset) => players[(dealerIndex + 1 + offset) % players.length].id);
}

export function resolveHoldemShowdown({ board, players, dealerIndex = 0 }) {
  if (!Array.isArray(board) || board.length !== 5) throw new Error('Showdown requires five community cards');
  const { pots, refunds } = buildHoldemPots(players);
  const awards = { ...refunds };
  const hands = {};
  for (const player of players) {
    if (!player.folded) hands[player.id] = evaluateHoldemHand([...player.cards, ...board]);
  }
  const order = clockwiseIds(players, dealerIndex);

  for (const pot of pots) {
    if (!pot.eligible.length) continue;
    let winners = [pot.eligible[0]];
    for (const id of pot.eligible.slice(1)) {
      const comparison = compareHoldemHands(hands[id], hands[winners[0]]);
      if (comparison > 0) winners = [id];
      else if (comparison === 0) winners.push(id);
    }
    winners.sort((first, second) => order.indexOf(first) - order.indexOf(second));
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount % winners.length;
    for (const id of winners) {
      awards[id] = (awards[id] ?? 0) + share + (remainder > 0 ? 1 : 0);
      remainder -= remainder > 0 ? 1 : 0;
    }
  }
  return { awards, hands, pots, refunds };
}

function potTotal(players) {
  return players.reduce((total, player) => total + player.totalBet, 0);
}

function nextActor(game, fromIndex) {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (fromIndex + offset) % game.players.length;
    const player = game.players[index];
    if (!player.folded && !player.allIn && (player.actedAtBet === null || player.streetBet < game.currentBet)) return index;
  }
  return null;
}

function blindIndexes(playerCount, dealerIndex) {
  if (playerCount === 2) {
    return { smallBlindIndex: dealerIndex, bigBlindIndex: (dealerIndex + 1) % playerCount };
  }
  return {
    smallBlindIndex: (dealerIndex + 1) % playerCount,
    bigBlindIndex: (dealerIndex + 2) % playerCount,
  };
}

function hasRaiseRight(game, player) {
  return player.actedAtBet === null || game.currentBet - player.actedAtBet >= game.minRaise;
}

function hasLiveRaiseOpponent(game, playerIndex) {
  return game.players.some((player, index) => (
    index !== playerIndex && !player.folded && !player.allIn && player.stack > 0
  ));
}

function syncRaiseRights(game) {
  for (const player of game.players) {
    player.canRaise = !player.folded && !player.allIn && hasRaiseRight(game, player);
  }
}

function postBlind(player, amount) {
  const paid = Math.min(amount, player.stack);
  player.stack -= paid;
  player.streetBet += paid;
  player.totalBet += paid;
  if (player.stack === 0) player.allIn = true;
  return paid;
}

function freshPlayers(playerCount = 3, stacks = []) {
  return PLAYER_IDS.slice(0, playerCount).map((id, index) => ({
    id,
    name: PLAYER_NAMES[index],
    stack: Number.isSafeInteger(stacks[index]) && stacks[index] >= 0 ? stacks[index] : BUY_IN,
    cards: [],
    folded: false,
    allIn: false,
    streetBet: 0,
    totalBet: 0,
    acted: false,
    actedAtBet: null,
    canRaise: true,
  }));
}

function dealCard(game) {
  const card = game.deck.pop();
  if (!card) throw new Error('The deck is empty');
  return card;
}

function revealStreet(game, phase) {
  game.burned.push(dealCard(game));
  const count = phase === 'flop' ? 3 : 1;
  for (let index = 0; index < count; index += 1) game.board.push(dealCard(game));
  game.phase = phase;
  game.currentBet = 0;
  game.minRaise = BIG_BLIND;
  for (const player of game.players) {
    player.streetBet = 0;
    player.acted = player.folded || player.allIn;
    player.actedAtBet = player.folded || player.allIn ? 0 : null;
    player.canRaise = !player.folded && !player.allIn;
  }
  game.log.push(`${phase === 'flop' ? '翻牌' : phase === 'turn' ? '转牌' : '河牌'}落桌`);
}

function resultSummary(game, resolution) {
  const topAward = Math.max(...Object.values(resolution.awards));
  const winners = Object.entries(resolution.awards).filter(([, amount]) => amount === topAward).map(([id]) => id);
  const names = winners.map((id) => game.players.find((player) => player.id === id)?.name ?? id).join('、');
  const firstHand = resolution.hands[winners[0]];
  return `${names} · ${firstHand?.label ?? '收池'}`;
}

function settleShowdown(game) {
  while (game.board.length < 5) {
    const phase = game.board.length === 0 ? 'flop' : game.board.length === 3 ? 'turn' : 'river';
    revealStreet(game, phase);
  }
  const resolution = resolveHoldemShowdown({ board: game.board, players: game.players, dealerIndex: game.dealerIndex });
  for (const player of game.players) {
    player.stack += resolution.awards[player.id] ?? 0;
    player.streetBet = 0;
    player.totalBet = 0;
    player.acted = true;
    player.actedAtBet = 0;
    player.canRaise = false;
  }
  game.phase = 'hand-over';
  game.actorIndex = null;
  game.pot = 0;
  game.showdown = true;
  game.awards = resolution.awards;
  game.hands = resolution.hands;
  game.resultText = resultSummary(game, resolution);
  game.log.push(game.resultText);
  return game;
}

function awardLastPlayer(game) {
  const winner = game.players.find((player) => !player.folded);
  const amount = potTotal(game.players);
  winner.stack += amount;
  for (const player of game.players) {
    player.streetBet = 0;
    player.totalBet = 0;
    player.acted = true;
    player.actedAtBet = 0;
    player.canRaise = false;
  }
  game.phase = 'hand-over';
  game.actorIndex = null;
  game.pot = 0;
  game.showdown = false;
  game.awards = { [winner.id]: amount };
  game.hands = {};
  game.resultText = `${winner.name} 收下 ${amount} 筹码`;
  game.log.push(game.resultText);
  return game;
}

function advanceBetting(game, previousActor) {
  const remaining = game.players.filter((player) => !player.folded);
  if (remaining.length === 1) return awardLastPlayer(game);
  const actors = remaining.filter((player) => !player.allIn);
  const loneActorOwesAction = actors.length === 1
    && (!actors[0].acted || actors[0].streetBet < game.currentBet);
  if (actors.length === 0 || (actors.length === 1 && !loneActorOwesAction)) return settleShowdown(game);

  const actor = nextActor(game, previousActor);
  if (actor !== null) {
    game.actorIndex = actor;
    game.pot = potTotal(game.players);
    return game;
  }

  if (game.phase === 'river') return settleShowdown(game);
  revealStreet(game, game.phase === 'preflop' ? 'flop' : game.phase === 'flop' ? 'turn' : 'river');
  const first = nextActor(game, game.dealerIndex);
  if (first === null) return settleShowdown(game);
  game.actorIndex = first;
  game.pot = potTotal(game.players);
  return game;
}

export function startNextHoldemHand(previous) {
  const game = clone(previous);
  if (game.players[0].stack < BIG_BLIND) {
    game.phase = 'session-over';
    game.actorIndex = null;
    game.resultText = '筹码用完，牌桌暂时收起';
    return game;
  }
  for (const player of game.players.slice(1)) {
    if (player.stack < BIG_BLIND) player.stack = BUY_IN;
  }

  game.handNumber += 1;
  game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
  game.deckSeed = safeSeed(game.baseSeed + Math.imul(game.handNumber, 0x9e3779b1));
  game.deck = createHoldemDeck(game.deckSeed);
  game.board = [];
  game.burned = [];
  game.phase = 'preflop';
  game.currentBet = 0;
  game.minRaise = BIG_BLIND;
  game.resultText = '';
  game.showdown = false;
  game.awards = {};
  game.hands = {};
  game.log = [`第 ${game.handNumber} 手`];
  game.players = game.players.map((player) => ({
    ...player,
    cards: [],
    folded: false,
    allIn: false,
    streetBet: 0,
    totalBet: 0,
    acted: false,
    actedAtBet: null,
    canRaise: true,
  }));

  for (let round = 0; round < 2; round += 1) {
    for (let offset = 1; offset <= game.players.length; offset += 1) {
      game.players[(game.dealerIndex + offset) % game.players.length].cards.push(dealCard(game));
    }
  }
  const { smallBlindIndex, bigBlindIndex } = blindIndexes(game.players.length, game.dealerIndex);
  game.smallBlindIndex = smallBlindIndex;
  game.bigBlindIndex = bigBlindIndex;
  postBlind(game.players[smallBlindIndex], SMALL_BLIND);
  postBlind(game.players[bigBlindIndex], BIG_BLIND);
  game.currentBet = Math.max(...game.players.map((player) => player.streetBet));
  game.pot = potTotal(game.players);
  game.actorIndex = nextActor(game, bigBlindIndex);
  game.log.push(`${game.players[smallBlindIndex].name} 小盲 ${SMALL_BLIND}`);
  game.log.push(`${game.players[bigBlindIndex].name} 大盲 ${BIG_BLIND}`);
  return game;
}

export function createHoldemGame(seed = Date.now(), stacksOrOptions = {}) {
  const options = Array.isArray(stacksOrOptions)
    ? { playerCount: safePlayerCount(stacksOrOptions.length), stacks: stacksOrOptions }
    : (stacksOrOptions && typeof stacksOrOptions === 'object' ? stacksOrOptions : {});
  const playerCount = safePlayerCount(options.playerCount);
  const baseSeed = safeSeed(seed);
  return startNextHoldemHand({
    version: 2,
    baseSeed,
    deckSeed: baseSeed,
    aiSeed: safeSeed(baseSeed ^ 0xa17f3d29),
    playerCount,
    difficulty: safeDifficulty(options.difficulty),
    handNumber: 0,
    dealerIndex: -1,
    smallBlindIndex: null,
    bigBlindIndex: null,
    actorIndex: null,
    phase: 'hand-over',
    currentBet: 0,
    minRaise: BIG_BLIND,
    pot: 0,
    deck: [],
    board: [],
    burned: [],
    players: freshPlayers(playerCount, Array.isArray(options.stacks) ? options.stacks : []),
    log: [],
    resultText: '',
    showdown: false,
    awards: {},
    hands: {},
  });
}

export function getHoldemLegalActions(game, playerId) {
  if (!game || !['preflop', 'flop', 'turn', 'river'].includes(game.phase)) return [];
  const playerIndex = game.players.findIndex((player) => player.id === playerId);
  if (playerIndex < 0 || playerIndex !== game.actorIndex) return [];
  const player = game.players[playerIndex];
  if (player.folded || player.allIn || player.stack <= 0) return [];
  const toCall = Math.max(0, game.currentBet - player.streetBet);
  const maxTo = player.streetBet + player.stack;
  const minTo = game.currentBet + game.minRaise;
  const raiseRight = hasRaiseRight(game, player);
  const hasOpponent = hasLiveRaiseOpponent(game, playerIndex);
  const actions = [];
  if (toCall > 0) actions.push({ type: 'fold' });
  if (toCall === 0) actions.push({ type: 'check' });
  else actions.push({ type: 'call', amount: Math.min(toCall, player.stack) });
  if (raiseRight && hasOpponent && maxTo >= minTo) actions.push({ type: 'raise', minTo, maxTo });
  const allInWouldRaise = maxTo > game.currentBet;
  if (!allInWouldRaise || (raiseRight && hasOpponent)) {
    actions.push({ type: 'all-in', amount: player.stack, to: maxTo });
  }
  return actions;
}

function requireLegalAction(game, action) {
  if (!action || !ACTIONS.has(action.type)) throw new Error('Invalid poker action');
  const actor = game.players[game.actorIndex];
  const legal = getHoldemLegalActions(game, actor?.id);
  const option = legal.find((candidate) => candidate.type === action.type);
  if (!option) throw new Error('Poker action is not legal now');
  if (action.type === 'raise') {
    if (!Number.isSafeInteger(action.raiseTo) || action.raiseTo < option.minTo || action.raiseTo > option.maxTo) {
      throw new Error('Raise amount is outside the legal range');
    }
  }
  return option;
}

export function applyHoldemAction(current, action) {
  const game = clone(current);
  requireLegalAction(game, action);
  const actorIndex = game.actorIndex;
  const player = game.players[actorIndex];
  const actorIsAi = player.id !== 'hero';
  const oldBet = game.currentBet;

  if (action.type === 'fold') {
    player.folded = true;
    player.acted = true;
    player.actedAtBet = game.currentBet;
    player.canRaise = false;
    game.log.push(`${player.name} 弃牌`);
  } else if (action.type === 'check') {
    player.acted = true;
    player.actedAtBet = game.currentBet;
    player.canRaise = false;
    game.log.push(`${player.name} 过牌`);
  } else {
    const target = action.type === 'call'
      ? Math.min(game.currentBet, player.streetBet + player.stack)
      : action.type === 'raise'
        ? action.raiseTo
        : player.streetBet + player.stack;
    const payment = Math.max(0, target - player.streetBet);
    player.stack -= payment;
    player.streetBet = target;
    player.totalBet += payment;
    if (player.stack === 0) player.allIn = true;

    const raiseSize = target - oldBet;
    if ((action.type === 'raise' || action.type === 'all-in') && target > oldBet) {
      game.currentBet = target;
      if (raiseSize >= game.minRaise) {
        game.minRaise = raiseSize;
      }
    }
    player.acted = true;
    player.actedAtBet = target;
    game.log.push(`${player.name} ${action.type === 'call' ? `跟 ${payment}` : action.type === 'raise' ? `加至 ${target}` : `全下 ${payment}`}`);
  }

  syncRaiseRights(game);
  if (actorIsAi) game.aiSeed = randomStep(game.aiSeed).seed;
  game.pot = potTotal(game.players);
  return advanceBetting(game, actorIndex);
}

function preflopStrength(cards) {
  const [first, second] = cards.map(rankValue).sort((a, b) => b - a);
  let strength = (first + second) / 32;
  if (first === second) strength = 0.52 + first / 30;
  if (cards[0][1] === cards[1][1]) strength += 0.07;
  if (Math.abs(first - second) <= 2) strength += 0.05;
  if (first === 14) strength += 0.05;
  return Math.min(1, strength);
}

function publicStrength(player, board) {
  if (board.length < 3) return preflopStrength(player.cards);
  const evaluation = evaluateHoldemHand([...player.cards, ...board]);
  return Math.min(1, evaluation.category / 8 + (evaluation.vector[1] ?? 0) / 90 + board.length * 0.015);
}

export function estimateHoldemEquity(cards, board = [], opponentCount = 1, seed = 1, trials = 72) {
  if (!Array.isArray(cards) || cards.length !== 2 || cards.some((card) => !validCard(card))
    || !Array.isArray(board) || board.length > 5 || board.some((card) => !validCard(card))
    || !Number.isSafeInteger(opponentCount) || opponentCount < 1 || opponentCount > 8) {
    throw new Error('Invalid equity simulation input');
  }
  const known = [...cards, ...board];
  if (new Set(known).size !== known.length) throw new Error('Known poker cards must be unique');
  const count = Math.max(12, Math.min(240, Number.isSafeInteger(trials) ? trials : 72));
  const fullDeck = SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));
  const remaining = fullDeck.filter((card) => !known.includes(card));
  const required = 5 - board.length + opponentCount * 2;
  if (required > remaining.length) throw new Error('Not enough unseen cards');
  let randomSeed = safeSeed(seed);
  let equity = 0;

  for (let trial = 0; trial < count; trial += 1) {
    const pool = [...remaining];
    for (let index = 0; index < required; index += 1) {
      const step = randomStep(randomSeed);
      randomSeed = step.seed;
      const swapIndex = index + Math.floor(step.value * (pool.length - index));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    let cursor = 0;
    const completedBoard = [...board];
    while (completedBoard.length < 5) completedBoard.push(pool[cursor++]);
    const heroHand = evaluateHoldemHand([...cards, ...completedBoard]);
    let tied = 1;
    let beaten = false;
    for (let opponent = 0; opponent < opponentCount; opponent += 1) {
      const opponentHand = evaluateHoldemHand([pool[cursor++], pool[cursor++], ...completedBoard]);
      const comparison = compareHoldemHands(opponentHand, heroHand);
      if (comparison > 0) {
        beaten = true;
        break;
      }
      if (comparison === 0) tied += 1;
    }
    if (!beaten) equity += 1 / tied;
  }
  return equity / count;
}

const DIFFICULTY_PROFILES = Object.freeze({
  easy: { noise: 0.34, aggression: -0.06, foldPadding: 0.17, raiseAt: 0.84, potFraction: 0.35 },
  standard: { noise: 0.2, aggression: 0, foldPadding: 0.1, raiseAt: 0.72, potFraction: 0.55 },
  hard: { noise: 0.08, aggression: 0.06, foldPadding: 0.025, raiseAt: 0.62, potFraction: 0.78 },
});

const THINK_TIME_RANGES = Object.freeze({
  easy: [850, 1_600],
  standard: [1_200, 2_200],
  hard: [1_500, 2_600],
});

export function getHoldemAiThinkDelay(difficulty = 'standard', seed = 1) {
  const [minimum, maximum] = THINK_TIME_RANGES[safeDifficulty(difficulty)];
  const step = randomStep(seed);
  return minimum + Math.floor(step.value * (maximum - minimum + 1));
}

export function chooseHoldemAiAction(game, seed = game?.aiSeed) {
  const player = game.players[game.actorIndex];
  if (!player || player.id === 'hero') throw new Error('AI can act only from an AI seat');
  const legal = getHoldemLegalActions(game, player.id);
  if (!legal.length) throw new Error('AI has no legal action');
  const step = randomStep(safeSeed(seed) + game.handNumber * 31 + game.actorIndex * 17 + game.log.length);
  const difficulty = safeDifficulty(game.difficulty);
  const profile = DIFFICULTY_PROFILES[difficulty];
  const noise = (step.value - 0.5) * profile.noise;
  const activeOpponents = Math.max(1, game.players.filter((candidate) => !candidate.folded && candidate.id !== player.id).length);
  const strength = difficulty === 'hard'
    ? estimateHoldemEquity(player.cards, game.board, activeOpponents, step.seed, 84)
    : publicStrength(player, game.board);
  const call = legal.find((action) => action.type === 'call');
  const raise = legal.find((action) => action.type === 'raise');
  const fold = legal.find((action) => action.type === 'fold');
  const check = legal.find((action) => action.type === 'check');
  const personality = player.id === 'nox' ? 0.08 : player.id === 'vela' ? 0.03 : -0.02;
  const confidence = strength + noise + profile.aggression + personality;
  const potOdds = call ? call.amount / Math.max(1, game.pot + call.amount) : 0;

  if (fold && confidence < potOdds + profile.foldPadding) return { type: 'fold' };
  if (raise && confidence > profile.raiseAt) {
    const pressure = Math.max(raise.minTo, Math.min(raise.maxTo, game.currentBet + Math.max(game.minRaise, Math.floor(game.pot * profile.potFraction))));
    return { type: 'raise', raiseTo: pressure };
  }
  if (call) return { type: 'call' };
  if (check) return { type: 'check' };
  return { type: 'all-in' };
}

function safeInteger(value, min = 0, max = 1_000_000) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function normalizeHoldemState(input) {
  if (!input || typeof input !== 'object' || ![1, 2].includes(input.version) || !PHASES.has(input.phase)) {
    return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  }
  if (!Array.isArray(input.players) || !PLAYER_COUNTS.has(input.players.length) || input.players.some((player, index) => (
    !player || player.id !== PLAYER_IDS[index] || typeof player.name !== 'string'
    || !safeInteger(player.stack, 0, 100_000_000) || !safeInteger(player.streetBet, 0, 100_000_000)
    || !safeInteger(player.totalBet, 0, 100_000_000)
    || !Array.isArray(player.cards) || player.cards.length !== 2 || player.cards.some((card) => !validCard(card))
    || typeof player.folded !== 'boolean' || typeof player.allIn !== 'boolean'
    || typeof player.acted !== 'boolean' || typeof player.canRaise !== 'boolean'
    || (input.version === 2 && player.actedAtBet !== null && !safeInteger(player.actedAtBet, 0, 100_000_000))
  ))) return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  if (!Array.isArray(input.deck) || !Array.isArray(input.board) || !Array.isArray(input.burned)) {
    return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  }
  const cards = [...input.deck, ...input.board, ...input.burned, ...input.players.flatMap((player) => player.cards)];
  if (cards.some((card) => !validCard(card)) || new Set(cards).size !== cards.length || cards.length !== 52) {
    return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  }
  const playerCount = input.players.length;
  const expectedBlinds = blindIndexes(playerCount, input.dealerIndex);
  if (input.version === 2 && (
    input.playerCount !== playerCount
    || !DIFFICULTIES.has(input.difficulty)
    || !safeInteger(input.aiSeed, 1, 0xffff_ffff)
    || input.smallBlindIndex !== expectedBlinds.smallBlindIndex
    || input.bigBlindIndex !== expectedBlinds.bigBlindIndex
  )) return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  if (!safeInteger(input.handNumber, 1, 999_999) || !safeInteger(input.dealerIndex, 0, playerCount - 1)
    || (input.actorIndex !== null && !safeInteger(input.actorIndex, 0, playerCount - 1))
    || !safeInteger(input.baseSeed, 1, 0xffff_ffff) || !safeInteger(input.deckSeed, 1, 0xffff_ffff)
    || !safeInteger(input.currentBet, 0, 100_000_000) || !safeInteger(input.minRaise, 1, 100_000_000)
    || !safeInteger(input.pot, 0, 100_000_000)) {
    return { ok: false, error: 'INVALID_HOLDEM_STATE' };
  }

  const value = clone(input);
  const blinds = blindIndexes(playerCount, value.dealerIndex);
  value.version = 2;
  value.playerCount = playerCount;
  value.difficulty = safeDifficulty(value.difficulty);
  value.aiSeed = safeSeed(value.aiSeed ?? (value.baseSeed ^ 0xa17f3d29));
  value.smallBlindIndex = safeInteger(value.smallBlindIndex, 0, playerCount - 1)
    ? value.smallBlindIndex
    : blinds.smallBlindIndex;
  value.bigBlindIndex = safeInteger(value.bigBlindIndex, 0, playerCount - 1)
    ? value.bigBlindIndex
    : blinds.bigBlindIndex;
  value.players = value.players.map((player) => ({
    ...player,
    actedAtBet: player.actedAtBet === null
      ? null
      : safeInteger(player.actedAtBet, 0, 100_000_000)
        ? player.actedAtBet
        : player.acted
          ? player.streetBet
          : null,
  }));
  syncRaiseRights(value);
  return { ok: true, value };
}

export function grantHoldemChips(current, amount = 100_000, playerId = 'hero') {
  if (!current || typeof current !== 'object' || !safeInteger(amount, 1, 1_000_000)) {
    throw new Error('Invalid chip grant');
  }
  const game = clone(current);
  const player = game.players?.find((candidate) => candidate.id === playerId);
  if (!player || !safeInteger(player.stack, 0, 100_000_000 - amount)) {
    throw new Error('Poker player cannot receive chips');
  }
  player.stack += amount;
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  game.log.push(`${player.name} 微信联系奖励 +${formatted}`);
  if (game.phase === 'session-over') {
    game.phase = 'hand-over';
    game.resultText = `筹码已到账 ${formatted}`;
  }
  return game;
}

export const HOLDEM_BLINDS = Object.freeze({ small: SMALL_BLIND, big: BIG_BLIND });
export const HOLDEM_BUY_IN = BUY_IN;
export const HOLDEM_PLAYER_COUNTS = Object.freeze([...PLAYER_COUNTS]);
export const HOLDEM_DIFFICULTIES = Object.freeze([...DIFFICULTIES]);
