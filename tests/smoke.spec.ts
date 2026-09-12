import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('loads the empty dashboard and navigates to settings', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText(/what needs your attention|was jetzt aufmerksamkeit braucht/i)
  ).toBeVisible({ timeout: 15_000 });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.getByRole('navigation').first()).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByText(/settings & data|einstellungen & daten/i)).toBeVisible();
});

test('loads demo data and exposes the main workflow', async ({ page }) => {
  await page.goto('/#/settings');
  await page
    .getByRole('button', {
      name: /replace with labelled demo data|durch markierte demodaten ersetzen/i
    })
    .click();
  await expect(page.getByText(/demo/i).first()).toBeVisible();
  await page.goto('/#/tanks');
  await expect(page.getByText(/tanks|becken/i).first()).toBeVisible();
});
