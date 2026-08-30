import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const placeModel = await import('../../app/experience-view-model.ts').catch(() => ({}));
const sourceUrl = new URL('../../app/FoodAtlas.tsx', import.meta.url);
const cityCoverPromptUrl = new URL('../../docs/city-cover-prompt.md', import.meta.url);

test('the built-in place menu starts with Shantou, Guangzhou, and Shenzhen', () => {
  assert.deepEqual(placeModel.DEFAULT_EXPERIENCE_PLACES, [
    { id: 'shantou', label: '汕頭' },
    { id: 'guangzhou', label: '廣州' },
    { id: 'shenzhen', label: '深圳' },
  ]);
});

test('each built-in place owns a distinct local NTO hero image', async () => {
  assert.equal(typeof placeModel.getExperiencePlaceHeroImage, 'function');

  const heroPaths = placeModel.DEFAULT_EXPERIENCE_PLACES.map(({ id }) => (
    placeModel.getExperiencePlaceHeroImage(id)
  ));

  assert.equal(new Set(heroPaths).size, 3, 'each built-in place should have its own hero artwork');
  for (const heroPath of heroPaths) {
    assert.match(heroPath, /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-v2\.png$/);
    await access(new URL(`../../public/${heroPath.slice(1)}`, import.meta.url));
  }
});

test('the reusable city-cover prompt keeps the complete title lockup and city variables', async () => {
  const prompt = await readFile(cityCoverPromptUrl, 'utf8').catch(() => '');

  assert.notEqual(prompt, '', 'docs/city-cover-prompt.md should document the reusable city-cover prompt');
  assert.match(prompt, /\bTONI\b/);
  assert.match(prompt, /\bROSALIE\b/);
  assert.match(prompt, /\bNTO\b/);
  assert.match(prompt, /NEXT TRAVEL OUTLINE/);
  assert.match(prompt, /(?:three\s+(?:separate\s+)?lines|三行)/i);
  assert.match(prompt, /(?:left[-\s]+align(?:ed|ment)?|左对齐)/i);
  assert.match(
    prompt,
    /(?:do not|must not|never|禁止|不得|不可|不要)[^\n]{0,160}\bTO\b[^\n]{0,80}\bRO\b/i,
    'the title instructions should explicitly reject the TO and RO abbreviations',
  );
  assert.match(
    prompt,
    /(?:\{\{?|\[\[?|<)\s*(?:CITY(?:_NAME)?|城市(?:名)?)\s*(?:\}\}?|\]\]?|>)/i,
    'the prompt should expose a replaceable city-name variable',
  );
  assert.match(
    prompt,
    /(?:\{\{?|\[\[?|<)\s*(?:CITY_(?:ELEMENTS?|MOTIFS?|LANDMARKS?)|城市(?:元素|地标|意象))\s*(?:\}\}?|\]\]?|>)/i,
    'the prompt should expose a replaceable city-element variable',
  );
  assert.match(
    prompt,
    /(?:bottom[-\s]+right|lower[-\s]+right|右下角)/i,
    'the city element should be placed at the bottom right',
  );
});

test('the selected place limits the shared map and list to that place', () => {
  assert.equal(typeof placeModel.filterExperiencesByPlace, 'function');
  const shantouExperiences = [
    { id: 'legacy-shantou', name: '纪德来甜汤' },
    { id: 'explicit-shantou', name: '公园路牛肉丸', placeId: 'shantou' },
  ];

  assert.deepEqual(
    placeModel.filterExperiencesByPlace(shantouExperiences, 'shantou').map(({ id }) => id),
    ['legacy-shantou', 'explicit-shantou'],
  );
  assert.deepEqual(placeModel.filterExperiencesByPlace(shantouExperiences, 'guangzhou'), []);
  assert.deepEqual(placeModel.filterExperiencesByPlace(shantouExperiences, 'shenzhen'), []);
});

test('a place added from management becomes a selectable option without mutating the old list', () => {
  assert.equal(typeof placeModel.appendExperiencePlace, 'function');
  const original = placeModel.DEFAULT_EXPERIENCE_PLACES;
  const next = placeModel.appendExperiencePlace(original, { id: 'zhuhai', label: '珠海' });

  assert.deepEqual(next.at(-1), { id: 'zhuhai', label: '珠海' });
  assert.equal(next.some((place) => place.id === 'zhuhai'), true);
  assert.equal(original.some((place) => place.id === 'zhuhai'), false);
});

test('an Experience created while viewing a place keeps that place in its payload', () => {
  assert.equal(typeof placeModel.withExperiencePlace, 'function');
  const draft = { name: '沙面散步', category: 'outdoor_nature' };

  assert.deepEqual(placeModel.withExperiencePlace(draft, 'guangzhou'), {
    name: '沙面散步',
    category: 'outdoor_nature',
    placeId: 'guangzhou',
  });
  assert.equal('placeId' in draft, false);
});

test('the current place has an accessible dropdown beside the journey title', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const title = source.indexOf('>我们一起走过的地方</h1>');
  const trigger = source.indexOf('className="place-selector-trigger"', title);
  const ribbon = source.indexOf('<section className="filter-ribbon"', title);

  assert.ok(title >= 0, 'the journey title should exist');
  assert.ok(trigger > title && trigger < ribbon, 'the place dropdown should sit with the title, before the filter ribbon');
  assert.match(source.slice(trigger, ribbon), /aria-haspopup="listbox"/);
  assert.match(source.slice(trigger, ribbon), /aria-expanded=\{placeMenuOpen\}/);
  assert.match(source.slice(trigger, ribbon), /\{currentPlace\.label\}/);
  assert.match(source, /role="listbox" aria-label="选择地方"/);
});

test('the place dropdown renders every option and includes a management action', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /placeOptions\.map\(\(place\) =>/);
  assert.match(source, /setCurrentPlaceId\(place\.id\)/);
  assert.match(source, />管理地方<\/button>/);
});

test('Quick Add sends the currently selected place to the Experience API', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const createStart = source.indexOf('async function createExperience');
  const createEnd = source.indexOf('async function createFootprint', createStart);

  assert.ok(createStart >= 0 && createEnd > createStart, 'the create Experience handler should exist');
  assert.match(source.slice(createStart, createEnd), /placeId:\s*currentPlaceId/);
});

test('an empty selected place shows “待你补充” and keeps its Quick Add entry instead of a map', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const emptyStart = source.indexOf("dataStatus === 'ready' && placeExperiences.length === 0");
  const populatedStart = source.indexOf("dataStatus === 'ready' && placeExperiences.length > 0", emptyStart);

  assert.ok(emptyStart >= 0 && populatedStart > emptyStart, 'empty and populated place branches should remain separate');
  const emptyBranch = source.slice(emptyStart, populatedStart);
  assert.match(emptyBranch, /<button type="button" onClick=\{openQuickAdd\}>＋ 新增<\/button>/);
  assert.match(emptyBranch, /<strong>待你补充<\/strong>/);
  assert.doesNotMatch(emptyBranch, /这里还没有记下地方|empty-seal/);
});

test('FoodAtlas drives the NTO hero image from the current place', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const ledeStart = source.indexOf('<section className="experience-lede">');
  const ledeEnd = source.indexOf('<section className="filter-ribbon"', ledeStart);

  assert.ok(ledeStart >= 0 && ledeEnd > ledeStart, 'the NTO introduction should exist');
  assert.match(source, /getExperiencePlaceHeroImage\(currentPlaceId\)/);
  assert.match(source.slice(ledeStart, ledeEnd), /<figure><Image src=\{[^}]+\}/);
  assert.doesNotMatch(source.slice(ledeStart, ledeEnd), /src="\/toni-rosalie-experience-map\.png"/);
});

test('the selected place owns the list total and the footer label', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /\{filteredExperiences\.length\} \/ \{placeExperiences\.length\}/);
  assert.match(source, /T &amp; R · \{currentPlace\.label\}/);
});

test('place management lists shared places and can add another one', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const modalStart = source.indexOf("modal === 'places'");
  const modalEnd = source.indexOf("modal === 'quick-add'", modalStart);

  assert.ok(modalStart >= 0 && modalEnd > modalStart, 'the place management modal should be rendered');
  const modal = source.slice(modalStart, modalEnd);
  assert.match(modal, /ModalShell title="管理地方"/);
  assert.match(modal, /placeOptions\.map\(\(place\) =>/);
  assert.match(modal, /className="place-manager-form" onSubmit=\{createPlace\}/);
  assert.match(modal, /value=\{newPlaceName\}/);
  assert.match(modal, /actionBusy \? '添加中…' : '确认'/);
});
