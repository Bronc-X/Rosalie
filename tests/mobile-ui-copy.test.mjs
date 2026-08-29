import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PRIMARY_SURFACES = [
  'app/site-chrome.tsx',
  'app/page.tsx',
  'app/treehole/treehole-board.tsx',
  'app/schedule/schedule-board.tsx',
  'app/interview/interview-room.tsx',
  'app/play/game-lab.tsx',
];

test('primary mobile surfaces avoid decorative emoji and ornamental separators', async () => {
  for (const file of PRIMARY_SURFACES) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /[☾☼✦✓♥♡↗…—–]| · /, file);
  }
});

test('the interview setup presents each instruction once', async () => {
  const source = await readFile(new URL('../app/interview/interview-room.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, />INTERVIEW</);
  assert.doesNotMatch(source, /一次一问/);
  assert.doesNotMatch(source, />0\{index \+ 1\}</);
});

test('the homepage folds secondary tools into the top and removes the invitation flow', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /<p className="whisper">多余的<\/p>/);
  assert.doesNotMatch(source, /从来都是负距离|2026\.08\.19 - 08\.29/);
  assert.match(source, /className="home-utility-bar"/);
  assert.match(source, /<details className="controller-drawer">/);
  assert.match(source, /href="\/interview"/);
  assert.match(source, /href="\/play"/);
  assert.doesNotMatch(source, /INITIAL_INVITATION|respondToInvitation|getDropChoice/);
  assert.doesNotMatch(source, /className=\{`invitation|mobile-charm-stage|想我就点右上方发信息给我/);
});

test('the homepage carries the farewell note as a restrained editorial section', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/pocket-stage.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /className="home-letter"/);
  assert.match(source, /我们太恰如其分地快乐/);
  assert.match(source, /消散并不等于没有发生/);
  assert.match(source, /日历你要加上，我在期待你会在里头增加什么/);
  assert.match(source, /那些疯野的念头/);
  assert.match(source, /想到这里，足矣~/);
  assert.doesNotMatch(source, /史铁生/);
  assert.match(styles, /\.home-letter\s*\{/);
  assert.match(styles, /url\("\/aurora-rainbow-original\.webp"\)/);
});

test('the homepage collapses secondary controls and countdown over the original sky', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/pocket-stage.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /<details className="home-hidden-drawer">/);
  assert.match(source, /<summary className="home-hidden-trigger"/);
  assert.match(source, /<details className="countdown-drawer">/);
  assert.doesNotMatch(source, /<details className="(?:home-hidden-drawer|countdown-drawer)"\s+open/);
  assert.match(source, /'--toni-shift': `\$\{state\.progress \* 16\}%`/);
  assert.match(source, /'--rosalie-shift': `\$\{state\.progress \* -16\}%`/);

  const reunionBlock = styles.match(/\.reunion\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(reunionBlock, /url\("\/aurora-rainbow-original\.webp"\)/);
  assert.doesNotMatch(reunionBlock, /gradient\(/);
  assert.match(styles, /\.meeting-scene \.glow-arc\s*\{[\s\S]*?display:\s*none/);
  assert.match(styles, /\.person-toni\s*\{[\s\S]*?left:\s*2%/);
  assert.match(styles, /\.person-rosalie\s*\{[\s\S]*?right:\s*2%/);
  assert.match(styles, /Keep the three homepage controls compact and together at the top-right/);
  assert.match(styles, /\.home-hidden-drawer\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(styles, /\.site-quick-actions button\s*\{[\s\S]*?width:\s*44px/);
});

test('the homepage keeps its compact drawer accurate, aligned, and legible', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/pocket-stage.css', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(source, /已归队/);
  assert.match(source, /isReunited \? '已结束'/);
  assert.match(styles, /--font-ui:\s*system-ui,\s*-apple-system/);
  assert.doesNotMatch(styles, /font-weight:\s*(?:650|680|720|750)\b/);
  assert.match(styles, /\.home-hidden-panel \.controller-popover\s*\{[\s\S]*?position:\s*relative/);
  assert.match(styles, /\.home-hidden-trigger,\s*\n\.site-quick-actions button\s*\{[\s\S]*?height:\s*44px/);
  const compactControls = styles.split('/* Keep the three homepage controls compact and together at the top-right. */')[1] ?? '';
  assert.match(compactControls.match(/\.site-quick-actions \.site-wechat-action\s*\{[^}]*\}/)?.[0] ?? '', /width:\s*44px/);
  assert.match(compactControls.match(/\.home-hidden-drawer\s*\{[^}]*\}/)?.[0] ?? '', /width:\s*44px/);
  assert.doesNotMatch(source, /scale:\s*\.(?:94|96|97)/);
});

test('the homepage letter accepts persistent notes and replies', async () => {
  const [page, board] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/home-letter-notes.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<HomeLetterNotes\s*\/>/);
  assert.match(board, /fetch\('\/api\/home-notes'/);
  assert.match(board, /fetch\('\/api\/home-notes\/replies'/);
  assert.match(board, /写旁注/);
  assert.match(board, /回复/);
});

test('homepage disclosure motion uses GSAP and keeps reduced motion static', async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/pocket-stage.css', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /querySelectorAll<HTMLDetailsElement>\('\.home-hidden-drawer, \.countdown-drawer'\)/);
  assert.match(page, /clipPath: 'inset\(0 0 100% 0 round 28px\)'/);
  assert.match(page, /prefers-reduced-motion: no-preference/);
  assert.match(styles, /\.home-hidden-trigger::before/);
  assert.match(styles, /backdrop-filter:\s*blur\(32px\) saturate\(185%\)/);
});
