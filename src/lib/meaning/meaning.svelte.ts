// Main-thread side of search by meaning. The worker starts only when the feature is switched on (or the
// menu asks whether its files are stored), so the app pays nothing for it otherwise. Only the latest
// query gets an answer; earlier ones resolve to null.
import { MEANING_CACHE } from '../data/fetch';
import type { MeaningHit, MeaningRequest, MeaningResponse, MeaningStatus } from './meaning-worker';

export const meaning = $state<{ status: MeaningStatus }>({ status: { state: 'idle', stored: false, loaded: 0, total: 0 } });

let worker: Worker | undefined;
let latest = 0;
const waiting = new Map<number, (hits: MeaningHit[] | null) => void>();

function connect(start: boolean): Worker {
  if (worker) {
    if (start) send({ type: 'start' });
    return worker;
  }
  worker = new Worker(new URL('./meaning-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<MeaningResponse>) => {
    const msg = e.data;
    if (msg.type === 'status') meaning.status = msg.status;
    else {
      for (const [id, resolve] of waiting) if (id <= msg.id) resolve(id === msg.id ? msg.hits : null);
      for (const id of [...waiting.keys()]) if (id <= msg.id) waiting.delete(id);
    }
  };
  send({ type: 'init', base: new URL('data/', document.baseURI).href, start });
  return worker;
}

const send = (msg: MeaningRequest) => worker?.postMessage(msg);

/** Learn whether the files are stored and how big they are, without loading anything. */
export function checkMeaning(): void {
  connect(false);
}

/** Download what's missing and load the model; queries sent meanwhile are answered once it's ready. */
export function startMeaning(): void {
  // Ask the browser not to evict ~50 MB under storage pressure (granted silently or not at all).
  void navigator.storage?.persist?.().catch(() => false);
  connect(true);
}

/** Stop and free the memory the model holds; the downloaded files stay. */
export function stopMeaning(): void {
  worker?.terminate();
  worker = undefined;
  for (const resolve of waiting.values()) resolve(null);
  waiting.clear();
  meaning.status = { ...meaning.status, state: 'idle', loaded: 0 };
}

/**
 * Stop, then delete the downloaded files. Stopping first ends a download still under way, so none of
 * its files can land in the cache after the delete.
 */
export async function removeMeaning(): Promise<void> {
  stopMeaning();
  if (typeof caches !== 'undefined') await caches.delete(MEANING_CACHE).catch(() => {});
  meaning.status = { ...meaning.status, stored: false };
}

/** The closest texts to this query, best first; null if a newer query was sent meanwhile. */
export function searchMeaning(text: string, limit = 60): Promise<MeaningHit[] | null> {
  connect(true);
  const id = ++latest;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    send({ type: 'query', id, text, limit });
  });
}
