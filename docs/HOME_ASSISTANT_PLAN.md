# Home Assistant Integration Plan

**Plan date:** 2026-09-12  
**Status:** Design proposal; no Home Assistant integration is promised for v0.1.

## 1. Safety statement

CaridinaKeeper v0.1 is a husbandry record and decision-support application. It must not automatically control heaters, chillers, filters, aeration, pumps, top-off, water changes, lighting, feeders, or dosing equipment.

No v0.1 code may call a Home Assistant service, fire an actuation event, publish an MQTT command, or turn a recommendation into a device action. A reading, target-range violation, rule, chart, notification, or AI-generated text is not sufficient authority for life-support control.

Home Assistant support will begin as **optional, explicitly configured, read-only telemetry**. Manual entry and local backup/restore remain fully usable without Home Assistant.

## 2. Goals and non-goals

### Goals

- Import selected Home Assistant sensor states into a specific tank and parameter.
- Preserve the source entity, original value/unit, source timestamp, receipt time, and availability state.
- Keep the application useful during Home Assistant or network outages.
- Make stale, unavailable, malformed, and uncalibrated data visible.
- Expose selected CaridinaKeeper status data to Home Assistant later through established Home Assistant mechanisms.
- Keep credentials local, revocable, narrowly used, and excluded from exports and logs.
- Maintain a clear boundary between telemetry, husbandry interpretation, alerts, and actuation.

### Non-goals

- Automatic correction of water chemistry.
- Closed-loop dosing, top-off, heating, cooling, or water changes.
- Diagnosing animal health or cause of death from sensor data.
- Treating Home Assistant history as authoritative if provenance, units, or timestamps are missing.
- Directly supporting every aquarium probe or controller protocol from the PWA.
- Requiring a Home Assistant account, broker, cloud account, or Internet connection for core CaridinaKeeper use.

## 3. Architectural constraints

CaridinaKeeper v0.1 is a static offline-first PWA whose authoritative data is stored in browser IndexedDB. A browser application cannot accept inbound connections like a server, and a Home Assistant custom integration cannot directly read another origin's IndexedDB.

That boundary produces three distinct integration paths:

1. **Direct read-only client:** the PWA connects outbound to a user's Home Assistant REST and WebSocket APIs. This is feasible first but introduces authentication, CORS, TLS, mixed-content, and browser-storage concerns.
2. **Home Assistant-native integration plus local bridge:** a later custom integration and optional local CaridinaKeeper service exchange only configured data. This improves setup and secret handling but adds a deployable service and long-term maintenance burden.
3. **MQTT interoperability:** a later non-browser bridge can publish CaridinaKeeper entities through MQTT Discovery and can subscribe to deliberately configured telemetry topics. MQTT does not automatically mirror arbitrary Home Assistant entities and must not be presented as zero-configuration bidirectional sync.

ESPHome should remain managed by Home Assistant. CaridinaKeeper consumes normalized Home Assistant entity states rather than competing with Home Assistant as a hardware controller.

Do not use REST `POST /api/states` to fabricate CaridinaKeeper devices or entities. Home Assistant explains that an external API client cannot correctly provide the entity lifecycle and behavior of an integration; use a real integration or an existing entity platform such as MQTT instead: [Home Assistant integrations API announcement](https://www.home-assistant.io/blog/2021/05/12/integrations-api/).

## 4. Phased delivery

### Phase 0 — v0.1 safety and data foundations

**Scope**

- No network connection to Home Assistant is required.
- No actuator model, service-call UI, MQTT command topic, or automatic control rule is shipped.
- Manual readings use the same provenance-capable model that future imported readings will use.
- Backups remain versioned and portable, with integration secrets excluded by design.

**Model preparation**

Future telemetry records should be able to carry:

- integration type and connection identifier;
- Home Assistant instance identifier without exposing its external URL in ordinary exports;
- source `entity_id` and optional device identifier;
- original state string, numeric parsed value, original unit, normalized unit, and conversion performed;
- Home Assistant `last_changed`/`last_updated` when supplied and CaridinaKeeper receipt time;
- quality state: current, unavailable, unknown, stale, malformed, unit mismatch, or manually rejected;
- calibration/method notes where the sensor supports them;
- an idempotency key so reconnects do not duplicate a reading.

**Acceptance criteria**

- The production bundle contains no Home Assistant token, broker credential, default endpoint, or command path.
- Searching the v0.1 code for Home Assistant service calls and MQTT command publication produces no result.
- Range evaluation never creates an equipment action.
- The UI states clearly that alerts and targets are informational and species/context dependent.

### Phase 1 — experimental direct read-only connector

This is the smallest useful Home Assistant connection and should ship behind an experimental flag until security, browser, and Home Assistant-version testing is complete.

#### 4.2.1 Connection and authentication

- Ask the user for the Home Assistant base URL; never scan the local network without explicit action.
- Prefer Home Assistant's authorization flow with short-lived access tokens and refresh-token revocation for a production-quality direct client. The official flow is documented in the [Home Assistant Authentication API](https://developers.home-assistant.io/docs/auth_api/).
- A manually created long-lived access token may be supported only as an explicitly labeled local prototype path. Home Assistant documents that such tokens can remain valid for years, so they are high-value secrets.
- Never request or imply a need for the Home Assistant owner account. Recommend a dedicated non-admin user and explain that the token has that user's effective permissions.
- Never place a token in a URL, query string, crash report, analytics event, screenshot, console log, exported backup, or synchronizable preference.
- Default to session-only credentials. If the user explicitly enables persistence, store the credential outside ordinary domain/export tables, explain the local risk, provide “forget/revoke connection,” and clear it on authentication failure or user request.

#### 4.2.2 Browser and network prerequisites

- A hosted HTTPS PWA cannot call a plain-HTTP Home Assistant endpoint because browsers block mixed active content. Require an HTTPS Home Assistant endpoint or a same-device/local deployment arrangement that is demonstrably safe; do not instruct users to disable browser security.
- Cross-origin REST requests require the exact CaridinaKeeper origin in Home Assistant's CORS allow-list. Home Assistant documents this under [HTTP settings](https://www.home-assistant.io/integrations/http#http-server-settings).
- The current Content Security Policy allows only same-origin requests and local WebSockets. When this phase is implemented, `connect-src` must be extended only for the configured Home Assistant origin and its corresponding `ws:`/`wss:` endpoint. Do not use unrestricted `*` network access.
- Treat self-signed certificates, reverse proxies, changed ports, split DNS, remote URLs, and Home Assistant Cloud URLs as explicit compatibility cases. Never silently downgrade TLS.

#### 4.2.3 Read-only flow

1. Validate and normalize the configured base URL.
2. Test authentication with a harmless read endpoint.
3. Fetch the initial entity snapshot through the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/) or WebSocket `get_states`.
4. Let the user select individual sensor entities and map each one to a CaridinaKeeper tank and parameter. Do not ingest every entity by default.
5. Connect to `/api/websocket`, authenticate, and subscribe to `state_changed` as documented by the [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/).
6. Filter events against the explicit entity allow-list before parsing or persistence.
7. Parse only finite numeric states for numeric parameters. Preserve the original state and unit; reject rather than guess unknown or incompatible units.
8. Treat `unknown`, `unavailable`, missing, non-finite, future-dated, and implausibly old states as quality events, not readings.
9. Deduplicate the initial snapshot and subsequent WebSocket event by entity and source timestamp/context.
10. Reconnect with capped exponential backoff and jitter. After reconnect, fetch a fresh snapshot before resuming events.

The connector must not use WebSocket `call_service`, REST service endpoints, event firing, or state writes. A code-level allow-list should expose only the read operations required for discovery and subscription.

#### 4.2.4 Sampling and retention

- Do not persist every high-frequency state event indefinitely. Provide a minimum interval, meaningful-change threshold, or aggregation policy per parameter.
- Never average pH, EC, temperature, or other measurements across a gap without displaying the gap.
- Retain both source time and receipt time so clock drift and delayed delivery remain detectable.
- Imported data must be deletable by connection, entity, tank, and date range without deleting manual records unintentionally.

#### 4.2.5 Phase 1 exit criteria

- Unit and timestamp handling is covered by tests for every supported parameter type.
- Revoked/expired credentials, HA restart, PWA suspension, offline use, duplicate events, DST/clock errors, and `unknown`/`unavailable` states have deterministic behavior.
- Browser tests cover supported HTTPS/CORS configurations; documentation does not promise unsupported local-network combinations.
- A security review confirms tokens cannot enter backups, logs, source maps, service-worker caches, or test artifacts.
- An automated test asserts that no code path can issue a Home Assistant action or write state.

### Phase 2 — Home Assistant custom integration

A Home Assistant custom integration becomes worthwhile only after the direct connector validates entity mapping and users demonstrate sustained demand.

#### 4.3.1 Required architecture decision

Because the static PWA has no inbound API, choose and document one synchronization boundary before implementation:

- **Optional local bridge:** a small self-hosted CaridinaKeeper service owns the integration channel while the PWA remains the user interface; or
- **Home Assistant as the bridge store:** the custom integration owns mapped telemetry and exposes an authenticated API/WebSocket surface that the PWA reads.

Do not claim that a custom integration can directly access the PWA's IndexedDB. Do not add a cloud relay merely to avoid this design decision.

#### 4.3.2 Integration responsibilities

- Use a Home Assistant config flow and options flow; no YAML-only setup.
- Establish explicit pairing with a short-lived code or revocable scoped credential.
- Let the user select entities and mappings. Subscribe only to selected entities.
- Keep network I/O asynchronous, bounded by timeouts, and tolerant of either side being offline.
- Surface connection health, last successful transfer, stale data, and repair guidance.
- Preserve entity/device registry identifiers and migration paths across versions.
- Expose diagnostics with secrets and private endpoint details redacted.
- Follow the [Home Assistant Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/) and official [integration development documentation](https://developers.home-assistant.io/docs/creating_integration_manifest/).

Initial custom-integration releases remain telemetry-only. They must not register button, switch, number, select, or service interfaces that can operate aquarium equipment.

#### 4.3.3 Distribution

- Begin as a separately versioned custom integration only after CI covers supported Home Assistant versions.
- HACS distribution may improve installation convenience but is not a substitute for security review, compatibility testing, release signing/checksums, migration documentation, and maintenance ownership.
- Consider Home Assistant Core submission only after the API and ownership model are stable and the project can sustain review and compatibility work.

### Phase 3 — MQTT interoperability

MQTT should be implemented in the local bridge or Home Assistant-side component, not directly in browser UI code. Browser MQTT over WebSockets would expose long-lived broker credentials to the origin and complicate TLS/CORS/security.

#### 4.4.1 CaridinaKeeper to Home Assistant

Use [Home Assistant MQTT Discovery](https://www.home-assistant.io/integrations/mqtt/#mqtt-discovery) to expose only non-actuating entities such as:

- last accepted temperature, pH, conductivity, GH, or KH record where semantically valid;
- age/availability of the latest record;
- due/overdue maintenance status;
- backup age and connector health;
- non-diagnostic informational alerts.

Requirements:

- stable, globally unique `unique_id` values and stable device identifiers;
- explicit units, device/state classes only where Home Assistant semantics actually match;
- availability topics and stale-data behavior;
- retained discovery messages handled according to Home Assistant restart/birth guidance;
- bounded payloads and strict schema validation;
- no confidential husbandry notes or animal-sale information in discovery/state attributes;
- cleanup of removed entities without leaving ghost discovery records.

Do not publish command topics, switches, numbers, or buttons in this phase.

#### 4.4.2 Home Assistant to CaridinaKeeper

MQTT does not automatically publish every Home Assistant entity. Data can enter CaridinaKeeper only through deliberately configured sensor topics, a Home Assistant automation, or the custom integration bridge. The UI must explain this rather than presenting MQTT as automatic sync.

Reject topic wildcards that capture an entire broker. Use an allow-list, per-connection namespace, TLS where crossing trust boundaries, separate broker credentials with minimum ACLs, and credential rotation.

### Phase 4 — ESPHome-aligned sensor guidance

CaridinaKeeper should not implement direct microcontroller management. ESPHome devices connect to Home Assistant through the official [ESPHome integration](https://www.home-assistant.io/integrations/esphome/), and CaridinaKeeper consumes selected Home Assistant sensor entities.

Reference hardware paths include:

- [ESPHome Dallas/DS18B20 temperature sensors](https://esphome.io/components/sensor/dallas_temp/);
- [ESPHome Atlas Scientific EZO sensors](https://esphome.io/components/sensor/ezo/) for supported pH, EC, dissolved oxygen, and related circuits.

Documentation must emphasize:

- calibration date, calibration method, probe age, cleaning/storage, and temperature compensation;
- raw conductivity plus any TDS conversion factor rather than unlabeled “ppm”;
- electrical isolation and manufacturer guidance where multiple electrochemical probes share water;
- no claim that a supported sensor is accurate merely because it reports a value;
- stale/unavailable status and manual cross-checks before interpreting anomalies.

Existing open-source projects such as [reef-pi](https://github.com/reef-pi/reef-pi), [AquaPi](https://github.com/TheRealFalseReality/aquapi), and [AquaEye](https://github.com/alexantao/aquaeye) should be treated as interoperability references, not dependencies that transfer their safety properties to CaridinaKeeper.

## 5. Security requirements

### 5.1 Threats to address

- Theft of a Home Assistant or MQTT credential through XSS, logs, backups, source maps, browser extensions, or shared profiles.
- Connecting to an attacker-controlled endpoint through a mistyped or replaced URL.
- Cross-origin or mixed-content misconfiguration that encourages unsafe workarounds.
- Malformed, oversized, replayed, duplicated, or rapidly changing state events.
- Unit confusion, timestamp spoofing, sensor clock drift, and stale values presented as current.
- Over-permissioned Home Assistant users or MQTT ACLs.
- Private hostnames, IP addresses, entity names, tank names, or occupancy patterns leaking through diagnostics and issues.
- Supply-chain compromise of the PWA, bridge, custom integration, dependencies, or CI artifacts.

### 5.2 Controls

- Default-deny network and entity allow-lists.
- Explicit confirmation of the resolved Home Assistant origin before authorization.
- Short-lived/revocable credentials where possible; no credentials in ordinary IndexedDB domain tables.
- CSP restricted to necessary origins; no wildcard scripts or connections.
- Strict input schemas, payload-size limits, finite-number checks, unit allow-lists, monotonic/idempotent ingestion, and rate limiting.
- Redacted structured logging and opt-in diagnostics.
- Clear disconnect, forget, revoke, and delete-imported-data controls.
- Dependency review, locked dependencies, minimal runtime dependencies, and least-privilege CI/release workflows.
- Threat-model review whenever the trust boundary changes, especially before adding a local bridge or broker.

Encryption inside the same browser origin is not a complete answer if the decryption key is stored beside the ciphertext. Documentation must not claim that locally persisted tokens are “securely encrypted” without a separate, reviewed key-management design.

## 6. Failsafes and future actuation boundary

There is no automatic life-support control in v0.1, Phase 1, Phase 2, or the initial MQTT phase.

If actuation is ever considered, it requires a separate proposal, threat model, animal-welfare review, hardware safety case, and explicit product decision. At minimum it would require:

- control remaining local when Internet, PWA, bridge, or Home Assistant is unavailable;
- independent physical thermostats/controllers, hard limits, watchdogs, and safe default states;
- maximum run time, maximum dose/change per interval, rate limits, and interlocks;
- multiple-signal validation where appropriate, calibration checks, and stale-sensor rejection;
- manual confirmation for consequential changes;
- audit logs and immediately accessible manual override;
- failure-mode testing for stuck relays, disconnected probes, false readings, restarts, clock errors, and duplicate messages;
- no AI-generated command and no single measurement directly driving equipment.

Even with those controls, CaridinaKeeper may choose never to offer actuation. Home Assistant notifications or user-authored automations are the user's separate responsibility and must not be represented as CaridinaKeeper-certified safety systems.

## 7. Data semantics

- Home Assistant state is a string plus attributes; numeric parsing and unit interpretation are CaridinaKeeper responsibilities.
- Entity names are mutable and must not become domain identity. Store stable internal mapping IDs and retain the source entity identifier as provenance.
- Do not silently convert ambiguous units such as generic `ppm`. Require parameter type and conversion basis.
- Keep raw imported records immutable. Corrections should create an auditable corrected/accepted record rather than overwrite provenance.
- A target profile and an observed reading are separate concepts. Importing a value must never change a target.
- Missing or stale data must not be interpolated into apparently continuous certainty.
- Home Assistant `last_changed`, `last_updated`, event time, and receipt time have different meanings and should not be collapsed without an explicit rule.

## 8. Testing strategy

### Automated tests

- Contract fixtures for current REST and WebSocket messages, including unknown attributes.
- Authentication success, expiry, revocation, and reconnect behavior.
- CORS/TLS error reporting without unsafe bypass advice.
- Entity allow-list filtering and mapping persistence.
- Numeric parsing, finite checks, unit conversion, timezone handling, and stale-state rules.
- Snapshot/event deduplication and reconnect backfill.
- Rate limiting, aggregation, and database quota failures.
- Export verification proving secrets and private connection metadata are absent.
- Static assertion and runtime mocks that fail any attempted REST service call, WebSocket `call_service`, or MQTT command publication.

### Integration tests

- A disposable supported Home Assistant test instance for each declared compatibility range.
- Restart Home Assistant and the bridge independently while events are flowing.
- Revoke credentials during a session.
- Suspend/resume the PWA and switch between offline and online modes.
- Validate Home Assistant discovery cleanup and availability after broker/HA restart.
- Test assistive-technology flows for connection errors, entity mapping, stale warnings, and disconnect confirmation.

### Manual acceptance

- A non-expert can connect and disconnect without copying secrets into logs or URLs.
- The UI always distinguishes live, delayed, stale, unavailable, and manual data.
- The application remains usable and truthful when Home Assistant is absent.
- No integration screen implies that CaridinaKeeper controls or guarantees aquarium safety.

## 9. Versioning and compatibility policy

- Document the minimum and tested Home Assistant versions for every integration release.
- Negotiate or inspect Home Assistant version at connection time and degrade with an actionable message, not undefined behavior.
- Version mapping and telemetry schemas independently from the CaridinaKeeper backup schema.
- Treat entity remapping, unit changes, deleted entities, and source replacement as auditable migrations.
- Maintain fixtures for at least the oldest and newest supported Home Assistant versions.
- Publish a deprecation window before removing an API, topic, or mapping schema.

## 10. Primary references

- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Home Assistant Authentication API](https://developers.home-assistant.io/docs/auth_api/)
- [Home Assistant HTTP and CORS settings](https://www.home-assistant.io/integrations/http)
- [Home Assistant MQTT integration and discovery](https://www.home-assistant.io/integrations/mqtt/)
- [Home Assistant Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/)
- [Home Assistant integration development](https://developers.home-assistant.io/docs/creating_integration_manifest/)
- [Home Assistant ESPHome integration](https://www.home-assistant.io/integrations/esphome/)
- [ESPHome Dallas temperature sensor](https://esphome.io/components/sensor/dallas_temp/)
- [ESPHome Atlas Scientific EZO sensor](https://esphome.io/components/sensor/ezo/)
