import { spawnSync } from 'node:child_process';

const result =
  process.platform === 'win32'
    ? spawnSync(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', 'C:\\PROGRA~1\\nodejs\\npm.cmd audit --audit-level=high'],
        { stdio: 'inherit' }
      )
    : spawnSync('npm', ['audit', '--audit-level=high'], { stdio: 'inherit' });
if (result.error) {
  console.error(`Unable to start npm audit: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
