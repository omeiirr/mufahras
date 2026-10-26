import { expect, test } from '@playwright/test';
import { expectSoundLayout, isPhone, openApp } from './helpers';

const SCREENS = [
  '#/',
  '#/?q=patience%20prayer',
  '#/?q=abu%20huraira',
  '#/?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF',
  '#/2:255?q=x',
  '#/bukhari/1?q=x',
  '#/surah/2',
  '#/surahs',
  '#/topic/1651',
  '#/bukhari/book/30',
  '#/books',
  '#/bookmarks',
  '#/history',
  '#/about',
  '#/names',
  '#/duas',
  '#/sajdah',
  '#/in-hadith',
  '#/topics',
  '#/phrases',
  '#/names-of-allah',
];

for (const hash of SCREENS)
  test(`layout holds: ${decodeURIComponent(hash)}`, async ({ page }) => {
    await openApp(page, hash);
    await page.waitForTimeout(800);
    await expectSoundLayout(page);
  });

test('the start screen scrolls and keeps the search bar on screen', async ({ page }) => {
  await openApp(page);
  const bar = await page.locator('.bar').boundingBox();
  expect(bar!.y + bar!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const scroll = page.locator('.results .scroll');
  const canScroll = await scroll.evaluate((e) => e.scrollHeight > e.clientHeight);
  if (canScroll) {
    await scroll.evaluate((e) => e.scrollTo(0, 400));
    expect(await scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  }
});

test('the graph page draws and fits the window', async ({ page }) => {
  await openApp(page, '#/graph');
  await expect(page.locator('.graph-page canvas')).toBeVisible();
  await expect(page.locator('.graph-page .meta')).toContainText('ayahs');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('reading screens open the menu on phones', async ({ page }) => {
  test.skip(!isPhone(page), 'desktop keeps the menu button in the search column');
  await openApp(page, '#/2:255?q=x');
  await page.locator('.overlay button[aria-label=Menu]').click();
  await expect(page.locator('nav.drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('nav.drawer')).toHaveCount(0);
  await expect(page.locator('.overlay')).toBeVisible(); // Esc closed the drawer only
});
