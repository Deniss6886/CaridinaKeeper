import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  clearAllData,
  createCrudRepositories,
  database,
  deleteBreedingLineWithRelatedData,
  deleteTankWithRelatedData
} from '../data/database';
import { exportWaterReadingsCsv, restoreBackup, serializeBackup } from '../data/backup';
import { createDemoData, loadDemoData } from '../data/demoData';
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
    locale: 'en',
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
  saveTank: (tank: Tank) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  saveTargetRanges: (
    tankId: string,
    ranges: Array<Omit<TargetRange, 'id' | 'createdAt' | 'updatedAt' | 'tankId'>>
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BackupData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repos = useMemo(() => createCrudRepositories(database), []);

  const refresh = useCallback(async () => {
    setError(null);
    const next: BackupData = {
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
    };
    setData(next);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await database.open();
        if ((await database.parameterDefinitions.count()) === 0) {
          await database.parameterDefinitions.bulkAdd(BUILT_IN_PARAMETERS.map(makeParameter));
        }
        if ((await database.settings.count()) === 0)
          await database.settings.add(makeDefaultSettings());
        if (active) await refresh();
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Unable to open local database.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const commit = useCallback(
    async (work: () => Promise<void>) => {
      try {
        setError(null);
        await work();
        await refresh();
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Local operation failed.';
        setError(message);
        throw cause;
      }
    },
    [refresh]
  );

  const value = useMemo<AppContextValue>(() => {
    const addTank = async (input: Omit<Tank, 'id' | 'createdAt' | 'updatedAt'>) => {
      const tank = { id: createStableId('tank'), ...createEntityTimestamps(), ...input };
      await commit(() => repos.tanks.add(tank).then(() => undefined));
      return tank;
    };
    const saveTank = (tank: Tank) => commit(() => repos.tanks.put(tank).then(() => undefined));
    const deleteTank = (id: string) => commit(() => deleteTankWithRelatedData(database, id));
    const saveTargetRanges = (
      tankId: string,
      ranges: Array<Omit<TargetRange, 'id' | 'createdAt' | 'updatedAt' | 'tankId'>>
    ) =>
      commit(async () => {
        await database.transaction('rw', database.targetRanges, async () => {
          await database.targetRanges.where('tankId').equals(tankId).delete();
          const records = ranges.map((range) => ({
            id: createStableId('target'),
            ...createEntityTimestamps(),
            tankId,
            ...range
          }));
          if (records.length) await database.targetRanges.bulkAdd(records);
        });
      });
    const addReading = async (input: Omit<WaterReading, 'id' | 'createdAt' | 'updatedAt'>) => {
      const reading = {
        id: createStableId('reading'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.waterReadings.add(reading).then(() => undefined));
      return reading;
    };
    const addParameter = async (
      input: Omit<ParameterDefinition, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const parameter = {
        id: createStableId('parameter'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.parameterDefinitions.add(parameter).then(() => undefined));
      return parameter;
    };
    const addBreedingLine = async (input: Omit<BreedingLine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const line = {
        id: createStableId('line'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.breedingLines.add(line).then(() => undefined));
      return line;
    };
    const addBreedingEvent = async (
      input: Omit<BreedingEvent, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const event = {
        id: createStableId('breeding'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.breedingEvents.add(event).then(() => undefined));
      return event;
    };
    const addCross = async (input: Omit<Cross, 'id' | 'createdAt' | 'updatedAt'>) => {
      const cross = { id: createStableId('cross'), ...createEntityTimestamps(), ...input };
      await commit(() => repos.crosses.add(cross).then(() => undefined));
      return cross;
    };
    const deleteBreedingLine = (id: string) =>
      commit(() => deleteBreedingLineWithRelatedData(database, id));
    const addMaintenance = async (
      input: Omit<MaintenanceEvent, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const event = {
        id: createStableId('maintenance'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.maintenanceEvents.add(event).then(() => undefined));
      return event;
    };
    const addReminder = async (input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => {
      const reminder = {
        id: createStableId('reminder'),
        ...createEntityTimestamps(),
        ...input
      };
      await commit(() => repos.reminders.add(reminder).then(() => undefined));
      return reminder;
    };
    const toggleReminder = (id: string, completed: boolean) =>
      commit(async () => {
        const current = await database.reminders.get(id);
        if (!current) throw new Error('Reminder not found.');
        await database.reminders.put({
          ...current,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        });
      });
    const updateSettings = (changes: Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>) =>
      commit(async () => {
        const current = (await database.settings.get(SETTINGS_ID)) ?? makeDefaultSettings();
        await database.settings.put({
          ...current,
          ...changes,
          id: SETTINGS_ID,
          updatedAt: new Date().toISOString()
        });
      });
    const exportBackup = () => serializeBackup(database, { pretty: true });
    const exportCsv = () =>
      exportWaterReadingsCsv(data.waterReadings, data.tanks, data.parameterDefinitions);
    const importBackup = (input: string) =>
      commit(() => restoreBackup(database, input).then(() => undefined));
    const loadDemo = () =>
      commit(() => loadDemoData(database, { replaceExisting: true }).then(() => undefined));
    const deleteAll = () => commit(() => clearAllData(database));

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

export function createBlankDemoData(): BackupData {
  return createDemoData();
}
