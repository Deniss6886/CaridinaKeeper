import { expect, test } from '@playwright/test';
import { gotoRoute } from './helpers';

test('capture release screenshots', async ({ page }, testInfo) => {
  await gotoRoute(page);
  await page.getByRole('button', { name: /explore demo|demo ansehen/i }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: /load demo data|demodaten laden/i }).click();
  await expect(page.getByText(/crystal red|blue bolt/i).first()).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true });
    return;
  }

  await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
  await gotoRoute(page, '/tanks');
  await expect(page.getByText(/tanks|becken/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/tanks-desktop.png', fullPage: true });
  await gotoRoute(page, '/water');
  await expect(page.getByText(/water measurements|wasserwerte/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/water-desktop.png', fullPage: true });
});
