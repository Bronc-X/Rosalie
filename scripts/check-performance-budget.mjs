import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const kib = 1_024;
const root = process.cwd();

async function findSingleChunk(directory, pattern, label) {
  const names = (await readdir(directory)).filter((name) => pattern.test(name));
  if (names.length !== 1) {
    throw new Error(`${label}: expected one built chunk, found ${names.length}`);
  }
  return join(directory, names[0]);
}

async function checkChunk(label, file, rawLimit, gzipLimit) {
  const body = await readFile(file);
  const gzipBytes = gzipSync(body).byteLength;
  if (body.byteLength > rawLimit || gzipBytes > gzipLimit) {
    throw new Error(
      `${label}: ${body.byteLength} B raw / ${gzipBytes} B gzip exceeds `
      + `${rawLimit} B raw / ${gzipLimit} B gzip`,
    );
  }
  console.log(`[performance] ${label}: ${body.byteLength} B raw / ${gzipBytes} B gzip`);
}

async function checkAssetSet() {
  const assets = [
    'aurora-rainbow-bg.jpg',
    'soft-pull-controller.webp',
    'match-rosette.webp',
    'match-charm.webp',
  ];
  const sizes = await Promise.all(assets.map(async (name) => (await stat(join(root, 'public', name))).size));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const limit = 180 * kib;
  if (total > limit) throw new Error(`home visual assets: ${total} B exceeds ${limit} B`);
  console.log(`[performance] home visual assets: ${total} B`);
}

try {
  const appChunks = join(root, '.next', 'static', 'chunks', 'app');
  const homeChunk = await findSingleChunk(appChunks, /^page-[a-f0-9]+\.js$/, 'home route');
  const interviewChunk = await findSingleChunk(
    join(appChunks, 'interview'),
    /^page-[a-f0-9]+\.js$/,
    'interview route',
  );

  await checkChunk('home route JS', homeChunk, 24 * kib, 8 * kib);
  await checkChunk('interview route JS', interviewChunk, 32 * kib, 10 * kib);
  await checkAssetSet();
  console.log('[performance] PASS — mobile route and visual-asset budgets are intact.');
} catch (error) {
  console.error(`[performance] FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
