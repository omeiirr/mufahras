# Mufahras: technical notes

What we learned building Mufahras, a fuzzy, offline, in-browser search over the Quran and six hadith collections.
It's written for whoever works on this next (including us, later): the decisions, the dead ends, and the bugs
that taught us something. [PLAN.md](../PLAN.md) has the roadmap and the decisions; this file has the reasons
and the details.

Contents

1. [Architecture](#1-architecture)
2. [Data: sources and their quirks](#2-data-sources-and-their-quirks)
3. [The data pipeline](#3-the-data-pipeline)
4. [Normalizing Arabic and Latin text](#4-normalizing-arabic-and-latin-text)
5. [The search engine](#5-the-search-engine)
6. [Making it fast](#6-making-it-fast)
7. [References, aliases and the source finder](#7-references-aliases-and-the-source-finder)
8. [The worker and progressive loading](#8-the-worker-and-progressive-loading)
9. [Offline and installable](#9-offline-and-installable)
10. [UI: Svelte 5, routing and layout](#10-ui-svelte-5-routing-and-layout)
11. [Typesetting Arabic](#11-typesetting-arabic)
12. [Themes, colour and contrast](#12-themes-colour-and-contrast)
12b. [Personal features: bookmarks, history, cards, the drawer](#12b-personal-features-bookmarks-history-cards-the-drawer)
13. [The similar-verses graph](#13-the-similar-verses-graph)
14. [Icons and link previews](#14-icons-and-link-previews)
15. [Testing](#15-testing)
16. [Lessons, in one list](#16-lessons-in-one-list)

---

## 1. Architecture

Everything runs on the device. There is no server: GitHub Pages serves static files, and a Web Worker does all
the searching.

```
                 build time                                        run time (browser)
┌──────────────────────────────────────────┐      ┌─────────────────────────────────────────────────┐
│ data-src/qul/*.zip  (manual QUL downloads)│      │ main thread (Svelte)        Web Worker            │
│ data-src/hadith/*.json (fetched, pinned)  │      │ ┌──────────────┐  search  ┌──────────────────┐  │
│            │                              │      │ │ App, router, │ ───────▶ │ SearchEngine     │  │
│            ▼                              │      │ │ views        │ ◀─────── │  word indexes    │  │
│ scripts/build-data.ts                     │      │ └──────────────┘ results  │  Enrichment      │  │
│  validate · normalize · lay out graph     │      │                  detail   │  chunk loader    │  │
│            ▼                              │      │                           └────────┬─────────┘  │
│ public/data/<name>.<hash>.json + manifest │ ───▶ │  service worker: precache app + Quran; data ◀─┘  │
└──────────────────────────────────────────┘      │  chunks cached by the worker itself (cache-first) │
                                                  └─────────────────────────────────────────────────┘
```

- **Stack:** Svelte 5 + TypeScript + Vite, [uFuzzy](https://github.com/leeoniya/uFuzzy) for fuzzy matching,
  vite-plugin-pwa (Workbox) for offline, d3-force at build time only. No UI kit, no CSS framework.
- **Main bundle:** ~46 KB gzipped (37 KB before bookmarks, cards and the menu). The graph page (~4 KB) is a
  separate chunk loaded when opened.
- **Data:** content-hashed JSON chunks (Quran 586 KB gzipped; each hadith book 0.4–1.1 MB English and
  0.6–1.3 MB Arabic; ~12 MB everything).

## 2. Data: sources and their quirks

| Source | Used for | Notes |
|---|---|---|
| [QUL](https://qul.tarteel.ai/resources) (Tarteel) | Quran text, Saheeh International, transliteration, tafsir, topics, themes, similar ayahs, mutashabihat | Downloads need a free account, so they're committed to `data-src/qul/` |
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | Six hadith books, English + Arabic, gradings | Unlicense; fetched from jsDelivr at a pinned commit |

Things that cost us time, so they don't cost you any:

- **A file named `.json.bz2` is really a zip.** Detect by content, not extension (`file` says so).
- **QUL's Uthmani text is word-level** (`surah:ayah:word`), and the last "word" is the ayah-number glyph
  (`٢٥٥`). One ayah (2:181 in the simple script) ends with an empty word instead.
- **A QUL "word" can contain spaces.** Pause marks belong to the word before (`ٱلْقَيُّومُ ۚ`), the rub
  el-hizb sign to the word after (`۞ إِنَّ`), one word is written split (`دَآئِرَ ةٌۭ`, 5:52), one is two
  pieces (`إِلْ يَاسِينَ`, 37:130), and one sajdah sign is followed by an invisible right-to-left mark
  (27:26). We found these because a test compared our word count with QUL's for every ayah (§15).
- **Two Unicode conventions for Uthmani text.** Ours (Tanzil style) uses U+0652 for sukun and tatweel before
  the dagger alif; QUL's QPC scripts use U+06E1 and need King Fahd's QPC fonts. Any Unicode Quran font
  renders ours. Our IndoPak text uses the QPC-style marks, so it will need a matching IndoPak font.
- **Tafsir groups ayahs.** Al-Mukhtasar sometimes explains 2–4 ayahs together: the group head has
  `{text, ayah_keys}` and the others are bare strings pointing at it (`"2:4": "2:3"`).
- **Hadith numbering isn't sunnah.com's.** "The religion is sincerity" is Muslim 196 here and 55 on
  sunnah.com. Some numbers are fractional (`402.2`). Muslim has 203 numbers with no text at all; they're
  dropped and reported by the build.
- **Gradings are free text:** 1,658 distinct strings ("Sahih", "Hasan Sahih", "Daif Isnaad", "Sahih Muslim
  (1480)", "-"). See [grading buckets](#gradings) below.
- **Bukhari and Muslim have no per-hadith gradings**; the whole collection is sahih, and the UI says so.
- **QUL topics have odd corners.** Some names are fragments of a parent ("nature of", "patience during"),
  and at least one fragment is filed under an unrelated parent (topic 339 "nature of", under "Goddesses of
  the pagan Arabs", lists 2:255). The verse screen hides fragments whose parents don't contain the verse.
- **Similar-ayah data covers 1,162 ayahs**, and most pairs are listed both ways (3,552 rows → 2,336 pairs).
- **Hadith filed under section 0 aren't an introduction.** hadith-api's `reference.book` is 0 for 311 Bukhari
  hadith scattered from 299 to 7495; its `section_details` give each chapter's number range, which places 300
  of them. Muslim's section 0 mixes its real introduction (1–92) with 145 hadith that belong elsewhere.
- **The IndoPak text uses Private Use Area glyphs** (U+E003–E022, 1,383 of them) that only QUL's own IndoPak
  font draws; every other font shows empty boxes.

<a id="gradings"></a>**Grading buckets.** The original text is always shown; buckets only drive the colour and the
"Sahih only" filter. Order matters: check weakness first, so "Munkar Daif" never counts as authentic.

```ts
export function classifyGrade(grade: string): GradeClass {
  const g = grade.toLowerCase();
  if (/mawdu|batil|fabricat/.test(g)) return 'mawdu';
  if (/da['ʿ]?if|munkar|shadh|weak|ma['ʿ]?l(oo|u)l/.test(g)) return 'daif';
  if (/sahih|agreed upon|mutawatir/.test(g)) return 'sahih'; // "Hasan Sahih" is authentic
  if (/hasan/.test(g)) return 'hasan';
  return 'other'; // Maqtu, Mursal, Mauquf
}
```

When several scholars grade a hadith, the summary is the most common bucket, and **ties go to the weaker one**,
so the filter errs on the side of leaving a hadith out.

## 3. The data pipeline

`npm run data:fetch` downloads the hadith (pinned in `scripts/sources.ts`); `npm run data` builds everything
in ~10 s. The build:

1. reads QUL archives directly with `fflate` (no unzip step) and SQLite files with Node's built-in
   `node:sqlite` (written to a temp file first);
2. **validates** everything it can and fails the build on any error: every ayah present and non-empty, every
   footnote has text, every tafsir pointer lands on a group that covers it, every topic, theme, similar-ayah
   and phrase reference is a real ayah, every hadith section exists;
3. writes **content-hashed** chunks (`quran.da86f82635.json`), so they can be cached forever, plus
   `manifest.json` listing files, sizes and sources;
4. prints a size table and data notes (skipped empty hadith, grades it couldn't classify).

Shapes live in `src/lib/data/types.ts`, shared by the build and the app. Ayahs are addressed by one global index
0–6235; `Surah.start` maps a surah to its first index. Hadith rows are tuples
(`[number, section, english, grades]`) rather than objects: smaller and faster to parse.

**Splitting chunks by when they're needed** brought the first load from ~980 KB to 586 KB gzipped:

| Chunk | When |
|---|---|
| `quran` (Arabic, translation, footnotes) | immediately |
| `translit` | right after, in the background |
| `hadith-<book>` (English, gradings) | in parallel after the Quran |
| `hadith-<book>-ar` | on the first Arabic query, or when a hadith is opened |
| `tafsir`, `themes`, `topics`, `similar`, `mutashabihat`, `graph` | topics in the background; the rest on the first verse opened |

**One build-time text change** makes word positions exact (see §11): spaces *inside* a QUL word become
no-break spaces, so a plain space always separates two QUL words.

```ts
const ar = perAyah('uthmani', Object.fromEntries(wordsByAyah), (ws) =>
  ws
    .sort((a, b) => a[0] - b[0])
    .map(([, t]) => t.trim())
    .filter((t) => t !== '' && !/^[٠-٩]+$/.test(t)) // drop the ayah-number "word"
    .map((t) => t.replace(/ /g, ' '))                    // one QUL word = one space-free token
    .join(' '),
);
```

## 4. Normalizing Arabic and Latin text

Search compares normalized text; display uses the original. The same functions (`src/lib/text/normalize.ts`)
run in the build, the worker and the tests, or queries and texts drift apart.

**Latin:** drop footnote superscripts, decompose and strip diacritics (`Allāh` → `allah`, `ḥ` → `h`),
drop apostrophe-like marks, lowercase, collapse everything else to single spaces.

```ts
export function normalizeLatin(s: string): string {
  return s
    .replace(/[¹²³⁰-⁹]/g, '') // footnote markers
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ʿʾʼ'`’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
```

Drop superscripts *before* NFKD: NFKD turns `¹` into `1`, and footnote numbers would become searchable.

**Arabic:** strip harakat, Quranic annotation marks, dagger alif and tatweel; unify `أ إ آ ٱ` → `ا`,
`ى` → `ي`, `ة` → `ه`, `ؤ` → `و`, `ئ` → `ي`; drop standalone `ء`.

- **Dropping hamza was a measured decision.** Normalized Uthmani and Uthmani-simple differed in 1,995 ayahs,
  and every difference was hamza (`ءامنوا` vs `امنوا`). With hamza dropped they're identical, so we ship one
  script and search both spellings.
- **The dagger alif needs two readings.** Uthmani writes many long *ā* with a small "dagger" alif:
  `ٱلْعَـٰلَمِينَ`, `ٱلصَّلَوٰةِ`. Dropping it matches `الرحمن`; turning it into `ا` matches what people type
  for `العالمين` and `الصلاة`. Neither alone is right, so **the Quran's Arabic is indexed both ways** and a
  query matches whichever fits. `وٰ` becomes `ا` (`الصلوة` → `الصلاة`); after `ى`/`ي` the dagger is dropped.

```ts
// Every replacement keeps the string length, so the highlight mapper can apply it too.
export function daggerToAlif(s: string): string {
  return s
    .replace(/([ىي][ً-ٟ]*)ٰ/g, (_, before: string) => `${before}ـ`)
    .replace(/و([ً-ٟ]*)ٰ/g, (_, marks: string) => `ـ${marks}ا`)
    .replace(/ٰ/g, 'ا');
}
```

**Transliteration** needs its own folding. Tanzil's ASCII scheme writes ʿayn as `AA` (`baAAda`) and hamza as
`/` (`ta/khuthuhu`); people type `qayyum`, `qayyoom`, `raheem`, `rahim`. So the transliteration segment strips
Tanzil's marks and folds both the text and the query:

```ts
export const foldTranslit = (s: string) =>
  s.replace(/dh/g, 'th').replace(/oo|ou/g, 'u').replace(/ee/g, 'i').replace(/([a-z])\1+/g, '$1');
```

**Highlights need a map back to the original.** Matches are found in normalized text, but highlighted in the
display text, which has diacritics and different lengths. `normalize-map.ts` normalizes character by character
and records where each output character came from:

```ts
function build(s: string, fold: (ch: string) => string, keep: RegExp): Mapped {
  let text = '';
  const map: number[] = []; // map[j] = index in s of normalized character j
  let pendingSpace = false;
  for (let i = 0; i < s.length; ) {
    const ch = String.fromCodePoint(s.codePointAt(i)!);
    for (const out of fold(ch)) {
      if (keep.test(out)) {
        if (pendingSpace && text) (text += ' '), map.push(i);
        pendingSpace = false;
        text += out;
        map.push(i);
      } else pendingSpace = true;
    }
    i += ch.length;
  }
  return { text, map };
}
```

When mapping a range back, extend its end over trailing combining marks, so an Arabic word's harakat stay
inside the highlight. **Two implementations of one normalization will drift**, so a test checks the mapped
version produces exactly the regex version's output for every text in the data (§15): about 53,000 English and
transliteration texts and 40,000 Arabic ones. An ASCII fast path in the
mapped version (skip `normalize()` for plain characters) made highlighting several times faster.

## 5. The search engine

`src/lib/search/engine.ts` is pure: it's handed chunks and answers queries, so the worker and the tests run
the same code.

**Segments and word indexes.** Each searchable field of each collection is a *segment* (Quran English, Quran
transliteration, Quran Arabic ×2 readings, each book's English and Arabic). Each segment has an inverted
index: word → sorted, unique document ids (`Uint32Array`).

**Every term must match, in any order, at one of three tiers:**

| Tier | Match | Example |
|---|---|---|
| 3 exact | the word contains the term (1 letter: whole word; 2 letters: word prefix) | `pray` → prayer |
| 2 typo | one insertion, deletion, substitution or transposition | `patiance` → patience |
| 1 abbreviation | the term's letters in order within one word, like fzf | `ptnc` → patience |

The exact pass runs first; the fuzzy tiers are added only when it finds fewer than 20 results, so typical
keystrokes never pay for fuzzy matching.

**uFuzzy needs `alpha` for Arabic.** Its default term splitting treats non-Latin letters as separators, so an
Arabic query splits into nothing. Setting `alpha` swaps its letter class everywhere:

```ts
const ALPHA = 'a-z\\u0621-\\u064A';
const typoFuzzy = new uFuzzy({ alpha: ALPHA, intraMode: 1, intraSub: 1, intraTrn: 1, intraDel: 1, intraIns: 1 });
const abbrevFuzzy = new uFuzzy({ alpha: ALPHA, intraMode: 0, intraIns: Infinity }); // within one word
```

**Ranking** (per document; best field wins):

- weakest term tier × 30, so exact matches always outrank fuzzy ones;
- per term: +4 at a word start, +10 for a whole word;
- phrase bonus for the top 300 only (+25, +10 more on word boundaries), because it needs a text scan;
- −3·log₂(1 + length/100), so a short verse beats a long hadith with the same words;
- transliteration: +10 for an exact match, since typing Arabic in Latin letters means a verse.

Word-level quality is packed into one byte per document while merging postings:

```ts
// (tier - 1) * 3 + boundary + 1; 0 = no match, higher = better. boundary: 0 inside, 1 prefix, 2 whole word.
const quality = (tier: Tier, boundary: 0 | 1 | 2) => (tier - 1) * 3 + boundary + 1;
const tierOf = (q: number) => (Math.floor((q - 1) / 3) + 1) as Tier;
```

**Filters:** a surah filter means Quran only, a book filter means those books only (otherwise "books: Tirmidhi"
still returned Quran verses, which surprised everyone including the tests).

## 6. Making it fast

The first version took 50–170 ms per query on a laptop, which means 200–500 ms on a phone. The final one
takes ~5 ms per keystroke. In order of impact:

1. **Match terms against a vocabulary, not the text.** The fuzzy regexes were running over ~16 MB of hadith
   text. A shared vocabulary per script (~60k words) and postings lists replaced that.
2. **Scan only the first letter's slice of the vocabulary.** uFuzzy's single-error mode never changes a term's
   first letter, and we chose the same for abbreviations, so both tiers scan only words starting with it:

   ```ts
   const words = vocab.withPrefix(term[0]!); // binary search on the sorted vocabulary
   ```
3. **Rarest term first, then look up candidates instead of merging postings.** After the rarest term, few
   documents remain; checking their words against a `Map` beats merging postings of common words like "allah"
   (27,000 documents):

   ```ts
   if (active && textCost < postings) {
     for (const d of active) {
       let v = 0;
       for (const w of seg.hay[d]!.split(' ')) v = Math.max(v, words.byWord.get(w) ?? 0);
       if (v) accept(d, v);
     }
   }
   ```
4. **Cache vocabulary matches per term.** Typing changes one term at a time.
5. **Profile before optimizing.** Step 3 barely moved the numbers; the CPU profile showed the remaining cost
   was building highlights for 50 results (the mapped normalizer). An ASCII fast path and 30 results per
   page fixed it. Two of our assumptions about where the time went were wrong.

Measure warm, not cold: the first query includes JIT warm-up and empty caches. Our ranking test prints timings
for every query, so regressions are visible in CI logs.

## 7. References, aliases and the source finder

**References** (`reference.ts`) are parsed before searching and pinned as "Go to": `2:255`, `2 255-257`,
`baqarah 255`, `al imran 190`, `البقرة ٢٥٥`, `bukhari 1`, `abu dawood 402.2`. Surah names tolerate typos
(Damerau-Levenshtein ≤ ⌊len/4⌋) and spelling variants through a fold applied to both sides:

```ts
const fold = (s: string) => s.replace(/ee/g, 'i').replace(/oo|ou/g, 'u').replace(/(.)\1/g, '$1').replace(/h$/, '');
// yaseen → yasin, baqarah → baqara, aliimran → alimran
```

A bare word only becomes a surah on an exact folded match, and some words never do: "allah" folds to "ala",
which is Surah Al-A'la.

**Aliases** (`aliases.ts`) are 34 well-known names: `ayatul kursi`, `amana rasul`, `heart of the quran`,
`hadith jibril`. Checking each target's text by hand before adding it is how we found that sunnah.com's Muslim
numbers don't apply here; **a test now checks every target** (the expected words must appear in its English).

**The source finder** handles a pasted or remembered quote that doesn't match strictly, because it's from
another translation or worded from memory. It kicks in for queries with ≥ 4 meaningful words that match fewer
than 10 results:

1. drop stopwords; keep documents containing at least half of the remaining words (whole word, prefix or one
   typo), each weighted by IDF;
2. **score Quran ayahs together with the next ayah**, because a quote can span two (Yusuf Ali's
   "Say: He is Allah, the One and Only; Allah, the Eternal, Absolute" is 112:1–2);
3. **rerank the top 300 by contiguity:** how many distinct query words fall within a short stretch of the
   text. Without this, long hadith collected the same words scattered across paragraphs and beat the verse;
4. **prefer an ayah over a hadith that quotes it**: hadith often quote verses in their own translation
   (Muslim 330 quotes 2:286), and someone typing a verse's wording wants the verse.

```ts
const span = Math.max(8, Math.round(content.length * 2));
for (let i = 0, j = 0; j < hits.length; j++) {        // hits: [word position, term index], sorted
  while (hits[j]![0] - hits[i]![0] >= span) i++;
  window = Math.max(window, new Set(hits.slice(i, j + 1).map(([, k]) => k)).size);
}
c.score = window * 10 + pairs * 4 + (c.seg.corpus === 'quran' ? 12 : 0) + c.score * 0.3;
```

Also: **long queries skip the fuzzy pass.** With many words, one-typo and abbreviation matches on each word
added up to thousands of weak results, so the source finder never ran.

What it can't do: true paraphrase. "None of you truly believes until he loves for his brother" shares too
few words with this translation of Bukhari 13. That needs search by meaning; two such cases are kept as
`it.todo` tests.

## 8. The worker and progressive loading

All data lives in the worker; the main thread only renders. Each chunk is fetched once, and everyone who needs
it awaits the same promise:

```ts
const chunks = new Map<string, Promise<void>>();
function ensure(name: string): Promise<void> {
  let p = chunks.get(name);
  if (!p) chunks.set(name, (p = load(name)));
  return p;
}
```

- **Searchable before everything's loaded.** The Quran arrives first; every time another chunk lands, the
  latest query re-runs and the results fill in.
- **Only the latest answer is delivered.** The client tags each search with an id and drops older answers.
- **Two-phase detail screens.** A hadith screen shows its English at once and asks again for the Arabic (a
  1.3 MB chunk); a verse shows at once and asks again for its tafsir, topics and similar ayahs. The first
  version waited for the big chunk, and the previous screen stayed visible meanwhile, which looked broken.

## 9. Offline and installable

vite-plugin-pwa generates the manifest and a Workbox service worker that **precaches** the app, fonts, icons
and the Quran. Hadith and extras are too big to precache, so they're cached as they load.

**The bug that shaped this design:** on a first visit, the page's worker starts *before* the service worker
takes control, and a worker keeps the controller it started with. So its fetches bypassed the service worker,
nothing was cached, and offline the app couldn't even find `manifest.json`. The fix is not to depend on
interception at all: **the worker reads and writes the cache itself, cache-first** (filenames are
content-hashed, so a cached copy is never stale):

```ts
async function fetchData(name: string, file: string): Promise<Response> {
  const url = new URL(file, base);
  const cached = 'caches' in self ? await caches.match(url, { ignoreSearch: true }) : undefined;
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  if ('caches' in self && name !== 'quran' && name !== 'translit')
    await caches.open(DATA_CACHE).then((c) => c.put(url, res.clone())).catch(() => {});
  return res;
}
```

`manifest.json` is network-first with a cached copy, stored the same way. After a data update, the worker
deletes cached chunks whose hashed names are no longer in the manifest. An end-to-end check (headless
Chromium, outside the test suite) loads the site under `/mufahras/` like GitHub Pages, downloads everything,
goes offline, reloads, and searches; it caught both bugs above.

**Share target (Android).** The manifest's `share_target` sends shared text as `?text=…` on the start URL;
the router turns it into a search before anything renders, stripping URLs and quotes.

**The bar below the installed app (Android)** is coloured from the manifest, not the page: `background_color`
on Android 15+, `theme_color` on older versions. We had the brand green in `theme_color`, so it showed. Both
are now the Paper background. It's fixed at install time; reinstall to see a change.

## 10. UI: Svelte 5, routing and layout

**URL ⇄ input sync without loops.** The query lives in the URL so Back and sharing work. Two effects, each
reading only one side, with `untrack` around the write:

```ts
$effect(() => {                // typing → URL (replace, so history isn't one entry per keystroke)
  const q = query;
  untrack(() => navigate({ q }, { replace: true }));
});
$effect(() => {                // Back/forward → input
  const q = route.q;
  untrack(() => { if (q !== query) query = q; });
});
```

**Back that works for deep links.** A counter of pushed entries breaks when the browser's own Back button is
used. Store the depth in `history.state` instead:

```ts
const depth = () => (history.state as { depth?: number } | null)?.depth ?? 0;
// push: history.pushState({ depth: depth() + 1 }, '', url); back(): depth() > 0 ? history.back() : replace('')
```

**The route carries both the detail and the search** (`#/2:255?q=patience`), which is what lets the desktop show
results and the selected verse side by side, and a phone return to the same results.

**Layout bugs, all one family:** CSS grid and flex items default to `min-width/min-height: auto`, so content
can stretch them.

- A long unbroken line widened the page past the phone: `grid-template-columns: minmax(0, 1fr)`.
- The chip row inside the dock grid did the same, pushing the theme button off screen: the dock grid too.
- The start screen stretched the layout when the verse-of-the-day card made it taller, pushing the search bar
  off screen with no way to scroll: `grid-template-rows: minmax(0, 1fr)`.
- And the real cause of that last one: changing the app's height from `100dvh` to `100%` made it 100% of a
  mount `<div>` with no height. `html, body, #app { height: 100% }`.

The lesson we paid for twice: **screenshots alone don't catch layout bugs.** We now measure: page `scrollWidth`
against the viewport, the search bar's bottom edge against the window, whether the panes scroll.

**A scroll container scrolls in both directions.** The chip row had `overflow-x: auto` so it could scroll
sideways; the 44px tap areas (a pseudo-element 4px taller than each chip) overflowed it vertically, so it could
be dragged up and down too. The fix was to make it fit (and wrap on very narrow screens) instead of scrolling.

**The bottom search bar and the iOS keyboard.** Android resizes the layout when the keyboard opens
(`interactive-widget=resizes-content` in the viewport meta); iOS doesn't, so the dock is lifted by the
keyboard's height from the VisualViewport API:

```ts
const update = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`);
```

## 11. Typesetting Arabic

- **Fonts:** Scheherazade New (SIL) for the Quran, chosen over Amiri Quran and Noto Naskh by rendering the same
  ayahs in each: its larger letter shapes read best at phone sizes. Noto Naskh Arabic for hadith. All
  self-hosted (offline) and loaded only when Arabic is on screen, through `unicode-range`.
- **Ayah markers:** U+06DD followed by Arabic-Indic digits (`۝٢٥٥`); the font draws them as one ornament.
- **Keep the marker with the last word.** Split off the last word and wrap it with the marker in
  `white-space: nowrap`, or the marker can wrap onto a line alone.
- **Keep pause marks with their word.** In the text, `ۚ` and friends are separate tokens after a space, so a
  line could start with one. The no-break space from the build (§3) fixes this for free.
- **Word positions.** QUL's similar-ayah and mutashabihat data give word numbers. With one QUL word per
  space-free token, mapping is trivial and exact; a test checks the count for all 6,236 ayahs.
- **Mark Arabic as Arabic:** `lang="ar" dir="rtl"` on every Arabic element, not just `direction: rtl` in CSS.
- **Highlighting Arabic took three tries.** A full-strength background turned into heavy slabs at Arabic line
  heights; colour-only (accent text) was too close to the ink in Sepia. What works in every theme: a softer,
  rounded version of the same highlight, and whole words only (colouring part of a joined word looks like a
  rendering glitch).

```css
.quran mark, .arabic mark {
  background: color-mix(in srgb, var(--mark) 70%, transparent);
  color: var(--ink);
  border-radius: 6px;
  padding: 0 3px;
}
```

## 12. Themes, colour and contrast

- **Four themes** (Paper, Sepia, Dusk, Night) and Auto (Paper by day, Night at night). All colours are tokens in
  `tokens.css`; components never use raw colours.
- **Maximum contrast isn't the goal.** The first dark theme was near-white on near-black (15.6:1) and was "very
  hard on the eyes". The dark themes now sit at ~10–11:1: still far above AA, without glare.
- **A test checks every text/background pair in every theme** (≥ 4.5:1 for text, ≥ 3:1 for focus rings), and
  that every theme defines every token.
- **No flash of the wrong theme:** a tiny inline script in `index.html` applies the saved theme before first
  paint; `theme.svelte.ts` takes over after.

## 12b. Personal features: bookmarks, history, cards, the drawer

- **Bookmarks in IndexedDB, history in localStorage.** Bookmarks are what someone would be upset to lose, so
  they get the durable store and an export/import (nothing syncs); search history is a convenience.
- **Esc belongs to the topmost layer.** The picture-card sheet closed on Esc, and the app's own Esc handler
  also navigated back to the results, because both listened on `window`. Open layers carry `data-modal`, and
  the app's handler stays out while one exists.
- **Canvas text doesn't wait for web fonts.** Before drawing a card, load the font for exactly the characters
  needed: `document.fonts.load('64px "Scheherazade New"', text)`. Arabic on canvas needs `ctx.direction = 'rtl'`
  with right alignment, and wrapping by measuring word by word; the no-break spaces inside QUL words (§3) keep
  pause marks with their words on cards too.
- **"Of the day" picks need curation, not just a hash.** A first pass over short hadith picked rulings out of
  context and a story about a temporary permission. Restricting to direct sayings ("The Prophet ﷺ said…") in
  the chapters of manners, faith, knowledge, supplication and softening of hearts gave a pool that reads well.
  The same happened with the verse of the day (§7).
- **Text size as a root font scale** (`html { font-size: calc(100% * var(--text-scale)) }`) scales every rem,
  like the system setting; Arabic sizes multiply by a separate `--arabic-scale`. Components that set an Arabic
  size directly must multiply by it too, or they silently ignore the setting (five did).
- **Check the source's own metadata before inventing a fix.** The hadith wrongly shown as Bukhari's
  "Introduction" were fixable from hadith-api's `section_details` (each chapter's number range), already in
  the file we downloaded.
- **Pin what a curated list depends on, and test it by name.** The hadith of the day uses section numbers from
  the pinned hadith-api commit; a test checks those numbers still name the intended chapters, so a data update
  can't quietly switch "Good Manners" for "Funerals".
- **The install button needs an event captured early.** Chrome fires `beforeinstallprompt` once, possibly
  before the app mounts, so `install.svelte.ts` is imported first in `main.ts` and keeps the event for the
  menu's "Install app". iOS never fires it; the menu shows the Share → Add to Home Screen steps instead.
- **Storage can be unavailable.** Private browsing can block IndexedDB and localStorage: every read and write
  is wrapped, settings fall back to defaults, and the bookmarks page says why it can't save.
- **Sakinah mode is a setting, not a separate app.** Components check `settings.sakinah` and leave out the
  daily cards, chips, graph, verse extras and picture cards; the verse screen also skips requesting the extras,
  so their data isn't downloaded.
- **Word by word loads on the first tap.** Each Arabic word is a button (read as plain text until tapped); the
  `words` chunk (212 KB) is fetched only when one is. QUL's word-by-word transliteration lines up with our
  words by QUL word number, except four gaps in the source (2:181, 8:6, 13:37, 36:52), which show "—".
- **A second version of the same data must not reset the UI.** The verse arrives again with its extras a
  moment after it opens; resetting the tapped word on every new `d` cleared it. Reset on a change of verse
  (compare the reference), not of object.
- **Export/import merges.** Importing keeps existing bookmarks and unions their tags; nothing is overwritten
  or lost by importing an older file.

## 13. The similar-verses graph

- **Layout at build time.** d3-force runs in `build-data.ts` (600 ticks, deterministic: d3 seeds its own random
  source) and the positions ship in a 22 KB chunk. The page doesn't load d3 at all, and it draws instantly on
  a phone.
- **Weak centering forces** keep the many small clusters together instead of drifting to the edges; stronger
  pairs get shorter links.
- **Canvas, not SVG**, for 1,644 nodes and 2,336 edges: one path for all edges, one arc per node, redrawn
  from Svelte effects when the view, selection, hover or theme changes (a `MutationObserver` on `data-theme`).
- **Hit testing by nearest node within 16 px**, bigger than the dots; pan, wheel zoom around the cursor, and
  two-pointer pinch with Pointer Events (`touch-action: none` on the canvas).
- **Colours from the dataviz skill's validator.** Meccan/Medinan are its first two categorical slots; on Sepia
  the orange failed 3:1 against the background (2.6:1), so Sepia uses the darker step. Labels are in ink, never
  the series colour.
- **Nothing depends on the canvas.** A selected node's card lists its similar verses as links, a find box
  focuses any ayah, the canvas is `aria-hidden` with a text summary for screen readers.
- **Lazy-loaded:** `{#await import('./components/GraphPage.svelte')}` keeps it out of the main bundle.
- **What it shows:** recurring refrains become dense clusters; Ar-Rahman's "Which of the favours of your Lord
  would you deny?" is the big one.

## 14. Icons and link previews

- **Centre glyphs by their ink, not their font box.** SVG `getBBox()` on text returns the em box (ascent to
  descent), so the meem sat low and looked cut off. Drawing it on a canvas and scanning the pixels gives the
  real outline:

  ```js
  ctx.font = `200px ${font}`; ctx.fillText(letter, 300, 500);
  const d = ctx.getImageData(0, 0, 800, 800).data; // then min/max x, y where alpha > 8
  ```
- **Maskable icons:** Android crops to circles and squircles; keep everything inside the central 80%.
- **Link previews need absolute URLs** in `og:image`; crawlers don't resolve relative ones. The preview card is
  excluded from the offline precache since only crawlers fetch it.

## 15. Testing

392 tests in Vitest (2 of them `it.todo`), most of them against the real generated data:

- **Ranking:** a fixed list of queries with the result that must appear in the top N (typos, abbreviations,
  transliteration, Arabic without diacritics, other translations). The test prints every query's time.
- **Equivalence across the corpus:** the mapped normalizer equals the regex one for all ~93,000 texts; the word
  splitter matches QUL's word count for all 6,236 ayahs. These found the five odd QUL words in §2.
- **Every alias's target contains its text**; the hadith of the day's chapters still have the intended names;
  hadith the source left without a chapter are placed in the right one (Bukhari 299 in Menstrual Periods).
- **Full-corpus tests need a longer timeout.** Walking ~40,000 Arabic texts character by character takes about
  5 s, right at Vitest's default limit; those tests set 30 s explicitly rather than flaking.
- **Data integrity:** counts, footnote markers vs footnotes, tafsir groups, cross-references.
- **Contrast** for every theme.
- **Browser tests (Playwright, `npm run e2e`, in CI before every deploy):** every kind of screen at 360 px,
  390 px and desktop must not overflow sideways, must fill the window exactly, and must have nothing scrollable
  in the dock; the start screen scrolls with the search bar on screen; plus typo search, the share target,
  Esc closing only the top layer, word by word, Sakinah mode, bookmarks, and a full offline run (download
  everything, go offline, reload, search, open a hadith with its Arabic). These began as one-off scripts
  around screenshots; making them assertions is what stops a layout bug from reaching a phone again.

`it.todo` keeps known gaps visible (paraphrases that need search by meaning) instead of hiding them.

## 16. Lessons, in one list

- Ship the normalization once and use it everywhere; test that two implementations agree on all the data.
- Measure before optimizing, and measure warm.
- When fuzzy matching is slow, change what it scans (a vocabulary, a first-letter slice), not the regex.
- Decide data questions by measuring the data (hamza, dagger alif, word counts), not by assumption.
- A service worker doesn't control a worker started before it did. Don't rely on interception for data.
- Grid and flex items need `minmax(0, …)` / `min-width: 0`, and a height needs every ancestor to have one.
- Screenshots miss layout bugs; measure the layout.
- Highest contrast isn't most readable; aim for comfortable and test the floor.
- Quotes come from somewhere contiguous: score closeness, not just overlap.
- Keep known gaps as visible todo tests.
- Curate anything shown "of the day": a hash over everything that fits picks rulings and stories out of context.
- The topmost layer owns the keyboard: a sheet's Esc must not also reach the page behind it.
- Look in the source's metadata before writing a workaround for its data.
- Read data that comes from crowd-sourced or converted sources defensively: QUL and hadith-api are excellent,
  and they still had fragments, mis-filed topics, split words and empty records.
