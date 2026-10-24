// Search-by-meaning worker: downloads (once) and loads the model, its runtime and the vectors, then
// answers queries with the closest verses and hadith. Separate from the search worker, so word search
// never waits on it and the ~50 MB it holds can be released by ending this worker.
// Everything it downloads is kept in its own cache (MEANING_CACHE), so "Remove" is one cache delete.
// The runtime code is imported only on start: checking what's stored (the menu does) stays light.
/// <reference lib="webworker" />
// ONNX Runtime's WebAssembly, as an asset Vite emits with a content hash (the runtime's own reference to
// it resolves to the same file); fetched here, so it's cached and counted in the download progress.
import runtimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { cachedBytes, fetchManifest } from '../data/fetch';
import type { Manifest, MeaningChunk } from '../data/types';
import type { DocRef } from '../search/types';
import type { Embedder } from './embed';
import { refOfRow } from './rows';
import type { Scorer } from './score';

export const MEANING_CACHE = 'mufahras-meaning';

export interface MeaningStatus {
  /** idle: nothing loaded (files may be stored); downloading/loading: after start; ready: answering queries. */
  state: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  /** Every file is in the cache, so starting needs no download. */
  stored: boolean;
  /** Bytes, uncompressed: downloaded so far / everything. */
  loaded: number;
  total: number;
  /** Bytes the download costs over the wire, compressed (an estimate). */
  download?: number;
  error?: string;
  /** Scoring runs in WebAssembly SIMD (otherwise plain JS). */
  simd?: boolean;
}

export interface MeaningHit {
  ref: DocRef;
  score: number;
}

export type MeaningRequest =
  | { type: 'init'; base: string; start: boolean }
  | { type: 'start' }
  | { type: 'query'; id: number; text: string; limit: number }
  | { type: 'remove' };

export type MeaningResponse =
  | { type: 'status'; status: MeaningStatus }
  | { type: 'results'; id: number; hits: MeaningHit[]; ms: number }
  | { type: 'removed' };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: MeaningResponse) => ctx.postMessage(msg);

let base = '';
let files: { url: string; bytes: number }[] = [];
let meta: MeaningChunk | undefined;
let meta$: Promise<void> | undefined;
let started: Promise<void> | undefined;
let embedder: Embedder | undefined;
let scorer: Scorer | undefined;
let pending: Extract<MeaningRequest, { type: 'query' }> | undefined;
const status: MeaningStatus = { state: 'idle', stored: false, loaded: 0, total: 0 };
const report = () => post({ type: 'status', status: { ...status } });

/** What there is to download, whether it's stored already; drops files of older builds from the cache. */
async function readMeta(): Promise<void> {
  const manifest: Manifest = await fetchManifest(base);
  const layout = manifest.chunks.meaning;
  const vectors = manifest.chunks['meaning-vectors'];
  if (!layout || !vectors) throw new Error('search by meaning is not in this build');
  const metaUrl = new URL(layout.file, base).href;
  meta = JSON.parse(new TextDecoder().decode(await cachedBytes(metaUrl, MEANING_CACHE)));
  const models = new URL('../models/', base);
  files = [
    { url: new URL(runtimeUrl, import.meta.url).href, bytes: meta!.model.runtime },
    ...meta!.model.files.map(([path, bytes]) => ({ url: new URL(`${meta!.model.dir}/${path}`, models).href, bytes })),
    { url: new URL(vectors.file, base).href, bytes: vectors.bytes },
  ];
  status.total = files.reduce((n, f) => n + f.bytes, 0);
  status.download = meta!.download;
  const cache = await caches.open(MEANING_CACHE);
  const current = new Set([metaUrl, ...files.map((f) => f.url)]);
  for (const req of await cache.keys()) if (!current.has(req.url)) await cache.delete(req);
  status.stored = (await Promise.all(files.map((f) => cache.match(f.url)))).every(Boolean);
  report();
}

async function start(): Promise<void> {
  await meta$;
  status.state = 'downloading';
  status.error = undefined;
  report();
  const done = new Array<number>(files.length).fill(0);
  let last = 0;
  const bytes = await Promise.all(
    files.map((f, k) =>
      cachedBytes(f.url, MEANING_CACHE, (n) => {
        done[k] = n;
        status.loaded = done.reduce((a, b) => a + b, 0);
        if (performance.now() - last > 200) {
          last = performance.now();
          report();
        }
      }),
    ),
  );
  status.stored = true;
  status.state = 'loading';
  report();

  const [runtime, model, tokenizerJson, tokenizerConfig, vectors] = bytes as [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
  const [ort, { Embedder }, { Scorer }] = await Promise.all([import('onnxruntime-web/wasm'), import('./embed'), import('./score')]);
  ort.env.wasm.wasmBinary = runtime;
  ort.env.wasm.numThreads = 1; // threads need cross-origin isolation, which GitHub Pages can't enable
  const json = (b: Uint8Array) => JSON.parse(new TextDecoder().decode(b));
  embedder = await Embedder.create(ort, model, json(tokenizerJson), json(tokenizerConfig));
  scorer = new Scorer(new Int8Array(vectors.buffer, vectors.byteOffset, vectors.length), meta!.dims, meta!.scale);
  status.simd = scorer.simd;
  status.state = 'ready';
  report();
  if (pending) void answer(pending);
}

async function answer(q: Extract<MeaningRequest, { type: 'query' }>): Promise<void> {
  if (!embedder || !scorer) {
    pending = q; // answered once loaded
    return;
  }
  pending = undefined;
  const t0 = performance.now();
  const v = await embedder.embed(meta!.queryPrefix + q.text);
  const hits = scorer.top(v, q.limit).map(({ index, score }) => ({ ref: refOfRow(meta!, index), score }));
  post({ type: 'results', id: q.id, hits, ms: performance.now() - t0 });
}

function fail(err: unknown): void {
  status.state = 'error';
  status.error = err instanceof Error ? err.message : String(err);
  started = undefined;
  report();
}

ctx.onmessage = (e: MessageEvent<MeaningRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    base = msg.base;
    meta$ = readMeta();
    meta$.catch(fail);
    if (msg.start) started = start().catch(fail);
  } else if (msg.type === 'start') {
    started ??= start().catch(fail);
  } else if (msg.type === 'query') {
    void answer(msg).catch(fail);
  } else {
    caches
      .delete(MEANING_CACHE)
      .catch(() => {})
      .then(() => post({ type: 'removed' }));
  }
};
