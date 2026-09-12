# Data model

All persisted records have an opaque UUID-based `id`, `createdAt`, `updatedAt`, and optional `isDemo`. Relations use IDs, never display names. Database schema version 1 is append-only; migrations must preserve old backups and be tested against fixtures.

| Record                           | Purpose                                          | Key relations                 |
| -------------------------------- | ------------------------------------------------ | ----------------------------- |
| `Tank`                           | Aquarium, dimensions, soil, residents            | optional breeding line        |
| `ParameterDefinition`            | Measured parameter and unit                      | referenced by readings/ranges |
| `WaterReading`                   | Raw observation plus method/uncertainty          | tank + parameter              |
| `TargetRange`                    | Keeper-editable interval and warning envelope    | tank + parameter              |
| `MaintenanceEvent`               | Water changes, feeding, filters, soil, additives | tank                          |
| `BreedingLine` / `BreedingEvent` | Lines and observed outcomes                      | line + optional tank          |
| `Cross`                          | Parent lines and selection goal                  | two lines + optional tank     |
| `Reminder`                       | Local due work                                   | optional tank                 |
| `Settings`                       | locale, theme, storage preferences               | singleton `settings`          |

The backup format is JSON with `format`, `schemaVersion`, `appVersion`, `exportedAt`, and all tables. Restore validates the complete object graph before one write transaction; a failure leaves the existing database untouched.
