import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('search finds verses as you type, with typos', async ({ page }) => {
  await openApp(page);
  await page.fill('input[type=search]', 'patiance prayer');
  await expect(page.locator('a.hit').first()).toContainText('2:153');
});

test('text shared into the app becomes the search', async ({ page }) => {
  await page.goto('/?title=x&text=' + encodeURIComponent('“seek help through patience and prayer” https://example.com/p'));
  await expect(page.locator('input[type=search]')).toHaveValue('seek help through patience and prayer');
});

test('Esc closes the picture-card sheet without leaving the verse', async ({ page }) => {
  await openApp(page, '#/2:153?q=x');
  await page.getByRole('button', { name: 'Image' }).click();
  await expect(page.getByRole('dialog', { name: 'Share as image' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/2:153/);
});

test('tapping a word shows it word by word', async ({ page }) => {
  await openApp(page, '#/1:1?q=x');
  await page.locator('.verse .quran button.w').first().click();
  await expect(page.getByRole('region', { name: 'Word by word' })).toContainText("bis'mi");
  await expect(page.getByRole('region', { name: 'Word by word' })).toContainText('In (the) name');
  await page.getByRole('button', { name: 'Next word' }).click();
  await expect(page.getByRole('region', { name: 'Word by word' })).toContainText('l-lahi');
});

test('Sakinah mode keeps search and reading, hides the rest', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('settings', JSON.stringify({ sakinah: true })));
  await openApp(page);
  await expect(page.getByText('Verse of the day')).toHaveCount(0);
  await page.fill('input[type=search]', 'patience');
  await expect(page.locator('a.hit').first()).toBeVisible();
  await expect(page.locator('ul.chips')).toHaveCount(0);
  await page.locator('a.hit').first().click();
  await expect(page.locator('.verse .quran')).toBeVisible();
  await expect(page.getByText('Explanation', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Image' })).toHaveCount(0);
});

test('bookmarks: save, tag, and find them in the list', async ({ page }) => {
  await openApp(page, '#/2:255?q=x');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
  await page.goto('/#/bookmarks');
  await expect(page.locator('.list')).toContainText('2:255');
  await page.getByRole('button', { name: 'Add tag' }).click();
  await page.keyboard.type('kursi');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'kursi' })).toBeVisible();
});

test('topics open as a tree down to the prophets, and a topic page shows where it sits', async ({ page }) => {
  await openApp(page, '#/topics');
  await page.getByRole('button', { name: 'Subtopics of Stories' }).click();
  await page.getByRole('button', { name: 'Subtopics of Prophets (25 mentioned by name)' }).click();
  await page.getByRole('link', { name: /^Moses \d+$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Moses', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Part of' })).toContainText('Stories›Prophets (25 mentioned by name)');
  await expect(page.getByRole('list', { name: 'Subtopics of Moses' })).toContainText('parting of the Red Sea');
});

test('hadith that mention a verse, the verses in a hadith, and the list of all of them', async ({ page }) => {
  await openApp(page, '#/2:255');
  const section = page.getByRole('region', { name: /Hadith that mention this verse/ });
  await expect(section.getByRole('link', { name: /Bukhari 3275/ })).toBeVisible();
  await openApp(page, '#/bukhari/4971');
  const verses = page.getByRole('navigation', { name: 'Verses in this hadith' });
  await verses.getByRole('link', { name: '111:1' }).click();
  await expect(page.getByRole('heading', { name: '111:1', level: 1 })).toBeVisible();
  await openApp(page, '#/in-hadith');
  await expect(page.getByRole('heading', { name: 'Verses in the hadith', level: 1 })).toBeVisible();
  await page.getByRole('radio', { name: 'Most mentioned' }).click();
  await expect(page.locator('.count').first()).toContainText(/In \d+ hadith/);
  await expect(page.getByRole('link', { name: /^112:1/ }).first()).toBeVisible();
});
