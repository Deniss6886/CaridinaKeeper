import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { liveQuery } from 'dexie';
import packageJson from '../../package.json';
import {
  clearAllData,
  createCrudRepositories,
  database,
  deleteBreedingLineWithRelatedData,
  deleteTankWithRelatedData,
  replaceTargetRanges,
  setReminderCompleted
} from '../data/database';
import { exportWaterReadingsCsv, restoreBackup, serializeBackup } from '../data/backup';
import { loadDemoData } from '../data/demoData';
import {
  createEntityTimestamps,
  createStableId,
  SETTINGS_ID,
  type BackupData,
  type BreedingEvent,
  type BreedingLine,
  type Cross,
  type MaintenanceEvent,
  type ParameterDefinition,
  type Reminder,
  type Settings,
  type Tank,
  type TargetRange,
  type WaterReading
} from '../domain/models';

export const BUILT_IN_PARAMETERS: Array<
  Omit<ParameterDefinition, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>
> = [
  {
    key: 'temperature',
    name: 'Temperature',
    unit: '°C',
    description: 'Water temperature',
    precision: 1,
    sortOrder: 10,
    isBuiltIn: true
  },
  {
    key: 'ph',
    name: 'pH',
    unit: 'pH',
    description: 'Acidity / alkalinity',
    precision: 2,
    sortOrder: 20,
    isBuiltIn: true
  },
  {
    key: 'ec',
    name: 'Conductivity (EC)',
    unit: 'µS/cm',
    description: 'Electrical conductivity',
    precision: 0,
    sortOrder: 30,
    isBuiltIn: true
  },
  {
    key: 'gh',
    name: 'General hardness (GH)',
    unit: '°dGH',
    description: 'General hardness',
    precision: 1,
    sortOrder: 40,
    isBuiltIn: true
  },
  {
    key: 'kh',
    name: 'Carbonate hardness (KH)',
    unit: '°dKH',
    description: 'Carbonate hardness',
    precision: 1,
    sortOrder: 50,
    isBuiltIn: true
  },
  {
    key: 'no3',
    name: 'Nitrate (NO₃)',
    unit: 'mg/L',
    description: 'Nitrate',
    precision: 1,
    sortOrder: 60,
    isBuiltIn: true
  },
  {
    key: 'no2',
    name: 'Nitrite (NO₂)',
    unit: 'mg/L',
    description: 'Nitrite',
    precision: 2,
    sortOrder: 70,
    isBuiltIn: true
  },
  {
    key: 'ammonia',
    name: 'Ammonium / ammonia',
    unit: 'mg/L',
    description: 'NH₄/NH₃ measured value',
    precision: 2,
    sortOrder: 80,
    isBuiltIn: true
  },
  {
    key: 'tds',
    name: 'TDS',
    unit: 'ppm',
    description: 'Total dissolved solids proxy',
    precision: 0,
    sortOrder: 90,
    isBuiltIn: true
  }
];

const emptyData: BackupData = {
  tanks: [],
  waterReadings: [],
  parameterDefinitions: [],
  targetRanges: [],
  maintenanceEvents: [],
  breedingLines: [],
  breedingEvents: [],
  crosses: [],
  reminders: [],
  settings: []
};

function makeDefaultSettings(): Settings {
  return {
    id: SETTINGS_ID,
    ...createEntityTimestamps(),
    locale:
      typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('de')
        ? 'de'
        : 'en',
    theme: 'system',
    reducedMotion: false,
    defaultWaterChangePercent: 20,
    onboardingCompleted: false,
    demoDataLoaded: false
  };
}

function makeParameter(definition: (typeof BUILT_IN_PARAMETERS)[number]): ParameterDefinition {
  return { id: `parameter_${definition.key}`, ...createEntityTimestamps(), ...definition };
}

interface AppContextValue extends BackupData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTank: (input: Omit<Tank, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tank>;
  saveTank: (tank: Tank, expectedUpdatedAt: string) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  saveTargetRanges: (
    tankId: string,
    ranges: Array<Omit<TargetRange, 'id' | 'createdAt' | 'updatedAt' | 'tankId'>>,
    expectedVersions?: readonly Pick<TargetRange, 'id' | 'updatedAt'>[]
  ) => Promise<void>;
  addParameter: (
    input: Omit<ParameterDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<ParameterDefinition>;
  addReading: (
    input: Omit<WaterReading, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<WaterReading>;
  addBreedingLine: (
    input: Omit<BreedingLine, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<BreedingLine>;
  addBreedingEvent: (
    input: Omit<BreedingEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<BreedingEvent>;
  addCross: (input: Omit<Cross, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Cross>;
  deleteBreedingLine: (id: string) => Promise<void>;
  addMaintenance: (
    input: Omit<MaintenanceEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<MaintenanceEvent>;
  addReminder: (input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reminder>;
  toggleReminder: (id: string, completed: boolean) => Promise<void>;
  updateSettings: (
    changes: Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  exportBackup: () => Promise<string>;
  exportCsv: () => string;
  importBackup: (input: string) => Promise<void>;
  loadDemo: () => Promise<void>;
  deleteAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// One transaction serializes first-run initialization across StrictMode and tabs.
async function ensureDefaults() {
  await database.transaction('rw', database.tables, async () => {
    const repositories = createCrudRepositories(database);
    const existingKeys = new Set(
      (await database.parameterDefinitions.toArray()).map((parameter) => parameter.key)
    );
    const missingParameters = BUILT_IN_PARAMETERS.filter(
      (parameter) => !existingKeys.has(parameter.key)
    ).map(makeParameter);
    if (missingParameters.length) {
      await repositories.parameterDefinitions.bulkPut(missingParameters);
    }
    if (!(await database.settings.get(SETTINGS_ID)))
      await repositories.settings.put(makeDefaultSettings());
  });
}

async function clearUserRecordsPreservingPreferences() {
  await database.transaction('rw', database.tables, async () => {
    const currentSettings = await database.settings.get(SETTINGS_ID);
    await clearAllData(database);
    const repositories = createCrudRepositories(database);
    await repositories.parameterDefinitions.bulkPut(BUILT_IN_PARAMETERS.map(makeParameter));
    await repositories.settings.put({
      ...(currentSettings ?? makeDefaultSettings()),
      id: SETTINGS_ID,
      updatedAt: new Date().toISOString(),
      onboardingCompleted: false,
      demoDataLoaded: false
    });
  });
}

async function readSnapshot(): Promise<BackupData> {
  return database.transaction('r', database.tables, async () => ({
    tanks: await database.tanks.toArray(),
    waterReadings: await database.waterReadings.toArray(),
    parameterDefinitions: await database.parameterDefinitions.toArray(),
    targetRanges: await database.targetRanges.toArray(),
    maintenanceEvents: await database.maintenanceEvents.toArray(),
    breedingLines: await database.breedingLines.toArray(),
    breedingEvents: await database.breedingEvents.toArray(),
    crosses: await database.crosses.toArray(),
    reminders: await database.reminders.toArray(),
    settings: await database.settings.toArray()
  }));
}

function operationError(cause: unknown): string {
  return cause instanceof Error && cause.name === 'QuotaExceededError'
    ? 'errors.quota'
    : 'errors.storage';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BackupData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repos = useMemo(() => createCrudRepositories(database), []);

  const refresh = useCallback(async () => {
    setData(await readSnapshot());
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        await database.open();
        await ensureDefaults();
        if (!active) return;
        const subscription = liveQuery(readSnapshot).subscribe({
          next(next) {
            if (active) {
              setData(next);
              setError(null);
              setLoading(false);
            }
          },
          error(cause: unknown) {
            if (active) {
              setError(operationError(cause));
              setLoading(false);
            }
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (cause) {
        if (active) {
          setError(operationError(cause));
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const commit = useCallback(
    async (work: () => Promise<void>) => {
      try {
        setError(null);
        await work();
        await refresh();
      } catch (cause) {
        if (
          cause instanceof Error &&
          [
            'AbortError',
            'DatabaseClosedError',
            'InvalidStateError',
            'OpenFailedError',
            'QuotaExceededError',
            'UnknownError'
          ].includes(cause.name)
        ) {
          setError(operationError(cause));
        }
        throw cause;
      }
    },
    [refresh]
  );

  const value = useMemo<AppContextValue>(() => {
    const addTank = async (input: Omit<Tank, 'id' | 'createdAt' | 'updatedAt'>) => {
      const tank = { ...input, id: createStableId('tank'), ...createEntityTimestamps() };
      await commit(() => repos.tanks.add(tank).then(() => undefined));
      return tank;
    };
    const saveTank = (tank: Tank, expectedUpdatedAt: string) =>
      commit(() => repos.tanks.putIfUnchanged(tank, expectedUpdatedAt).then(() => undefined));
    const deleteTank = (id: string) => commit(() => deleteTankWithRelatedData(database, id));
    const saveTargetRanges = (
      tankId: string,
      ranges: Array<Omit<TargetRange, 'id' | 'createdAt' | 'updatedAt' | 'tankId'>>,
      expectedVersions?: readonly Pick<TargetRange, 'id' | 'updatedAt'>[]
    ) =>
      commit(async () => {
        const records = ranges.map((range) => ({
          ...range,
          id: createStableId('target'),
          ...createEntityTimestamps(),
          tankId
        }));
        await replaceTargetRanges(database, tankId, records, expectedVersions);
      });
    const addReading = async (input: Omit<WaterReading, 'id' | 'createdAt' | 'updatedAt'>) => {
      const reading = {
        ...input,
        id: createStableId('reading'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.waterReadings.add(reading).then(() => undefined));
      return reading;
    };
    const addParameter = async (
      input: Omit<ParameterDefinition, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const parameter = {
        ...input,
        id: createStableId('parameter'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.parameterDefinitions.add(parameter).then(() => undefined));
      return parameter;
    };
    const addBreedingLine = async (input: Omit<BreedingLine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const line = {
        ...input,
        id: createStableId('line'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.breedingLines.add(line).then(() => undefined));
      return line;
    };
    const addBreedingEvent = async (
      input: Omit<BreedingEvent, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const event = {
        ...input,
        id: createStableId('breeding'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.breedingEvents.add(event).then(() => undefined));
      return event;
    };
    const addCross = async (input: Omit<Cross, 'id' | 'createdAt' | 'updatedAt'>) => {
      const cross = { ...input, id: createStableId('cross'), ...createEntityTimestamps() };
      await commit(() => repos.crosses.add(cross).then(() => undefined));
      return cross;
    };
    const deleteBreedingLine = (id: string) =>
      commit(() => deleteBreedingLineWithRelatedData(database, id));
    const addMaintenance = async (
      input: Omit<MaintenanceEvent, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const event = {
        ...input,
        id: createStableId('maintenance'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.maintenanceEvents.add(event).then(() => undefined));
      return event;
    };
    const addReminder = async (input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => {
      const reminder = {
        ...input,
        id: createStableId('reminder'),
        ...createEntityTimestamps()
      };
      await commit(() => repos.reminders.add(reminder).then(() => undefined));
      return reminder;
    };
    const toggleReminder = (id: string, completed: boolean) =>
      commit(() => setReminderCompleted(database, id, completed).then(() => undefined));
    const updateSettings = (changes: Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>) =>
      commit(async () => {
        await repos.settings.update(SETTINGS_ID, changes);
      });
    const exportBackup = () =>
      serializeBackup(database, { appVersion: packageJson.version, pretty: true });
    const exportCsv = () =>
      exportWaterReadingsCsv(data.waterReadings, data.tanks, data.parameterDefinitions);
    const importBackup = (input: string) =>
      commit(() =>
        database.transaction('rw', database.tables, async () => {
          await restoreBackup(database, input);
          await ensureDefaults();
        })
      );
    const loadDemo = () =>
      commit(() => loadDemoData(database, { replaceExisting: true }).then(() => undefined));
    const deleteAll = () => commit(clearUserRecordsPreservingPreferences);

    return {
      ...data,
      loading,
      error,
      refresh,
      addTank,
      saveTank,
      deleteTank,
      saveTargetRanges,
      addParameter,
      addReading,
      addBreedingLine,
      addBreedingEvent,
      addCross,
      deleteBreedingLine,
      addMaintenance,
      addReminder,
      toggleReminder,
      updateSettings,
      exportBackup,
      exportCsv,
      importBackup,
      loadDemo,
      deleteAll
    };
  }, [commit, data, error, loading, refresh, repos]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
