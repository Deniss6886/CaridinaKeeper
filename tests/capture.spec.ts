import { expect, test } from '@playwright/test';

test('capture release screenshots', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: /explore demo|demo ansehen/i }).click();
  await expect(page.getByText(/crystal red|blue bolt/i).first()).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true });
    return;
  }

  await page.screenshot({ path: 'docs/screenshots/dashboard-desktop.png', fullPage: true });
  await page.goto('/#/tanks');
  await expect(page.getByText(/tanks|becken/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/tanks-desktop.png', fullPage: true });
  await page.goto('/#/water');
  await expect(page.getByText(/water measurements|wasserwerte/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/water-desktop.png', fullPage: true });
});
