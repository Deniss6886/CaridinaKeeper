import { z } from 'zod';

import {
  BACKUP_FORMAT,
  BREEDING_EVENT_TYPES,
  CROSS_GENERATIONS,
  DATABASE_SCHEMA_VERSION,
  MAINTENANCE_EVENT_TYPES,
  REMINDER_REPEATS,
  SETTINGS_ID,
  type BackupSchema,
  type BreedingEvent,
  type BreedingLine,
  type Cross,
  type DataRecordMap,
  type MaintenanceEvent,
  type ParameterDefinition,
  type Reminder,
  type Settings,
  type Tank,
  type TargetRange,
  type WaterReading
} from './models';

export const MAX_ID_LENGTH = 128;
export const MAX_SHORT_TEXT_LENGTH = 160;
export const MAX_MEDIUM_TEXT_LENGTH = 2_000;
export const MAX_LONG_TEXT_LENGTH = 10_000;
export const MAX_ARRAY_ITEMS = 100_000;
export const MAX_TOTAL_BACKUP_RECORDS = 250_000;
export const MAX_OBJECT_GRAPH_NODES = 1_000_000;
export const MAX_OBJECT_GRAPH_DEPTH = 24;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isRealIsoDate(value: string): boolean {
  const parts = value.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const idSchema = z
  .string()
  .min(1)
  .max(MAX_ID_LENGTH)
  .regex(ID_PATTERN, 'ID contains unsupported characters');

export const shortTextSchema = z.string().trim().min(1).max(MAX_SHORT_TEXT_LENGTH);
export const optionalShortTextSchema = z.string().trim().max(MAX_SHORT_TEXT_LENGTH).optional();
export const optionalMediumTextSchema = z.string().trim().max(MAX_MEDIUM_TEXT_LENGTH).optional();
export const optionalLongTextSchema = z.string().trim().max(MAX_LONG_TEXT_LENGTH).optional();

export const isoDateSchema = z
  .string()
  .length(10)
  .regex(ISO_DATE_PATTERN, 'Expected an ISO date (YYYY-MM-DD)')
  .refine(isRealIsoDate, 'Date does not exist');

export const isoDateTimeSchema = z
  .string()
  .min(20)
  .max(35)
  .regex(ISO_DATE_TIME_PATTERN, 'Expected an ISO date-time with timezone')
  .refine((value) => Number.isFinite(Date.parse(value)), 'Date-time does not exist');

export const finiteNumberSchema = z.number().finite().min(-1_000_000_000).max(1_000_000_000);
const nonNegativeNumberSchema = z.number().finite().min(0).max(1_000_000_000);
const countSchema = z.number().int().finite().min(0).max(1_000_000);

const entityFields = {
  id: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  isDemo: z.boolean().optional()
};

export const tankDimensionsSchema = z
  .object({
    lengthCm: z.number().finite().positive().max(10_000),
    widthCm: z.number().finite().positive().max(10_000),
    heightCm: z.number().finite().positive().max(10_000)
  })
  .strict();

export const tankInhabitantSchema = z
  .object({
    id: idSchema,
    species: shortTextSchema,
    variant: optionalShortTextSchema,
    count: countSchema,
    notes: optionalMediumTextSchema
  })
  .strict();

export const tankSchema: z.ZodType<Tank> = z
  .object({
    ...entityFields,
    name: shortTextSchema,
    volumeLiters: z.number().finite().positive().max(100_000),
    dimensions: tankDimensionsSchema.optional(),
    startDate: isoDateSchema,
    description: optionalMediumTextSchema,
    soil: optionalShortTextSchema,
    soilInstalledAt: isoDateSchema.optional(),
    filterType: optionalShortTextSchema,
    targetTemperature: z.number().finite().min(-20).max(100).optional(),
    notes: optionalLongTextSchema,
    inhabitants: z.array(tankInhabitantSchema).max(500),
    breedingLineId: idSchema.optional()
  })
  .strict();

export const parameterDefinitionSchema: z.ZodType<ParameterDefinition> = z
  .object({
    ...entityFields,
    key: z.string().min(1).max(64).regex(KEY_PATTERN),
    name: shortTextSchema,
    unit: z.string().trim().min(1).max(32),
    description: optionalMediumTextSchema,
    precision: z.number().int().min(0).max(6),
    sortOrder: z.number().int().min(0).max(100_000),
    isBuiltIn: z.boolean()
  })
  .strict();

export const targetRangeSchema: z.ZodType<TargetRange> = z
  .object({
    ...entityFields,
    tankId: idSchema,
    parameterId: idSchema,
    minimum: finiteNumberSchema,
    maximum: finiteNumberSchema,
    warningMinimum: finiteNumberSchema.optional(),
    warningMaximum: finiteNumberSchema.optional()
  })
  .strict()
  .superRefine((range, context) => {
    if (range.minimum > range.maximum) {
      context.addIssue({
        code: 'custom',
        path: ['minimum'],
        message: 'minimum must not exceed maximum'
      });
    }
    if (range.warningMinimum !== undefined && range.warningMinimum > range.minimum) {
      context.addIssue({
        code: 'custom',
        path: ['warningMinimum'],
        message: 'warningMinimum must not exceed minimum'
      });
    }
    if (range.warningMaximum !== undefined && range.warningMaximum < range.maximum) {
      context.addIssue({
        code: 'custom',
        path: ['warningMaximum'],
        message: 'warningMaximum must not be below maximum'
      });
    }
  });

export const waterReadingSchema: z.ZodType<WaterReading> = z
  .object({
    ...entityFields,
    tankId: idSchema,
    parameterId: idSchema,
    value: finiteNumberSchema,
    unit: z.string().trim().min(1).max(32),
    measuredAt: isoDateTimeSchema,
    method: optionalShortTextSchema,
    uncertainty: z.number().finite().min(0).max(1_000_000_000).optional(),
    note: optionalMediumTextSchema
  })
  .strict();

export const maintenanceEventSchema: z.ZodType<MaintenanceEvent> = z
  .object({
    ...entityFields,
    tankId: idSchema,
    type: z.enum(MAINTENANCE_EVENT_TYPES),
    performedAt: isoDateTimeSchema,
    amount: nonNegativeNumberSchema.optional(),
    unit: z.string().trim().min(1).max(32).optional(),
    waterChangePercent: z.number().finite().min(0).max(100).optional(),
    note: optionalMediumTextSchema
  })
  .strict();

export const breedingLineSchema: z.ZodType<BreedingLine> = z
  .object({
    ...entityFields,
    name: shortTextSchema,
    species: shortTextSchema,
    variant: optionalShortTextSchema,
    color: optionalShortTextSchema,
    orangeEye: z.boolean(),
    generation: optionalShortTextSchema,
    origin: optionalMediumTextSchema,
    purchaseDate: isoDateSchema.optional(),
    count: countSchema,
    sex: optionalShortTextSchema,
    price: nonNegativeNumberSchema.optional(),
    notes: optionalLongTextSchema
  })
  .strict();

export const breedingEventSchema: z.ZodType<BreedingEvent> = z
  .object({
    ...entityFields,
    breedingLineId: idSchema,
    tankId: idSchema.optional(),
    type: z.enum(BREEDING_EVENT_TYPES),
    occurredAt: isoDateTimeSchema,
    count: countSchema.optional(),
    fromTankId: idSchema.optional(),
    toTankId: idSchema.optional(),
    price: nonNegativeNumberSchema.optional(),
    note: optionalMediumTextSchema
  })
  .strict();

export const crossSchema: z.ZodType<Cross> = z
  .object({
    ...entityFields,
    name: shortTextSchema,
    parentLineIds: z.tuple([idSchema, idSchema]),
    generation: z.enum(CROSS_GENERATIONS),
    selectionGoal: z.string().trim().min(1).max(MAX_MEDIUM_TEXT_LENGTH),
    notes: optionalLongTextSchema,
    tankId: idSchema.optional()
  })
  .strict()
  .superRefine((cross, context) => {
    if (cross.parentLineIds[0] === cross.parentLineIds[1]) {
      context.addIssue({
        code: 'custom',
        path: ['parentLineIds', 1],
        message: 'A cross requires two different parent lines'
      });
    }
  });

export const reminderSchema: z.ZodType<Reminder> = z
  .object({
    ...entityFields,
    tankId: idSchema.optional(),
    title: shortTextSchema,
    description: optionalMediumTextSchema,
    dueAt: isoDateTimeSchema,
    repeat: z.enum(REMINDER_REPEATS),
    completed: z.boolean(),
    completedAt: isoDateTimeSchema.optional()
  })
  .strict()
  .superRefine((reminder, context) => {
    if (reminder.completed && reminder.completedAt === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'completedAt is required for a completed reminder'
      });
    }
    if (!reminder.completed && reminder.completedAt !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'completedAt must be absent for an open reminder'
      });
    }
  });

export const settingsSchema: z.ZodType<Settings> = z
  .object({
    ...entityFields,
    id: z.literal(SETTINGS_ID),
    locale: z.string().trim().min(2).max(35),
    theme: z.enum(['system', 'light', 'dark']),
    reducedMotion: z.boolean(),
    defaultWaterChangePercent: z.number().finite().min(0).max(100),
    onboardingCompleted: z.boolean(),
    demoDataLoaded: z.boolean()
  })
  .strict();

export const dataRecordSchemas: {
  [K in keyof DataRecordMap]: z.ZodType<DataRecordMap[K]>;
} = {
  tanks: tankSchema,
  waterReadings: waterReadingSchema,
  parameterDefinitions: parameterDefinitionSchema,
  targetRanges: targetRangeSchema,
  maintenanceEvents: maintenanceEventSchema,
  breedingLines: breedingLineSchema,
  breedingEvents: breedingEventSchema,
  crosses: crossSchema,
  reminders: reminderSchema,
  settings: settingsSchema
};

const backupDataSchema = z
  .object({
    tanks: z.array(tankSchema).max(10_000),
    waterReadings: z.array(waterReadingSchema).max(MAX_ARRAY_ITEMS),
    parameterDefinitions: z.array(parameterDefinitionSchema).max(1_000),
    targetRanges: z.array(targetRangeSchema).max(50_000),
    maintenanceEvents: z.array(maintenanceEventSchema).max(MAX_ARRAY_ITEMS),
    breedingLines: z.array(breedingLineSchema).max(20_000),
    breedingEvents: z.array(breedingEventSchema).max(MAX_ARRAY_ITEMS),
    crosses: z.array(crossSchema).max(20_000),
    reminders: z.array(reminderSchema).max(50_000),
    settings: z.array(settingsSchema).max(1)
  })
  .strict()
  .superRefine((data, context) => {
    const total = Object.values(data).reduce((sum, records) => sum + records.length, 0);
    if (total > MAX_TOTAL_BACKUP_RECORDS) {
      context.addIssue({
        code: 'custom',
        message: `Backup contains more than ${MAX_TOTAL_BACKUP_RECORDS} records`
      });
    }
  });

export const backupSchema: z.ZodType<BackupSchema> = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.literal(DATABASE_SCHEMA_VERSION),
    appVersion: z.string().trim().min(1).max(64),
    exportedAt: isoDateTimeSchema,
    data: backupDataSchema
  })
  .strict();

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Reject prototype-pollution payloads and pathological object graphs before schema parsing. */
export function assertSafeObjectGraph(value: unknown): void {
  let visitedNodes = 0;
  const seen = new WeakSet<object>();

  const visit = (current: unknown, depth: number): void => {
    visitedNodes += 1;
    if (visitedNodes > MAX_OBJECT_GRAPH_NODES) {
      throw new Error('Input contains too many values.');
    }
    if (depth > MAX_OBJECT_GRAPH_DEPTH) {
      throw new Error('Input is nested too deeply.');
    }
    if (typeof current === 'number' && !Number.isFinite(current)) {
      throw new Error('Input contains a non-finite number.');
    }
    if (typeof current === 'string' && current.length > MAX_LONG_TEXT_LENGTH) {
      throw new Error('Input contains an oversized string.');
    }
    if (current === null || typeof current !== 'object') return;
    if (seen.has(current)) throw new Error('Input contains a circular reference.');
    seen.add(current);

    if (Array.isArray(current)) {
      if (current.length > MAX_ARRAY_ITEMS) throw new Error('Input array is too large.');
      for (const child of current) visit(child, depth + 1);
      return;
    }

    const prototype = Reflect.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Input contains a non-plain object.');
    }
    for (const [key, child] of Object.entries(current)) {
      if (FORBIDDEN_KEYS.has(key)) throw new Error(`Forbidden object key: ${key}`);
      visit(child, depth + 1);
    }
  };

  visit(value, 0);
}

export function parseBackupSchema(value: unknown): BackupSchema {
  assertSafeObjectGraph(value);
  return backupSchema.parse(value);
}
