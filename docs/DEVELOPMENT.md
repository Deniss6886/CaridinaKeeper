# Development

## Requirements

Node.js 24 LTS, npm 11, and a modern browser. `npm ci` uses the committed exact lockfile.

## Commands

- `npm run dev` – Vite development server.
- `npm run check` – Prettier check, ESLint, strict TypeScript, Vitest, and production build.
- `npm run test:e2e` – production build, preview server, Chromium/mobile smoke, and axe checks.
- `npm run security:audit` – fail on high-severity npm advisories.

Playwright's Chromium binary is a developer/CI dependency; install it with `npx playwright install chromium` when needed. Do not use real keeper backups in tests, screenshots, issues, or fixtures.

## UI and data rules

Use translated labels, semantic headings, labelled controls, visible focus, keyboard-operable dialogs, and `aria-live` only for meaningful status. Keep scientific uncertainty explicit. New persisted fields require a Zod schema, a migration decision, backup fixture coverage, and documentation.

## Release checklist

1. Run `npm run check`, `npm run test:e2e`, and `npm run security:audit`.
2. Review the production bundle, service-worker scope, CSP, manifest, and base path.
3. Test export, invalid restore, reload, offline navigation, keyboard-only flow, reduced motion, German locale, and a small mobile viewport.
4. Review docs and screenshots for private data, unsupported claims, and stale version numbers.
