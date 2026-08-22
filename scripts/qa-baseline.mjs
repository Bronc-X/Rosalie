import { spawnSync } from 'node:child_process';

const packageManagerCli = process.env.npm_execpath;

if (!packageManagerCli) {
  console.error('[baseline] Run this gate through the package manager: pnpm qa:baseline');
  process.exit(1);
}

const checks = [
  { label: 'behavior tests', script: 'test', env: {} },
  { label: 'lint', script: 'lint', env: {} },
  { label: 'Vercel production build', script: 'build:vercel', env: { VERCEL: '1' } },
];

for (const check of checks) {
  console.log(`\n[baseline] ${check.label}`);
  const result = spawnSync(process.execPath, [packageManagerCli, 'run', check.script], {
    env: { ...process.env, ...check.env },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[baseline] ${check.label} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[baseline] ${check.label} failed.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[baseline] PASS — verified behavior, lint, and Vercel build are intact.');
