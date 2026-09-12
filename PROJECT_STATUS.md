# Project Status

Last updated: 2026-09-12

## Completed

- Continued from the uncommitted Astra/Sol working tree without resetting or discarding prior changes.
- Hardened repository writes with runtime validation, global ID/reference checks, atomic relationship cascades, atomic target replacement, and calendar-correct recurring reminders.
- Made initialization, restore, demo replacement, and preference-preserving deletion transactional; added cross-tab IndexedDB live updates.
- Added strict 10 MiB backup validation, duplicate JSON-member and unsafe-object rejection, complete relationship validation, UTF-8 import failure handling, restore preview/confirmation, and rollback tests for generic and quota-style write failures.
- Corrected decimal-comma handling, finite numeric validation, target warning preservation, measurement/target unit mismatches, demo parameter units, and spreadsheet formula neutralisation.
- Added failure-safe forms, explicit destructive-action confirmation, storage/render errors, update confirmation, live system theme, database-backed language selection, reduced motion, and accurate online/offline status.
- Removed production-CSP-incompatible inline styles and fixed mobile dialog sizing, hidden-sidebar focus, horizontal overflow, and target/no-target status semantics.
- Reworked Playwright configuration to use an isolated production preview and run the complete workflow on both desktop and Pixel 7 projects with no retries or mobile skip.
- Updated React and React DOM together to 19.3.0; retained TypeScript 6.0.3 because typescript-eslint 8.70.0 declares support below TypeScript 6.1.
- Updated backup, architecture, development, release, roadmap, support, adoption, and OpenAI OSS readiness documentation; version prepared as 0.1.1.
- Enabled and verified GitHub Private Vulnerability Reporting (`enabled: true`).

## Verified locally on the current working tree

- ESLint: passed with zero warnings.
- Strict TypeScript project build: passed.
- Vitest: 5 files and 73 tests passed on the current working tree.
- Production Vite/PWA build: passed; service worker and manifest generated.
- Full Playwright E2E: 10 tests passed across desktop and Pixel 7, including axe, backup round-trip, invalid-import preservation, reload persistence, and offline navigation.
- `npm audit --audit-level=high` and production dependency audit: 0 vulnerabilities.
- Installed dependency license metadata: present for every package; no GPL/AGPL dependency reported.
- `git diff --check`: passed after the implementation pass.

## Verified remotely

- Release candidate commits `444419f`, `74ac355`, and `067d31f` are pushed to `main`.
- GitHub CI, CodeQL v4, and the Pages deployment completed successfully for `067d31f` (run `34702318022`).
- External live verification passed: 10 Playwright tests on desktop and Pixel 7 against `https://deniss6886.github.io/CaridinaKeeper/`; app, manifest, and service worker returned HTTP 200.

## Remaining

- Publish the v0.1.1 release tag and GitHub release after this final documentation commit.
- Reconcile safe Dependabot updates without merging incompatible TypeScript 7 or unmatched React updates.
- Have the strongest available model perform the requested additional architecture, security, and final-quality review.

## Deferred

- Evidence provenance, water-batch traceability, read-only Home Assistant ingestion, conflict-aware import, dedicated-origin migration, and broader browser-family coverage.
- OpenAI OSS application submission. Current readiness is **NOT READY** because there is no verified external adoption or established public maintenance history.

## Known limitations

- GitHub Pages project sites share the `OWNER.github.io` origin; IndexedDB is origin-scoped rather than path-scoped. A dedicated origin remains preferable for strong storage isolation.
- Backups are validated but are not encrypted or authenticated. Downloaded files are outside the app's storage controls.
- A meta CSP on GitHub Pages cannot enforce `frame-ancestors` or provide CSP reporting; response-header CSP needs a host that supports custom headers.
- `npm audit signatures` currently returns an npm-registry E404 for an unavailable `whatwg-url@17.1.1` attestation. Lockfile integrity is still enforced by `npm ci`; vulnerability and license audits pass.

## Production and release

- Canonical repository: `https://github.com/Deniss6886/CaridinaKeeper`.
- The v0.1.1 release candidate is deployed at `https://deniss6886.github.io/CaridinaKeeper/`; the release tag/publication is the final remaining release action.
