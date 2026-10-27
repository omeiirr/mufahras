// The landing page at welcome/: it fits every width, its pictures load, and the demo plays.
import { expect, test } from '@playwright/test';

test('the landing page fits the window and its pictures load', async ({ page }) => {
  await page.goto('/welcome/');
  await expect(page.getByRole('heading', { name: 'Find any verse or hadith as you type.', level: 1 })).toBeVisible();
  // Bring every lazy picture in, then check none failed.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await expect.poll(() => page.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('the search in the hero types the next example', async ({ page }) => {
  await page.goto('/welcome/');
  await expect(page.locator('.hero .mock-q')).toHaveText('ayatul kursi', { timeout: 10_000 });
  await expect(page.locator('.hero .mock-hits')).toContainText('2:255');
});

test('See demo plays the video, and closing stops it', async ({ page }) => {
  await page.goto('/welcome/');
  await page.getByRole('button', { name: 'See demo' }).click();
  const video = page.locator('dialog.demo video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(1);
  await page.keyboard.press('Escape');
  await expect(video).toBeHidden();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test('Open Mufahras opens the app', async ({ page }) => {
  await page.goto('/welcome/');
  await page.getByRole('link', { name: 'Open Mufahras' }).first().click();
  await expect(page.locator('input[type=search]')).toBeVisible();
});
