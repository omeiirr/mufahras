import { expect, test, type Page } from '@playwright/test';
import { expectSoundLayout, openApp } from './helpers';

const storedUrls = (page: Page) =>
  page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    return urls;
  });

test('search by meaning: off until switched on, then finds texts by meaning, offline too, and can be removed', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'once is enough; it downloads ~40 MB');
  test.setTimeout(180_000);
  await openApp(page);
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30_000 });
  // Its model, runtime and vectors aren't fetched or precached before it's switched on.
  expect((await storedUrls(page)).filter((u) => /models\/|meaning-vectors|\.wasm$/.test(u))).toEqual([]);
  // Word search alone finds nothing for this.
  await page.fill('input[type=search]', 'dealing with anxiety and worry');
  await expect(page.getByText('Nothing matched')).toBeVisible();
  await expect(page.getByText('By meaning', { exact: true })).toHaveCount(0);

  // Nothing found with the words: the results offer to switch it on.
  await page.getByRole('button', { name: 'Switch on search by meaning' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('nav.drawer .meaning input[type=checkbox]')).toBeChecked();
  await expect(page.locator('nav.drawer .meaning')).toContainText('Ready, and works offline', { timeout: 120_000 });
  await page.keyboard.press('Escape');

  const byMeaning = page.locator('a.hit').filter({ hasText: /Bukhari 6369|94:6/ });
  await expect(page.getByText('By meaning', { exact: true })).toBeVisible();
  await expect(byMeaning.first()).toBeVisible({ timeout: 20_000 });

  await context.setOffline(true);
  await page.reload();
  await page.fill('input[type=search]', 'visiting the sick');
  await expect(page.locator('a.hit').filter({ hasText: /Muslim 655[124]|Bukhari 5649|Ibn Majah 1443/ }).first()).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);

  // Off keeps the files (so it can come back quickly); Remove deletes them.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('nav.drawer .meaning input[type=checkbox]').uncheck();
  await page.locator('nav.drawer .meaning').getByRole('button', { name: /Remove its files/ }).click();
  await expect(page.locator('nav.drawer .meaning').getByRole('button', { name: /Remove/ })).toHaveCount(0);
  expect((await storedUrls(page)).filter((u) => /models\/|meaning-vectors|\.wasm$/.test(u))).toEqual([]);
});

test('results by meaning keep the layout sound', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'phone widths');
  test.setTimeout(120_000);
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('settings', JSON.stringify({ meaning: true })));
  await page.reload();
  await page.fill('input[type=search]', 'the religion is easy');
  await expect(page.getByText('By meaning', { exact: true })).toBeVisible();
  await expect(page.locator('li.pending')).toHaveCount(0, { timeout: 90_000 });
  await expect(page.getByRole('button', { name: /More by meaning/ })).toBeVisible();
  await expectSoundLayout(page);
});
