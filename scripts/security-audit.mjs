import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// npm supplies its own CLI location to lifecycle scripts on every platform.
// The fallbacks also support invoking this script directly with Node.
const nodeDirectory = dirname(process.execPath);
const npmCli = [
  process.env.npm_execpath,
  resolve(nodeDirectory, 'node_modules/npm/bin/npm-cli.js'),
  resolve(nodeDirectory, '../node_modules/npm/bin/npm-cli.js'),
  resolve(nodeDirectory, '../lib/node_modules/npm/bin/npm-cli.js')
].find((entry) => entry && existsSync(entry));

if (!npmCli) {
  console.error('Cannot find npm. Run this check with npm run security:audit.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmCli, 'audit', '--audit-level=high'], {
  stdio: 'inherit'
});
if (result.error) {
  console.error(`Unable to start npm audit: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
