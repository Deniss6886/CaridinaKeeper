import { describe, expect, it } from 'vitest';
import { createDemoData, loadDemoData } from './demoData';
import { createDatabase, deleteTankWithRelatedData } from './database';

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
