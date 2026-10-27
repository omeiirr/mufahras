// Screenshots of the app for the landing page (welcome/), taken from the built site so they show what
// ships. Run after `npm run build`: npm run welcome:shots. Writes welcome/shots/*.webp.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';

const OUT = 'welcome/shots';
const PORT = 4190;
const BASE = `http://localhost:${PORT}/`;

interface Shot {
  name: string;
  hash: string;
  desktop?: boolean;
  theme?: string;
  settings?: Record<string, unknown>;
  /** Runs after the screen has loaded, before the picture is taken. */
  prepare?: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  { name: 'search', hash: '#/?q=patiance%20prayer' },
  {
    name: 'verse',
    hash: '#/94:6',
    prepare: async (page) => {
      await page.locator('.verse .quran button.w').nth(1).click();
      await page.getByRole('region', { name: 'Word by word' }).locator('.meaning').waitFor();
    },
  },
  {
    name: 'verse-hadith',
    hash: '#/112:1',
    prepare: async (page) => {
      const h = page.getByRole('heading', { name: /Hadith that mention this verse/ });
      await h.waitFor();
      await h.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    },
  },
  { name: 'mushaf', hash: '#/surah/67', settings: { surahView: 'pages' }, prepare: (page) => page.locator('.pages .page').first().waitFor() },
  { name: 'arabic', hash: '#/surah/36', settings: { surahView: 'arabic' }, theme: 'night' },
  {
    name: 'topics',
    hash: '#/topics',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Subtopics of Stories' }).click();
      await page.getByRole('button', { name: /^Subtopics of Prophets/ }).click();
      await page.getByRole('link', { name: /^Stories \d+$/ }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    },
  },
  { name: 'names', hash: '#/names-of-allah' },
  { name: 'in-hadith', hash: '#/in-hadith', prepare: (page) => page.getByRole('radio', { name: 'Most mentioned' }).click() },
  { name: 'graph', hash: '#/graph', prepare: () => new Promise((r) => setTimeout(r, 2500)) },
  { name: 'desktop', hash: '#/2:255?q=ayatul%20kursi', desktop: true },
  { name: 'desktop-night', hash: '#/1:2?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF%20%D9%84%D9%84%D9%87%20%D8%B1%D8%A8%20%D8%A7%D9%84%D8%B9%D8%A7%D9%84%D9%85%D9%8A%D9%86', desktop: true, theme: 'night' },
];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
try {
  for (let k = 0; k < 50; k++) {
    if (await fetch(BASE).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const s of SHOTS) {
    const context = await browser.newContext(
      s.desktop ? { viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 } : { viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    );
    const page = await context.newPage();
    await page.goto(BASE);
    await page.evaluate(
      ({ theme, settings }) => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('settings', JSON.stringify(settings));
        localStorage.setItem('wbw-hint-seen', '1');
        localStorage.setItem('history', '[]');
      },
      { theme: s.theme ?? 'paper', settings: s.settings ?? {} },
    );
    await page.goto(BASE + s.hash);
    await page.reload();
    await page.waitForFunction(() => !document.body.textContent?.includes('Loading'));
    await page.waitForTimeout(800);
    await s.prepare?.(page);
    await page.waitForTimeout(400);
    const png = join(OUT, `${s.name}.png`);
    await page.screenshot({ path: png });
    execFileSync('magick', [png, '-quality', '82', png.replace(/\.png$/, '.webp')]);
    rmSync(png);
    console.log('  ', s.name);
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
