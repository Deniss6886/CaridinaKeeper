# Privacy

Last reviewed: 2026-09-12

CaridinaKeeper is designed as a privacy-first, offline-capable PWA. Its
application data is stored locally in the browser with IndexedDB. It has no
CaridinaKeeper account system, application backend, cloud synchronization,
advertising, analytics, or telemetry.

This document explains the technical design and its limits. It is not legal
advice. Privacy and electronic-communications rules vary by role, deployment,
jurisdiction, and actual data flow.

## Summary

- Aquarium and breeding records stay in the browser unless the user explicitly
  exports a file.
- JSON restore and CSV generation run in the browser. CaridinaKeeper does not
  upload those files.
- Application assets are loaded from the hosting provider, currently expected
  to be GitHub Pages, and the browser checks for PWA updates.
- GitHub Pages records visitor IP addresses for security purposes. Hosting is
  therefore not metadata-free.
- Browser storage is not guaranteed to be encrypted or permanent. Users should
  keep backups and protect exported files.

## Data stored by the application

Depending on the features used, the local database may contain:

- Tank names, dimensions, volume, start date, substrate, filter, target
  temperature, inhabitants, breeding-line references, and notes.
- Parameter definitions, target ranges, water readings, units, dates, times,
  and notes.
- Maintenance, feeding, mineral, additive, water-change, filter-cleaning, and
  substrate events.
- Breeding lines, origin, acquisition details, generation, counts, sex where
  known, optional prices, crosses, selection goals, and breeding events.
- Local reminders and application settings.
- Clearly labelled synthetic demo data if the user chooses to load it.

The domain model does not require a person's real name, account identifier,
address, precise location, or contact details. Free-text notes can nevertheless
contain personal or sensitive information if a user enters it. Users should
avoid recording personal data that is not needed for aquarium management.

## Where data is stored

Application records are held in IndexedDB under the site's browser origin.
The PWA also uses browser-managed Cache Storage, a service-worker registration,
and normal HTTP cache data for the application shell and static assets. These
stores are separate from exported backup files.

CaridinaKeeper does not claim that IndexedDB is encrypted by the application.
Protection at rest depends on the device, operating system, browser profile,
full-disk encryption, screen lock, installed extensions, and local account
security.

### Origin isolation and GitHub Pages

Browser storage is scoped by origin: scheme, hostname, and port. It is not
scoped by repository path. GitHub Project Pages normally use URLs in this form:

    https://OWNER.github.io/REPOSITORY/

Different project paths below the same OWNER.github.io hostname share an
origin. Script from another page on that origin can therefore potentially
access the same IndexedDB and Cache Storage. A service worker's narrower path
scope does not create a separate IndexedDB security boundary.

A dedicated hostname or otherwise dedicated origin is the preferred deployment
for CaridinaKeeper. Until that is in place, all content served from the same
OWNER.github.io origin must be treated as trusted and the shared-origin
limitation must remain visible in the project status and security review.
Database and cache names must be namespaced, but namespacing alone is not a
security boundary.

The IndexedDB specification explicitly warns that content sharing one hostname
shares databases and cannot be isolated by path. GitHub documents the
path-based Project Pages URL model. This hosting risk is an inference from
those two primary sources:

- [W3C IndexedDB security considerations, cross-directory
  attacks](https://www.w3.org/TR/IndexedDB-3/#security)
- [GitHub Pages URL
  model](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## Data sent over the network

CaridinaKeeper does not intentionally send aquarium records, breeding records,
notes, reminders, settings, imported backups, or generated CSV content to the
maintainer or an application server.

Network requests still occur when:

- The browser downloads HTML, CSS, JavaScript, icons, the manifest, and the
  service worker.
- The browser checks the host for updated PWA resources.
- A user follows an external documentation or project link.

The production application must self-host its runtime assets and fonts. It must
not include analytics tags, tracking pixels, remote fonts, advertising, social
widgets, or unnecessary third-party requests.

GitHub states that a Pages visitor's IP address is logged and stored for
security purposes regardless of sign-in. GitHub's own privacy terms govern its
processing:

- [GitHub Pages data
  collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)
- [GitHub General Privacy
  Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

Accordingly, the accurate privacy claim is that application-content data stays
local, not that using the hosted application creates no network metadata.

## Cookies and similar storage

CaridinaKeeper does not intentionally set cookies. IndexedDB, Cache Storage,
and the service-worker registration are used to provide the expressly requested
local and offline functionality. No non-essential storage may be added without
updating this notice and completing a fresh legal and technical assessment.

Article 5(3) of the ePrivacy Directive and, in Germany, section 25 TDDDG concern
storing or accessing information on terminal equipment; their scope is broader
than personal data. German law includes an exception where storage or access is
strictly necessary to provide a digital service explicitly requested by the
user. Whether a particular deployment and each stored item qualifies must be
assessed on the actual facts. A local-only design is not, by itself, a legal
exemption.

Primary references:

- [Consolidated ePrivacy Directive, Article
  5(3)](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A02002L0058-20091219)
- [EDPB Guidelines 2/2023 on the technical scope of Article
  5(3)](https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en)
- [Germany: section 25
  TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)

## Retention, persistence, and loss

Local records normally remain until one of the following occurs:

- The user deletes data in CaridinaKeeper.
- The user clears site data or the browser profile.
- The browser or operating system removes best-effort storage under storage
  pressure.
- The origin changes, making the old origin's data unavailable to the new
  deployment.
- The browser profile or device is lost or damaged.

Where supported, CaridinaKeeper may ask the browser to make storage persistent
after first explaining the effect to the user. A successful
navigator.storage.persist() request reduces automatic eviction risk but does
not replace a backup and does not prevent user deletion.

The [WHATWG Storage Standard](https://storage.spec.whatwg.org/) defines storage
quota, best-effort eviction, and persistent-storage behavior.

## Export, restore, and deletion

- A full JSON backup is created locally and downloaded at the user's explicit
  request.
- The backup is not encrypted, signed, or uploaded by CaridinaKeeper.
- CSV is a spreadsheet-oriented export, not a complete or lossless backup.
- Restore validates the entire file before changing the database and performs
  the replacement atomically. Invalid input must leave existing records
  untouched.
- The in-app delete-all operation removes CaridinaKeeper's named local
  database. It does not delete downloaded backups, browser or provider logs, or
  data outside the application's control.
- Cache cleanup must remove only CaridinaKeeper-owned, namespaced caches rather
  than every cache visible to a shared origin.

The normative application format and validation rules are described in
[BACKUP_FORMAT.md](BACKUP_FORMAT.md).

## GDPR-relevant design principles

To the extent that personal data and an applicable controller relationship are
present, CaridinaKeeper's design is guided by purpose limitation, data
minimisation, storage limitation, integrity and confidentiality, and privacy by
design and by default. See [GDPR Articles 5, 25, and
32](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

The maintainer cannot view, correct, export, or delete application records that
never leave the user's device. Users exercise those controls locally through
the application and browser. Requests concerning GitHub-hosted connection data
must be directed according to GitHub's privacy statement.

For a non-sensitive project privacy question, use the repository's public issue
tracker without including personal data. Security or privacy vulnerabilities
must be reported privately as described in [../SECURITY.md](../SECURITY.md).
No privacy email address is currently published.

## Changes to this notice

Any future account system, synchronization feature, push service, analytics,
crash reporting, remote API, or third-party asset would materially change this
data flow. Such a change requires an architecture review, threat-model update,
documentation update, and an appropriate legal assessment before release.
