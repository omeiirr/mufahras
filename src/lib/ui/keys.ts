// Keyboard shortcuts that depend on what's on screen. The app, each screen and each open card add a layer
// of keys while they're shown; a higher layer wins, so the word card's ← → shadow the verse's. `?` lists
// the keys that work right now (shortcutHelp). Keys don't fire while typing in a field, or while a dialog
// is open (dialogs handle their own keys).

export interface Shortcut {
  /** KeyboardEvent.key values; single letters in lower case. */
  keys: string[];
  /** What the ? list says; without one the key works but isn't listed. */
  label?: string;
  /** How the ? list shows the key, when not just the key itself. */
  display?: string;
  /** Needs Ctrl (⌘ on a Mac). */
  ctrl?: boolean;
  /** Also while typing in a text field. */
  typing?: boolean;
  /** Only while this holds. */
  when?: () => boolean;
  run: (e: KeyboardEvent) => void;
}

/** 0: the whole app, 1: the screen, 2: a part of the screen opened over it (word card, mushaf pages). */
export type Level = 0 | 1 | 2;

interface Layer {
  name: string;
  level: Level;
  list: () => Shortcut[];
}

const layers: Layer[] = [];

/** Adds a layer of keys until the returned function is called. In a component: $effect(() => addShortcuts(…)). */
export function addShortcuts(name: string, level: Level, list: () => Shortcut[]): () => void {
  const layer = { name, level, list };
  layers.push(layer);
  return () => {
    const k = layers.indexOf(layer);
    if (k >= 0) layers.splice(k, 1);
  };
}

/** Highest level first; within a level, the latest added first. */
const ordered = () => layers.map((l, k) => [l, k] as const).sort((a, b) => b[0].level - a[0].level || b[1] - a[1]).map(([l]) => l);

const keyOf = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
/** In a field that takes letters (a checkbox or a button doesn't). */
export const isTyping = (t: EventTarget | null) =>
  (t instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes(t.type)) ||
  t instanceof HTMLTextAreaElement ||
  t instanceof HTMLSelectElement ||
  (t instanceof HTMLElement && t.isContentEditable);

export function handleShortcut(e: KeyboardEvent): void {
  // A control that used the key itself (a radio group's arrows, the topic tree) has prevented it.
  if (e.defaultPrevented || e.isComposing || e.altKey || document.querySelector('[data-modal]')) return;
  const key = keyOf(e);
  if (e.shiftKey && key.length > 1) return; // Shift+arrows select text
  const ctrl = e.ctrlKey || e.metaKey;
  const typing = isTyping(e.target);
  for (const layer of ordered())
    for (const s of layer.list()) {
      if (!s.keys.includes(key) || !!s.ctrl !== ctrl || (typing && !s.typing) || (s.when && !s.when())) continue;
      e.preventDefault();
      s.run(e);
      return;
    }
}

const NAMES: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc', Enter: 'Enter', ' ': 'Space' };
const mac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform);
const shown = (s: Shortcut) => s.display ?? `${s.ctrl ? (mac ? '⌘' : 'Ctrl ') : ''}${s.keys.map((k) => NAMES[k] ?? k.toUpperCase()).join(' ')}`;

/** The keys that work now, grouped by layer, most specific first; keys a higher layer takes are left out. */
export function shortcutHelp(): { name: string; keys: { key: string; label: string }[] }[] {
  const taken = new Set<string>();
  const groups = new Map<string, { key: string; label: string }[]>();
  for (const layer of ordered())
    for (const s of layer.list()) {
      if (s.when && !s.when()) continue;
      const ids = s.keys.map((k) => `${s.ctrl ? '^' : ''}${k}`);
      const free = ids.some((id) => !taken.has(id));
      ids.forEach((id) => taken.add(id));
      if (!free || !s.label) continue;
      const g = groups.get(layer.name) ?? groups.set(layer.name, []).get(layer.name)!;
      g.push({ key: shown(s), label: s.label });
    }
  return [...groups].map(([name, keys]) => ({ name, keys }));
}

/**
 * j / k: focus the next or previous of a screen's items (their links match `selector`), from the one
 * focused now or, when none is, from the first one on screen.
 */
export function stepFocus(selector: string, dir: 1 | -1): void {
  const items = [...document.querySelectorAll<HTMLElement>(selector)];
  if (!items.length) return;
  let at = items.findIndex((el) => el === document.activeElement || el.closest('li, .ayah')?.contains(document.activeElement));
  if (at < 0) {
    const first = items.findIndex((el) => el.getBoundingClientRect().top >= 0);
    at = first < 0 ? items.length : first - (dir > 0 ? 1 : 0);
  }
  const next = items[Math.max(0, Math.min(items.length - 1, at + dir))]!;
  next.focus({ preventScroll: true });
  (next.closest('li, .ayah') ?? next).scrollIntoView({ block: 'nearest' });
}

/** Follows an in-app link, as clicking it would. */
export const go = (href: string) => (location.hash = href.slice(href.indexOf('#')));

/** w: open word by word on the focused item's first word, or on the first item on screen. */
export function openWords(itemSelector: string): void {
  const items = [...document.querySelectorAll<HTMLElement>(itemSelector)];
  const item = items.find((el) => el.contains(document.activeElement)) ?? items.find((el) => el.getBoundingClientRect().top >= 0) ?? items[0];
  const word = item?.querySelector<HTMLElement>('button.w');
  word?.click();
  word?.focus({ preventScroll: true });
}
