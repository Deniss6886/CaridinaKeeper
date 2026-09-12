import { expect, test } from '@playwright/test';

test('completes the core keeper journey and round-trips a backup', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The full form journey runs once on desktop.');

  await page.goto('/#/tanks');
  await page.getByRole('button', { name: 'New tank' }).first().click();
  await page.getByLabel('Tank name').fill('Acceptance Tank');
  await page.getByLabel('Volume (L)').fill('30');
  await page.getByLabel('Start date').fill('2026-09-01');
  await page.getByLabel('Species').fill('Caridina cantonensis');
  await page.getByLabel('Variant').fill('Crystal Red');
  await page.getByRole('button', { name: 'Save' }).last().click();
  await expect(page.getByText('Acceptance Tank').first()).toBeVisible();

  await page.getByLabel('Temperature minimum').fill('20');
  await page.getByLabel('Temperature maximum').fill('23');
  await page.getByRole('button', { name: 'Save ranges' }).click();

  await page.goto('/#/water');
  await page.getByRole('button', { name: 'Add measurement' }).click();
  const waterDialog = page.locator('dialog[open]');
  await waterDialog.getByLabel('Tank').selectOption({ label: 'Acceptance Tank' });
  await waterDialog.getByLabel('Parameter').selectOption({ label: 'Temperature · °C' });
  await waterDialog.getByLabel('Value').fill('21.5');
  await waterDialog.getByLabel('Method').fill('calibrated thermometer');
  await waterDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('21.5')).toBeVisible();

  await page.goto('/#/breeding');
  await page.getByRole('button', { name: 'Add line' }).first().click();
  let breedingDialog = page.locator('dialog[open]');
  await breedingDialog.getByLabel('Line name').fill('Acceptance Line');
  await breedingDialog.getByLabel('Species').fill('Caridina cantonensis');
  await breedingDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Acceptance Line').first()).toBeVisible();
  await page.getByRole('button', { name: 'Log event' }).first().click();
  breedingDialog = page.locator('dialog[open]');
  await breedingDialog.getByLabel('Line name').selectOption({ label: 'Acceptance Line' });
  await breedingDialog.getByRole('button', { name: 'Save' }).click();

  await page.goto('/#/care');
  await page.getByRole('button', { name: 'Log care' }).first().click();
  const careDialog = page.locator('dialog[open]');
  await careDialog.getByLabel('Tank').selectOption({ label: 'Acceptance Tank' });
  await careDialog.getByRole('button', { name: 'Save' }).click();

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export full JSON backup' }).click();
  const backupDownload = await downloadPromise;
  const backupPath = await backupDownload.path();
  expect(backupPath).toBeTruthy();
  await page.getByRole('button', { name: 'Delete all local records' }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByText('Backup restored successfully.')).toBeVisible();
  await page.goto('/#/tanks');
  await expect(page.getByText('Acceptance Tank').first()).toBeVisible();
});
