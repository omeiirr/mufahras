// Search worker: loads the data chunks, builds the engine, answers queries and detail requests.
// The main thread only renders.
// Load order: Quran (searchable as soon as it arrives) → transliteration → hadith books (English).
// Hadith Arabic loads per book on demand: the first Arabic query loads all six, opening a hadith
// loads that book's. Each time a chunk lands, the latest query is re-run so results fill in.
/// <reference lib="webworker" />
import type { Detail, DetailRequest } from '../data/views';
import {
  HADITH_BOOKS,
  type HadithArabicChunk,
  type HadithBookId,
  type HadithChunk,
  type Manifest,
  type MutashabihatChunk,
  type QuranChunk,
  type SimilarChunk,
  type TafsirChunk,
  type Theme,
  type Topic,
  type TranslitChunk,
  type GraphChunk,
  type WordsChunk,
  type NamesOfAllahChunk,
} from '../data/types';
import { DATA_CACHE, fetchManifest } from '../data/fetch';
import { SearchEngine } from './engine';
import type { DocRef, PresentedHit, SearchOptions, SearchResponse } from './types';

export type WorkerRequest =
  | { type: 'init'; base: string }
  | { type: 'search'; id: number; query: string; opts: SearchOptions }
  | { type: 'detail'; id: number; req: DetailRequest }
  | { type: 'offline'; id: number; download: boolean }
  /** Search-by-meaning results (texts found by the meaning worker), to be filtered and prepared for display. */
  | { type: 'present'; id: number; refs: DocRef[]; opts: SearchOptions };

/** How much of the data is stored for offline use (by the service worker's caches). */
export interface OfflineStatus {
  /** Cache Storage exists and a service worker controls the page; otherwise nothing is stored. */
  supported: boolean;
  cached: number;
  total: number;
  /** Bytes still to download for everything to work offline. */
  missingBytes: number;
}

export interface LoadStatus {
  /** Chunks loaded so far, by manifest name. */
  loaded: string[];
  /** Everything needed for full English results is loaded (Arabic hadith load on demand). */
  ready: boolean;
  /** Milliseconds from init until the Quran was searchable. */
  quranMs?: number;
  error?: string;
}

export type WorkerResponse =
  | { type: 'status'; status: LoadStatus }
  | { type: 'results'; id: number; response: SearchResponse }
  | { type: 'detail'; id: number; detail: Detail | null }
  | { type: 'offline'; id: number; offline: OfflineStatus }
  | { type: 'present'; id: number; hits: PresentedHit[] };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const engine = new SearchEngine();
const status: LoadStatus = { loaded: [], ready: false };
let base = '';
let manifest: Promise<Manifest> | undefined;
let latest: Extract<WorkerRequest, { type: 'search' }> | undefined;

const post = (msg: WorkerResponse) => ctx.postMessage(msg);

/** Each chunk is fetched and added to the engine once; callers await the same promise. */
const chunks = new Map<string, Promise<void>>();
function ensure(name: string): Promise<void> {
  let p = chunks.get(name);
  if (!p) {
    p = load(name);
    chunks.set(name, p);
  }
  return p;
}

async function load(name: string): Promise<void> {
  // Engine order matters: a book's English chunk before its Arabic.
  const arBook = /^hadith-(\w+)-ar$/.exec(name)?.[1] as HadithBookId | undefined;
  if (arBook) await ensure(`hadith-${arBook}`);
  else if (name !== 'quran') await ensure('quran');

  const info = (await manifest!).chunks[name];
  if (!info) throw new Error(`chunk ${name} missing from manifest`);
  const data: unknown = await (await fetchData(name, info.file)).json();

  if (name === 'quran') engine.addQuran(data as QuranChunk);
  else if (name === 'translit') engine.addTranslit(data as TranslitChunk);
  else if (name === 'tafsir') engine.addTafsir(data as TafsirChunk);
  else if (name === 'themes') engine.addThemes(data as Theme[]);
  else if (name === 'topics') engine.addTopics(data as Topic[]);
  else if (name === 'similar') engine.addSimilar(data as SimilarChunk);
  else if (name === 'mutashabihat') engine.addMutashabihat(data as MutashabihatChunk);
  else if (name === 'graph') engine.addGraph(data as GraphChunk);
  else if (name === 'words') engine.addWords(data as WordsChunk);
  else if (name === 'names-of-allah') engine.addNamesOfAllah(data as NamesOfAllahChunk);
  else if (arBook) engine.addHadithArabic(arBook, data as HadithArabicChunk);
  else engine.addHadith(data as HadithChunk);

  status.loaded.push(name);
  post({ type: 'status', status: { ...status } });
  if (latest) runSearch(latest);
}

function runSearch(req: Extract<WorkerRequest, { type: 'search' }>): void {
  if (!engine.hasQuran()) return; // answered once the Quran arrives
  const r = engine.search(req.query, req.opts);
  post({ type: 'results', id: req.id, response: { ...r, partial: !status.ready } });
}

// ---- offline storage

/** Verse-screen extras: tafsir, themes, topics, similar ayahs, mutashabihat. */
const EXTRA_CHUNKS = ['tafsir', 'themes', 'topics', 'similar', 'mutashabihat', 'graph'];

/** Chunks needed for everything the app does today; Arabic hadith included. */
const OFFLINE_CHUNKS = ['quran', 'translit', 'words', 'names-of-allah', ...EXTRA_CHUNKS, ...HADITH_BOOKS.map((b) => `hadith-${b}`), ...HADITH_BOOKS.map((b) => `hadith-${b}-ar`)];

/**
 * Fetches a data chunk, cache first (names are content-hashed, so a cached copy is never stale),
 * and stores it for offline use. This doesn't rely on the service worker intercepting the worker's
 * requests: a worker started before the service worker took control (the first visit) isn't.
 * quran and translit are precached by the service worker; caches.match finds them there too.
 */
async function fetchData(name: string, file: string): Promise<Response> {
  const url = new URL(file, base);
  const cached = 'caches' in self ? await caches.match(url, { ignoreSearch: true }) : undefined;
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  if ('caches' in self && name !== 'quran' && name !== 'translit')
    await caches
      .open(DATA_CACHE)
      .then((c) => c.put(url, res.clone()))
      .catch(() => {}); // storage full or blocked: still usable online
  return res;
}

/** Drops cached chunks from older builds (their hashed names are no longer in the manifest). */
async function pruneDataCache(m: Manifest): Promise<void> {
  if (!('caches' in self)) return;
  const current = new Set(Object.values(m.chunks).map((c) => c.file));
  const cache = await caches.open(DATA_CACHE);
  for (const req of await cache.keys()) {
    const file = new URL(req.url).pathname.split('/').pop()!;
    if (!current.has(file)) await cache.delete(req);
  }
}

async function offlineStatus(download: boolean): Promise<OfflineStatus> {
  const m = await manifest!;
  const supported = 'caches' in self && !!(await caches.keys()).length;
  const missing: string[] = [];
  if (supported)
    for (const name of OFFLINE_CHUNKS) {
      const url = new URL(m.chunks[name]!.file, base).href;
      if (!(await caches.match(url, { ignoreSearch: true }))) missing.push(name);
    }
  if (download && supported) {
    // Stored, not parsed, so memory stays low; the engine loads them when needed.
    for (const name of missing.splice(0)) await (await fetchData(name, m.chunks[name]!.file)).arrayBuffer();
  }
  return {
    supported,
    cached: OFFLINE_CHUNKS.length - missing.length,
    total: OFFLINE_CHUNKS.length,
    missingBytes: missing.reduce((n, name) => n + m.chunks[name]!.gzipBytes, 0),
  };
}

async function init(): Promise<void> {
  const t0 = performance.now();
  manifest = fetchManifest(base);
  manifest.then(pruneDataCache).catch(() => {});
  await ensure('quran');
  status.quranMs = Math.round(performance.now() - t0);
  post({ type: 'status', status: { ...status } });
  await ensure('translit');
  await Promise.all(HADITH_BOOKS.map((b) => ensure(`hadith-${b}`)));
  status.ready = true;
  post({ type: 'status', status: { ...status } });
  if (latest) runSearch(latest);
  // Topic names give search its topic chips; small, so fetched right away.
  await ensure('topics');
}

async function detail(req: DetailRequest): Promise<Detail | null> {
  if (req.kind === 'hadith') await ensure(req.arabic ? `hadith-${req.book}-ar` : `hadith-${req.book}`);
  else if (req.kind === 'section') await ensure(`hadith-${req.book}`);
  else await ensure('quran');
  if (req.kind === 'ayah' || req.kind === 'daily') await ensure('translit');
  if (req.kind === 'topic') await ensure('topics');
  if (req.kind === 'graph') await ensure('graph');
  if (req.kind === 'words') await ensure('words');
  if (req.kind === 'topics') await ensure('topics');
  if (req.kind === 'names-of-allah') await ensure('names-of-allah');
  if (req.kind === 'phrases') await ensure('mutashabihat');
  if (req.kind === 'hadith-daily') await Promise.all([ensure('hadith-bukhari'), ensure('hadith-muslim')]);
  if (req.kind === 'books') await Promise.all(HADITH_BOOKS.map((b) => ensure(`hadith-${b}`)));
  if (req.kind === 'ayah' && req.extra) await Promise.all(EXTRA_CHUNKS.map(ensure));
  return engine.detail(req);
}

function fail(err: Error): void {
  status.error = err.message;
  post({ type: 'status', status: { ...status } });
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    base = msg.base;
    init().catch(fail);
  } else if (msg.type === 'offline') {
    offlineStatus(msg.download)
      .then((offline) => post({ type: 'offline', id: msg.id, offline }))
      .catch((err: Error) => {
        fail(err);
        post({ type: 'offline', id: msg.id, offline: { supported: false, cached: 0, total: 0, missingBytes: 0 } });
      });
  } else if (msg.type === 'present') {
    const books = [...new Set(msg.refs.flatMap((r) => (r.kind === 'hadith' ? [r.book] : [])))];
    Promise.all([ensure('quran'), ...books.map((b) => ensure(`hadith-${b}`))])
      .then(() => post({ type: 'present', id: msg.id, hits: engine.presentRefs(msg.refs, msg.opts, msg.opts.limit) }))
      .catch((err: Error) => {
        fail(err);
        post({ type: 'present', id: msg.id, hits: [] });
      });
  } else if (msg.type === 'detail') {
    detail(msg.req)
      .then((d) => post({ type: 'detail', id: msg.id, detail: d }))
      .catch((err: Error) => {
        fail(err);
        post({ type: 'detail', id: msg.id, detail: null });
      });
  } else {
    latest = msg;
    if (/[؀-ۿ]/.test(msg.query) && msg.opts.corpus !== 'quran')
      for (const b of HADITH_BOOKS) ensure(`hadith-${b}-ar`).catch(fail);
    runSearch(msg);
  }
};
