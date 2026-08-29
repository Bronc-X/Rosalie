import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const holdem = await import('../lib/holdem-game.mjs').catch(() => ({}));
const holdemUi = await import('../lib/holdem-ui.mjs').catch(() => ({}));

test('a seeded deck contains 52 unique cards and is reproducible', () => {
  assert.equal(typeof holdem.createHoldemDeck, 'function');
  const first = holdem.createHoldemDeck(1212);
  const second = holdem.createHoldemDeck(1212);
  const other = holdem.createHoldemDeck(1213);
  assert.equal(first.length, 52);
  assert.equal(new Set(first).size, 52);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, other);
});

test('seven-card evaluation handles category order, wheel straights and kickers', () => {
  assert.equal(typeof holdem.evaluateHoldemHand, 'function');
  const straightFlush = holdem.evaluateHoldemHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '2d', '3c']);
  const quads = holdem.evaluateHoldemHand(['Ah', 'Ad', 'Ac', 'As', 'Kd', '2c', '3d']);
  const wheel = holdem.evaluateHoldemHand(['As', '2d', '3c', '4h', '5s', 'Kd', 'Qc']);
  const pairAceKicker = holdem.evaluateHoldemHand(['9s', '9d', 'As', 'Kd', '7c', '4h', '2s']);
  const pairQueenKicker = holdem.evaluateHoldemHand(['9c', '9h', 'Qs', 'Jd', '7h', '4c', '2d']);

  assert.equal(straightFlush.category, 8);
  assert.equal(quads.category, 7);
  assert.equal(wheel.category, 4);
  assert.equal(wheel.vector[1], 5);
  assert.ok(holdem.compareHoldemHands(straightFlush, quads) > 0);
  assert.ok(holdem.compareHoldemHands(pairAceKicker, pairQueenKicker) > 0);
});

test('side pots keep folded chips and return an unmatched overbet', () => {
  assert.equal(typeof holdem.buildHoldemPots, 'function');
  const result = holdem.buildHoldemPots([
    { id: 'hero', totalBet: 100, folded: false },
    { id: 'mira', totalBet: 60, folded: false },
    { id: 'nox', totalBet: 20, folded: true },
  ]);

  assert.deepEqual(result.refunds, { hero: 40 });
  assert.deepEqual(result.pots.map((pot) => ({ amount: pot.amount, eligible: pot.eligible })), [
    { amount: 60, eligible: ['hero', 'mira'] },
    { amount: 80, eligible: ['hero', 'mira'] },
  ]);
});

test('a three-seat hand posts blinds and advances through the flop in order', () => {
  assert.equal(typeof holdem.createHoldemGame, 'function');
  let game = holdem.createHoldemGame(20260829);
  assert.equal(game.phase, 'preflop');
  assert.equal(game.dealerIndex, 0);
  assert.equal(game.actorIndex, 0);
  assert.deepEqual(game.players.map((player) => player.streetBet), [0, 10, 20]);
  assert.equal(game.players.reduce((sum, player) => sum + player.stack + player.totalBet, 0), 3_000);
  assert.equal(new Set(game.players.flatMap((player) => player.cards)).size, 6);

  const heroActions = holdem.getHoldemLegalActions(game, 'hero');
  assert.deepEqual(heroActions.map((action) => action.type), ['fold', 'call', 'raise', 'all-in']);
  assert.equal(heroActions.find((action) => action.type === 'call').amount, 20);
  assert.equal(heroActions.find((action) => action.type === 'raise').minTo, 40);

  game = holdem.applyHoldemAction(game, { type: 'call' });
  game = holdem.applyHoldemAction(game, { type: 'call' });
  game = holdem.applyHoldemAction(game, { type: 'check' });
  assert.equal(game.phase, 'flop');
  assert.equal(game.board.length, 3);
  assert.equal(game.burned.length, 1);
  assert.equal(game.actorIndex, 1);
  assert.deepEqual(game.players.map((player) => player.streetBet), [0, 0, 0]);
});

test('two to nine players use the correct blind and action order', () => {
  const cases = [
    { playerCount: 2, blinds: [10, 20], dealer: 0, small: 0, big: 1, actor: 0 },
    { playerCount: 3, blinds: [0, 10, 20], dealer: 0, small: 1, big: 2, actor: 0 },
    { playerCount: 4, blinds: [0, 10, 20, 0], dealer: 0, small: 1, big: 2, actor: 3 },
    { playerCount: 9, blinds: [0, 10, 20, 0, 0, 0, 0, 0, 0], dealer: 0, small: 1, big: 2, actor: 3 },
  ];
  for (const expected of cases) {
    const game = holdem.createHoldemGame(8200 + expected.playerCount, {
      playerCount: expected.playerCount,
      difficulty: 'hard',
    });
    assert.equal(game.players.length, expected.playerCount);
    assert.equal(game.playerCount, expected.playerCount);
    assert.equal(game.difficulty, 'hard');
    assert.equal(game.dealerIndex, expected.dealer);
    assert.equal(game.smallBlindIndex, expected.small);
    assert.equal(game.bigBlindIndex, expected.big);
    assert.equal(game.actorIndex, expected.actor);
    assert.deepEqual(game.players.map((player) => player.streetBet), expected.blinds);
    assert.equal(new Set(game.players.flatMap((player) => player.cards)).size, expected.playerCount * 2);
  }
});

test('a nine-seat game deals unique cards, rotates cleanly and survives persistence', () => {
  const first = holdem.createHoldemGame(909, { playerCount: 9, difficulty: 'hard' });
  assert.equal(first.players.length, 9);
  assert.equal(new Set(first.players.flatMap((player) => player.cards)).size, 18);
  assert.equal(first.players.reduce((sum, player) => sum + player.stack + player.totalBet, 0), 9_000);
  const second = holdem.startNextHoldemHand(first);
  assert.equal(second.dealerIndex, 1);
  assert.equal(second.smallBlindIndex, 2);
  assert.equal(second.bigBlindIndex, 3);
  assert.equal(second.actorIndex, 4);
  const restored = holdem.normalizeHoldemState(JSON.parse(JSON.stringify(second)));
  assert.equal(restored.ok, true);
  assert.equal(restored.value.playerCount, 9);
  assert.equal(restored.value.difficulty, 'hard');
});

test('heads-up rotates the button while keeping dealer as the small blind', () => {
  const first = holdem.createHoldemGame(212, { playerCount: 2, difficulty: 'easy' });
  const second = holdem.startNextHoldemHand(first);
  assert.equal(second.dealerIndex, 1);
  assert.equal(second.smallBlindIndex, 1);
  assert.equal(second.bigBlindIndex, 0);
  assert.equal(second.actorIndex, 1);
});

test('folding down to one player awards the pot immediately', () => {
  let game = holdem.createHoldemGame(77);
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  assert.equal(game.phase, 'hand-over');
  assert.equal(game.players[2].stack, 1_010);
  assert.equal(game.pot, 0);
  assert.match(game.resultText, /Nox/);
});

test('a lone live player must still answer an all-in bet before the board runs out', () => {
  let game = holdem.createHoldemGame(88, [1_000, 20, 20]);
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  assert.equal(game.phase, 'preflop');
  assert.equal(game.actorIndex, 1);
  assert.deepEqual(holdem.getHoldemLegalActions(game, 'mira').map((action) => action.type), ['fold', 'call', 'all-in']);
});

test('a short all-in cannot reopen a raise or bypass it through the all-in button', () => {
  let game = holdem.createHoldemGame(901, [1_000, 30, 1_000]);
  game = holdem.applyHoldemAction(game, { type: 'call' });
  game = holdem.applyHoldemAction(game, { type: 'all-in' });
  game = holdem.applyHoldemAction(game, { type: 'call' });
  assert.equal(game.actorIndex, 0);
  assert.deepEqual(holdem.getHoldemLegalActions(game, 'hero').map((action) => action.type), ['fold', 'call']);
});

test('cumulative short all-ins reopen a full raise once they reach the minimum', () => {
  let game = holdem.createHoldemGame(902, {
    playerCount: 4,
    stacks: [30, 40, 1_000, 1_000],
  });
  game = holdem.applyHoldemAction(game, { type: 'call' });
  game = holdem.applyHoldemAction(game, { type: 'all-in' });
  game = holdem.applyHoldemAction(game, { type: 'all-in' });
  game = holdem.applyHoldemAction(game, { type: 'call' });
  const legal = holdem.getHoldemLegalActions(game, 'vela').map((action) => action.type);
  assert.ok(legal.includes('raise'));
  assert.ok(legal.includes('all-in'));
});

test('the last live stack cannot open an empty side pot against all-in players', () => {
  let game = holdem.createHoldemGame(903, [1_000, 1_000, 20]);
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  assert.equal(game.actorIndex, 1);
  assert.deepEqual(holdem.getHoldemLegalActions(game, 'mira').map((action) => action.type), ['fold', 'call']);
});

test('showdown pays main and side pots and splits odd chips clockwise from the dealer', () => {
  assert.equal(typeof holdem.resolveHoldemShowdown, 'function');
  const winner = holdem.resolveHoldemShowdown({
    board: ['2c', '3d', '4h', '5s', '9c'],
    dealerIndex: 2,
    players: [
      { id: 'hero', cards: ['As', 'Ad'], totalBet: 100, folded: false },
      { id: 'mira', cards: ['Ks', 'Kd'], totalBet: 100, folded: false },
      { id: 'nox', cards: ['Qs', 'Qd'], totalBet: 40, folded: false },
    ],
  });
  assert.equal(winner.awards.hero, 240);

  const split = holdem.resolveHoldemShowdown({
    board: ['As', 'Ks', 'Qs', 'Js', 'Ts'],
    dealerIndex: 2,
    players: [
      { id: 'hero', cards: ['2c', '3d'], totalBet: 5, folded: false },
      { id: 'mira', cards: ['4c', '5d'], totalBet: 5, folded: false },
      { id: 'nox', cards: ['6c', '7d'], totalBet: 5, folded: true },
    ],
  });
  assert.deepEqual(split.awards, { hero: 8, mira: 7 });
});

test('seeded AI only chooses an action currently allowed by the engine', () => {
  assert.equal(typeof holdem.chooseHoldemAiAction, 'function');
  let game = holdem.createHoldemGame(99);
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  for (let seed = 1; seed <= 40; seed += 1) {
    const choice = holdem.chooseHoldemAiAction(game, seed);
    const legal = holdem.getHoldemLegalActions(game, game.players[game.actorIndex].id);
    assert.ok(legal.some((action) => action.type === choice.type));
  }
});

test('AI choices and timing seeds survive refresh deterministically', () => {
  let game = holdem.createHoldemGame(47, { playerCount: 3, difficulty: 'hard' });
  game = holdem.applyHoldemAction(game, { type: 'fold' });
  const first = holdem.chooseHoldemAiAction(game);
  const second = holdem.chooseHoldemAiAction(JSON.parse(JSON.stringify(game)));
  assert.deepEqual(first, second);
  const advanced = holdem.applyHoldemAction(game, first);
  assert.notEqual(advanced.aiSeed, game.aiSeed);
});

test('hard difficulty evaluates equity rather than reading opponents hidden cards', () => {
  assert.equal(typeof holdem.estimateHoldemEquity, 'function');
  const aces = holdem.estimateHoldemEquity(['As', 'Ah'], [], 3, 1212, 160);
  const sevenTwo = holdem.estimateHoldemEquity(['7s', '2h'], [], 3, 1212, 160);
  assert.ok(aces > sevenTwo);
  assert.ok(aces > 0.45);
});

test('AI think time is deterministic and visibly paced by difficulty', () => {
  assert.equal(typeof holdem.getHoldemAiThinkDelay, 'function');
  const ranges = {
    easy: [850, 1_600],
    standard: [1_200, 2_200],
    hard: [1_500, 2_600],
  };
  for (const [difficulty, [minimum, maximum]] of Object.entries(ranges)) {
    const delays = Array.from({ length: 16 }, (_, index) => holdem.getHoldemAiThinkDelay(difficulty, 1212 + index));
    assert.ok(delays.every((delay) => delay >= minimum && delay <= maximum));
    assert.equal(holdem.getHoldemAiThinkDelay(difficulty, 1212), delays[0]);
    assert.ok(new Set(delays).size > 1);
  }
});

test('hard AI equity simulation supports eight opponents without hidden-card access', () => {
  const equity = holdem.estimateHoldemEquity(['As', 'Ah'], [], 8, 8888, 48);
  assert.ok(equity > 0 && equity <= 1);
});

test('the WeChat contact action grants exactly one hundred thousand persistent chips per tap', () => {
  assert.equal(holdemUi.HOLDEM_WECHAT_BONUS, 100_000);
  assert.equal(typeof holdem.grantHoldemChips, 'function');
  const original = holdem.createHoldemGame(1212);
  const funded = holdem.grantHoldemChips(original, holdemUi.HOLDEM_WECHAT_BONUS);
  assert.equal(funded.players[0].stack, original.players[0].stack + 100_000);
  assert.equal(original.players[0].stack, 1_000);
  assert.match(funded.log.at(-1), /100,000/);
});

test('a serialized current hand can be restored without changing the cards or actor', () => {
  assert.equal(typeof holdem.normalizeHoldemState, 'function');
  const game = holdem.applyHoldemAction(holdem.createHoldemGame(31415), { type: 'call' });
  const restored = holdem.normalizeHoldemState(JSON.parse(JSON.stringify(game)));
  assert.equal(restored.ok, true);
  assert.equal(restored.value.actorIndex, game.actorIndex);
  assert.deepEqual(restored.value.deck, game.deck);
  assert.deepEqual(restored.value.players.map((player) => player.cards), game.players.map((player) => player.cards));
});

test('the poker table is a configurable portrait route with compact controls and WeChat funding', async () => {
  const [page, table, css, lab, chrome, wechatShare] = await Promise.all([
    readFile(new URL('../app/play/holdem/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/play/holdem/holdem-table.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/play/holdem/holdem.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/play/game-lab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/site-chrome.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/wechat-share.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /HoldemTable/);
  assert.match(table, /rosalie_holdem_state_v1/);
  assert.match(table, /data-holdem-table/);
  assert.match(table, /getHoldemLegalActions/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(max-width:\s*360px\)/);
  assert.match(css, /@media \(max-height:\s*650px\) and \(max-width:\s*430px\)/);
  assert.match(css, /\.holdem-actions\s*\{\s*grid-template-columns:\s*repeat\(4,/);
  assert.match(table, /const OPPONENT_LAYOUTS/);
  assert.match(table, /--seat-x/);
  assert.match(table, /data-avatar=\{player\.id\}/);
  assert.match(css, /\.holdem-opponents\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /var\(--seat-x\)/);
  assert.match(css, /\[data-avatar="hero"\]/);
  assert.match(css, /\[data-avatar="mira"\]/);
  assert.match(css, /\[data-avatar="lune"\]/);
  assert.match(css, /min-height:\s*390px/);
  assert.match(table, /求你爸爸，给你多点筹码/);
  assert.match(table, /对手人数/);
  assert.match(table, /难度/);
  assert.match(table, /简单/);
  assert.match(table, /标准/);
  assert.match(table, /困难/);
  assert.match(table, /getHoldemLegalActions\(current,\s*currentActor\.id\)/);
  assert.match(table, /保底行动/);
  assert.match(chrome, /SITE_WECHAT_ACTION_EVENT/);
  assert.match(chrome, /\/play\/holdem/);
  assert.match(chrome, /求你爸爸，给你多点筹码/);
  assert.match(wechatShare, /求你爸爸，给你多点筹码/);
  assert.match(wechatShare, /\/play\/holdem/);
  assert.match(lab, /牌桌/);
  assert.match(lab, /\/play\/holdem/);
});
