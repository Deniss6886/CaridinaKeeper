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

## Verified locally on the current working tree

- ESLint: passed with zero warnings.
- Strict TypeScript project build: passed.
- Vitest: 5 files and 73 tests passed on the current working tree.
- Production Vite/PWA build: passed; service worker and manifest generated.
- Full Playwright E2E: 10 tests passed across desktop and Pixel 7, including axe, backup round-trip, invalid-import preservation, reload persistence, and offline navigation.
- `npm audit --audit-level=high` and production dependency audit: 0 vulnerabilities.
- Installed dependency license metadata: present for every package; no GPL/AGPL dependency reported.
- `git diff --check`: passed after the implementation pass.

## In progress

- Final aggregate format/lint/type/unit/build gate: passed on the current working tree.
- Independent final diff review, clean-room clone verification, commit, CI/CodeQL/Pages wait, and live production verification.

## Remaining

- GitHub Private Vulnerability Reporting enabled and verified (`enabled: true`).
- Reconcile safe Dependabot updates without merging incompatible TypeScript 7 or unmatched React updates.
- Publish v0.1.1 only after local gates, clean clone, GitHub checks, deployment, and live verification are green.
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
- Current published release remains v0.1.0; v0.1.1 is not yet published.
- Current live site remains `https://deniss6886.github.io/CaridinaKeeper/` until the gated v0.1.1 deployment completes.
- No remote mutation has been made during this continuation before completing the local quality gates.
