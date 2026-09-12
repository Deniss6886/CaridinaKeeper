import Dexie, { type Table, type Transaction } from 'dexie';
import type { z } from 'zod';

import {
  DATABASE_SCHEMA_VERSION,
  type BreedingEvent,
  type BreedingLine,
  type Cross,
  type DataTableName,
  type EntityRecord,
  type MaintenanceEvent,
  type ParameterDefinition,
  type Reminder,
  type Settings,
  type Tank,
  type TargetRange,
  type WaterReading
} from '../domain/models';
import {
  assertSafeObjectGraph,
  breedingEventSchema,
  breedingLineSchema,
  crossSchema,
  maintenanceEventSchema,
  parameterDefinitionSchema,
  reminderSchema,
  settingsSchema,
  tankSchema,
  targetRangeSchema,
  waterReadingSchema
} from '../domain/validation';
import { nextReminderDueAt } from '../domain/calculations';

export const DATABASE_NAME = 'CaridinaKeeper';

/**
 * Schema history is intentionally append-only. Future migrations add another
 * entry and an upgrade function; an existing version must never be rewritten.
 */
export const DATABASE_MIGRATIONS: ReadonlyArray<{
  version: number;
  stores: Record<string, string>;
  upgrade?: (transaction: Transaction) => void | PromiseLike<void>;
}> = [
  {
    version: 1,
    stores: {
      tanks: 'id,name,startDate,breedingLineId,updatedAt',
      waterReadings:
        'id,tankId,parameterId,measuredAt,[tankId+measuredAt],[tankId+parameterId+measuredAt]',
      parameterDefinitions: 'id,&key,sortOrder',
      targetRanges: 'id,tankId,parameterId,&[tankId+parameterId]',
      maintenanceEvents: 'id,tankId,type,performedAt,[tankId+performedAt]',
      breedingLines: 'id,name,species,variant',
      breedingEvents:
        'id,breedingLineId,tankId,type,occurredAt,fromTankId,toTankId,[breedingLineId+occurredAt]',
      crosses: 'id,name,*parentLineIds,tankId,generation',
      reminders: 'id,tankId,dueAt',
      settings: 'id'
    }
  }
];

export class CaridinaKeeperDatabase extends Dexie {
  tanks!: Table<Tank, string>;
  waterReadings!: Table<WaterReading, string>;
  parameterDefinitions!: Table<ParameterDefinition, string>;
  targetRanges!: Table<TargetRange, string>;
  maintenanceEvents!: Table<MaintenanceEvent, string>;
  breedingLines!: Table<BreedingLine, string>;
  breedingEvents!: Table<BreedingEvent, string>;
  crosses!: Table<Cross, string>;
  reminders!: Table<Reminder, string>;
  settings!: Table<Settings, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    for (const migration of DATABASE_MIGRATIONS) {
      const version = this.version(migration.version).stores(migration.stores);
      if (migration.upgrade) version.upgrade(migration.upgrade);
    }
  }
}

export function createDatabase(name = DATABASE_NAME): CaridinaKeeperDatabase {
  return new CaridinaKeeperDatabase(name);
}

export const database = createDatabase();

export type EntityChanges<T extends EntityRecord> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>
>;

export class RecordConflictError extends Error {
  override name = 'RecordConflictError';
}

/** Must run in the same transaction as the write to prevent concurrent orphan creation. */
async function assertRecordReferences(
  owner: CaridinaKeeperDatabase,
  tableName: string,
  record: EntityRecord
): Promise<void> {
  const requireReference = async (table: Table, id: string | undefined, field: string) => {
    if (id !== undefined && !(await table.get(id))) {
      throw new Error(`${tableName}.${field} references missing ID ${id}.`);
    }
  };

  for (const table of owner.tables) {
    if (table.name !== tableName && (await table.get(record.id))) {
      throw new Error(`Duplicate record ID: ${record.id}`);
    }
  }
  switch (tableName as DataTableName) {
    case 'tanks':
      await requireReference(
        owner.breedingLines,
        (record as Tank).breedingLineId,
        'breedingLineId'
      );
      break;
    case 'waterReadings':
    case 'targetRanges': {
      const related = record as WaterReading | TargetRange;
      await requireReference(owner.tanks, related.tankId, 'tankId');
      await requireReference(owner.parameterDefinitions, related.parameterId, 'parameterId');
      break;
    }
    case 'maintenanceEvents':
    case 'reminders':
      await requireReference(owner.tanks, (record as MaintenanceEvent | Reminder).tankId, 'tankId');
      break;
    case 'breedingEvents': {
      const event = record as BreedingEvent;
      await requireReference(owner.breedingLines, event.breedingLineId, 'breedingLineId');
      await requireReference(owner.tanks, event.tankId, 'tankId');
      await requireReference(owner.tanks, event.fromTankId, 'fromTankId');
      await requireReference(owner.tanks, event.toTankId, 'toTankId');
      break;
    }
    case 'crosses': {
      const cross = record as Cross;
      await requireReference(owner.tanks, cross.tankId, 'tankId');
      for (const id of cross.parentLineIds) {
        await requireReference(owner.breedingLines, id, 'parentLineIds');
      }
      break;
    }
  }
}

function parseRecord<T>(schema: z.ZodType<T>, record: unknown): T {
  assertSafeObjectGraph(record);
  return schema.parse(record);
}

export class ValidatedCrudRepository<T extends EntityRecord> {
  constructor(
    private readonly owner: CaridinaKeeperDatabase,
    readonly table: Table<T, string>,
    private readonly schema: z.ZodType<T>
  ) {}

  async get(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async count(): Promise<number> {
    return this.table.count();
  }

  async add(record: T): Promise<string> {
    const validRecord = parseRecord(this.schema, record);
    return this.owner.transaction('rw', this.owner.tables, async () => {
      await assertRecordReferences(this.owner, this.table.name, validRecord);
      return this.table.add(validRecord);
    });
  }

  async put(record: T): Promise<string> {
    const validRecord = parseRecord(this.schema, record);
    return this.owner.transaction('rw', this.owner.tables, async () => {
      await assertRecordReferences(this.owner, this.table.name, validRecord);
      return this.table.put(validRecord);
    });
  }

  /** Replace a record only when the caller still owns the version it edited. */
  async putIfUnchanged(record: T, expectedUpdatedAt: string): Promise<string> {
    const validRecord = parseRecord(this.schema, record);
    return this.owner.transaction('rw', this.owner.tables, async () => {
      const existing = await this.table.get(validRecord.id);
      if (!existing || existing.updatedAt !== expectedUpdatedAt) {
        throw new RecordConflictError(`Record changed or was deleted: ${validRecord.id}`);
      }
      await assertRecordReferences(this.owner, this.table.name, validRecord);
      return this.table.put(validRecord);
    });
  }

  async bulkPut(records: readonly T[]): Promise<void> {
    assertSafeObjectGraph(records);
    const validRecords = records.map((record) => parseRecord(this.schema, record));
    if (new Set(validRecords.map(({ id }) => id)).size !== validRecords.length) {
      throw new Error('Bulk write contains duplicate record IDs.');
    }
    await this.owner.transaction('rw', this.owner.tables, async () => {
      for (const record of validRecords) {
        await assertRecordReferences(this.owner, this.table.name, record);
      }
      await this.table.bulkPut(validRecords);
    });
  }

  async update(id: string, changes: EntityChanges<T>, now = new Date()): Promise<T> {
    assertSafeObjectGraph(changes);
    return this.owner.transaction('rw', this.owner.tables, async () => {
      const existing = await this.table.get(id);
      if (!existing) throw new Error(`Record not found: ${id}`);
      const updated = parseRecord(this.schema, {
        ...existing,
        ...changes,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now.toISOString()
      });
      await assertRecordReferences(this.owner, this.table.name, updated);
      await this.table.put(updated);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    if (this.table.name === 'tanks') return deleteTankWithRelatedData(this.owner, id);
    if (this.table.name === 'parameterDefinitions')
      return deleteParameterWithReadings(this.owner, id);
    if (this.table.name === 'breedingLines') {
      return deleteBreedingLineWithRelatedData(this.owner, id);
    }
    await this.table.delete(id);
  }
}

/** Replace a tank's complete target set only after every new record passes validation. */
export async function replaceTargetRanges(
  owner: CaridinaKeeperDatabase,
  tankId: string,
  records: readonly TargetRange[],
  expectedVersions?: readonly Pick<TargetRange, 'id' | 'updatedAt'>[]
): Promise<void> {
  assertSafeObjectGraph(records);
  const ranges = records.map((record) => parseRecord(targetRangeSchema, record));
  if (ranges.some((range) => range.tankId !== tankId)) {
    throw new Error('Every target range must belong to the selected tank.');
  }
  if (new Set(ranges.map(({ id }) => id)).size !== ranges.length) {
    throw new Error('Target ranges contain duplicate record IDs.');
  }
  if (new Set(ranges.map(({ parameterId }) => parameterId)).size !== ranges.length) {
    throw new Error('A tank has more than one target range for a parameter.');
  }
  await owner.transaction('rw', owner.tables, async () => {
    if (!(await owner.tanks.get(tankId))) throw new Error(`Tank not found: ${tankId}`);
    if (expectedVersions) {
      const current = await owner.targetRanges.where('tankId').equals(tankId).toArray();
      const currentSignature = current
        .map(({ id, updatedAt }) => `${id}\u0000${updatedAt}`)
        .sort()
        .join('\u0001');
      const expectedSignature = expectedVersions
        .map(({ id, updatedAt }) => `${id}\u0000${updatedAt}`)
        .sort()
        .join('\u0001');
      if (currentSignature !== expectedSignature) {
        throw new RecordConflictError(`Target ranges changed: ${tankId}`);
      }
    }
    for (const range of ranges) await assertRecordReferences(owner, 'targetRanges', range);
    await owner.targetRanges.where('tankId').equals(tankId).delete();
    await owner.targetRanges.bulkAdd(ranges);
  });
}

/** Completing a repeat advances one calendar interval and keeps the reminder open. */
export async function setReminderCompleted(
  owner: CaridinaKeeperDatabase,
  id: string,
  completed: boolean,
  now = new Date()
): Promise<Reminder> {
  return owner.transaction('rw', owner.tables, async () => {
    const current = await owner.reminders.get(id);
    if (!current) throw new Error('Reminder not found.');
    const dueAt = completed ? nextReminderDueAt(current, now) : null;
    const updated = parseRecord(reminderSchema, {
      ...current,
      dueAt: dueAt ?? current.dueAt,
      completed: dueAt === null && completed,
      completedAt: dueAt === null && completed ? now.toISOString() : undefined,
      updatedAt: now.toISOString()
    });
    await assertRecordReferences(owner, 'reminders', updated);
    await owner.reminders.put(updated);
    return updated;
  });
}

export function createCrudRepositories(owner: CaridinaKeeperDatabase) {
  return {
    tanks: new ValidatedCrudRepository(owner, owner.tanks, tankSchema),
    waterReadings: new ValidatedCrudRepository(owner, owner.waterReadings, waterReadingSchema),
    parameterDefinitions: new ValidatedCrudRepository(
      owner,
      owner.parameterDefinitions,
      parameterDefinitionSchema
    ),
    targetRanges: new ValidatedCrudRepository(owner, owner.targetRanges, targetRangeSchema),
    maintenanceEvents: new ValidatedCrudRepository(
      owner,
      owner.maintenanceEvents,
      maintenanceEventSchema
    ),
    breedingLines: new ValidatedCrudRepository(owner, owner.breedingLines, breedingLineSchema),
    breedingEvents: new ValidatedCrudRepository(owner, owner.breedingEvents, breedingEventSchema),
    crosses: new ValidatedCrudRepository(owner, owner.crosses, crossSchema),
    reminders: new ValidatedCrudRepository(owner, owner.reminders, reminderSchema),
    settings: new ValidatedCrudRepository(owner, owner.settings, settingsSchema)
  };
}

export type CrudRepositories = ReturnType<typeof createCrudRepositories>;
export const repositories = createCrudRepositories(database);

export const ALL_DATA_TABLES = [
  'tanks',
  'waterReadings',
  'parameterDefinitions',
  'targetRanges',
  'maintenanceEvents',
  'breedingLines',
  'breedingEvents',
  'crosses',
  'reminders',
  'settings'
] as const;

export async function deleteTankWithRelatedData(
  owner: CaridinaKeeperDatabase,
  tankId: string
): Promise<void> {
  await owner.transaction(
    'rw',
    [
      owner.tanks,
      owner.waterReadings,
      owner.targetRanges,
      owner.maintenanceEvents,
      owner.breedingEvents,
      owner.crosses,
      owner.reminders
    ],
    async () => {
      await owner.waterReadings.where('tankId').equals(tankId).delete();
      await owner.targetRanges.where('tankId').equals(tankId).delete();
      await owner.maintenanceEvents.where('tankId').equals(tankId).delete();
      await owner.breedingEvents
        .filter(
          (event) =>
            event.tankId === tankId || event.fromTankId === tankId || event.toTankId === tankId
        )
        .delete();
      await owner.crosses.where('tankId').equals(tankId).delete();
      await owner.reminders.where('tankId').equals(tankId).delete();
      await owner.tanks.delete(tankId);
    }
  );
}

export async function deleteParameterWithReadings(
  owner: CaridinaKeeperDatabase,
  parameterId: string
): Promise<void> {
  await owner.transaction(
    'rw',
    owner.parameterDefinitions,
    owner.waterReadings,
    owner.targetRanges,
    async () => {
      await owner.waterReadings.where('parameterId').equals(parameterId).delete();
      await owner.targetRanges.where('parameterId').equals(parameterId).delete();
      await owner.parameterDefinitions.delete(parameterId);
    }
  );
}

export async function deleteBreedingLineWithRelatedData(
  owner: CaridinaKeeperDatabase,
  breedingLineId: string,
  now = new Date()
): Promise<void> {
  const updatedAt = now.toISOString();
  await owner.transaction(
    'rw',
    owner.breedingLines,
    owner.breedingEvents,
    owner.crosses,
    owner.tanks,
    async () => {
      await owner.breedingEvents.where('breedingLineId').equals(breedingLineId).delete();
      await owner.crosses.where('parentLineIds').equals(breedingLineId).delete();
      await owner.tanks
        .where('breedingLineId')
        .equals(breedingLineId)
        .modify((tank) => {
          delete tank.breedingLineId;
          tank.updatedAt = updatedAt;
        });
      await owner.breedingLines.delete(breedingLineId);
    }
  );
}

export async function clearAllData(owner: CaridinaKeeperDatabase): Promise<void> {
  await owner.transaction('rw', owner.tables, async () => {
    for (const table of owner.tables) await table.clear();
  });
}

export { DATABASE_SCHEMA_VERSION };
