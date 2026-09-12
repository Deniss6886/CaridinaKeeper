import { spawnSync } from 'node:child_process';

const node = process.execPath;
const commands = [
  ['node_modules/prettier/bin/prettier.cjs', ['--check', '.']],
  ['node_modules/eslint/bin/eslint.js', ['.', '--max-warnings=0']],
  ['node_modules/typescript/bin/tsc', ['-b', '--pretty', 'false']],
  ['node_modules/vitest/vitest.mjs', ['run']],
  ['node_modules/vite/bin/vite.js', ['build']]
];

for (const [entry, args] of commands) {
  const result = spawnSync(node, [entry, ...args], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  }
}
