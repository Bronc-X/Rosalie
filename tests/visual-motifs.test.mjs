import test from 'node:test';
import assert from 'node:assert/strict';

const visuals = await import('../lib/visual-motifs.mjs').catch(() => ({}));

test('the playful visual language has at least eight distinct silhouettes', () => {
  assert.ok(Array.isArray(visuals.VISUAL_MOTIFS));
  assert.ok(visuals.VISUAL_MOTIFS.length >= 8);
  assert.ok(new Set(visuals.VISUAL_MOTIFS.map((motif) => motif.shape)).size >= 8);
  assert.ok(visuals.VISUAL_MOTIFS.some((motif) => motif.id === 'sakura'));
  assert.ok(visuals.VISUAL_MOTIFS.some((motif) => motif.id === 'potato'));
  assert.ok(visuals.VISUAL_MOTIFS.some((motif) => !['sakura', 'controller'].includes(motif.id)));
});

test('motif selection is deterministic and cycles through the full set', () => {
  assert.equal(typeof visuals.motifForIndex, 'function');
  const firstPass = Array.from({ length: visuals.VISUAL_MOTIFS.length }, (_, index) => visuals.motifForIndex(index, 3).id);
  const secondPass = Array.from({ length: visuals.VISUAL_MOTIFS.length }, (_, index) => visuals.motifForIndex(index, 3).id);
  assert.deepEqual(firstPass, secondPass);
  assert.equal(new Set(firstPass).size, visuals.VISUAL_MOTIFS.length);
});
