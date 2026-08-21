import test from 'node:test';
import assert from 'node:assert/strict';

const routeGame = await import('../lib/route-game.mjs').catch(() => ({}));

test('a route round begins at Toni with an empty active trail', () => {
  assert.equal(typeof routeGame.beginRouteGame, 'function');
  assert.deepEqual(routeGame.beginRouteGame(), {
    status: 'playing',
    points: [routeGame.ROUTE_START],
  });
});

test('a safe move extends the route without mutating the old state', () => {
  const state = routeGame.beginRouteGame();
  const next = routeGame.advanceRouteGame(state, { x: 18, y: 82 });

  assert.equal(next.status, 'playing');
  assert.deepEqual(next.points.at(-1), { x: 18, y: 82 });
  assert.equal(state.points.length, 1);
});

test('crossing a work zone loses even when both endpoints are outside it', () => {
  const obstacle = { x: 50, y: 50, radius: 8, label: '干' };

  assert.equal(
    routeGame.segmentHitsCircle({ x: 35, y: 50 }, { x: 65, y: 50 }, obstacle),
    true,
  );
  assert.equal(
    routeGame.segmentHitsCircle({ x: 35, y: 28 }, { x: 65, y: 28 }, obstacle),
    false,
  );
});

test('reaching Rosalie completes the route', () => {
  const state = {
    status: 'playing',
    points: [{ x: 78, y: 19 }],
  };
  const next = routeGame.advanceRouteGame(state, routeGame.ROUTE_TARGET, []);

  assert.equal(next.status, 'won');
});

test('letting go before arrival restores the distance', () => {
  const state = routeGame.advanceRouteGame(routeGame.beginRouteGame(), { x: 20, y: 86 }, []);
  assert.equal(routeGame.releaseRouteGame(state).status, 'lost');
});

