import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('works offline after downloading everything', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'once is enough; it downloads ~12 MB');
  test.setTimeout(120_000);
  await openApp(page);
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('nav.drawer .offline button').click();
  await expect(page.locator('nav.drawer .offline')).toContainText('Everything is available offline', { timeout: 90_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('input[type=search]')).toBeVisible();
  await page.fill('input[type=search]', 'patience prayer');
  await expect(page.locator('a.hit').filter({ hasText: 'Muslim' }).first()).toBeVisible();
  await page.goto('/#/bukhari/1?q=x');
  await expect(page.locator('.hadith .arabic')).toBeVisible();
  await context.setOffline(false);
});
