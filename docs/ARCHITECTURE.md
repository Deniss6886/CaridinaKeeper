# Architecture

CaridinaKeeper is a static React/Vite PWA. The browser is the runtime boundary: React renders the UI, Dexie provides a typed access layer over IndexedDB, and Zod validates records at import and repository boundaries. There is no application server in v0.1.

```text
React routes and forms
        |
AppContext (live query, CRUD, backup, demo, settings)
        |
Validated repositories + atomic database helpers
        |
Dexie / IndexedDB (versioned schema)
```

The build emits a content-addressed static bundle and a prompt-based service worker. Hash routing supports static hosting without server rewrites. GitHub Pages project builds set `CARIDINA_BASE_PATH=/CaridinaKeeper/`; a dedicated origin is preferred for long-lived user data because IndexedDB is origin scoped.

External input boundaries are JSON restore, future Home Assistant payloads, and CSV/UI values. They must be size-limited, finite, schema-validated, referentially checked, and rendered as text. No input is used for control commands. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) and [BACKUP_FORMAT.md](BACKUP_FORMAT.md).

Writes pass through validated repositories or purpose-built all-table transactions. Relationship-changing deletes cascade in the same transaction; target replacement and full restore commit completely or roll back. A Dexie live query publishes committed snapshots within the current tab and across same-origin tabs. Deleting user records deliberately recreates built-in parameter definitions and preserves only locale, theme, and motion preferences.
