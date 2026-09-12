import { expect, test } from '@playwright/test';
import {
  addBreedingLine,
  addMaintenance,
  addReminder,
  addTank,
  addWaterReading,
  gotoRoute,
  inputDate,
  inputDateTime,
  openDialog,
  setTargetRange
} from './helpers';

test('completes the keeper journey and atomically round-trips a backup', async ({ page }) => {
  await gotoRoute(page, '/tanks');
  await addTank(page, {
    name: 'Acceptance Tank',
    volume: '30,5',
    length: '40',
    width: '25',
    height: '30',
    startDate: inputDate(-30),
    soil: 'Active soil',
    soilInstalledAt: inputDate(-30),
    filter: 'Sponge filter',
    targetTemperature: '22,5',
    species: 'Caridina cantonensis',
    variant: 'Crystal Red',
    residents: '12',
    description: 'Acceptance journey',
    notes: 'Stored only in this browser'
  });
  await setTargetRange(page, 'Acceptance Tank', 'Temperature', '20', '23');

  await gotoRoute(page, '/water');
  await addWaterReading(page, {
    tank: 'Acceptance Tank',
    parameter: 'Temperature',
    value: '21,5',
    measuredAt: inputDateTime(10),
    method: 'Calibrated thermometer',
    uncertainty: '0,2',
    note: 'Before feeding'
  });
  await expect(page.getByText(/21[,.]5/).first()).toBeVisible();

  await gotoRoute(page, '/breeding');
  await addBreedingLine(page, {
    name: 'Acceptance Line',
    species: 'Caridina cantonensis',
    variant: 'Crystal Red',
    count: '12'
  });
  await page.getByRole('button', { name: 'Log event', exact: true }).first().click();
  const breedingDialog = openDialog(page);
  await breedingDialog.getByLabel('Line name').selectOption({ label: 'Acceptance Line' });
  await breedingDialog.getByLabel('Quantity').fill('3');
  await breedingDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(breedingDialog).not.toBeVisible();

  await gotoRoute(page, '/care');
  await addMaintenance(page, {
    tank: 'Acceptance Tank',
    type: 'water_change',
    amount: '6,1',
    unit: 'L',
    percentage: '20',
    note: 'Routine change'
  });
  await addReminder(page, {
    title: 'Inspect moss',
    tank: 'Acceptance Tank',
    dueAt: inputDate()
  });

  await gotoRoute(page, '/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export full JSON backup' }).click();
  const backupDownload = await downloadPromise;
  const backupPath = await backupDownload.path();
  if (!backupPath) throw new Error('The browser did not provide a backup path.');

  await page.getByRole('button', { name: 'Delete all local records' }).click();
  await openDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await gotoRoute(page, '/tanks');
  await expect(page.getByText('Acceptance Tank', { exact: true })).toHaveCount(0);

  await gotoRoute(page, '/settings');
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  const restoreDialog = openDialog(page);
  await expect(restoreDialog).toContainText('Backup created:');
  await expect(restoreDialog).toContainText('1');
  await restoreDialog.getByRole('button', { name: 'Restore backup' }).click();
  await expect(restoreDialog).not.toBeVisible();
  await expect(page.getByText('Backup restored successfully.')).toBeVisible();

  await page.reload();
  await gotoRoute(page, '/tanks');
  await expect(page.getByText('Acceptance Tank', { exact: true }).first()).toBeVisible();
  await gotoRoute(page, '/care');
  await expect(page.getByText('Inspect moss', { exact: true })).toBeVisible();
});

test('rejects an invalid backup without replacing current records', async ({ page }) => {
  await gotoRoute(page, '/tanks');
  await addTank(page, {
    name: 'Must Survive',
    volume: '20',
    length: '',
    width: '',
    height: '',
    startDate: inputDate(),
    soil: '',
    soilInstalledAt: '',
    filter: '',
    targetTemperature: '',
    species: '',
    variant: '',
    residents: '0',
    description: '',
    notes: ''
  });
  await gotoRoute(page, '/settings');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"CaridinaKeeper","format":"tampered"}')
  });
  await expect(page.getByText('This backup is invalid and no data was changed.')).toBeVisible();
  await expect(openDialog(page)).toHaveCount(0);
  await gotoRoute(page, '/tanks');
  await expect(page.getByText('Must Survive', { exact: true }).first()).toBeVisible();
});
