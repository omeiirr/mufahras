import { expect, type Page } from '@playwright/test';

/** Opens the app at a hash route and waits until the Quran is searchable. */
export async function openApp(page: Page, hash = ''): Promise<void> {
  await page.goto(`/${hash}`);
  await expect(page.locator('input[type=search]')).toBeVisible();
  await page.waitForFunction(() => !document.body.textContent?.includes('Loading the Quran'));
}

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 1024;

/** Layout invariants every screen must keep. */
export async function expectSoundLayout(page: Page): Promise<void> {
  const m = await page.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const app = document.querySelector('.app')!.getBoundingClientRect();
    // Scroll containers inside the dock make the chips draggable (they shouldn't scroll at all).
    const dockScrollers = [...document.querySelectorAll('.dock *')].filter((e) => {
      const cs = getComputedStyle(e);
      return /(auto|scroll)/.test(cs.overflowX + cs.overflowY);
    }).length;
    // The page can be fine while a scrolling pane overflows sideways inside it (a grid column stretched by
    // unwrappable text); check the panes too.
    const paneOverflow = [...document.querySelectorAll('.scroll')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
    return { pageWidth: document.documentElement.scrollWidth, vw, appHeight: Math.round(app.height), vh, dockScrollers, paneOverflow };
  });
  expect(m.pageWidth, 'no horizontal overflow').toBeLessThanOrEqual(m.vw);
  expect(m.paneOverflow, 'no pane scrolls sideways').toBe(0);
  expect(m.appHeight, 'the app fills the window exactly').toBe(m.vh);
  expect(m.dockScrollers, 'nothing in the dock scrolls').toBe(0);
}
