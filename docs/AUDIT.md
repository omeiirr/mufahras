# Audit notes (2026-10-24)

Whole-repo audit. Load assumed: one person on one device, often a phone on a weak connection.
Overall healthy; one real bug, the rest small.

**All fixed on 2026-10-25**, including item 9, found while fixing the others.

## Must fix

1. ✅ **A failed download is remembered for the whole session** (`src/lib/search/worker.ts:75-82`)
   `ensure(name)` caches the load promise, including a rejected one. A network blip while
   `hadith-muslim` loads leaves Muslim out of search, `ready` never true, and every Muslim hadith
   "not found" until reload.
   Fix: in `ensure`, `p.catch(() => chunks.delete(name));`

## Should fix

2. ✅ **A broken `%` in the link gives a blank page** (`src/lib/router.svelte.ts:240`)
   `decodeURIComponent` throws `URIError` on e.g. `#/50%`, at module load, so the app never starts.
   Fix: drop `decodeURIComponent` (`format()` never encodes the path), or wrap it in try/catch.

3. ✅ **IndoPak text built and deployed, never used** (`scripts/build-data.ts:217,508`,
   `src/lib/data/types.ts:35`, `tests/data.test.ts:32`)
   1.4 MB per deploy for a display option that doesn't exist yet.
   Fix: remove the two build lines, the type and the test argument until the option ships.

4. ✅ **Dead code** (`src/lib/search/engine.ts:174-180`, `src/lib/search/worker.ts:53,179,183`)
   `hasHadith()`, `hasHadithArabic()` and `LoadStatus.quranMs` have no readers anywhere.
   Fix: delete (~12 lines).

5. ✅ **Same lookup copied 5 times, date hash copied twice** (`src/lib/search/engine.ts:391, 561, 603,
   621, 800`; `687`, `719`)
   Ayah index → surah via `q.surahs.find(...)`, and the FNV hash for verse/hadith of the day.
   Fix: one private `surahOf(i)` and one `dateHash(date)`, used everywhere.

## Smaller items (edge cases, low priority)

6. ✅ **Overlap counter wraps past 255 words** (`src/lib/search/engine.ts:364`): `count` is a
   `Uint8Array`, so a pasted text with more than 255 distinct content words never matches.
7. ✅ **Imported bookmark tags aren't normalized** (`src/lib/store/bookmarks.svelte.ts:105`): unlike
   `setTags`, they aren't trimmed or lowercased, so "Patience" and "patience" can both exist.
8. ✅ **Removing search by meaning mid-download** (`src/lib/meaning/meaning.svelte.ts:103`): an
   in-flight download can put a file back into the cache after it was deleted.

## Found later

9. ✅ **A very long pasted passage is slow to search** (`src/lib/search/engine.ts`, `overlap`): every
   content word is matched (with typos) against the whole index, so a 1,322-word passage takes about
   4.5 s on a laptop, more on a phone. Fixed: past 40 content words, the strict pass uses the 20 rarest
   and the overlap pass the 60 rarest (about 0.2 s); all words are still highlighted.

## Not checked

Most Svelte components (read only `App`, `DetailPane`, `DailyVerse`), `card/render.ts`,
`GraphPage`, `build-data.ts` and `build-meaning.ts` in depth, eval notebooks, `video/`, e2e specs.
Tests and build were not run.

Lean: about -25 lines and -1.4 MB per deploy possible; no dependencies to remove.
