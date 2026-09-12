import {
  BACKUP_FORMAT,
  DATABASE_SCHEMA_VERSION,
  SETTINGS_ID,
  type BackupData,
  type BackupSchema,
  type EntityRecord,
  type ParameterDefinition,
  type TargetRange,
  type WaterReading
} from '../domain/models';
import type { CaridinaKeeperDatabase } from './database';
import { restoreBackup, validateBackup } from './backup';

export const DEMO_DATA_MARKER = 'DEMO ·';
const CREATED_AT = '2026-09-01T12:00:00.000Z';
const UPDATED_AT = '2026-09-11T18:00:00.000Z';

const entity = (id: string): EntityRecord => ({
  id,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  isDemo: true
});

const parameters: ParameterDefinition[] = [
  {
    ...entity('parameter_temperature'),
    key: 'temperature',
    name: 'Temperatur',
    unit: '°C',
    description: 'Wassertemperatur',
    precision: 1,
    sortOrder: 10,
    isBuiltIn: true
  },
  {
    ...entity('parameter_ph'),
    key: 'ph',
    name: 'pH-Wert',
    unit: 'pH',
    precision: 1,
    sortOrder: 20,
    isBuiltIn: true
  },
  {
    ...entity('parameter_gh'),
    key: 'gh',
    name: 'Gesamthärte',
    unit: '°dGH',
    precision: 0,
    sortOrder: 30,
    isBuiltIn: true
  },
  {
    ...entity('parameter_kh'),
    key: 'kh',
    name: 'Karbonathärte',
    unit: '°dKH',
    precision: 0,
    sortOrder: 40,
    isBuiltIn: true
  },
  {
    ...entity('parameter_tds'),
    key: 'tds',
    name: 'Leitwert/TDS',
    unit: 'ppm',
    precision: 0,
    sortOrder: 50,
    isBuiltIn: true
  },
  {
    ...entity('parameter_nitrate'),
    key: 'nitrate',
    name: 'Nitrat',
    unit: 'mg/L',
    precision: 1,
    sortOrder: 60,
    isBuiltIn: true
  },
  {
    ...entity('parameter_nitrite'),
    key: 'nitrite',
    name: 'Nitrit',
    unit: 'mg/L',
    precision: 2,
    sortOrder: 70,
    isBuiltIn: true
  }
];

const parameterByKey = new Map(parameters.map((parameter) => [parameter.key, parameter]));

function parameterId(key: string): string {
  const definition = parameterByKey.get(key);
  if (!definition) throw new Error(`Unknown demo parameter: ${key}`);
  return definition.id;
}

function range(
  tankId: string,
  parameterKey: string,
  minimum: number,
  maximum: number,
  warningMinimum?: number,
  warningMaximum?: number
): TargetRange {
  return {
    ...entity(`target_${tankId.replace('tank_demo_', '')}_${parameterKey}`),
    tankId,
    parameterId: parameterId(parameterKey),
    minimum,
    maximum,
    warningMinimum,
    warningMaximum
  };
}

function reading(
  tankId: string,
  parameterKey: string,
  value: number,
  measuredAt: string,
  suffix: string,
  note?: string,
  method?: string,
  uncertainty?: number
): WaterReading {
  const definition = parameterByKey.get(parameterKey);
  if (!definition) throw new Error(`Unknown demo parameter: ${parameterKey}`);
  return {
    ...entity(`reading_${tankId.replace('tank_demo_', '')}_${parameterKey}_${suffix}`),
    tankId,
    parameterId: definition.id,
    value,
    unit: definition.unit,
    measuredAt,
    method,
    uncertainty,
    note
  };
}

export function createDemoData(): BackupData {
  const tanks: BackupData['tanks'] = [
    {
      ...entity('tank_demo_crystal_red'),
      name: `${DEMO_DATA_MARKER} Crystal Red 30 l`,
      volumeLiters: 30,
      dimensions: { lengthCm: 40, widthCm: 25, heightCm: 30 },
      startDate: '2025-11-15',
      description: 'Beispielbecken mit aktivem Soil und weichem Osmosewasser.',
      soil: 'Aktiver Shrimp Soil',
      soilInstalledAt: '2025-11-15',
      filterType: 'Doppel-Schwammfilter',
      targetTemperature: 21.5,
      notes: 'DEMO-DATEN – können jederzeit durch ein Backup ersetzt werden.',
      inhabitants: [
        {
          id: 'inhabitant_demo_crystal_red',
          species: 'Caridina logemanni',
          variant: 'Crystal Red',
          count: 34,
          notes: 'Gemischte Altersstruktur'
        }
      ],
      breedingLineId: 'line_demo_crystal_red'
    },
    {
      ...entity('tank_demo_blue_bolt'),
      name: `${DEMO_DATA_MARKER} Blue Bolt 45 l`,
      volumeLiters: 45,
      dimensions: { lengthCm: 45, widthCm: 30, heightCm: 34 },
      startDate: '2026-02-10',
      description: 'Beispiel-Zuchtbecken für eine Taiwan-Bee-Linie.',
      soil: 'Aktiver Shrimp Soil',
      soilInstalledAt: '2026-02-10',
      filterType: 'Bodenfilter plus Schwammfilter',
      targetTemperature: 21,
      notes: 'DEMO-DATEN – der erhöhte TDS-Wert demonstriert eine Warnung.',
      inhabitants: [
        {
          id: 'inhabitant_demo_blue_bolt',
          species: 'Caridina cantonensis',
          variant: 'Blue Bolt',
          count: 22
        }
      ],
      breedingLineId: 'line_demo_blue_bolt'
    },
    {
      ...entity('tank_demo_oebt'),
      name: `${DEMO_DATA_MARKER} Orange Eye Blue Tiger 54 l`,
      volumeLiters: 54,
      dimensions: { lengthCm: 60, widthCm: 30, heightCm: 30 },
      startDate: '2025-08-20',
      description: 'Beispielbecken mit etwas härterem Wasser für Tigergarnelen.',
      soil: 'Neutraler dunkler Bodengrund',
      soilInstalledAt: '2025-08-20',
      filterType: 'Hamburger Mattenfilter',
      targetTemperature: 22.5,
      notes: 'DEMO-DATEN – ein absichtlich hoher pH-Wert zeigt den kritischen Status.',
      inhabitants: [
        {
          id: 'inhabitant_demo_oebt',
          species: 'Caridina mariae',
          variant: 'Orange Eye Blue Tiger',
          count: 28
        }
      ],
      breedingLineId: 'line_demo_oebt'
    }
  ];

  const breedingLines: BackupData['breedingLines'] = [
    {
      ...entity('line_demo_crystal_red'),
      name: `${DEMO_DATA_MARKER} Crystal Red Stamm`,
      species: 'Caridina logemanni',
      variant: 'Crystal Red',
      color: 'Rot/Weiß',
      orangeEye: false,
      generation: 'F6',
      origin: 'Lokale Nachzucht (fiktives DEMO-Beispiel)',
      purchaseDate: '2025-11-01',
      count: 34,
      sex: 'gemischt',
      price: 136,
      notes: 'DEMO-DATEN – keine echte Herkunfts- oder Preisangabe.'
    },
    {
      ...entity('line_demo_blue_bolt'),
      name: `${DEMO_DATA_MARKER} Blue Bolt Stamm`,
      species: 'Caridina cantonensis',
      variant: 'Blue Bolt',
      color: 'Blau',
      orangeEye: false,
      generation: 'F4',
      origin: 'Privatzüchter (fiktives DEMO-Beispiel)',
      purchaseDate: '2026-01-28',
      count: 22,
      sex: 'gemischt',
      price: 198,
      notes: 'DEMO-DATEN – selektiert auf deckendes Blau.'
    },
    {
      ...entity('line_demo_red_wine'),
      name: `${DEMO_DATA_MARKER} Red Wine Stamm`,
      species: 'Caridina cantonensis',
      variant: 'Red Wine',
      color: 'Dunkelrot/Weiß',
      orangeEye: false,
      generation: 'F5',
      origin: 'Tauschgruppe (fiktives DEMO-Beispiel)',
      purchaseDate: '2026-03-14',
      count: 12,
      sex: 'gemischt',
      price: 96,
      notes: 'DEMO-Elterntierlinie für das Beispielkreuzungsprojekt.'
    },
    {
      ...entity('line_demo_oebt'),
      name: `${DEMO_DATA_MARKER} OEBT Stamm`,
      species: 'Caridina mariae',
      variant: 'Orange Eye Blue Tiger',
      color: 'Blau/Schwarz',
      orangeEye: true,
      generation: 'F8',
      origin: 'Eigene Selektion (fiktives DEMO-Beispiel)',
      purchaseDate: '2025-08-01',
      count: 28,
      sex: 'gemischt',
      price: 224,
      notes: 'DEMO-DATEN – Orange-Eye-Merkmal ist markiert.'
    }
  ];

  const targetRanges: BackupData['targetRanges'] = [
    range('tank_demo_crystal_red', 'temperature', 20, 23, 18, 25),
    range('tank_demo_crystal_red', 'ph', 5.8, 6.5, 5.5, 6.8),
    range('tank_demo_crystal_red', 'gh', 4, 6, 3, 7),
    range('tank_demo_crystal_red', 'kh', 0, 1, 0, 2),
    range('tank_demo_crystal_red', 'tds', 100, 150, 80, 180),
    range('tank_demo_crystal_red', 'nitrate', 0, 10, 0, 20),
    range('tank_demo_crystal_red', 'nitrite', 0, 0, 0, 0.05),
    range('tank_demo_blue_bolt', 'temperature', 20, 22, 18, 24),
    range('tank_demo_blue_bolt', 'ph', 5.5, 6.2, 5.2, 6.6),
    range('tank_demo_blue_bolt', 'gh', 4, 6, 3, 7),
    range('tank_demo_blue_bolt', 'kh', 0, 1, 0, 2),
    range('tank_demo_blue_bolt', 'tds', 100, 140, 80, 160),
    range('tank_demo_blue_bolt', 'nitrate', 0, 10, 0, 20),
    range('tank_demo_blue_bolt', 'nitrite', 0, 0, 0, 0.05),
    range('tank_demo_oebt', 'temperature', 21, 24, 19, 26),
    range('tank_demo_oebt', 'ph', 6.5, 7.2, 6.2, 7.5),
    range('tank_demo_oebt', 'gh', 6, 8, 5, 10),
    range('tank_demo_oebt', 'kh', 1, 3, 0, 5),
    range('tank_demo_oebt', 'tds', 160, 220, 130, 250),
    range('tank_demo_oebt', 'nitrate', 0, 15, 0, 25),
    range('tank_demo_oebt', 'nitrite', 0, 0, 0, 0.05)
  ];

  const firstMeasurement = '2026-09-08T18:00:00.000Z';
  const latestMeasurement = '2026-09-11T18:00:00.000Z';
  const waterReadings: BackupData['waterReadings'] = [
    reading(
      'tank_demo_crystal_red',
      'temperature',
      21.6,
      firstMeasurement,
      '01',
      undefined,
      'Digitalthermometer',
      0.2
    ),
    reading('tank_demo_crystal_red', 'ph', 6.1, firstMeasurement, '01'),
    reading('tank_demo_crystal_red', 'gh', 5, latestMeasurement, '02'),
    reading('tank_demo_crystal_red', 'kh', 0, latestMeasurement, '02'),
    reading('tank_demo_crystal_red', 'tds', 132, latestMeasurement, '02'),
    reading(
      'tank_demo_crystal_red',
      'nitrate',
      14,
      latestMeasurement,
      '02',
      'DEMO: leicht oberhalb des Zielbereichs'
    ),
    reading('tank_demo_crystal_red', 'nitrite', 0, latestMeasurement, '02'),
    reading('tank_demo_blue_bolt', 'temperature', 21.1, firstMeasurement, '01'),
    reading('tank_demo_blue_bolt', 'ph', 5.9, latestMeasurement, '02'),
    reading('tank_demo_blue_bolt', 'gh', 5, latestMeasurement, '02'),
    reading('tank_demo_blue_bolt', 'kh', 0, latestMeasurement, '02'),
    reading(
      'tank_demo_blue_bolt',
      'tds',
      150,
      latestMeasurement,
      '02',
      'DEMO: Warnbereich, Mineralisierung prüfen'
    ),
    reading('tank_demo_blue_bolt', 'nitrate', 6, latestMeasurement, '02'),
    reading('tank_demo_blue_bolt', 'nitrite', 0, latestMeasurement, '02'),
    reading('tank_demo_oebt', 'temperature', 22.8, firstMeasurement, '01'),
    reading(
      'tank_demo_oebt',
      'ph',
      7.6,
      latestMeasurement,
      '02',
      'DEMO: absichtlich kritischer Beispielwert'
    ),
    reading('tank_demo_oebt', 'gh', 7, latestMeasurement, '02'),
    reading('tank_demo_oebt', 'kh', 2, latestMeasurement, '02'),
    reading('tank_demo_oebt', 'tds', 188, latestMeasurement, '02'),
    reading('tank_demo_oebt', 'nitrate', 8, latestMeasurement, '02'),
    reading('tank_demo_oebt', 'nitrite', 0, latestMeasurement, '02')
  ];

  return {
    tanks,
    waterReadings,
    parameterDefinitions: parameters.map((parameter) => ({ ...parameter })),
    targetRanges,
    maintenanceEvents: [
      {
        ...entity('maintenance_demo_crystal_water'),
        tankId: 'tank_demo_crystal_red',
        type: 'water_change',
        performedAt: '2026-09-09T17:30:00.000Z',
        amount: 6,
        unit: 'L',
        waterChangePercent: 20,
        note: 'DEMO: remineralisiertes Osmosewasser'
      },
      {
        ...entity('maintenance_demo_blue_feed'),
        tankId: 'tank_demo_blue_bolt',
        type: 'feed',
        performedAt: '2026-09-10T17:00:00.000Z',
        amount: 0.15,
        unit: 'g',
        note: 'DEMO: Brennnessel-Stick, Reste nach zwei Stunden entfernt'
      },
      {
        ...entity('maintenance_demo_oebt_filter'),
        tankId: 'tank_demo_oebt',
        type: 'filter_clean',
        performedAt: '2026-09-06T10:15:00.000Z',
        note: 'DEMO: Matte vorsichtig in Beckenwasser ausgedrückt'
      }
    ],
    breedingLines,
    breedingEvents: [
      {
        ...entity('breeding_demo_crystal_berried'),
        breedingLineId: 'line_demo_crystal_red',
        tankId: 'tank_demo_crystal_red',
        type: 'berried',
        occurredAt: '2026-09-04T19:00:00.000Z',
        count: 2,
        note: 'DEMO: zwei tragende Weibchen beobachtet'
      },
      {
        ...entity('breeding_demo_blue_juveniles'),
        breedingLineId: 'line_demo_blue_bolt',
        tankId: 'tank_demo_blue_bolt',
        type: 'juveniles',
        occurredAt: '2026-09-07T18:20:00.000Z',
        count: 11,
        note: 'DEMO: erste Jungtiere sichtbar'
      },
      {
        ...entity('breeding_demo_oebt_selection'),
        breedingLineId: 'line_demo_oebt',
        tankId: 'tank_demo_oebt',
        type: 'selection',
        occurredAt: '2026-09-02T16:00:00.000Z',
        count: 4,
        note: 'DEMO: Tiere mit schwacher Zeichnung separat gesetzt'
      }
    ],
    crosses: [
      {
        ...entity('cross_demo_blue_red'),
        name: `${DEMO_DATA_MARKER} Blue Bolt × Red Wine`,
        parentLineIds: ['line_demo_blue_bolt', 'line_demo_red_wine'],
        generation: 'F1',
        selectionGoal: 'Dichte Blauanteile mit klarer weißer Zeichnung beobachten.',
        notes: 'DEMO-Kreuzung – rein illustrativ, keine dokumentierte reale Verpaarung.',
        tankId: 'tank_demo_blue_bolt'
      }
    ],
    reminders: [
      {
        ...entity('reminder_demo_crystal_water'),
        tankId: 'tank_demo_crystal_red',
        title: `${DEMO_DATA_MARKER} Wasserwechsel`,
        description: '20 % mit aufbereitetem Osmosewasser.',
        dueAt: '2026-09-16T17:30:00.000Z',
        repeat: 'weekly',
        completed: false
      },
      {
        ...entity('reminder_demo_blue_measure'),
        tankId: 'tank_demo_blue_bolt',
        title: `${DEMO_DATA_MARKER} TDS nachmessen`,
        description: 'Erhöhten Beispielwert kontrollieren.',
        dueAt: '2026-09-13T18:00:00.000Z',
        repeat: 'none',
        completed: false
      },
      {
        ...entity('reminder_demo_oebt_ph'),
        tankId: 'tank_demo_oebt',
        title: `${DEMO_DATA_MARKER} pH gegenprüfen`,
        description: 'Test mit kalibrierter Elektrode wiederholen.',
        dueAt: '2026-09-12T18:00:00.000Z',
        repeat: 'none',
        completed: false
      }
    ],
    settings: [
      {
        ...entity(SETTINGS_ID),
        id: SETTINGS_ID,
        locale: 'de-DE',
        theme: 'system',
        reducedMotion: false,
        defaultWaterChangePercent: 20,
        onboardingCompleted: true,
        demoDataLoaded: true
      }
    ]
  };
}

export function createDemoBackup(): BackupSchema {
  return validateBackup({
    format: BACKUP_FORMAT,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    appVersion: '0.1.0-demo',
    exportedAt: UPDATED_AT,
    data: createDemoData()
  });
}

/** Refuse to mix demo and user records unless replacement was explicitly requested. */
export async function loadDemoData(
  owner: CaridinaKeeperDatabase,
  options: { replaceExisting?: boolean } = {}
): Promise<BackupSchema> {
  const existingRecordCount = await owner.transaction('r', owner.tables, async () => {
    let count = 0;
    for (const table of owner.tables) count += await table.count();
    return count;
  });
  if (existingRecordCount > 0 && options.replaceExisting !== true) {
    throw new Error(
      'Database is not empty. Explicitly request replacement before loading demo data.'
    );
  }
  return restoreBackup(owner, createDemoBackup());
}
