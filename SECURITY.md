# Security Policy

Last reviewed: 2026-09-12

CaridinaKeeper is a local-first, static progressive web application. Aquarium
records are intended to remain in the user's browser rather than being sent to
an application server. This design reduces exposure, but it does not remove
client-side, import, browser-storage, hosting, dependency, or build-pipeline
risks.

## Supported versions

Before the first public release, only the current main branch is maintained.
After the v0.1.0 release, the latest v0.1.x release will receive security fixes.
Pre-release builds and older snapshots are not supported.

This table will be updated when the first release is published:

| Version                  | Supported                      |
| ------------------------ | ------------------------------ |
| Current main branch      | Best effort during development |
| Latest v0.1.x release    | Yes, once published            |
| Older pre-release builds | No                             |

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public issue, discussion,
pull request, screenshot, or social-media post.

The preferred reporting channel is GitHub Private Vulnerability Reporting:

    https://github.com/OWNER/REPOSITORY/security/advisories/new

OWNER and REPOSITORY are placeholders. This document must be updated with the
canonical repository URL after the public repository is created and Private
Vulnerability Reporting is enabled.

If the private reporting form is not yet available, open a public issue that
contains only a request for a private security contact. Do not include the
vulnerability, reproduction steps, affected data, secrets, or identifying
information in that issue. No security email address is currently published;
one must not be invented.

Include the following in the private report when it is safe to do so:

- A concise description and the likely impact.
- The affected version, commit, browser, operating system, and deployment URL.
- Minimal, non-destructive reproduction steps or a proof of concept.
- Whether imported data, a sibling same-origin site, a service worker, or a
  browser extension is involved.
- Any suggested mitigation.

Do not send real aquarium backups, personal notes, credentials, tokens, or other
sensitive data. Use synthetic records in reproductions.

## Response targets

This project is maintained on a volunteer basis. The current targets are:

- Acknowledge a private report within seven days.
- Provide an initial severity and scope assessment within fourteen days.
- Coordinate remediation and disclosure with the reporter.
- Credit the reporter if requested and legally permissible.

These are targets rather than guaranteed service-level commitments. If a report
affects another vendor, such as a browser, dependency, or hosting provider, the
maintainer may coordinate with that vendor before disclosure.

## In-scope examples

- Cross-site scripting or HTML injection that can read or modify local data.
- Bypassing backup validation or causing a failed restore to destroy existing
  data.
- Prototype pollution or unsafe processing of imported JSON.
- Spreadsheet formula injection in exported CSV files.
- Unauthorized access to IndexedDB or Cache Storage from another page.
- Service-worker cache poisoning, unsafe update behavior, or excessive scope.
- Unexpected transmission of aquarium data, notes, or identifiers.
- A committed secret or an over-privileged GitHub Actions workflow.
- A vulnerable production dependency with a demonstrated impact.

## Generally out of scope

- Findings that require the reporter to edit their own browser database or
  developer-tools state and do not cross a trust boundary.
- Self-XSS with no path to affect another user or persisted application state.
- Unsupported or end-of-life browsers.
- Denial of service that only affects a reporter's own disposable local data,
  unless normal application input can trigger it.
- Automated scanner output without a reproducible impact.
- Vulnerabilities in GitHub, the browser, or an operating system that do not
  arise from CaridinaKeeper. Report these to the relevant vendor as well.

## Security boundaries

- Application records are stored in IndexedDB. The browser profile, device,
  operating system, extensions, and anyone with local device access remain part
  of the user's security boundary.
- IndexedDB is isolated by origin, not by URL path. A GitHub Project Pages URL
  such as OWNER.github.io/REPOSITORY does not isolate its database from other
  scripts served by the same OWNER.github.io origin.
- GitHub Pages receives technical request metadata, including visitor IP
  addresses. The application must not describe hosting as network-free.
- Exported JSON backups are data files, not authenticated or encrypted
  containers. Anyone who can read the file can normally read its contents.
- Content Security Policy is defense in depth. Input validation, safe DOM
  rendering, transactional persistence, and dependency review remain required.

For the detailed threat model and open release gates, see
[docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md). For local data handling, see
[docs/PRIVACY.md](docs/PRIVACY.md).

## Coordinated disclosure and safe harbor

Please act in good faith, avoid privacy violations and service disruption, use
the minimum data necessary, and stop testing if you encounter data that is not
your own. Give the project a reasonable opportunity to investigate and fix the
issue before public disclosure.

The project will not pursue action against good-faith research that follows
this policy, stays within applicable law, avoids harm, and does not access or
retain other people's data. This statement is not legal advice and cannot bind
third parties such as GitHub or browser vendors.

There is currently no bug-bounty program and no promise of payment.

## Primary references

- [GitHub documentation: privately reporting a security
  vulnerability](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/privately-reporting-a-security-vulnerability)
- [GitHub Actions secure-use
  reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [W3C IndexedDB security
  considerations](https://www.w3.org/TR/IndexedDB-3/#security)
- [OWASP Vulnerability Disclosure Cheat
  Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)
