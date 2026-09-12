import Dexie, { type Table, type Transaction } from 'dexie';
import type { z } from 'zod';

import {
  DATABASE_SCHEMA_VERSION,
  type BreedingEvent,
  type BreedingLine,
  type Cross,
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
    const validRecord = this.schema.parse(record);
    return this.table.add(validRecord);
  }

  async put(record: T): Promise<string> {
    const validRecord = this.schema.parse(record);
    return this.table.put(validRecord);
  }

  async bulkPut(records: readonly T[]): Promise<void> {
    const validRecords = records.map((record) => this.schema.parse(record));
    await this.table.bulkPut(validRecords);
  }

  async update(id: string, changes: EntityChanges<T>, now = new Date()): Promise<T> {
    return this.owner.transaction('rw', this.table, async () => {
      const existing = await this.table.get(id);
      if (!existing) throw new Error(`Record not found: ${id}`);
      const updated = this.schema.parse({
        ...existing,
        ...changes,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now.toISOString()
      });
      await this.table.put(updated);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
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
