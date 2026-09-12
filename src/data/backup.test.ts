import { describe, expect, it } from 'vitest';
import { buildSafeCsv, createBackup, exportWaterReadingsCsv, validateBackup } from './backup';
import { createDemoBackup, createDemoData, loadDemoData } from './demoData';
import { createDatabase } from './database';

describe('backup and export safety', () => {
  it('validates the demo backup and rejects broken references', () => {
    const backup = createDemoBackup();
    expect(validateBackup(backup)).toEqual(backup);
    const broken = structuredClone(backup);
    const firstReading = broken.data.waterReadings[0];
    if (!firstReading) throw new Error('Demo backup has no reading.');
    firstReading.tankId = 'missing-tank';
    expect(() => validateBackup(broken)).toThrow(/missing ID/);
  });

  it('rejects ambiguous or unsafe serialized object structures', () => {
    const valid = JSON.stringify(createDemoBackup());
    expect(() => validateBackup(valid.replace('"format":', '"format":"other","format":'))).toThrow(
      /Duplicate JSON member/
    );
    expect(() => validateBackup('{"a":1,"\\u0061":2}')).toThrow(/Duplicate JSON member/);
    expect(() => validateBackup('{"__proto__":{}}')).toThrow();
  });

  it('neutralizes spreadsheet formulas and preserves delimiters', () => {
    expect(buildSafeCsv(['name'], [['=SUM(A1:A2)']])).toBe('"name"\r\n"\t=SUM(A1:A2)"');
    expect(buildSafeCsv(['a', 'b'], [['hello', 'world']], ';')).toBe('"a";"b"\r\n"hello";"world"');
    expect(buildSafeCsv(['name'], [['　＝cmd']])).toContain('\t　＝cmd');
    expect(buildSafeCsv(['name'], [['safe + text']])).not.toContain('\tsafe');
  });

  it('exports water readings with human-readable labels', () => {
    const data = createDemoData();
    const csv = exportWaterReadingsCsv(data.waterReadings, data.tanks, data.parameterDefinitions);
    expect(csv).toContain('"Tank"');
    expect(csv).toContain('Crystal Red');
    expect(csv).toContain('Temperatur');
  });

  it('creates a sorted backup from IndexedDB', async () => {
    const db = createDatabase(`backup-test-${crypto.randomUUID()}`);
    await db.open();
    await loadDemoData(db, { replaceExisting: true });
    const backup = await createBackup(db, { now: new Date('2026-09-12T00:00:00.000Z') });
    expect(backup.exportedAt).toBe('2026-09-12T00:00:00.000Z');
    expect(backup.data.tanks[0]?.id).toBe('tank_demo_blue_bolt');
    await db.delete();
  });
});
