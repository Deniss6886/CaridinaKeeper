import { spawnSync } from 'node:child_process';

const node = process.execPath;
const steps = [
  ['node_modules/vite/bin/vite.js', ['build']],
  ['node_modules/@playwright/test/cli.js', ['test']]
];

for (const [entry, args] of steps) {
  const result = spawnSync(node, [entry, ...args], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  }
}
