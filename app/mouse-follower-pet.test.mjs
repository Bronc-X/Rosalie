import assert from 'node:assert/strict';
import test from 'node:test';

const petMotion = await import('./mouse-follower-pet.ts').catch(() => ({}));

test('normalizes cursor direction and clamps distant pointers', () => {
  assert.equal(typeof petMotion.normalizePointerVector, 'function');
  assert.deepEqual(
    petMotion.normalizePointerVector({ x: 420, y: 120 }, { x: 120, y: 120 }, 240),
    { x: 1, y: 0, proximity: 1 },
  );
});

test('keeps close cursor motion proportional and finite at the character origin', () => {
  assert.deepEqual(
    petMotion.normalizePointerVector({ x: 150, y: 160 }, { x: 120, y: 120 }, 200),
    { x: 0.15, y: 0.2, proximity: 0.25 },
  );
  assert.deepEqual(
    petMotion.normalizePointerVector({ x: 120, y: 120 }, { x: 120, y: 120 }, 200),
    { x: 0, y: 0, proximity: 0 },
  );
});

test('keeps a freely dragged pet dock inside the visible viewport', () => {
  assert.equal(typeof petMotion.clampPetDockPosition, 'function');
  assert.deepEqual(
    petMotion.clampPetDockPosition(
      { x: -80, y: 900 },
      { width: 180, height: 260 },
      { width: 1280, height: 720 },
      { horizontal: 8, top: 42, bottom: 8 },
    ),
    { x: 8, y: 452 },
  );
});

test('snaps a collapsed pet dock to the nearest side while preserving a safe height', () => {
  assert.equal(typeof petMotion.snapPetDockToSide, 'function');
  assert.deepEqual(
    petMotion.snapPetDockToSide(
      { x: 780, y: 180 },
      { width: 180, height: 260 },
      { width: 1280, height: 720 },
      { horizontal: 8, top: 42, bottom: 8 },
    ),
    { side: 'right', position: { x: 1092, y: 180 } },
  );
  assert.deepEqual(
    petMotion.snapPetDockToSide(
      { x: 80, y: -20 },
      { width: 180, height: 260 },
      { width: 1280, height: 720 },
      { horizontal: 8, top: 42, bottom: 8 },
    ),
    { side: 'left', position: { x: 8, y: 42 } },
  );
});

test('disables the animated pair when the layout cannot safely host it', () => {
  assert.equal(typeof petMotion.shouldAnimatePetPair, 'function');
  assert.equal(petMotion.shouldAnimatePetPair({ width: 1280, coarsePointer: false, reducedMotion: false }), true);
  assert.equal(petMotion.shouldAnimatePetPair({ width: 800, coarsePointer: false, reducedMotion: false }), false);
  assert.equal(petMotion.shouldAnimatePetPair({ width: 1280, coarsePointer: true, reducedMotion: false }), false);
  assert.equal(petMotion.shouldAnimatePetPair({ width: 1280, coarsePointer: false, reducedMotion: true }), false);
});

test('keeps ambient glances rare while still allowing deterministic blinks', () => {
  assert.equal(petMotion.selectAmbientPetFrame(0), 'blink');
  assert.equal(petMotion.selectAmbientPetFrame(0.79), 'blink');
  assert.equal(petMotion.selectAmbientPetFrame(0.8), 'glance');
  assert.equal(petMotion.selectAmbientPetFrame(1), 'glance');
});

test('uses short blinks and a readable greeting without animating idle', () => {
  assert.equal(petMotion.petFrameDuration('idle'), 0);
  assert.equal(petMotion.petFrameDuration('blink'), 170);
  assert.equal(petMotion.petFrameDuration('glance'), 900);
  assert.equal(petMotion.petFrameDuration('wave'), 920);
});

test('restores a valid saved dock side, collapsed state, and both outfits', () => {
  const saved = {
    side: 'left',
    collapsed: true,
    position: null,
    poses: { toni: 'sit', rosalie: 'profile' },
    outfits: {
      toni: { preset: 'weekend', color: '#2f6f8f' },
      rosalie: { preset: 'date', color: '#b53b2f' },
    },
  };

  assert.deepEqual(petMotion.parsePetDockSettings(JSON.stringify(saved)), saved);
});

test('restores a saved free position and rejects malformed coordinates', () => {
  assert.deepEqual(
    petMotion.parsePetDockSettings(JSON.stringify({ position: { x: 320, y: 144 } })).position,
    { x: 320, y: 144 },
  );
  assert.equal(
    petMotion.parsePetDockSettings(JSON.stringify({ position: { x: 'far', y: -20 } })).position,
    null,
  );
});

test('falls back field by field when saved pet settings are malformed', () => {
  assert.deepEqual(
    petMotion.parsePetDockSettings(JSON.stringify({
      side: 'top',
      collapsed: 'yes',
      poses: { toni: 'flying', rosalie: 'crouch' },
      outfits: {
        toni: { preset: 'spacesuit', color: 'red' },
        rosalie: { preset: 'field', color: '#ABCDEF' },
      },
    })),
    {
      side: 'right',
      collapsed: false,
      position: null,
      poses: { toni: 'stand', rosalie: 'crouch' },
      outfits: {
        toni: { preset: 'classic', color: '#b53b2f' },
        rosalie: { preset: 'field', color: '#abcdef' },
      },
    },
  );

  assert.deepEqual(petMotion.parsePetDockSettings('{not-json'), petMotion.DEFAULT_PET_DOCK_SETTINGS);
});

test('shows the other character first for the active member', () => {
  assert.deepEqual(petMotion.defaultPetVisibility('toni'), { toni: false, rosalie: true });
  assert.deepEqual(petMotion.defaultPetVisibility('rosalie'), { toni: true, rosalie: false });
});

test('reveals the hidden character when a single visible pet is clicked', () => {
  assert.deepEqual(
    petMotion.petVisibilityAfterCharacterClick({ toni: false, rosalie: true }),
    { toni: true, rosalie: true },
  );
  assert.deepEqual(
    petMotion.petVisibilityAfterCharacterClick({ toni: true, rosalie: false }),
    { toni: true, rosalie: true },
  );
});

test('keeps both characters visible when either one is clicked', () => {
  assert.deepEqual(
    petMotion.petVisibilityAfterCharacterClick({ toni: true, rosalie: true }),
    { toni: true, rosalie: true },
  );
});

test('lets each character be hidden and restored independently, including both hidden', () => {
  assert.equal(typeof petMotion.petVisibilityAfterToggle, 'function');
  const onlyRosalie = petMotion.petVisibilityAfterToggle({ toni: true, rosalie: true }, 'toni');
  assert.deepEqual(onlyRosalie, { toni: false, rosalie: true });

  const bothHidden = petMotion.petVisibilityAfterToggle(onlyRosalie, 'rosalie');
  assert.deepEqual(bothHidden, { toni: false, rosalie: false });
  assert.deepEqual(
    petMotion.petVisibilityAfterToggle(bothHidden, 'toni'),
    { toni: true, rosalie: false },
  );
});

test('keeps outfit customization hidden while pose selection remains available', () => {
  assert.equal(petMotion.PET_OUTFIT_CUSTOMIZATION_ENABLED, false);
});

