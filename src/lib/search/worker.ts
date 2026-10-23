// Search worker: loads the data chunks, builds the engine, answers queries. The main thread only renders.
// Load order: Quran (searchable as soon as it arrives) → transliteration → hadith books (English).
// Hadith Arabic loads on the first Arabic query. Each time a chunk lands, the latest query is re-run
// so results fill in while loading.
/// <reference lib="webworker" />
import { HADITH_BOOKS, type HadithArabicChunk, type HadithChunk, type Manifest, type QuranChunk, type TranslitChunk } from '../data/types';
import { SearchEngine } from './engine';
import type { SearchOptions, SearchResponse } from './types';

export type WorkerRequest = { type: 'init'; base: string } | { type: 'search'; id: number; query: string; opts: SearchOptions };

export interface LoadStatus {
  /** Chunks loaded so far, by manifest name. */
  loaded: string[];
  /** Everything needed for full English results is loaded (Arabic hadith load on demand). */
  ready: boolean;
  /** Milliseconds from init until the Quran was searchable. */
  quranMs?: number;
  error?: string;
}

export type WorkerResponse = { type: 'status'; status: LoadStatus } | { type: 'results'; id: number; response: SearchResponse };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const engine = new SearchEngine();
const status: LoadStatus = { loaded: [], ready: false };
let base = '';
let manifest: Manifest | undefined;
let latest: Extract<WorkerRequest, { type: 'search' }> | undefined;
let arabicRequested = false;

const post = (msg: WorkerResponse) => ctx.postMessage(msg);

async function fetchChunk<T>(name: string): Promise<T> {
  const info = manifest!.chunks[name];
  if (!info) throw new Error(`chunk ${name} missing from manifest`);
  const res = await fetch(new URL(info.file, base));
  if (!res.ok) throw new Error(`${info.file}: HTTP ${res.status}`);
  return res.json();
}

function loaded(name: string): void {
  status.loaded.push(name);
  post({ type: 'status', status: { ...status } });
  if (latest) runSearch(latest);
}

function runSearch(req: Extract<WorkerRequest, { type: 'search' }>): void {
  if (!status.loaded.includes('quran')) return; // answered once the Quran arrives
  const r = engine.search(req.query, req.opts);
  post({ type: 'results', id: req.id, response: { ...r, partial: !status.ready } });
}

async function init(): Promise<void> {
  const t0 = performance.now();
  const res = await fetch(new URL('manifest.json', base));
  if (!res.ok) throw new Error(`manifest.json: HTTP ${res.status}`);
  manifest = await res.json();

  engine.addQuran(await fetchChunk<QuranChunk>('quran'));
  status.quranMs = Math.round(performance.now() - t0);
  loaded('quran');

  engine.addTranslit(await fetchChunk<TranslitChunk>('translit'));
  loaded('translit');

  // Fetch all books in parallel, index them in a fixed order as they arrive.
  const books = HADITH_BOOKS.map((b) => fetchChunk<HadithChunk>(`hadith-${b}`));
  for (const [i, b] of HADITH_BOOKS.entries()) {
    engine.addHadith(await books[i]!);
    if (i === HADITH_BOOKS.length - 1) status.ready = true;
    loaded(`hadith-${b}`);
  }
  if (arabicRequested) void loadArabic();
}

let arabicLoading = false;
async function loadArabic(): Promise<void> {
  if (arabicLoading || !status.ready) return;
  arabicLoading = true;
  for (const b of HADITH_BOOKS) {
    if (engine.hasHadithArabic(b)) continue;
    engine.addHadithArabic(b, await fetchChunk<HadithArabicChunk>(`hadith-${b}-ar`));
    loaded(`hadith-${b}-ar`);
  }
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    base = msg.base;
    init().catch((err: Error) => {
      status.error = err.message;
      post({ type: 'status', status: { ...status } });
    });
    return;
  }
  latest = msg;
  if (/[؀-ۿ]/.test(msg.query) && msg.opts.corpus !== 'quran') {
    arabicRequested = true;
    void loadArabic();
  }
  runSearch(msg);
};
