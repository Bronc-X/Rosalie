import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function readHomeUi() {
  const [app, css] = await Promise.all([
    readFile(new URL('app/FoodAtlas.tsx', root), 'utf8'),
    readFile(new URL('app/experience.css', root), 'utf8'),
  ]);
  return { app, css };
}

test('the NTO introduction uses the current place artwork and keeps its Chinese title on one line', async () => {
  const { app, css } = await readHomeUi();

  assert.match(app, /<div className="lede-copy is-right"><h1>我们一起走过的地方<\/h1><div className="place-selector"/);
  assert.match(app, /getExperiencePlaceHeroImage\(currentPlaceId\)/);
  assert.match(app, /<figure><Image src=\{[^}]+\} alt="" fill sizes="\(max-width: 800px\) 100vw, \(max-width: 1100px\) 62vw, 48vw"/);
  assert.match(app, /alt="" fill sizes="\(max-width: 800px\) 100vw, \(max-width: 1100px\) 62vw, 48vw"/);
  assert.match(app, /aria-label=\{`现在一共收录 \$\{placeExperiences\.length\} 个地方`\}/);
  assert.match(app, /className="lede-total" aria-label=\{`现在一共收录 \$\{placeExperiences\.length\} 个地方`\}/);
  assert.doesNotMatch(app, /<figure>[\s\S]*?<figcaption/);
  assert.doesNotMatch(css, /\.experience-lede figure::after/);
  assert.match(css, /\.experience-lede \{[^}]*grid-template-columns:\s*36%\s+48%\s+16%;/s);
  assert.match(css, /\.place-selector-trigger > span \{[^}]*font:\s*900\s+clamp\(3\.7rem,/s);
  assert.match(css, /\.lede-copy\.is-right h1 \{[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.experience-lede figure \{[^}]*aspect-ratio:\s*1734\s*\/\s*907;[^}]*min-height:\s*0;/s);
});

test('the current place is selected beside the title instead of repeated in the filter ribbon', async () => {
  const { app, css } = await readHomeUi();
  await access(new URL('public/icons/place-dropdown-journal-v2.png', root));
  const title = app.indexOf('<h1>我们一起走过的地方</h1>');
  const selector = app.indexOf('className="place-selector-trigger"', title);
  const ribbonStart = app.indexOf('<section className="filter-ribbon"', title);

  assert.ok(title >= 0 && selector > title, 'the current place selector should follow the title');
  assert.ok(selector < ribbonStart, 'the current place selector should stay in the introduction');
  assert.doesNotMatch(app.slice(ribbonStart), /place-navigation/);
  assert.match(app.slice(selector, ribbonStart), /src="\/icons\/place-dropdown-journal-v2\.png"/);
  assert.match(app.slice(selector, ribbonStart), /className="place-selector-icon"/);
  assert.match(css, /\.place-selector-icon \{[^}]*object-fit:\s*contain;/s);
});

test('the search is compact while quick tags sit below the state filters and full selects stay on the right', async () => {
  const { app, css } = await readHomeUi();

  assert.match(app, /className="experience-search"[^>]*>[\s\S]*placeholder="寻店"/);
  assert.match(app, /className="state-filter-stack"/);
  assert.match(app, /const quickFilterTags = \[/);
  assert.match(app, /\{ value: '全部', label: '全部标签' \}/);
  assert.match(app, /className="quick-tag-tabs" role="group" aria-label="常用标签"/);
  assert.match(app, /quickFilterTags\.filter\([\s\S]*setTagFilter\(value\)/);
  assert.match(app, /className="category-select"/);
  assert.match(app, /className="tag-select"/);
  assert.match(css, /\.filter-ribbon \{[^}]*grid-template-columns:\s*minmax\(8rem,\s*11rem\)\s+minmax\(0,\s*1fr\)\s+auto\s+auto;/s);
  assert.match(css, /\.quick-tag-tabs \{[^}]*overflow-x:\s*auto;/s);
});

test('the pixel pair stays in the right journal margin above the shared dock', async () => {
  const { css } = await readHomeUi();
  const pet = await readFile(new URL('app/MouseFollowerPet.tsx', root), 'utf8');

  assert.match(css, /\.pet-dock \{[^}]*bottom:\s*calc\(var\(--experience-dock-space\) \+ \.5rem\);/s);
  assert.match(css, /\.pet-dock\.is-collapsed \{[^}]*bottom:\s*calc\(var\(--experience-dock-space\) \+ \.5rem\);/s);
  assert.match(pet, /const dockClassName = `pet-dock is-right\$\{settings\.collapsed \? ' is-collapsed' : ''\}`;/);
  assert.doesNotMatch(pet, /onMouseDown=\{beginPetDrag\}|可拖动/);
});
