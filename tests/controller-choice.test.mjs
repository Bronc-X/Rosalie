import test from 'node:test';
import assert from 'node:assert/strict';

const controllerChoice = await import('../lib/controller-choice.mjs').catch(() => ({}));

test('the homepage offers exactly three controller choices', () => {
  assert.equal(controllerChoice.CONTROLLER_CHOICES?.length, 3);
  assert.deepEqual(
    controllerChoice.CONTROLLER_CHOICES?.map(({ id, label }) => ({ id, label })),
    [
      { id: 'pull', label: '双潮生' },
      { id: 'rosette', label: '不烫别怕' },
      { id: 'talisman', label: '铃儿响叮当' },
    ],
  );
});

test('every controller offers the same three distinct color palettes', () => {
  assert.equal(controllerChoice.CONTROLLER_PALETTES?.length, 3);
  assert.deepEqual(
    controllerChoice.CONTROLLER_PALETTES?.map(({ id, label }) => ({ id, label })),
    [
      { id: 'original', label: '本色' },
      { id: 'blush', label: '樱雾' },
      { id: 'midnight', label: '月蓝' },
    ],
  );

  const filters = controllerChoice.CONTROLLER_PALETTES.map(({ id }) => controllerChoice.controllerPaletteFilter(id));
  assert.equal(new Set(filters).size, 3);
  assert.equal(controllerChoice.resolveControllerPalette('unknown'), 'original');
});

test('unknown stored controller choices fall back to the pull controller', () => {
  assert.equal(controllerChoice.resolveControllerChoice('rosette'), 'rosette');
  assert.equal(controllerChoice.resolveControllerChoice('anything-else'), 'pull');
  assert.equal(controllerChoice.resolveControllerChoice(null), 'pull');
  assert.equal(controllerChoice.controllerAsset('talisman'), '/match-charm.webp');
});
