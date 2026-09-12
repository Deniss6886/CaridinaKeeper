import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoRoute } from './helpers';

test('loads the empty dashboard and navigates to settings', async ({ page }) => {
  await gotoRoute(page);
  await expect(
    page.getByText(/what needs your attention|was jetzt aufmerksamkeit braucht/i)
  ).toBeVisible({ timeout: 15_000 });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.locator('#main-content')).toBeVisible();
  await gotoRoute(page, '/settings');
  await expect(page.getByText(/settings & data|einstellungen & daten/i)).toBeVisible();
});

test('loads demo data and exposes the main workflow', async ({ page }) => {
  await gotoRoute(page, '/settings');
  await page
    .getByRole('button', {
      name: /replace with labelled demo data|durch markierte demodaten ersetzen/i
    })
    .click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toContainText(/fictional|fiktiv/i);
  await dialog.getByRole('button', { name: /load demo data|demodaten laden/i }).click();
  await expect(dialog).not.toBeVisible();
  await gotoRoute(page, '/tanks');
  await expect(page.getByText(/Crystal Red 30 l/i).first()).toBeVisible();
});

test('installs the PWA shell and keeps routes available offline', async ({ page, context }) => {
  await gotoRoute(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/
  );
  await expect
    .poll(() =>
      page.locator('html').evaluate(() => {
        const browserNavigator = navigator as unknown as {
          serviceWorker?: { controller?: unknown };
        };
        return Boolean(browserNavigator.serviceWorker?.controller);
      })
    )
    .toBe(true);
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await gotoRoute(page, '/settings');
    await expect(page.getByRole('heading', { name: 'Settings & data' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
