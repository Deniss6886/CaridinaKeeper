import { z } from 'zod';

import {
  BACKUP_FORMAT,
  DATABASE_SCHEMA_VERSION,
  type BackupData,
  type BackupSchema,
  type ParameterDefinition,
  type Tank,
  type WaterReading
} from '../domain/models';
import { assertSafeObjectGraph, parseBackupSchema } from '../domain/validation';
import type { CaridinaKeeperDatabase } from './database';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_ROWS = 100_000;
export const MAX_CSV_CELL_LENGTH = 10_000;

export class BackupValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupValidationError';
  }
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function ensureBackupSize(serialized: string): void {
  if (utf8ByteLength(serialized) > MAX_BACKUP_BYTES) {
    throw new BackupValidationError(`Backup exceeds the ${MAX_BACKUP_BYTES}-byte limit.`);
  }
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function requireReference(ids: ReadonlySet<string>, id: string, path: string): void {
  if (!ids.has(id)) throw new BackupValidationError(`${path} references missing ID ${id}.`);
}

function assertReferentialIntegrity(data: BackupData): void {
  const allRecordIds: string[] = [];
  const recordsByTable: Array<readonly { id: string }[]> = [
    data.tanks,
    data.waterReadings,
    data.parameterDefinitions,
    data.targetRanges,
    data.maintenanceEvents,
    data.breedingLines,
    data.breedingEvents,
    data.crosses,
    data.reminders,
    data.settings
  ];
  for (const records of recordsByTable) {
    for (const record of records) allRecordIds.push(record.id);
  }
  const duplicateRecordIds = duplicateValues(allRecordIds);
  if (duplicateRecordIds.length > 0) {
    throw new BackupValidationError(`Duplicate record ID: ${duplicateRecordIds[0]}`);
  }

  const tankIds = new Set(data.tanks.map(({ id }) => id));
  const parameterIds = new Set(data.parameterDefinitions.map(({ id }) => id));
  const lineIds = new Set(data.breedingLines.map(({ id }) => id));

  const duplicateParameterKeys = duplicateValues(data.parameterDefinitions.map(({ key }) => key));
  if (duplicateParameterKeys.length > 0) {
    throw new BackupValidationError(`Duplicate parameter key: ${duplicateParameterKeys[0]}`);
  }

  const targetPairs = data.targetRanges.map(
    ({ tankId, parameterId }) => `${tankId}\u0000${parameterId}`
  );
  const duplicateTargetPairs = duplicateValues(targetPairs);
  if (duplicateTargetPairs.length > 0) {
    throw new BackupValidationError('A tank has more than one target range for a parameter.');
  }

  for (const tank of data.tanks) {
    if (tank.breedingLineId) {
      requireReference(lineIds, tank.breedingLineId, `tank ${tank.id}.breedingLineId`);
    }
    const duplicateInhabitants = duplicateValues(tank.inhabitants.map(({ id }) => id));
    if (duplicateInhabitants.length > 0) {
      throw new BackupValidationError(`Tank ${tank.id} has duplicate inhabitant IDs.`);
    }
  }

  for (const reading of data.waterReadings) {
    requireReference(tankIds, reading.tankId, `waterReading ${reading.id}.tankId`);
    requireReference(parameterIds, reading.parameterId, `waterReading ${reading.id}.parameterId`);
  }
  for (const range of data.targetRanges) {
    requireReference(tankIds, range.tankId, `targetRange ${range.id}.tankId`);
    requireReference(parameterIds, range.parameterId, `targetRange ${range.id}.parameterId`);
  }
  for (const event of data.maintenanceEvents) {
    requireReference(tankIds, event.tankId, `maintenanceEvent ${event.id}.tankId`);
  }
  for (const event of data.breedingEvents) {
    requireReference(lineIds, event.breedingLineId, `breedingEvent ${event.id}.breedingLineId`);
    if (event.tankId) requireReference(tankIds, event.tankId, `breedingEvent ${event.id}.tankId`);
    if (event.fromTankId) {
      requireReference(tankIds, event.fromTankId, `breedingEvent ${event.id}.fromTankId`);
    }
    if (event.toTankId) {
      requireReference(tankIds, event.toTankId, `breedingEvent ${event.id}.toTankId`);
    }
  }
  for (const cross of data.crosses) {
    requireReference(lineIds, cross.parentLineIds[0], `cross ${cross.id}.parentLineIds[0]`);
    requireReference(lineIds, cross.parentLineIds[1], `cross ${cross.id}.parentLineIds[1]`);
    if (cross.tankId) requireReference(tankIds, cross.tankId, `cross ${cross.id}.tankId`);
  }
  for (const reminder of data.reminders) {
    if (reminder.tankId) {
      requireReference(tankIds, reminder.tankId, `reminder ${reminder.id}.tankId`);
    }
  }
}

export function validateBackup(input: unknown): BackupSchema {
  let value: unknown = input;
  if (typeof input === 'string') {
    ensureBackupSize(input);
    try {
      value = JSON.parse(input) as unknown;
    } catch (error) {
      throw new BackupValidationError('Backup is not valid JSON.', { cause: error });
    }
  } else {
    try {
      assertSafeObjectGraph(input);
      const serialized = JSON.stringify(input);
      ensureBackupSize(serialized);
    } catch (error) {
      if (error instanceof BackupValidationError) throw error;
      throw new BackupValidationError('Backup object is unsafe or cannot be serialized.', {
        cause: error
      });
    }
  }

  try {
    const backup = parseBackupSchema(value);
    assertReferentialIntegrity(backup.data);
    return backup;
  } catch (error) {
    if (error instanceof BackupValidationError) throw error;
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue?.path.join('.') || 'backup';
      throw new BackupValidationError(
        `Invalid backup at ${path}: ${firstIssue?.message ?? 'schema mismatch'}`,
        { cause: error }
      );
    }
    throw new BackupValidationError('Backup validation failed.', { cause: error });
  }
}

function byId<T extends { id: string }>(records: T[]): T[] {
  return records.sort((left, right) => left.id.localeCompare(right.id));
}

export async function createBackup(
  owner: CaridinaKeeperDatabase,
  options: { appVersion?: string; now?: Date } = {}
): Promise<BackupSchema> {
  const data = await owner.transaction('r', owner.tables, async (): Promise<BackupData> => ({
    tanks: byId(await owner.tanks.toArray()),
    waterReadings: byId(await owner.waterReadings.toArray()),
    parameterDefinitions: byId(await owner.parameterDefinitions.toArray()),
    targetRanges: byId(await owner.targetRanges.toArray()),
    maintenanceEvents: byId(await owner.maintenanceEvents.toArray()),
    breedingLines: byId(await owner.breedingLines.toArray()),
    breedingEvents: byId(await owner.breedingEvents.toArray()),
    crosses: byId(await owner.crosses.toArray()),
    reminders: byId(await owner.reminders.toArray()),
    settings: byId(await owner.settings.toArray())
  }));

  return validateBackup({
    format: BACKUP_FORMAT,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    appVersion: options.appVersion ?? '0.1.0',
    exportedAt: (options.now ?? new Date()).toISOString(),
    data
  });
}

export async function serializeBackup(
  owner: CaridinaKeeperDatabase,
  options: { appVersion?: string; now?: Date; pretty?: boolean } = {}
): Promise<string> {
  const backup = await createBackup(owner, options);
  const serialized = JSON.stringify(backup, null, options.pretty === false ? undefined : 2);
  ensureBackupSize(serialized);
  return serialized;
}

/** Validate completely before opening the single all-table write transaction. */
export async function restoreBackup(
  owner: CaridinaKeeperDatabase,
  input: unknown
): Promise<BackupSchema> {
  const backup = validateBackup(input);
  const { data } = backup;

  await owner.transaction('rw', owner.tables, async () => {
    for (const table of owner.tables) await table.clear();
    if (data.tanks.length) await owner.tanks.bulkAdd(data.tanks);
    if (data.waterReadings.length) await owner.waterReadings.bulkAdd(data.waterReadings);
    if (data.parameterDefinitions.length) {
      await owner.parameterDefinitions.bulkAdd(data.parameterDefinitions);
    }
    if (data.targetRanges.length) await owner.targetRanges.bulkAdd(data.targetRanges);
    if (data.maintenanceEvents.length) {
      await owner.maintenanceEvents.bulkAdd(data.maintenanceEvents);
    }
    if (data.breedingLines.length) await owner.breedingLines.bulkAdd(data.breedingLines);
    if (data.breedingEvents.length) await owner.breedingEvents.bulkAdd(data.breedingEvents);
    if (data.crosses.length) await owner.crosses.bulkAdd(data.crosses);
    if (data.reminders.length) await owner.reminders.bulkAdd(data.reminders);
    if (data.settings.length) await owner.settings.bulkAdd(data.settings);
  });

  return backup;
}

export type CsvCell = string | number | boolean | null | undefined;
export type CsvDelimiter = ',' | ';';

function neutralizeSpreadsheetFormula(value: string): string {
  const firstMeaningfulCharacter = value.trimStart().charAt(0);
  if (
    value.startsWith('\t') ||
    value.startsWith('\r') ||
    ['=', '+', '-', '@'].includes(firstMeaningfulCharacter)
  ) {
    return `'${value}`;
  }
  return value;
}

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('CSV contains a non-finite number.');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value.length > MAX_CSV_CELL_LENGTH) throw new RangeError('CSV cell is too large.');
  const safeValue = neutralizeSpreadsheetFormula(value);
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function buildSafeCsv(
  headers: readonly string[],
  rows: ReadonlyArray<readonly CsvCell[]>,
  delimiter: CsvDelimiter = ','
): string {
  if (headers.length === 0 || headers.length > 100) {
    throw new RangeError('CSV must have between 1 and 100 columns.');
  }
  if (rows.length > MAX_CSV_ROWS) throw new RangeError('CSV contains too many rows.');
  if (rows.some((row) => row.length !== headers.length)) {
    throw new RangeError('Every CSV row must match the header column count.');
  }

  const lines = [
    headers.map(escapeCsvCell).join(delimiter),
    ...rows.map((row) => row.map(escapeCsvCell).join(delimiter))
  ];
  return lines.join('\r\n');
}

export function exportWaterReadingsCsv(
  readings: readonly WaterReading[],
  tanks: readonly Tank[],
  parameters: readonly ParameterDefinition[],
  delimiter: CsvDelimiter = ','
): string {
  const tankNames = new Map(tanks.map((tank) => [tank.id, tank.name]));
  const parameterNames = new Map(parameters.map((parameter) => [parameter.id, parameter.name]));
  const rows = [...readings]
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
    .map((reading): readonly CsvCell[] => [
      reading.id,
      tankNames.get(reading.tankId) ?? reading.tankId,
      parameterNames.get(reading.parameterId) ?? reading.parameterId,
      reading.value,
      reading.unit,
      reading.measuredAt,
      reading.method ?? '',
      reading.uncertainty ?? '',
      reading.note ?? ''
    ]);
  return buildSafeCsv(
    ['ID', 'Tank', 'Parameter', 'Value', 'Unit', 'Measured at', 'Method', 'Uncertainty', 'Note'],
    rows,
    delimiter
  );
}
