export const MAINTENANCE_EVENT_TYPES = [
  'water_change',
  'filter_clean',
  'soil_replace',
  'soil_partial',
  'feed',
  'mineral',
  'additive',
  'other'
] as const;

export const BREEDING_EVENT_TYPES = [
  'berried',
  'released',
  'juveniles',
  'molt',
  'loss',
  'move',
  'selection',
  'sale',
  'giveaway',
  'purchase'
] as const;

export const CROSS_GENERATIONS = ['F1', 'F2', 'backcross'] as const;
export const REMINDER_REPEATS = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
] as const;

export const BACKUP_FORMAT = 'caridina-keeper-backup' as const;
export const DATABASE_SCHEMA_VERSION = 1 as const;
export const SETTINGS_ID = 'settings' as const;

export type MaintenanceEventType = (typeof MAINTENANCE_EVENT_TYPES)[number];
export type BreedingEventType = (typeof BREEDING_EVENT_TYPES)[number];
export type CrossGeneration = (typeof CROSS_GENERATIONS)[number];
export type ReminderRepeat = (typeof REMINDER_REPEATS)[number];
export type ISODate = string;
export type ISODateTime = string;

export interface EntityRecord {
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Demo records are always opt-in and visibly distinguishable from user data. */
  isDemo?: boolean;
}

export interface TankDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface TankInhabitant {
  id: string;
  species: string;
  variant?: string;
  count: number;
  notes?: string;
}

export interface Tank extends EntityRecord {
  name: string;
  volumeLiters: number;
  dimensions?: TankDimensions;
  startDate: ISODate;
  description?: string;
  soil?: string;
  soilInstalledAt?: ISODate;
  filterType?: string;
  targetTemperature?: number;
  notes?: string;
  inhabitants: TankInhabitant[];
  breedingLineId?: string;
}

export interface ParameterDefinition extends EntityRecord {
  /** Stable, machine-readable key such as `ph` or `temperature`. */
  key: string;
  name: string;
  unit: string;
  description?: string;
  precision: number;
  sortOrder: number;
  isBuiltIn: boolean;
}

/**
 * The target interval is healthy. The optional warning interval surrounds it;
 * values beyond that outer interval are critical.
 */
export interface TargetRange extends EntityRecord {
  tankId: string;
  parameterId: string;
  minimum: number;
  maximum: number;
  warningMinimum?: number;
  warningMaximum?: number;
}

export interface WaterReading extends EntityRecord {
  tankId: string;
  parameterId: string;
  value: number;
  unit: string;
  measuredAt: ISODateTime;
  method?: string;
  /** Absolute measurement uncertainty in the reading's unit. */
  uncertainty?: number;
  note?: string;
}

export interface MaintenanceEvent extends EntityRecord {
  tankId: string;
  type: MaintenanceEventType;
  performedAt: ISODateTime;
  amount?: number;
  unit?: string;
  waterChangePercent?: number;
  note?: string;
}

export interface BreedingLine extends EntityRecord {
  name: string;
  species: string;
  variant?: string;
  color?: string;
  orangeEye: boolean;
  generation?: string;
  origin?: string;
  purchaseDate?: ISODate;
  count: number;
  sex?: string;
  price?: number;
  notes?: string;
}

export interface BreedingEvent extends EntityRecord {
  breedingLineId: string;
  tankId?: string;
  type: BreedingEventType;
  occurredAt: ISODateTime;
  count?: number;
  fromTankId?: string;
  toTankId?: string;
  price?: number;
  note?: string;
}

export interface Cross extends EntityRecord {
  name: string;
  parentLineIds: [string, string];
  generation: CrossGeneration;
  selectionGoal: string;
  notes?: string;
  tankId?: string;
}

export interface Reminder extends EntityRecord {
  tankId?: string;
  title: string;
  description?: string;
  dueAt: ISODateTime;
  repeat: ReminderRepeat;
  completed: boolean;
  completedAt?: ISODateTime;
}

export interface Settings extends EntityRecord {
  id: typeof SETTINGS_ID;
  locale: string;
  theme: 'system' | 'light' | 'dark';
  reducedMotion: boolean;
  defaultWaterChangePercent: number;
  onboardingCompleted: boolean;
  demoDataLoaded: boolean;
}

export interface BackupData {
  tanks: Tank[];
  waterReadings: WaterReading[];
  parameterDefinitions: ParameterDefinition[];
  targetRanges: TargetRange[];
  maintenanceEvents: MaintenanceEvent[];
  breedingLines: BreedingLine[];
  breedingEvents: BreedingEvent[];
  crosses: Cross[];
  reminders: Reminder[];
  settings: Settings[];
}

export interface BackupSchema {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof DATABASE_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: ISODateTime;
  data: BackupData;
}

export type DataTableName = keyof BackupData;

export type DataRecordMap = {
  tanks: Tank;
  waterReadings: WaterReading;
  parameterDefinitions: ParameterDefinition;
  targetRanges: TargetRange;
  maintenanceEvents: MaintenanceEvent;
  breedingLines: BreedingLine;
  breedingEvents: BreedingEvent;
  crosses: Cross;
  reminders: Reminder;
  settings: Settings;
};

export type EntityIdPrefix =
  | 'tank'
  | 'inhabitant'
  | 'parameter'
  | 'target'
  | 'reading'
  | 'maintenance'
  | 'line'
  | 'breeding'
  | 'cross'
  | 'reminder';

/** Create opaque IDs once and persist them; names and array positions never become identity. */
export function createStableId(prefix: EntityIdPrefix): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (!uuid) {
    throw new Error('Secure random UUID generation is unavailable in this environment.');
  }
  return `${prefix}_${uuid}`;
}

export function createEntityTimestamps(
  now = new Date()
): Pick<EntityRecord, 'createdAt' | 'updatedAt'> {
  const timestamp = now.toISOString();
  return { createdAt: timestamp, updatedAt: timestamp };
}
