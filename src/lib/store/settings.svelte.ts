// Reading settings, kept in localStorage (a per-device convenience; losing them just means defaults).
// Sizes are applied as CSS variables on <html>: --text-scale scales the whole interface like the
// system text size; --arabic-scale scales Arabic on top of that.

export interface Settings {
  textScale: number;
  arabicScale: number;
  /** Show word-by-word transliteration under a verse. */
  translit: boolean;
  /** Remember searches on this device (recent searches, history page). */
  history: boolean;
}

export const TEXT_SCALES = [0.9, 1, 1.12, 1.25] as const;
export const ARABIC_SCALES = [0.85, 1, 1.2, 1.4] as const;

const KEY = 'settings';
const DEFAULTS: Settings = { textScale: 1, arabicScale: 1, translit: true, history: true };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = $state<Settings>(load());

function apply(): void {
  const root = document.documentElement.style;
  root.setProperty('--text-scale', String(settings.textScale));
  root.setProperty('--arabic-scale', String(settings.arabicScale));
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage blocked: the change lasts for this visit
  }
  apply();
}

apply();
