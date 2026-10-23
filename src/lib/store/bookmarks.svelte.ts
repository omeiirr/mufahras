// Bookmarks with tags, stored in IndexedDB on this device only. Export/import moves them between
// devices or keeps a backup, since nothing is synced.

export interface Bookmark {
  /** Route path: "2:255", "bukhari/1". Unique. */
  path: string;
  kind: 'ayah' | 'hadith';
  label: string;
  sublabel: string;
  /** Short text shown in the list. */
  text: string;
  tags: string[];
  created: number;
}

const DB = 'mufahras';
const STORE = 'bookmarks';

let dbPromise: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'path' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Newest first. */
export const bookmarks = $state<{ list: Bookmark[]; ready: boolean; error: string }>({ list: [], ready: false, error: '' });

const sort = () => bookmarks.list.sort((a, b) => b.created - a.created);

export async function loadBookmarks(): Promise<void> {
  try {
    bookmarks.list = await tx('readonly', (s) => s.getAll() as IDBRequest<Bookmark[]>);
    sort();
  } catch {
    bookmarks.error = "Bookmarks can't be saved in this browser mode (private browsing or blocked storage).";
  }
  bookmarks.ready = true;
}

export const isBookmarked = (path: string) => bookmarks.list.some((b) => b.path === path);

async function put(b: Bookmark): Promise<void> {
  await tx('readwrite', (s) => s.put($state.snapshot(b)));
  const i = bookmarks.list.findIndex((x) => x.path === b.path);
  if (i >= 0) bookmarks.list[i] = b;
  else bookmarks.list.unshift(b);
  sort();
}

export async function toggleBookmark(b: Omit<Bookmark, 'tags' | 'created'>): Promise<void> {
  if (isBookmarked(b.path)) {
    await tx('readwrite', (s) => s.delete(b.path));
    bookmarks.list = bookmarks.list.filter((x) => x.path !== b.path);
  } else await put({ ...b, tags: [], created: Date.now() });
}

export async function removeBookmark(path: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(path));
  bookmarks.list = bookmarks.list.filter((x) => x.path !== path);
}

export async function setTags(path: string, tags: string[]): Promise<void> {
  const b = bookmarks.list.find((x) => x.path === path);
  if (b) await put({ ...b, tags: [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort() });
}

export const allTags = () => [...new Set(bookmarks.list.flatMap((b) => b.tags))].sort();

export function exportBookmarks(): void {
  const blob = new Blob([JSON.stringify({ app: 'mufahras', version: 1, bookmarks: $state.snapshot(bookmarks.list) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mufahras-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Merges an exported file into the current bookmarks; returns how many were added or updated. */
export async function importBookmarks(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as { bookmarks?: unknown };
  if (!Array.isArray(data.bookmarks)) throw new Error('Not a Mufahras bookmarks file.');
  let n = 0;
  for (const raw of data.bookmarks as Partial<Bookmark>[]) {
    if (typeof raw.path !== 'string' || (raw.kind !== 'ayah' && raw.kind !== 'hadith')) continue;
    const existing = bookmarks.list.find((b) => b.path === raw.path);
    await put({
      path: raw.path,
      kind: raw.kind,
      label: String(raw.label ?? raw.path),
      sublabel: String(raw.sublabel ?? ''),
      text: String(raw.text ?? '').slice(0, 400),
      tags: [...new Set([...(existing?.tags ?? []), ...(Array.isArray(raw.tags) ? raw.tags.map(String) : [])])],
      created: existing?.created ?? (Number(raw.created) || Date.now()),
    });
    n++;
  }
  return n;
}
