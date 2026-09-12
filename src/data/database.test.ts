import { afterEach, describe, expect, it } from 'vitest';
import { createDemoBackup, createDemoData, loadDemoData } from './demoData';
import {
  clearAllData,
  createCrudRepositories,
  createDatabase,
  deleteTankWithRelatedData,
  replaceTargetRanges,
  setReminderCompleted,
  type CaridinaKeeperDatabase
} from './database';
import { createBackup, restoreBackup } from './backup';
import type { BreedingEvent, DataRecordMap } from '../domain/models';

const databases: CaridinaKeeperDatabase[] = [];
const fixedNow = new Date('2026-09-12T12:00:00.000Z');
async function demoDatabase() {
  const db = createDatabase(`integrity-test-${crypto.randomUUID()}`);
  databases.push(db);
  await loadDemoData(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe('database lifecycle', () => {
  it('loads demo data and deletes a tank with all related records atomically', async () => {
    const db = createDatabase(`database-test-${crypto.randomUUID()}`);
    await db.open();
    await loadDemoData(db, { replaceExisting: true });
    const demo = createDemoData();
    const deletedTank = demo.tanks[0];
    if (!deletedTank) throw new Error('Demo data has no tank.');
    expect(await db.tanks.count()).toBe(demo.tanks.length);
    expect(await db.waterReadings.where('tankId').equals(deletedTank.id).count()).toBeGreaterThan(
      0
    );
    await deleteTankWithRelatedData(db, deletedTank.id);
    expect(await db.tanks.get(deletedTank.id)).toBeUndefined();
    expect(await db.waterReadings.where('tankId').equals(deletedTank.id).count()).toBe(0);
    expect(await db.targetRanges.where('tankId').equals(deletedTank.id).count()).toBe(0);
    await db.delete();
  });
});

describe('validated repository integrity', () => {
  const missingReferences: Array<{
    table: keyof DataRecordMap;
    field: string;
    change: Record<string, unknown>;
  }> = [
    { table: 'tanks', field: 'breedingLineId', change: { breedingLineId: 'missing' } },
    { table: 'waterReadings', field: 'tankId', change: { tankId: 'missing' } },
    { table: 'waterReadings', field: 'parameterId', change: { parameterId: 'missing' } },
    { table: 'targetRanges', field: 'tankId', change: { tankId: 'missing' } },
    { table: 'targetRanges', field: 'parameterId', change: { parameterId: 'missing' } },
    { table: 'maintenanceEvents', field: 'tankId', change: { tankId: 'missing' } },
    { table: 'breedingEvents', field: 'breedingLineId', change: { breedingLineId: 'missing' } },
    { table: 'breedingEvents', field: 'tankId', change: { tankId: 'missing' } },
    { table: 'breedingEvents', field: 'fromTankId', change: { fromTankId: 'missing' } },
    { table: 'breedingEvents', field: 'toTankId', change: { toTankId: 'missing' } },
    { table: 'crosses', field: 'tankId', change: { tankId: 'missing' } },
    {
      table: 'crosses',
      field: 'parentLineIds',
      change: { parentLineIds: ['missing', 'line_demo_oebt'] }
    },
    { table: 'reminders', field: 'tankId', change: { tankId: 'missing' } }
  ];

  it.each(missingReferences)(
    'rejects an orphan in $table.$field without replacing data',
    async ({ table, change }) => {
      const db = await demoDatabase();
      const repository = createCrudRepositories(db)[table];
      const original = (await repository.getAll())[0]!;
      // Deliberately bypass static typing to exercise the runtime boundary.
      await expect(repository.put({ ...original, ...change } as never)).rejects.toThrow(
        /missing ID/
      );
      expect(await repository.get(original.id)).toEqual(original);
    }
  );

  it('rolls back every bulk write if a later unique-key constraint fails', async () => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    const original = createDemoData().parameterDefinitions[0]!;
    await expect(
      repos.parameterDefinitions.bulkPut([
        { ...original, id: 'new-parameter', key: 'new_parameter' },
        { ...original, id: 'duplicate-key' }
      ])
    ).rejects.toThrow();
    expect(await db.parameterDefinitions.get('new-parameter')).toBeUndefined();
    expect(await db.parameterDefinitions.get(original.id)).toEqual(original);
  });

  it('rejects repeated IDs within a batch and IDs used by another table', async () => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    const tank = createDemoData().tanks[0]!;
    await expect(repos.tanks.bulkPut([tank, tank])).rejects.toThrow(/duplicate record IDs/);
    await expect(repos.tanks.add({ ...tank, id: 'parameter_ph' })).rejects.toThrow(
      /Duplicate record ID/
    );
  });

  it('merges concurrent partial updates without losing independent fields or changing identity', async () => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    const tank = createDemoData().tanks[0]!;
    await Promise.all([
      repos.tanks.update(tank.id, { name: 'Updated name' }, fixedNow),
      repos.tanks.update(tank.id, { notes: 'Updated notes' }, fixedNow)
    ]);
    expect(await db.tanks.get(tank.id)).toMatchObject({
      id: tank.id,
      createdAt: tank.createdAt,
      updatedAt: fixedNow.toISOString(),
      name: 'Updated name',
      notes: 'Updated notes'
    });
    await expect(repos.tanks.update('missing', { name: 'No tank' })).rejects.toThrow(/not found/);
  });

  it('rejects stale full-record replacements instead of recreating or overwriting a tank', async () => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    const tank = createDemoData().tanks[0]!;
    await repos.tanks.update(tank.id, { name: 'Changed elsewhere' }, fixedNow);
    await expect(
      repos.tanks.putIfUnchanged(
        { ...tank, name: 'Stale draft', updatedAt: fixedNow.toISOString() },
        tank.updatedAt
      )
    ).rejects.toThrow(/changed or was deleted/);
    await repos.tanks.delete(tank.id);
    await expect(
      repos.tanks.putIfUnchanged({ ...tank, name: 'Recreated stale draft' }, fixedNow.toISOString())
    ).rejects.toThrow(/changed or was deleted/);
  });

  it('serializes child insertion against a concurrent tank deletion', async () => {
    const db = await demoDatabase();
    const secondConnection = createDatabase(db.name);
    databases.push(secondConnection);
    const tankId = createDemoData().tanks[0]!.id;
    const reading = { ...createDemoData().waterReadings[0]!, id: 'concurrent-reading' };
    await Promise.allSettled([
      deleteTankWithRelatedData(db, tankId),
      createCrudRepositories(secondConnection).waterReadings.add(reading)
    ]);
    expect(await db.tanks.get(tankId)).toBeUndefined();
    expect(await db.waterReadings.where('tankId').equals(tankId).count()).toBe(0);
    await createBackup(db);
  });

  it('uses cascading generic deletes for tanks, parameters, and breeding lines', async () => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    const data = createDemoData();
    const deletedTank = data.tanks[0]!;
    const linkedEvent: BreedingEvent = {
      ...data.breedingEvents[1]!,
      id: 'move-between-tanks',
      type: 'move',
      fromTankId: deletedTank.id,
      toTankId: data.tanks[1]!.id
    };
    await repos.breedingEvents.add(linkedEvent);
    await repos.tanks.delete(deletedTank.id);
    expect(await db.breedingEvents.get(linkedEvent.id)).toBeUndefined();
    expect(await db.maintenanceEvents.where('tankId').equals(deletedTank.id).count()).toBe(0);
    expect(await db.reminders.where('tankId').equals(deletedTank.id).count()).toBe(0);
    await repos.parameterDefinitions.delete('parameter_ph');
    expect(await db.waterReadings.where('parameterId').equals('parameter_ph').count()).toBe(0);
    expect(await db.targetRanges.where('parameterId').equals('parameter_ph').count()).toBe(0);
    await repos.breedingLines.delete('line_demo_blue_bolt');
    expect(await db.crosses.count()).toBe(0);
    expect((await db.tanks.get('tank_demo_blue_bolt'))?.breedingLineId).toBeUndefined();
    expect(
      await db.breedingEvents.where('breedingLineId').equals('line_demo_blue_bolt').count()
    ).toBe(0);
    await createBackup(db);
  });
});

describe('atomic replacement and restore', () => {
  it('preserves existing target ranges after invalid input, missing references or ID conflicts', async () => {
    const db = await demoDatabase();
    const ranges = await db.targetRanges.where('tankId').equals('tank_demo_crystal_red').toArray();
    const first = ranges[0]!;
    for (const invalid of [
      { ...first, minimum: first.maximum + 1 },
      { ...first, parameterId: 'missing' },
      { ...first, tankId: 'other-tank' },
      { ...first, id: 'target_blue_bolt_ph' }
    ]) {
      await expect(replaceTargetRanges(db, first.tankId, [invalid])).rejects.toThrow();
      expect(await db.targetRanges.where('tankId').equals(first.tankId).toArray()).toEqual(ranges);
    }
    await expect(
      replaceTargetRanges(db, first.tankId, [first, { ...first, id: 'extra' }])
    ).rejects.toThrow(/more than one/);
    await expect(replaceTargetRanges(db, 'missing', [])).rejects.toThrow(/not found/);
    await replaceTargetRanges(db, first.tankId, []);
    expect(await db.targetRanges.where('tankId').equals(first.tankId).count()).toBe(0);
  });

  it.each([
    ['write failure', new Error('Simulated disk failure')],
    ['quota failure', new DOMException('Simulated quota failure', 'QuotaExceededError')]
  ])('restores every original table after a %s during replacement', async (_label, failure) => {
    const db = await demoDatabase();
    const repos = createCrudRepositories(db);
    await repos.tanks.update('tank_demo_crystal_red', { name: 'Irreplaceable user tank' });
    const before = await createBackup(db, { now: fixedNow });
    const fail = () => {
      throw failure;
    };
    db.parameterDefinitions.hook('creating', fail);
    await expect(restoreBackup(db, createDemoBackup())).rejects.toThrow(/failure/);
    db.parameterDefinitions.hook('creating').unsubscribe(fail);
    expect(await createBackup(db, { now: fixedNow })).toEqual(before);
  });

  it('leaves the database untouched for invalid backups and rejects demo replacement without opt-in', async () => {
    const db = await demoDatabase();
    const before = await createBackup(db, { now: fixedNow });
    await expect(restoreBackup(db, '{bad JSON')).rejects.toThrow(/valid JSON/);
    await expect(loadDemoData(db)).rejects.toThrow(/not empty/);
    expect(await createBackup(db, { now: fixedNow })).toEqual(before);
    await clearAllData(db);
    const counts = await Promise.all(db.tables.map((table) => table.count()));
    expect(counts.every((count) => count === 0)).toBe(true);
  });

  it('allows only one concurrent opt-in-free demo load', async () => {
    const db = createDatabase(`demo-race-${crypto.randomUUID()}`);
    databases.push(db);
    const outcomes = await Promise.allSettled([loadDemoData(db), loadDemoData(db)]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await db.tanks.count()).toBe(createDemoData().tanks.length);
  });

  it('completes and reopens one-time reminders and advances recurring reminders', async () => {
    const db = await demoDatabase();
    const onceId = 'reminder_demo_blue_measure';
    const completed = await setReminderCompleted(db, onceId, true, fixedNow);
    expect(completed).toMatchObject({ completed: true, completedAt: fixedNow.toISOString() });
    const reopened = await setReminderCompleted(db, onceId, false, fixedNow);
    expect(reopened.completed).toBe(false);
    expect(reopened.completedAt).toBeUndefined();
    const repeating = await setReminderCompleted(
      db,
      'reminder_demo_crystal_water',
      true,
      new Date('2026-10-01T12:00:00Z')
    );
    expect(repeating.completed).toBe(false);
    expect(repeating.completedAt).toBeUndefined();
    expect(Date.parse(repeating.dueAt)).toBeGreaterThan(Date.parse('2026-10-01T12:00:00Z'));
    await expect(setReminderCompleted(db, 'missing', true)).rejects.toThrow(/not found/);
    await createBackup(db);
  });
});
