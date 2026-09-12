# Security Review

Review date: 2026-09-12

Status: implementation review complete for the v0.1.1 release candidate; live deployment and release approval remain pending.

This review covers the v0.1.1 static PWA, local IndexedDB persistence,
JSON backup and restore, CSV export, service-worker behavior, GitHub Pages
hosting, dependencies, and GitHub Actions. It records requirements and open
release gates. It does not claim that an implementation control passed until a
test or inspection result is recorded.

This document is technical guidance, not legal advice.

## Architecture and trust boundaries

CaridinaKeeper has no application backend or user accounts. Static application
files are downloaded from the host. Aquarium data is processed by JavaScript
and stored in IndexedDB in the user's browser. Cache Storage and a service
worker support offline operation. Backups leave the browser only when the user
explicitly downloads or shares them.

Principal trust boundaries:

1. Hosting provider to browser.
2. Application JavaScript to IndexedDB and Cache Storage.
3. User-selected JSON or future CSV input to trusted domain objects.
4. Domain objects and free text to the DOM, charts, and downloaded CSV.
5. npm registry and dependency maintainers to the build environment.
6. Pull-request content and third-party actions to GitHub Actions tokens.
7. Other content on the same web origin to CaridinaKeeper browser storage.

The absence of a backend does not make XSS low impact. Script executing in the
CaridinaKeeper origin can read or corrupt the entire local database and can
attempt to transmit it.

## Review findings

| ID     | Severity | Finding                                                                                                                                                                                                   | Required disposition                                                                                                                        |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001 | High     | GitHub Project Pages isolate repositories by path, while IndexedDB is isolated by origin. Sibling project pages below the same OWNER.github.io origin can access the same browser-storage origin.         | Accepted and disclosed; a dedicated origin remains the future mitigation.                                                                   |
| SR-002 | Medium   | A meta-delivered CSP cannot enforce frame-ancestors or sandbox and cannot run in Report-Only mode. It also does not govern content fetched before the element.                                            | Accepted for GitHub Pages; header-capable hosting remains the future mitigation.                                                            |
| SR-003 | Medium   | The current development index policy permits ws://localhost:* in connect-src and blob: workers. If shipped unchanged, it grants production capabilities that are not required by the intended static app. | Passed: production output removes development-only sources and uses same-origin workers.                                                    |
| SR-004 | High     | A malformed or malicious restore can destroy records, exhaust memory, poison object prototypes, or persist content that later becomes XSS.                                                                | Passed: bounded strict parsing, unsafe-key rejection, reference checks, atomic restore, and rollback tests.                                 |
| SR-005 | Medium   | User-controlled tank names, parameter names, and notes can become spreadsheet formulas in CSV.                                                                                                            | Passed: formula-prefix neutralisation and delimiter/quote/newline tests; target-spreadsheet manual QA remains follow-up.                    |
| SR-006 | Medium   | A compromised dependency or install script can alter the production bundle even though the deployed app has no backend.                                                                                   | Passed locally: lockfile/npm ci, vulnerability and license audits, dependency review; registry signature attestation is unavailable (E404). |
| SR-007 | High     | GitHub Actions can expose repository write or Pages deployment rights if permissions are broad or actions are tag-pinned.                                                                                 | Passed in workflow review: minimum permissions, isolated deploy job, full-SHA pins, and no privileged pull-request checkout.                |
| SR-008 | Low      | GitHub Pages logs visitor IP addresses and ordinary asset/update requests reveal hosting metadata.                                                                                                        | State this accurately in PRIVACY.md and avoid claims that using the hosted PWA produces no network data.                                    |
| SR-009 | Medium   | Best-effort browser storage can be evicted; local device loss can remove the only copy.                                                                                                                   | Offer validated backup, explain persistence, handle quota errors, and never describe IndexedDB as guaranteed durable storage.               |
| SR-010 | Medium   | Exported JSON is neither encrypted nor authenticated.                                                                                                                                                     | Warn before export, never upload automatically, avoid sensitive content in filenames, and document file-handling responsibility.            |

## Content security and DOM safety

The production application must:

- Render user data as text through normal React interpolation.
- Prohibit dangerouslySetInnerHTML, raw innerHTML, document.write, eval, new
  Function, and runtime script construction.
- Validate any future URL before assigning it to href or src.
- Keep scripts, styles, icons, and fonts same-origin.
- Avoid inline event handlers and production inline scripts.
- Treat CSP as defense in depth rather than as an input sanitizer.

A target production policy is:

    default-src 'none';
    script-src 'self';
    script-src-attr 'none';
    style-src 'self';
    style-src-attr 'none';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    worker-src 'self';
    manifest-src 'self';
    object-src 'none';
    frame-src 'none';
    frame-ancestors 'none';
    base-uri 'none';
    form-action 'self';
    upgrade-insecure-requests

The exact policy must be tested against the built application. Development HMR
exceptions must not leak into production. CSP Level 3 identifies HTTP response
headers as the preferred delivery mechanism and documents that meta CSP cannot
provide Report-Only, report-uri, frame-ancestors, or sandbox.

## Import and export controls

The normative requirements are in [BACKUP_FORMAT.md](BACKUP_FORMAT.md).
Release approval requires evidence that:

- Import file size, nesting, string length, and entity count are bounded.
- Duplicate JSON names and prototype-control keys are rejected.
- Runtime schemas are strict and schemaVersion selects an explicit parser.
- All references and IDs are validated before database access.
- Restore is a single transaction over every affected table.
- Any error leaves a byte-for-byte-equivalent logical data set in place.
- Imported strings reach no HTML, URL, CSS, or code interpretation sink.
- CSV formula prefixes, delimiters, quotes, and multiline cells are tested.

## IndexedDB, deletion, and origin safety

- Use stable IDs and explicit schema migrations.
- Namespace the database and every Cache Storage entry.
- Delete only CaridinaKeeper-owned database and cache names.
- Handle blocked upgrades, quota errors, aborted transactions, and multiple
  open tabs.
- Never use a database name or object-store name derived from imported input.
- Revalidate after migration and before commit.
- Request persistent storage only with user context and explain that the
  browser may refuse.

The strongest mitigation for SR-001 is a dedicated origin. Random database
names, service-worker path scopes, and obscure identifiers do not isolate
IndexedDB from other same-origin scripts.

## Service-worker review

The service worker must:

- Be served over HTTPS and registered from the intended base path.
- Cache only a versioned allowlist of application-shell assets.
- Avoid opaque third-party responses and remote runtime dependencies.
- Use a cache-first strategy only for immutable hashed assets.
- Use a controlled navigation strategy with an offline fallback.
- Remove only stale CaridinaKeeper caches during activation.
- Avoid caching imported files, generated backups, or user-specific blob URLs.
- Expose an understandable update path and not leave incompatible application
  code indefinitely paired with a newer database schema.

A document's worker-src controls which ServiceWorker URL may be registered. A
separate CSP for the service worker itself requires an HTTP response header on
the worker script.

## Dependency and build-pipeline review

Required controls:

- Pin direct dependencies deliberately and commit package-lock.json.
- Pin the package-manager version in package.json.
- Use npm ci in CI and fail if the lockfile and manifest disagree.
- Run npm audit, npm audit --omit=dev, and npm audit signatures.
- Review every high or critical advisory rather than applying audit fix
  blindly.
- Record any accepted advisory with identifier, impact analysis, owner, and
  expiration date.
- Review production and development licenses and preserve required notices.
- Generate or retain an SBOM for a release when practical.
- Enable GitHub dependency graph, Dependabot alerts and updates, and dependency
  review.

An audit only checks known advisories. It does not prove that a dependency is
benign, maintained, correctly licensed, or free of malicious install scripts.

## GitHub Actions review

- Set workflow-level permissions to contents: read unless a job demonstrates a
  narrower or additional need.
- Give pages: write and id-token: write only to the isolated deployment job.
- Pin GitHub-authored and third-party actions to verified full commit SHAs;
  retain the release tag in a comment for maintainability.
- Avoid pull_request_target. Never check out untrusted pull-request code in a
  job with secrets, write permission, deployment permission, or a trusted
  cache.
- Do not interpolate untrusted branch names, issue text, or pull-request titles
  directly into shell scripts.
- Protect workflow changes with review and use Dependabot for the
  github-actions ecosystem.

GitHub states that a full commit SHA is currently the only immutable way to
reference an action.

## Secrets and network access

The frontend must contain no API keys, access tokens, analytics identifiers, or
credentials. Environment-variable names prefixed for frontend exposure are
public after bundling and must never contain secrets.

Release verification must inspect:

- Git history and the complete built output for credentials and private data.
- Browser network requests during first load, ordinary use, offline use,
  backup export, restore, and service-worker update.
- Console errors and CSP violations.
- The deployed HTML and service-worker response headers.

Expected application origins are the deployment origin only. Documentation
links open only after a user action and must not load remote content inside the
application.

## Release security gates

The following must be complete before v0.1.1 is marked security-reviewed:

- [x] Resolve or explicitly accept SR-001 with a documented deployment-origin
      decision.
- [x] Remove development-only CSP sources from the production output.
- [x] Verify the production policy and document and accept the meta-only limit.
- [x] Pass malicious, oversized, corrupted, and rollback restore tests.
- [x] Pass CSV injection algorithm tests; spreadsheet-target manual QA is tracked separately.
- [x] Pass unit, integration, E2E, offline, refresh, persistence, and deletion
      tests.
- [x] Complete dependency vulnerability and license reviews; npm signature attestation is unavailable (E404) and documented.
- [x] Pin Actions to full SHAs and verify minimum token permissions.
- [x] Enable a private vulnerability-reporting route; GitHub API verification
      returned `{\"enabled\":true}`.
- [ ] Inspect the live deployment's network log, console, security headers,
      manifest, service worker, and 404 behavior.
- [ ] Confirm that no real personal data or secrets are committed or included
      in demo data and screenshots.

## Verification record template

Record command versions, commit SHA, date, operator, and exit code in
PROJECT_STATUS.md or a release artifact:

    npm ci
    npm run format:check
    npm run lint
    npm run typecheck
    npm run test
    npm run build
    npm run test:e2e
    npm audit --audit-level=high
    npm audit --omit=dev
    npm audit signatures

Also perform manual browser testing at smartphone and desktop sizes, online and
offline, with both light and dark themes.

## Primary references

- [W3C IndexedDB security and privacy
  considerations](https://www.w3.org/TR/IndexedDB-3/#security)
- [WHATWG Storage Standard](https://storage.spec.whatwg.org/)
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [W3C Service Workers security
  considerations](https://www.w3.org/TR/service-workers/#security-considerations)
- [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259.html)
- [RFC 4180: CSV](https://www.rfc-editor.org/rfc/rfc4180.html)
- [OWASP Content Security Policy Cheat
  Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP File Upload Cheat
  Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [GitHub Actions secure-use
  reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub dependency
  review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)
- [GitHub Pages data
  collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)
