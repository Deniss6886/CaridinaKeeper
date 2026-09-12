# Architecture

CaridinaKeeper is a static React/Vite PWA. The browser is the runtime boundary: React renders the UI, Dexie provides a typed access layer over IndexedDB, and Zod validates records at import and repository boundaries. There is no application server in v0.1.

```text
React routes and forms
        |
AppContext (refresh, CRUD, backup, demo, settings)
        |
Validated repositories + atomic database helpers
        |
Dexie / IndexedDB (versioned schema)
```

The build emits a content-addressed static bundle and a prompt-based service worker. Hash routing supports static hosting without server rewrites. GitHub Pages project builds set `CARIDINA_BASE_PATH=/CaridinaKeeper/`; a dedicated origin is preferred for long-lived user data because IndexedDB is origin scoped.

External input boundaries are JSON restore, future Home Assistant payloads, and CSV/UI values. They must be size-limited, finite, schema-validated, referentially checked, and rendered as text. No input is used for control commands. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) and [BACKUP_FORMAT.md](BACKUP_FORMAT.md).
