import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [holeSand, parkingScrew, waterRescue, arrow, connectMarkup, connectStyles] = await Promise.all([
  readFile(new URL('../app/play/immersive/create-hole-sand-games.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/play/immersive/create-parking-screw-games.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/play/immersive/create-water-rescue-games.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/play/arrow/create-arrow-game.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/play/connect/link-match-game.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/play/connect/connect.css', import.meta.url), 'utf8'),
]);

test('the immersive games keep independent world renderers instead of one shared pastel backdrop', () => {
  assert.match(holeSand, /addHoleObservatoryBackdrop/);
  assert.match(holeSand, /addSandLightboxBackdrop/);
  assert.match(parkingScrew, /drawParkingGarage/);
  assert.match(parkingScrew, /drawScrewWorkshop/);
  assert.match(waterRescue, /'water-lab' \| 'storm-shelter'/);
  assert.match(arrow, /const skyBands/);
});

test('link match renders its own constellation ambience in both markup and CSS', () => {
  assert.match(connectMarkup, /className="link-game-glow"/);
  assert.match(connectStyles, /\.link-game-glow::before/);
  assert.match(connectStyles, /@keyframes link-comet/);
  assert.match(connectStyles, /html\[data-theme="dark"\] \.link-game-page/);
});
