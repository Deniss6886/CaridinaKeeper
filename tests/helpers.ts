import { expect, type Download, type Locator, type Page } from '@playwright/test';

export interface TankInput {
  name: string;
  volume: string;
  length: string;
  width: string;
  height: string;
  startDate: string;
  soil: string;
  soilInstalledAt: string;
  filter: string;
  targetTemperature: string;
  species: string;
  variant: string;
  residents: string;
  description: string;
  notes: string;
}

export async function gotoRoute(page: Page, route = '/'): Promise<void> {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  await page.goto(`./#${normalized}`);
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export function inputDate(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function inputDateTime(hour: number, minute = 0): string {
  return `${inputDate()}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function openDialog(page: Page): Locator {
  return page.locator('dialog[open]');
}

async function submitWithKeyboard(locator: Locator): Promise<void> {
  await locator.press('Enter');
}

export async function selectOptionByText(select: Locator, text: string | RegExp): Promise<void> {
  const option = select.locator('option').filter({ hasText: text }).first();
  const value = await option.getAttribute('value');
  if (value === null) throw new Error(`Option not found: ${String(text)}`);
  await select.selectOption(value);
}

export async function addTank(page: Page, input: TankInput): Promise<void> {
  await page.getByRole('button', { name: 'New tank', exact: true }).first().click();
  const dialog = openDialog(page);
  await expect(dialog).toContainText('New tank');
  await dialog.getByLabel('Tank name').fill(input.name);
  await dialog.getByLabel('Volume (L)').fill(input.volume);
  await dialog.getByLabel('Start date').fill(input.startDate);
  await dialog.getByLabel('Length').fill(input.length);
  await dialog.getByLabel('Width').fill(input.width);
  await dialog.getByLabel('Height').fill(input.height);
  await dialog.getByLabel('Temperature target (°C)').fill(input.targetTemperature);
  await dialog.getByLabel('Soil', { exact: true }).fill(input.soil);
  await dialog.getByLabel('Soil installed').fill(input.soilInstalledAt);
  await dialog.getByLabel('Filter type').fill(input.filter);
  await dialog.getByLabel('Species').fill(input.species);
  await dialog.getByLabel('Variant').fill(input.variant);
  await dialog.getByLabel('Residents').fill(input.residents);
  await dialog.getByLabel('Description').fill(input.description);
  await dialog.getByLabel('Private notes').fill(input.notes);
  await submitWithKeyboard(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(input.name, { exact: true }).first()).toBeVisible();
}

export async function selectTank(page: Page, name: string): Promise<void> {
  const card = page.locator('button.tank-card').filter({ hasText: name }).first();
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
}

export async function setTargetRange(
  page: Page,
  tankName: string,
  parameterName: string,
  minimum: string,
  maximum: string
): Promise<void> {
  await selectTank(page, tankName);
  await page.getByLabel(new RegExp(`^${parameterName} minimum$`, 'i')).fill(minimum);
  await page.getByLabel(new RegExp(`^${parameterName} maximum$`, 'i')).fill(maximum);
  await page.getByRole('button', { name: 'Save ranges', exact: true }).click();
  await expect(page.getByLabel(new RegExp(`^${parameterName} minimum$`, 'i'))).toHaveValue(minimum);
  await expect(page.getByLabel(new RegExp(`^${parameterName} maximum$`, 'i'))).toHaveValue(maximum);
}

export async function addWaterReading(
  page: Page,
  input: {
    tank: string;
    parameter: string;
    value: string;
    measuredAt: string;
    method?: string;
    uncertainty?: string;
    note?: string;
  }
): Promise<void> {
  await page.getByRole('button', { name: 'Add measurement', exact: true }).click();
  const dialog = openDialog(page);
  await selectOptionByText(dialog.getByLabel('Tank'), input.tank);
  await selectOptionByText(dialog.getByLabel('Parameter'), input.parameter);
  await dialog.getByLabel('Value').fill(input.value);
  await dialog.getByLabel('Measured at').fill(input.measuredAt);
  if (input.method) await dialog.getByLabel('Method / instrument').fill(input.method);
  if (input.uncertainty) await dialog.getByLabel('Uncertainty').fill(input.uncertainty);
  if (input.note) await dialog.getByLabel('Note').fill(input.note);
  await submitWithKeyboard(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(dialog).not.toBeVisible();
}

export async function addBreedingLine(
  page: Page,
  input: { name: string; species: string; variant: string; count: string }
): Promise<void> {
  await page.getByRole('button', { name: 'Add line', exact: true }).first().click();
  const dialog = openDialog(page);
  await dialog.getByLabel('Line name').fill(input.name);
  await dialog.getByLabel('Species').fill(input.species);
  await dialog.getByLabel('Variant').fill(input.variant);
  await dialog.getByLabel('Count').fill(input.count);
  await submitWithKeyboard(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(input.name, { exact: true }).first()).toBeVisible();
}

export async function addMaintenance(
  page: Page,
  input: {
    tank: string;
    type: 'water_change' | 'filter_clean';
    amount?: string;
    unit?: string;
    percentage?: string;
    note: string;
  }
): Promise<void> {
  await page.getByRole('button', { name: 'Log care', exact: true }).first().click();
  const dialog = openDialog(page);
  await selectOptionByText(dialog.getByLabel('Tank'), input.tank);
  await dialog.getByLabel('Care type').selectOption(input.type);
  await dialog.getByLabel('Date').fill(inputDate());
  if (input.amount) await dialog.getByLabel('Amount / volume').fill(input.amount);
  if (input.unit !== undefined) await dialog.getByLabel('Unit').fill(input.unit);
  if (input.percentage) await dialog.getByLabel('Water change (%)').fill(input.percentage);
  await dialog.getByLabel('Note').fill(input.note);
  await submitWithKeyboard(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(dialog).not.toBeVisible();
}

export async function addReminder(
  page: Page,
  input: { title: string; tank: string; dueAt: string }
): Promise<void> {
  await page.getByRole('button', { name: 'Add reminder', exact: true }).first().click();
  const dialog = openDialog(page);
  await dialog.getByLabel('Task title').fill(input.title);
  await selectOptionByText(dialog.getByLabel('Tank'), input.tank);
  await dialog.getByLabel('Due date').fill(input.dueAt);
  await dialog.getByLabel('Note').fill('Weekly visual inspection');
  await submitWithKeyboard(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(input.title, { exact: true })).toBeVisible();
}

export async function loadDemoData(page: Page): Promise<void> {
  await gotoRoute(page, '/settings');
  await page.getByRole('button', { name: /replace with labelled demo data/i }).click();
  const dialog = openDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Load demo data' }).click();
  await expect(dialog).not.toBeVisible();
  await gotoRoute(page, '/tanks');
  await expect(page.getByText(/Crystal Red 30 l/i).first()).toBeVisible();
}

export async function downloadAsText(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error(`No stream for download ${download.suggestedFilename()}`);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks).toString('utf8');
}
