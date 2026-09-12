import type {
  ParameterDefinition,
  Reminder,
  TankDimensions,
  TargetRange,
  WaterReading
} from './models';
import { isoDateTimeSchema, targetRangeSchema } from './validation';

export type TargetStatus =
  'in-range' | 'warning-low' | 'warning-high' | 'critical-low' | 'critical-high';

export type TargetSeverity = 'ok' | 'warning' | 'critical';

export interface TargetEvaluation {
  status: TargetStatus;
  severity: TargetSeverity;
  value: number;
  targetMinimum: number;
  targetMaximum: number;
  /** Absolute distance to the nearest target boundary; zero while in range. */
  deviation: number;
}

export interface ParameterWarning {
  reading: WaterReading;
  range: TargetRange;
  parameter?: ParameterDefinition;
  evaluation: TargetEvaluation;
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be a finite number.`);
  return value;
}

export function evaluateTargetRange(value: number, range: TargetRange): TargetEvaluation {
  requireFinite(value, 'value');
  const validRange = targetRangeSchema.parse(range);

  if (value < validRange.minimum) {
    const critical = validRange.warningMinimum !== undefined && value < validRange.warningMinimum;
    return {
      status: critical ? 'critical-low' : 'warning-low',
      severity: critical ? 'critical' : 'warning',
      value,
      targetMinimum: validRange.minimum,
      targetMaximum: validRange.maximum,
      deviation: validRange.minimum - value
    };
  }

  if (value > validRange.maximum) {
    const critical = validRange.warningMaximum !== undefined && value > validRange.warningMaximum;
    return {
      status: critical ? 'critical-high' : 'warning-high',
      severity: critical ? 'critical' : 'warning',
      value,
      targetMinimum: validRange.minimum,
      targetMaximum: validRange.maximum,
      deviation: value - validRange.maximum
    };
  }

  return {
    status: 'in-range',
    severity: 'ok',
    value,
    targetMinimum: validRange.minimum,
    targetMaximum: validRange.maximum,
    deviation: 0
  };
}

export function isWithinTarget(value: number, range: TargetRange): boolean {
  return evaluateTargetRange(value, range).severity === 'ok';
}

export function latestReadingsByTankAndParameter(
  readings: readonly WaterReading[]
): Map<string, WaterReading> {
  const latest = new Map<string, WaterReading>();
  for (const reading of readings) {
    const timestamp = Date.parse(reading.measuredAt);
    if (!Number.isFinite(timestamp)) continue;
    const key = `${reading.tankId}\u0000${reading.parameterId}`;
    const previous = latest.get(key);
    if (
      !previous ||
      timestamp > Date.parse(previous.measuredAt) ||
      (timestamp === Date.parse(previous.measuredAt) &&
        (Date.parse(reading.updatedAt) > Date.parse(previous.updatedAt) ||
          (Date.parse(reading.updatedAt) === Date.parse(previous.updatedAt) &&
            reading.id > previous.id)))
    ) {
      latest.set(key, reading);
    }
  }
  return latest;
}

/** Return only actionable warnings, based on the newest reading for each tank/parameter pair. */
export function collectParameterWarnings(
  readings: readonly WaterReading[],
  ranges: readonly TargetRange[],
  definitions: readonly ParameterDefinition[] = []
): ParameterWarning[] {
  const latest = latestReadingsByTankAndParameter(readings);
  const parameters = new Map(definitions.map((definition) => [definition.id, definition]));
  const warnings: ParameterWarning[] = [];

  for (const range of ranges) {
    const reading = latest.get(`${range.tankId}\u0000${range.parameterId}`);
    if (!reading) continue;
    const parameter = parameters.get(range.parameterId);
    // Historic readings retain their recorded units; comparisons never imply a conversion.
    if (parameter && parameter.unit !== reading.unit) continue;
    const evaluation = evaluateTargetRange(reading.value, range);
    if (evaluation.severity === 'ok') continue;
    warnings.push({
      reading,
      range,
      parameter,
      evaluation
    });
  }

  const severityRank: Record<TargetSeverity, number> = { critical: 0, warning: 1, ok: 2 };
  return warnings.sort((left, right) => {
    const severityDifference =
      severityRank[left.evaluation.severity] - severityRank[right.evaluation.severity];
    if (severityDifference !== 0) return severityDifference;
    return Date.parse(right.reading.measuredAt) - Date.parse(left.reading.measuredAt);
  });
}

export function calculateTankVolumeLiters(dimensions: TankDimensions): number {
  const length = requireFinite(dimensions.lengthCm, 'lengthCm');
  const width = requireFinite(dimensions.widthCm, 'widthCm');
  const height = requireFinite(dimensions.heightCm, 'heightCm');
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new RangeError('Tank dimensions must be greater than zero.');
  }
  return requireFinite((length * width * height) / 1_000, 'Tank volume');
}

export function calculateWaterChangeLiters(volumeLiters: number, percentage: number): number {
  requireFinite(volumeLiters, 'volumeLiters');
  requireFinite(percentage, 'percentage');
  if (volumeLiters <= 0) throw new RangeError('volumeLiters must be greater than zero.');
  if (percentage < 0 || percentage > 100) {
    throw new RangeError('percentage must be between 0 and 100.');
  }
  return requireFinite(volumeLiters * (percentage / 100), 'Water change volume');
}

export function isReminderDue(reminder: Reminder, now: Date = new Date()): boolean {
  if (reminder.completed) return false;
  const dueAt = Date.parse(reminder.dueAt);
  const nowTime = now.getTime();
  if (!Number.isFinite(dueAt) || !Number.isFinite(nowTime)) {
    throw new RangeError('Reminder and comparison date must be valid date-times.');
  }
  return dueAt <= nowTime;
}

/** Advance from the due date to the first future occurrence in the user's local calendar. */
export function nextReminderDueAt(reminder: Reminder, now: Date = new Date()): string | null {
  if (reminder.repeat === 'none') return null;
  const due = new Date(isoDateTimeSchema.parse(reminder.dueAt));
  if (!Number.isFinite(now.getTime())) throw new RangeError('Completion date must be valid.');
  const candidate = new Date(due);
  if (reminder.repeat === 'daily' || reminder.repeat === 'weekly') {
    const interval = reminder.repeat === 'daily' ? 1 : 7;
    const dayNumber = (date: Date) => {
      const utc = new Date(0);
      utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return utc.getTime() / 86_400_000;
    };
    let periods = Math.max(1, Math.floor((dayNumber(now) - dayNumber(due)) / interval));
    candidate.setDate(due.getDate() + periods * interval);
    while (candidate.getTime() <= now.getTime()) {
      periods += 1;
      candidate.setTime(due.getTime());
      candidate.setDate(due.getDate() + periods * interval);
    }
  } else {
    const interval = reminder.repeat === 'monthly' ? 1 : reminder.repeat === 'quarterly' ? 3 : 12;
    const elapsedMonths =
      (now.getFullYear() - due.getFullYear()) * 12 + now.getMonth() - due.getMonth();
    let periods = Math.max(1, Math.floor(elapsedMonths / interval));
    const move = () => {
      candidate.setTime(due.getTime());
      candidate.setDate(1);
      candidate.setMonth(due.getMonth() + periods * interval);
      const lastDay = new Date(candidate);
      lastDay.setMonth(lastDay.getMonth() + 1, 0);
      candidate.setDate(Math.min(due.getDate(), lastDay.getDate()));
    };
    move();
    while (candidate.getTime() <= now.getTime()) {
      periods += 1;
      move();
    }
  }
  return isoDateTimeSchema.parse(candidate.toISOString());
}
