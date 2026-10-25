// Fetching for the workers. They store what they fetch in Cache Storage themselves rather than relying on
// the service worker: a worker started before the service worker took control (the first visit) isn't
// intercepted by it.
import type { Manifest } from './types';

// Runtime cache names, see vite.config.ts.
export const DATA_CACHE = 'mufahras-data';
/** Search by meaning keeps everything it downloads here, so removing it is one cache delete. */
export const MEANING_CACHE = 'mufahras-meaning';
export const MANIFEST_CACHE = 'mufahras-manifest';

const hasCaches = () => typeof caches !== 'undefined';

/** The manifest is network-first (so new data is picked up), with a cached copy for offline use. */
export async function fetchManifest(base: string): Promise<Manifest> {
  const url = new URL('manifest.json', base);
  let res: Response | undefined;
  try {
    res = await fetch(url);
  } catch {
    res = hasCaches() ? await caches.match(url) : undefined;
  }
  if (!res?.ok) throw new Error(`manifest.json: ${res ? `HTTP ${res.status}` : 'offline and not cached'}`);
  if (hasCaches())
    await caches
      .open(MANIFEST_CACHE)
      .then((c) => c.put(url, res.clone()))
      .catch(() => {});
  return res.json();
}

/**
 * A file's bytes, from the named cache if it's there, otherwise downloaded (reporting bytes as they
 * arrive) and stored. For files whose names change with their content, so a cached copy is never stale.
 */
export async function cachedBytes(url: string, cacheName: string, onProgress?: (bytes: number) => void): Promise<Uint8Array> {
  const cache = hasCaches() ? await caches.open(cacheName).catch(() => undefined) : undefined;
  const hit = await cache?.match(url);
  if (hit) {
    const bytes = new Uint8Array(await hit.arrayBuffer());
    onProgress?.(bytes.length);
    return bytes;
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url.split('/').pop()}: HTTP ${res.status}`);
  const parts: Uint8Array[] = [];
  let got = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    onProgress?.(got);
  }
  const bytes = new Uint8Array(got);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  await cache?.put(url, new Response(bytes)).catch(() => {}); // storage full or blocked: still usable now
  return bytes;
}
