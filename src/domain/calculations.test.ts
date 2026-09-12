import { describe, expect, it } from 'vitest';
import {
  calculateTankVolumeLiters,
  calculateWaterChangeLiters,
  collectParameterWarnings,
  evaluateTargetRange,
  isReminderDue
} from './calculations';
import type { Reminder, TargetRange, WaterReading } from './models';

const entity = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('target calculations', () => {
  it('classifies healthy, warning and critical values', () => {
    const range: TargetRange = {
      ...entity,
      id: 'range-1',
      tankId: 'tank-1',
      parameterId: 'ph',
      minimum: 5.8,
      maximum: 6.5,
      warningMinimum: 5.5,
      warningMaximum: 6.8
    };
    expect(evaluateTargetRange(6.1, range).status).toBe('in-range');
    expect(evaluateTargetRange(5.7, range).severity).toBe('warning');
    expect(evaluateTargetRange(5.2, range).status).toBe('critical-low');
    expect(evaluateTargetRange(7, range).status).toBe('critical-high');
  });

  it('uses the newest reading and sorts critical warnings first', () => {
    const readings: WaterReading[] = [
      {
        ...entity,
        id: 'old',
        tankId: 'tank-1',
        parameterId: 'ph',
        value: 6,
        unit: 'pH',
        measuredAt: '2026-01-01T00:00:00.000Z'
      },
      {
        ...entity,
        id: 'new',
        tankId: 'tank-1',
        parameterId: 'ph',
        value: 5.7,
        unit: 'pH',
        measuredAt: '2026-01-02T00:00:00.000Z'
      },
      {
        ...entity,
        id: 'critical',
        tankId: 'tank-1',
        parameterId: 'tds',
        value: 400,
        unit: 'ppm',
        measuredAt: '2026-01-02T00:00:00.000Z'
      }
    ];
    const ranges: TargetRange[] = [
      {
        ...entity,
        id: 'r-ph',
        tankId: 'tank-1',
        parameterId: 'ph',
        minimum: 5.8,
        maximum: 6.5,
        warningMinimum: 5.5,
        warningMaximum: 6.8
      },
      {
        ...entity,
        id: 'r-tds',
        tankId: 'tank-1',
        parameterId: 'tds',
        minimum: 100,
        maximum: 150,
        warningMinimum: 80,
        warningMaximum: 200
      }
    ];
    const warnings = collectParameterWarnings(readings, ranges);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.reading.id).toBe('critical');
    expect(warnings[1]?.reading.id).toBe('new');
  });

  it('guards physical calculations', () => {
    expect(calculateTankVolumeLiters({ lengthCm: 40, widthCm: 25, heightCm: 30 })).toBe(30);
    expect(calculateWaterChangeLiters(30, 20)).toBe(6);
    expect(() => calculateTankVolumeLiters({ lengthCm: 0, widthCm: 25, heightCm: 30 })).toThrow(
      RangeError
    );
    expect(() => calculateWaterChangeLiters(30, 101)).toThrow(RangeError);
  });

  it('determines reminder due state without mutating the record', () => {
    const reminder: Reminder = {
      ...entity,
      id: 'reminder-1',
      title: 'Water change',
      dueAt: '2026-01-02T00:00:00.000Z',
      repeat: 'weekly',
      completed: false
    };
    expect(isReminderDue(reminder, new Date('2026-01-03T00:00:00.000Z'))).toBe(true);
    expect(
      isReminderDue({ ...reminder, completed: true }, new Date('2026-01-03T00:00:00.000Z'))
    ).toBe(false);
  });
});
