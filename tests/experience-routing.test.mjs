import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readSource(relativePath) {
  try {
    return await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return '';
    throw error;
  }
}

test('the root route keeps the original potato, blossom, and five-part letter', async () => {
  const source = await readSource('app/page.tsx');
  const letter = source.match(/const HOME_LETTER_PARAGRAPHS\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? '';

  assert.match(source, /export default function Home\(\)/);
  assert.match(source, /className="character potato"/);
  assert.match(source, /className="character sakura"/);
  assert.equal((letter.match(/^\s*'/gm) ?? []).length, 5);
});

test('/experiences mounts the Experience module in experience view', async () => {
  const source = await readSource('app/experiences/page.tsx');

  assert.match(source, /<FoodAtlas\b(?=[^>]*\binitialView="experiences")[^>]*\/>/);
});

test('/calendar mounts the Experience module in calendar view', async () => {
  const source = await readSource('app/calendar/page.tsx');

  assert.match(source, /<FoodAtlas\b(?=[^>]*\binitialView="calendar")[^>]*\/>/);
});

test('Experience styles stay inside the NTO routes instead of loading on the original homepage', async () => {
  const rootLayout = await readSource('app/layout.tsx');
  const experiencesLayout = await readSource('app/experiences/layout.tsx');
  const calendarLayout = await readSource('app/calendar/layout.tsx');

  assert.doesNotMatch(rootLayout, /import\s+['"]\.\/experience\.css['"]/);
  assert.match(experiencesLayout, /import\s+['"]\.\.\/experience\.css['"]/);
  assert.match(calendarLayout, /import\s+['"]\.\.\/experience\.css['"]/);
});

test('NTO disabled and reduced-motion rules do not target controls on the original site', async () => {
  const source = await readSource('app/experience.css');

  assert.doesNotMatch(source, /(^|,)\s*button:disabled\s*\{/m);
  assert.doesNotMatch(source, /(^|\{)\s*\*,\s*\*::before,\s*\*::after\s*\{/m);
  assert.match(source, /\.experience-app button:disabled/);
  assert.match(source, /\.access-page button:disabled/);
});

test('/food sends the retired food entry to the NTO Experience module', async () => {
  const source = await readSource('app/food/page.tsx');

  assert.match(source, /redirect\(['"]\/experiences['"]\)/);
  assert.doesNotMatch(source, /<FoodAtlas\b/);
});

test('the Experience topbar Home link returns to the original root route', async () => {
  const source = await readSource('app/FoodAtlas.tsx');
  const topbarNav = source.match(/<nav\s+aria-label="主要页面">([\s\S]*?)<\/nav>/)?.[1] ?? '';

  assert.match(topbarNav, /<Link\b(?=[^>]*\bhref="\/")[^>]*>\s*Home\s*<\/Link>/);
});
