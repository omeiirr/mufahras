import { expect, test, type Page } from '@playwright/test';
import { isPhone, openApp } from './helpers';

/** The menu button the user can actually tap (on phones the reading screen's own, on top). */
const menuButton = (page: Page) => (isPhone(page) && page.url().match(/#\/[^?]/) ? page.locator('.overlay button[aria-label=Menu]') : page.locator('button[aria-label=Menu]:visible').first());

/** Phones: top right on every screen. Desktop: below the search bar, on the left. */
async function menuCorner(page: Page) {
  const box = (await menuButton(page).boundingBox())!;
  if (isPhone(page)) {
    const vw = page.viewportSize()!.width;
    expect(box.x + box.width, 'menu at the right edge').toBeGreaterThan(vw - 80);
    expect(box.y, 'menu at the top').toBeLessThan(70);
  } else {
    const bar = (await page.locator('.bar').boundingBox())!;
    expect(box.y, 'menu below the search bar').toBeGreaterThan(bar.y + bar.height - 1);
    expect(box.x, 'menu on the left').toBeLessThan(bar.x + 30);
  }
}

test('the menu button stays in one place across screens', async ({ page }) => {
  await openApp(page);
  await menuCorner(page);
  await page.fill('input[type=search]', 'patience');
  await menuCorner(page);
  await page.locator('a.hit').first().click();
  await expect(page.locator('.verse')).toBeVisible();
  await menuCorner(page);
});

test('the drawer opens from the side its button is on', async ({ page }) => {
  await openApp(page);
  await menuButton(page).click();
  await page.waitForTimeout(300); // let the slide-in finish
  const drawer = (await page.locator('nav.drawer').boundingBox())!;
  const vw = page.viewportSize()!.width;
  if (isPhone(page)) expect(Math.round(drawer.x + drawer.width), 'phones: from the right').toBe(vw);
  else expect(Math.round(drawer.x), 'desktop: from the left').toBe(0);
});

test('word card: Next on the left, Previous on the right (right-to-left like the verse)', async ({ page }) => {
  await openApp(page, '#/2:255?q=x');
  await page.locator('.verse .quran button.w').nth(3).click();
  const next = (await page.getByRole('button', { name: 'Next word' }).boundingBox())!;
  const prev = (await page.getByRole('button', { name: 'Previous word' }).boundingBox())!;
  expect(next.x).toBeLessThan(prev.x);
});

test('word by word on the surah screen and in verse lists, one card at a time', async ({ page }) => {
  await openApp(page, '#/surah/112');
  const verses = page.locator('.ayahs li');
  await verses.nth(0).locator('button.w').nth(1).click();
  const card = page.getByRole('region', { name: 'Word by word' });
  await expect(card).toHaveCount(1);
  await expect(verses.nth(0).getByRole('region', { name: 'Word by word' })).toContainText(/\S/);
  await expect(card.locator('.meaning')).not.toBeEmpty();
  // A word in another verse moves the card there.
  await verses.nth(2).locator('button.w').first().click();
  await expect(card).toHaveCount(1);
  await expect(verses.nth(2).getByRole('region', { name: 'Word by word' })).toBeVisible();
  await page.getByRole('button', { name: 'Close word by word' }).click();
  await expect(card).toHaveCount(0);

  await openApp(page, '#/duas');
  await page.locator('.list li').first().locator('button.w').first().click();
  await expect(card).toHaveCount(1);
  await expect(page).toHaveURL(/#\/duas/);
});

test('Back closes the menu first, then the image sheet, without leaving the screen', async ({ page }) => {
  await openApp(page, '#/2:255?q=x');
  await menuButton(page).click();
  await expect(page.locator('nav.drawer')).toBeVisible();
  await page.goBack();
  await expect(page.locator('nav.drawer')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/2:255/);
  await page.getByRole('button', { name: 'Image' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.verse')).toBeVisible();
});

test('installed app: the first Back at the start asks, the second closes', async ({ page }) => {
  test.skip(!isPhone(page), 'the Back button matters on phones');
  // Pretend to be the installed app: display-mode: standalone.
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (q: string) =>
      q.includes('display-mode: standalone') ? ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : original(q);
  });
  await page.goto('about:blank');
  await openApp(page);
  await page.goBack();
  await expect(page.getByRole('status').filter({ hasText: 'Press back again to exit' })).toBeVisible();
  await expect(page.locator('input[type=search]')).toBeVisible(); // still in the app
  await page.goBack();
  await expect(page).toHaveURL('about:blank'); // left the app
});

test('a link with a stray % still opens the app', async ({ page }) => {
  await openApp(page, '#/50%');
  await expect(page.locator('input[type=search]')).toBeVisible();
});

test('a download that fails is tried again, and search fills in once it works', async ({ page }) => {
  let requests = 0;
  // The search worker fetches the data, so the route is on the context (a page route misses worker requests).
  await page.context().route(/hadith-muslim\.[0-9a-f]+\.json$/, (route) => (++requests === 1 ? route.abort('internetdisconnected') : route.continue()));
  await openApp(page);
  await page.locator('input[type=search]').fill('muslim 100');
  await expect(page.getByRole('link', { name: /Go to Muslim 100\b/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toBe(2);
});

test('the surah screen can show the Arabic alone, and remembers it', async ({ page }) => {
  await openApp(page, '#/surah/67');
  await expect(page.getByText('Blessed is He in whose hand is dominion')).toBeVisible();
  await page.getByRole('radio', { name: 'Arabic', exact: true }).click();
  await expect(page.getByText('Blessed is He in whose hand is dominion')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Verse 67:30' })).toBeAttached();
  await openApp(page, '#/surah/67/15');
  await expect(page.getByRole('radio', { name: 'Arabic', exact: true })).toBeChecked();
  await expect(page.locator('#ayah-67-15')).toBeInViewport();
  await page.getByRole('link', { name: 'Verse 67:15' }).click();
  await expect(page).toHaveURL(/#\/67:15/);
});

test('the surah screen shows the pages of the Madani mushaf', async ({ page }) => {
  await openApp(page, '#/surah/67/15');
  await page.getByRole('radio', { name: 'Mushaf' }).click();
  await expect(page.getByRole('region', { name: 'Page 562' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Page 564' })).toBeAttached();
  await expect(page.locator('#ayah-67-15')).toBeInViewport();
  const overflowing = await page.locator('.line').evaluateAll((lines) => lines.filter((l) => l.scrollWidth > l.clientWidth + 1).length);
  expect(overflowing).toBe(0);
  await page.getByRole('link', { name: 'Verse 67:15' }).click();
  await expect(page).toHaveURL(/#\/67:15/);
});

