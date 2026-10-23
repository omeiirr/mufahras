// Hash router. URL shape: #/<path>?q=…&in=quran&sahih=1
//   path ''            search only
//   '2:255'            verse
//   'surah/2[/255]'    surah reader (optionally scrolled to an ayah)
//   'surahs'           surah index
//   'bukhari/1'        hadith
//   'bukhari/book/30'  a chapter (book) of a hadith collection
//   'topic/1651'       a QUL topic
// The search state lives in the query string on every route, so the desktop layout can show results
// and a detail side by side, and Back on a phone returns to the same results.
import { HADITH_BOOKS, type HadithBookId } from './data/types';
import type { DetailRequest } from './data/views';

export type Corpus = 'all' | 'quran' | 'hadith';

export interface RouteState {
  path: string;
  q: string;
  corpus: Corpus;
  sahih: boolean;
}

function parse(hash: string): RouteState {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?', 2);
  const params = new URLSearchParams(query);
  const corpus = params.get('in');
  return {
    path: decodeURIComponent(path),
    q: params.get('q') ?? '',
    corpus: corpus === 'quran' || corpus === 'hadith' ? corpus : 'all',
    sahih: params.get('sahih') === '1',
  };
}

function format(s: RouteState): string {
  const params = new URLSearchParams();
  if (s.q) params.set('q', s.q);
  if (s.corpus !== 'all') params.set('in', s.corpus);
  if (s.sahih) params.set('sahih', '1');
  const query = params.toString();
  return `#/${s.path}${query ? `?${query}` : ''}`;
}

/**
 * Text shared into the app (Android share target) arrives as ?text=…&title=…&url=… on the start URL.
 * Turn it into a search and move it to the hash so the rest of the app sees a normal route.
 */
function takeSharedText(): void {
  const params = new URLSearchParams(location.search);
  if (!['text', 'title', 'url'].some((k) => params.has(k))) return;
  const raw = params.get('text') || params.get('title') || '';
  const q = raw
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/["“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  history.replaceState(null, '', `${location.pathname}${format({ path: '', q, corpus: 'all', sahih: false })}`);
}
takeSharedText();

export const route = $state<RouteState>(parse(location.hash));

// Each entry this app pushes records its depth in history.state, so Back knows whether the previous
// entry is ours (depth > 0) or the page was opened straight on a detail link.
const depth = (): number => (history.state as { depth?: number } | null)?.depth ?? 0;

export function navigate(patch: Partial<RouteState>, opts: { replace?: boolean } = {}): void {
  const next = { ...route, ...patch };
  const url = format(next);
  if (url === location.hash) return;
  if (opts.replace) history.replaceState({ depth: depth() }, '', url);
  else history.pushState({ depth: depth() + 1 }, '', url);
  Object.assign(route, next);
}

/** Back to the results: pops our own entry when there is one, otherwise replaces (deep links). */
export function back(): void {
  if (depth() > 0) history.back();
  else navigate({ path: '' }, { replace: true });
}

addEventListener('popstate', () => Object.assign(route, parse(location.hash)));
addEventListener('hashchange', () => Object.assign(route, parse(location.hash)));

const BOOK_SET = new Set<string>(HADITH_BOOKS);

/** The detail screen a path points to, plus an ayah to scroll to in the surah reader. */
export function detailFor(path: string): { req: DetailRequest; scrollTo?: number } | null {
  let m = /^(\d{1,3}):(\d{1,3})$/.exec(path);
  if (m) return { req: { kind: 'ayah', surah: Number(m[1]), ayah: Number(m[2]) } };
  m = /^surah\/(\d{1,3})(?:\/(\d{1,3}))?$/.exec(path);
  if (m) return { req: { kind: 'surah', surah: Number(m[1]) }, scrollTo: m[2] ? Number(m[2]) : undefined };
  if (path === 'surahs') return { req: { kind: 'surahs' } };
  if (path === 'graph' || path.startsWith('graph/')) return { req: { kind: 'graph' } };
  m = /^topic\/(\d+)$/.exec(path);
  if (m) return { req: { kind: 'topic', id: Number(m[1]) } };
  m = /^(\w+)\/book\/(\d+)$/.exec(path);
  if (m && BOOK_SET.has(m[1]!)) return { req: { kind: 'section', book: m[1] as HadithBookId, n: Number(m[2]) } };
  m = /^(\w+)\/(\d+(?:\.\d+)?)$/.exec(path);
  if (m && BOOK_SET.has(m[1]!)) return { req: { kind: 'hadith', book: m[1] as HadithBookId, number: Number(m[2]) } };
  return null;
}
