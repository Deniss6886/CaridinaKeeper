# Contributing

Thanks for helping make CaridinaKeeper safer and more useful for keepers.

## Before opening a change

1. Read [the architecture](docs/ARCHITECTURE.md), [the data model](docs/DATA_MODEL.md), and [the security policy](SECURITY.md).
2. Keep user data local by default. Do not add analytics, remote fonts, mandatory accounts, or controller actuation without a documented threat model and maintainer review.
3. Preserve the distinction between measured values, derived values, breeder targets, published evidence, and user notes.
4. Add or update tests and documentation with the change.

## Development loop

```bash
npm ci
npm run check
npm run test:e2e
```

Use small commits, avoid committing real backups or sensor endpoints, and include screenshots for responsive UI changes. Pull requests must pass CI; repository rules should require those checks before merging where the hosting plan supports them.

## Pull requests

Explain the user problem, data-model impact, security/privacy impact, migration needs, and how you verified the change. A maintainer may request a manual keyboard, mobile, and restore/backup check even when automated checks pass.
