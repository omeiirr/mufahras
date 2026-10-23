// Recent searches on this device (localStorage). Recorded when a search leads somewhere: a result
// opened or Enter pressed. Turning history off in settings clears it.
import { settings } from './settings.svelte';

export interface HistoryEntry {
  q: string;
  at: number;
}

const KEY = 'history';
const MAX = 50;

function load(): HistoryEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((e) => typeof e?.q === 'string') : [];
  } catch {
    return [];
  }
}

export const history = $state<{ list: HistoryEntry[] }>({ list: load() });

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(history.list));
  } catch {
    // storage blocked: history lasts for this visit
  }
}

export function recordSearch(q: string): void {
  const query = q.trim();
  if (!settings.history || !query) return;
  history.list = [{ q: query, at: Date.now() }, ...history.list.filter((e) => e.q.toLowerCase() !== query.toLowerCase())].slice(0, MAX);
  save();
}

export function removeSearch(q: string): void {
  history.list = history.list.filter((e) => e.q !== q);
  save();
}

export function clearHistory(): void {
  history.list = [];
  save();
}
