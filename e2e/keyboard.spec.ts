// Keyboard use on a desktop: shortcuts that change with the screen, radio groups, the topic tree and dialogs.
import { expect, test } from '@playwright/test';
import { isPhone, openApp } from './helpers';

test.beforeEach(({ page }) => test.skip(isPhone(page), 'keyboards are for desktops'));

const search = (page: import('@playwright/test').Page) => page.locator('input[type=search]');
const heading = (page: import('@playwright/test').Page, name: string) => page.getByRole('heading', { name, level: 1 });

test('Enter opens a result and moves to it; then its keys work, and Esc goes back to the search', async ({ page }) => {
  await openApp(page);
  await search(page).fill('2:255');
  await expect(page.locator('a.hit').first()).toBeVisible();
  await search(page).press('Enter');
  await expect(heading(page, '2:255')).toBeVisible();
  await expect(page.locator('.detail .scroll')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(heading(page, '2:256')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(heading(page, '2:255')).toBeVisible();
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  // Word by word: ← is the next word (right to left), Esc closes the card before it leaves the verse.
  await page.keyboard.press('w');
  const card = page.getByRole('region', { name: 'Word by word' });
  await expect(card).toContainText('Word 1 of');
  await page.keyboard.press('ArrowLeft');
  await expect(card).toContainText('Word 2 of');
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(heading(page, '2:255')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search(page)).toBeFocused();
});

test('? lists the keys for the screen it was opened on', async ({ page }) => {
  await openApp(page, '#/2:255');
  await expect(heading(page, '2:255')).toBeVisible();
  await page.locator('.detail .scroll').focus();
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toContainText('This verse');
  await expect(help).toContainText('Next verse');
  await expect(help).toContainText('Search the Quran only');
  await page.keyboard.press('Escape');
  await expect(help).toHaveCount(0);
  await expect(heading(page, '2:255')).toBeVisible(); // Esc closed the list only

  await openApp(page, '#/surah/2');
  await page.getByRole('radio', { name: 'Mushaf' }).click();
  await expect(page.locator('.pages .page').first()).toBeVisible();
  await page.keyboard.press('?');
  await expect(help).toContainText('Next page');
  await expect(help).not.toContainText('Next surah'); // ← → turn the pages here
  await page.keyboard.press('Escape');
  await page.locator('.detail .scroll').focus(); // focus went back to the Mushaf radio, which takes ← → itself
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const pane = await page.locator('.detail .scroll').boundingBox();
  const third = await page.locator('.pages .page').nth(1).boundingBox(); // surah 2 starts on page 2: this is page 3
  expect(Math.abs(third!.y - pane!.y)).toBeLessThan(4);
  await page.getByRole('radio', { name: 'Mushaf' }).click();
  await page.keyboard.press('ArrowLeft'); // the radio group takes the arrows while it has focus
  await expect(page.getByRole('radio', { name: 'Arabic' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Translation' }).click();
});

test('filters by key: q, h, a and s', async ({ page }) => {
  await openApp(page);
  await search(page).fill('patience');
  await expect(page.locator('a.hit').first()).toBeVisible();
  await search(page).press('Enter');
  await page.keyboard.press('q');
  await expect(page.getByRole('radio', { name: 'Quran' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('h');
  await page.keyboard.press('s');
  await expect(page.getByRole('radio', { name: 'Hadith' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Sahih hadith only' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('a');
  await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  // Typing in the search box types, it doesn't filter; Esc leaves the box, keeping the search.
  await search(page).focus();
  await page.keyboard.type(' q');
  await expect(search(page)).toHaveValue('patience q');
  await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(search(page)).not.toBeFocused();
  await expect(search(page)).toHaveValue('patience q');
  await page.keyboard.press('q');
  await expect(page.getByRole('radio', { name: 'Quran' })).toHaveAttribute('aria-checked', 'true');
});

test('j and k step through the verses of a surah', async ({ page }) => {
  await openApp(page, '#/surah/112');
  await expect(page.locator('ol.ayahs li')).toHaveCount(4);
  await page.locator('.detail .scroll').focus();
  await page.keyboard.press('j');
  await expect(page.getByRole('link', { name: '112:1', exact: true })).toBeFocused();
  await page.keyboard.press('j');
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await expect(page.getByRole('link', { name: '112:2', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(heading(page, '112:2')).toBeVisible();
});

test('radio groups: one Tab stop, arrows choose', async ({ page }) => {
  await openApp(page);
  const all = page.getByRole('radio', { name: 'All' });
  await all.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Quran' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Quran' })).toHaveAttribute('aria-checked', 'true');
  await expect(all).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('End');
  await expect(page.getByRole('radio', { name: 'Hadith' })).toHaveAttribute('aria-checked', 'true');
});

test('the topic tree opens and closes with the arrow keys', async ({ page }) => {
  await openApp(page, '#/topics');
  const stories = page.getByRole('link', { name: /^Stories \d+$/ });
  await stories.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Subtopics of Stories' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  const prophets = page.getByRole('link', { name: /^Prophets \(25 mentioned by name\) \d+$/ });
  // → moved to the first subtopic; walk down to Prophets.
  for (let k = 0; k < 10 && !(await prophets.evaluate((el) => el === document.activeElement)); k++) await page.keyboard.press('ArrowDown');
  await expect(prophets).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(stories).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Subtopics of Stories' })).toHaveAttribute('aria-expanded', 'false');
});

test('the menu keeps Tab inside it, and gives focus back when it closes', async ({ page }) => {
  await openApp(page);
  await page.locator('.detail .scroll').focus();
  await page.keyboard.press('m');
  const close = page.getByRole('button', { name: 'Close menu' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('nav.drawer')).toContainText('Send feedback');
  expect(await page.evaluate(() => !!document.activeElement?.closest('nav.drawer'))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('nav.drawer')).toHaveCount(0);
  await expect(page.locator('.detail .scroll')).toBeFocused();
  // m opens it and m closes it, also from a switch inside it.
  await page.keyboard.press('m');
  await page.getByRole('checkbox', { name: /Sakinah mode/ }).focus();
  await page.keyboard.press('m');
  await expect(page.locator('nav.drawer')).toHaveCount(0);
});
