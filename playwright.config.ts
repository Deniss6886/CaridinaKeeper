import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function normalizeBasePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  const normalized = withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
  if (normalized.includes('..') || normalized.includes('?') || normalized.includes('#')) {
    throw new Error(`Invalid CARIDINA_BASE_PATH: ${value}`);
  }
  return normalized;
}

function quoteShellArgument(value: string): string {
  if (value.includes('"')) throw new Error(`Unsupported quote in executable path: ${value}`);
  return `"${value}"`;
}

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
if (!/^[A-Za-z0-9.:-]+$/.test(host)) throw new Error(`Invalid PLAYWRIGHT_HOST: ${host}`);

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid PLAYWRIGHT_PORT: ${process.env.PLAYWRIGHT_PORT ?? ''}`);
}

const appBasePath = normalizeBasePath(process.env.CARIDINA_BASE_PATH ?? '/');
const urlHost = host.includes(':') ? `[${host}]` : host;
const localBaseURL = `http://${urlHost}:${port}${appBasePath}`;
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = new URL(configuredBaseURL ?? localBaseURL).href;
const captureScreenshots = process.env.CARIDINA_CAPTURE === '1';
const viteCli = resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
const previewCommand = [
  quoteShellArgument(process.execPath),
  quoteShellArgument(viteCli),
  'preview',
  '--host',
  host,
  '--port',
  String(port),
  '--strictPort'
].join(' ');

export default defineConfig({
  testDir: './tests',
  testIgnore: captureScreenshots ? [] : ['**/capture.spec.ts'],
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  use: {
    actionTimeout: 15_000,
    baseURL,
    locale: 'en-GB',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] }
    }
  ],
  webServer: configuredBaseURL
    ? undefined
    : {
        command: previewCommand,
        url: baseURL,
        env: { CARIDINA_BASE_PATH: appBasePath },
        reuseExistingServer: false,
        timeout: 120_000
      }
});
