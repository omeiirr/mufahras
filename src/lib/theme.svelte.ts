// Theme choice: one of the named themes, or "auto" (follows the system: Paper in light, Night in dark).
// The choice is kept in localStorage; index.html applies it before first paint to avoid a flash.
// Keep THEME_KEY, the auto mapping and the theme-color values in sync with the script in index.html.

export const THEMES = [
  { id: 'paper', label: 'Paper', dark: false, bg: '#faf8f3', swatch: ['#faf8f3', '#1f6b57'] },
  { id: 'sepia', label: 'Sepia', dark: false, bg: '#f1e7d0', swatch: ['#f1e7d0', '#2c6449'] },
  { id: 'dusk', label: 'Dusk', dark: true, bg: '#262421', swatch: ['#262421', '#8fc4b1'] },
  { id: 'night', label: 'Night', dark: true, bg: '#1f242c', swatch: ['#1f242c', '#8cc5c0'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export type ThemeChoice = ThemeId | 'auto';

const THEME_KEY = 'theme';
const AUTO = { light: 'paper', dark: 'night' } as const satisfies Record<string, ThemeId>;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

function stored(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'auto' || THEMES.some((t) => t.id === v) ? (v as ThemeChoice) : 'auto';
  } catch {
    return 'auto';
  }
}

export const theme = $state<{ choice: ThemeChoice }>({ choice: stored() });

export function resolved(choice: ThemeChoice): ThemeId {
  return choice === 'auto' ? (darkQuery.matches ? AUTO.dark : AUTO.light) : choice;
}

function apply(): void {
  const id = resolved(theme.choice);
  document.documentElement.dataset.theme = id;
  const bg = THEMES.find((t) => t.id === id)!.bg;
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) m.content = bg;
}

export function setTheme(choice: ThemeChoice): void {
  theme.choice = choice;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // private mode or storage blocked: the choice lasts for this visit
  }
  apply();
}

darkQuery.addEventListener('change', () => theme.choice === 'auto' && apply());
apply();
