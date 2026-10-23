// Search worker: loads the data chunks, builds the engine, answers queries and detail requests.
// The main thread only renders.
// Load order: Quran (searchable as soon as it arrives) → transliteration → hadith books (English).
// Hadith Arabic loads per book on demand: the first Arabic query loads all six, opening a hadith
// loads that book's. Each time a chunk lands, the latest query is re-run so results fill in.
/// <reference lib="webworker" />
import type { Detail, DetailRequest } from '../data/views';
import { HADITH_BOOKS, type HadithArabicChunk, type HadithBookId, type HadithChunk, type Manifest, type QuranChunk, type TranslitChunk } from '../data/types';
import { SearchEngine } from './engine';
import type { SearchOptions, SearchResponse } from './types';

export type WorkerRequest =
  | { type: 'init'; base: string }
  | { type: 'search'; id: number; query: string; opts: SearchOptions }
  | { type: 'detail'; id: number; req: DetailRequest };

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
  | { type: 'detail'; id: number; detail: Detail | null };

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
  const res = await fetch(new URL(info.file, base));
  if (!res.ok) throw new Error(`${info.file}: HTTP ${res.status}`);
  const data: unknown = await res.json();

  if (name === 'quran') engine.addQuran(data as QuranChunk);
  else if (name === 'translit') engine.addTranslit(data as TranslitChunk);
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

async function init(): Promise<void> {
  const t0 = performance.now();
  manifest = fetch(new URL('manifest.json', base)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest.json: HTTP ${r.status}`))));
  await ensure('quran');
  status.quranMs = Math.round(performance.now() - t0);
  post({ type: 'status', status: { ...status } });
  await ensure('translit');
  await Promise.all(HADITH_BOOKS.map((b) => ensure(`hadith-${b}`)));
  status.ready = true;
  post({ type: 'status', status: { ...status } });
  if (latest) runSearch(latest);
}

async function detail(req: DetailRequest): Promise<Detail | null> {
  if (req.kind === 'hadith') await ensure(req.arabic ? `hadith-${req.book}-ar` : `hadith-${req.book}`);
  else await ensure('quran');
  if (req.kind === 'ayah') await ensure('translit');
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
