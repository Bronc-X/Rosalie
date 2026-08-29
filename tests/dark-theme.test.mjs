import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Transmit visual system exposes matching light and dark editorial tokens', async () => {
  const css = await read('app/transmit-ui.css');
  const lightTokens = css.match(/:root\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
  const darkTokens = css.match(/html\[data-theme="dark"\]\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';

  assert.match(lightTokens, /--stage-canvas:\s*#ffffff/);
  assert.match(lightTokens, /--stage-rail:\s*#f8fafc/);
  assert.match(lightTokens, /--stage-accent:\s*#db2777/);
  assert.match(darkTokens, /--stage-accent:\s*#f472b6/);
  assert.match(darkTokens, /--stage-canvas:\s*#0b0f16/);
  assert.match(darkTokens, /--stage-rail:\s*#111722/);
  assert.match(darkTokens, /--stage-surface-inset:\s*#0f1520/);
  assert.match(darkTokens, /--stage-line:\s*rgb\(148 163 184 \/ 16%\)/);
});

test('global chrome follows the fixed transport bar instead of a floating glass pill', async () => {
  const css = await read('app/transmit-ui.css');

  assert.match(css, /html body \.site-dock\s*\{[^}]*left:\s*var\(--transmit-rail\)/s);
  assert.match(css, /html body \.site-dock\s*\{[^}]*border-top:\s*1px solid var\(--stage-line\)/s);
  assert.match(css, /html body \.site-dock\s*\{[^}]*border-radius:\s*0/s);
  assert.match(css, /html body \.site-dock-indicator\s*\{[^}]*display:\s*none/s);
});

test('home and feature routes use a rail plus open editorial content structure', async () => {
  const css = await read('app/transmit-ui.css');
  const home = await read('app/page.tsx');

  assert.match(home, /className="home-masthead"/);
  assert.match(home, /className="home-feed"/);
  assert.match(css, /grid-template-columns:\s*var\(--transmit-rail\) minmax\(0, 1fr\)/);
  assert.match(css, /\.home-letter\s*\{[^}]*border-top:\s*1px solid var\(--stage-line\)[^}]*background:\s*transparent/s);
  assert.match(css, /:is\(\.interview-page, \.treehole-page, \.schedule-page, \.play-lab\)[^}]*background:\s*var\(--stage-canvas\)/s);
});

test('mobile controller drawer remains viewport bound when expanded', async () => {
  const css = await read('app/transmit-ui.css');

  assert.match(css, /\.home-hidden-panel\s*\{[^}]*width:\s*min\(390px, calc\(100vw - 32px\)\)/s);
  assert.match(css, /\.controller-drawer\[open\]\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(css, /\.home-hidden-panel \.controller-popover\s*\{[^}]*width:\s*100%/s);
});

test('browser chrome theme colours match the editorial canvas', async () => {
  const layout = await read('app/layout.tsx');
  assert.match(layout, /prefers-color-scheme:\s*light[^\n]*color:\s*'#ffffff'/);
  assert.match(layout, /prefers-color-scheme:\s*dark[^\n]*color:\s*'#0b0f16'/);
  assert.match(layout, /import '\.\/transmit-ui\.css'/);
});

test('the homepage never reveals the retired aurora canvas at the scroll boundary', async () => {
  const css = await read('app/transmit-ui.css');

  assert.match(css, /html body \.reunion\s*\{[^}]*padding:\s*0 0 calc\(var\(--transmit-dock\) \+ env\(safe-area-inset-bottom\)\) !important;[^}]*grid-template-rows:\s*minmax\(calc\(100dvh - var\(--transmit-dock\)\), auto\);[^}]*background:\s*var\(--stage-canvas\)/s);
  assert.match(css, /html\[data-theme="dark"\] body \.reunion\s*\{[^}]*background:\s*var\(--stage-canvas\)/s);
});
