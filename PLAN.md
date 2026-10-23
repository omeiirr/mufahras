# Mufahras — Plan

A fast, offline, installable web app (PWA) for looking up Quran verses and hadith
by fuzzy search, on desktop and mobile. Successor to
[quran-cli](https://github.com/omeiirr/quran-cli).

## Goals

- **Instant:** results update on every keystroke; a search should take well under 50 ms on a mid-range phone.
- **Offline:** after the first visit, everything works without a network (audio excepted).
- **One codebase:** an installable PWA on GitHub Pages; no app stores.
- **Trustworthy references:** every result shows a citation (surah:ayah, book + number) and,
  for hadith, gradings with the scholar's name.

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript |
| UI | Svelte 5 |
| Fuzzy search | uFuzzy (fzf-style subsequence + out-of-order terms + 1 typo per term) |
| Search thread | Web Worker (the main thread only renders) |
| Result list | Virtualized list |
| Offline / install | vite-plugin-pwa (Workbox) |
| Local storage | IndexedDB (bookmarks, tags, history, settings) |
| Picture cards | Canvas 2D → PNG, shared via Web Share API (falls back to download) |
| Data pipeline | Node/TS scripts run at build time |
| Tests | Vitest (search ranking + data integrity) |
| Deploy | GitHub Actions → GitHub Pages |

Routing uses the URL hash (`#/2:255`, `#/bukhari/1`) because GitHub Pages has no SPA fallback.

## Data sources

**Rule: use [QUL by Tarteel](https://qul.tarteel.ai/resources) wherever it has the resource.** QUL has no hadith,
so hadith come from fawazahmed0/hadith-api.

| Content | Source | License / terms |
|---|---|---|
| Quran Arabic (Uthmani for display, Uthmani-simple for search, IndoPak as an optional display script) | QUL `uthmani`, `uthmani-simple`, `indopak` (text prepared by Tanzil) | Tanzil terms: attribution + link to tanzil.net; text must not be altered (the normalized search field is internal, never displayed) |
| Quran translation: Saheeh International, with footnotes | QUL `en-sahih-international-with-footnote-tags` | Publisher copyright (Dar Abul-Qasim); credit it |
| Transliteration (per ayah + word by word) | QUL `transliteration-simple`, `english-wbw-transliteration` | No per-resource license stated |
| Topics (2,512, hierarchical) | QUL `topics.db` | No per-resource license stated |
| Ayah themes (2,098 ranges) | QUL `ayah-themes.db` | No per-resource license stated |
| Similar ayahs (3,552 pairs) | QUL `matching-ayah` | No per-resource license stated |
| Mutashabihat (814 repeated phrases) | QUL `Mutashabihat ul Quran` | No per-resource license stated |
| Tafsir summary: *Abridged Explanation of the Quran* (English Al-Mukhtasar) | QUL `abridged-explanation-of-the-quran` | No license stated; original publisher is the Tafsir Center for Quranic Studies |
| Surah metadata (names, Arabic names, revelation place/order, verse counts) | QUL `quran-metadata-surah-name` | — |
| Hadith: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah (English + Arabic, gradings, sections) | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | Unlicense |
| Fallback Quran translations, if a QUL one can't be used | [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api) | Unlicense |

### QUL licensing status (checked 2026-10-23)

- **[Tarteel ToS](https://www.tarteel.ai/terms)** (last updated 2021-04-02) is a general terms of service for Tarteel's apps and website.
  It doesn't mention QUL or license any data. Relevant parts:
  - it gives a non-transferable licence to use the Service and says not to copy the Service, its features or its user interface
  - Tarteel's name and logos may not be used
  - everything is provided "as is", with no guarantee of accuracy
  - you indemnify Tarteel against claims that a translation it provides is inaccurate
- **[QUL FAQ](https://qul.tarteel.ai/faq):** "Yes, you can use QUL data in commercial projects. However, please review the
  licensing terms for each resource." It also says resources "vary in their copyright status… some are in the public domain,
  while others may be subject to specific licenses."
- **QUL resource pages** (checked: Al-Mukhtasar #266, ayah topics) show **no licence**. QUL's [credits](https://qul.tarteel.ai/credits)
  say most resources were created or curated by the community, and credit Tanzil, the King Fahd Complex and others.
- **QUL code** is MIT, but that covers the code, not the data.
- **Downloads require a free QUL account**, so CI can't fetch them automatically.

What this means for the app:
1. QUL's own resource pages say the files are meant to be downloaded and bundled into apps, and the FAQ allows even
   commercial use. A free, open-source, ad-free app is well within that.
2. Credit every resource to its original author/publisher (not to Tarteel's brand) on the About page and in the repo `NOTICE`.
3. Before the public launch, ask on QUL's GitHub/Discord to confirm redistribution of topics, similar ayahs and
   Al-Mukhtasar. Al-Mukhtasar's licence is the one most likely to come with conditions.
4. The app must not use Tarteel's name or logo, and must not suggest Tarteel endorses it.

QUL file details that matter here (checked 2026-10-23; all files cover all 6,236 ayahs unless noted):
- **Arabic scripts are word-level:** 83,668 entries keyed `surah:ayah:word`. Join them into verses; the last
  "word" is the ayah-number marker (`٢٥٥`), so drop it. 2:181 in `uthmani-simple` ends with an empty word
  instead of the marker, so handle that case.
- **`uthmani-simple` keeps tatweel** (`الرحمـن`), which the Arabic normalization must strip.
- **Saheeh International** text contains `<sup foot_note="id">n</sup>` tags, with footnote text in `f`
  (1,613 ayahs have footnotes). Strip the tags for search; show footnotes in the verse detail. The text uses
  diacritics (`Allāh`), so search folds them to plain letters.
- **Tafsir groups ayahs:** 6,198 entries are `{text}`. 18 are group heads `{text, ayah_keys}`, and 20 are plain
  strings pointing to their group head (e.g. `"2:4": "2:3"`). Resolve the pointers, and show "Explanation of 2:3–4" in that case.
- **`transliteration-simple`** uses Tanzil's ASCII scheme (`baAAda`, `ta/khuthuhu`, words sometimes run together),
  while the word-by-word file is cleaner (`bis'mi l-lahi`). Index both after folding, to catch loose spellings like `ayatul kursi`.
- **Topics** have parent/child links, an Arabic name, an HTML description with `<topic data-id>` links, and a
  comma-separated `ayahs` list. 2,330 topics have at least one ayah.
- **Ayah themes** cover 6,200 ayahs. Missing: 2:134, 40:61, 54:45–55, 55:56–78.
- **Similar ayahs** (`matching-ayah`) is based on shared Arabic wording, not meaning. It covers 1,162 ayahs,
  with a score (50–100), coverage %, and the matching word ranges, which can be highlighted.
- **Mutashabihat:** `phrases.json` gives the phrase's source location, word range and every occurrence;
  `phrase_verses.json` maps each ayah to its phrase IDs (2,232 ayahs). The file is tiny (~40 KB).

hadith-api details that matter here:
- English and Arabic are separate editions; join them on `hadithnumber`.
- `grades: [{name, grade}]` gives one grading per scholar (Al-Albani, Shakir, Zubair Ali Zai, Bashar Awad…).
- `metadata.sections` gives book/chapter names, which power the book filter and topic search for hadith.
- The narrator is part of the text, not a separate field.

## Data pipeline (`scripts/`)

1. **Fetch:**
   - QUL: downloaded manually (sign-in required) as JSON into `data-src/qul/`. These files are committed,
     with each resource's ID and download date in `data-src/qul/SOURCES.md`.
   - hadith-api: a script fetches a pinned version into `data-src/hadith/` (gitignored, fetched again in CI).
2. **Normalize** (`src/lib/text/normalize.ts`, shared with the search worker). Search text is derived when the data
   loads in the worker; the shipped files hold display text only.
   - Latin: strip footnote superscripts, fold diacritics (`Allāh` → `allah`), drop apostrophe-like marks, lowercase.
   - Arabic: strip harakat, Quranic marks, dagger alif and tatweel; unify أ/إ/آ/ٱ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي;
     drop standalone ء. With hamza dropped, normalized Uthmani text matches Uthmani-simple, so only Uthmani is shipped.
3. **Emit** JSON chunks into `public/data/`, content-hashed (`quran.<hash>.json`) so they can be cached forever.
   Shapes are in `src/lib/data/types.ts`; ayahs are addressed by a global index 0–6235.
4. **Validate:** the build fails if any ayah is missing or empty, a footnote has no text, a tafsir pointer or
   topic/theme/similar/mutashabihat reference is invalid, or a hadith section is unknown.
   `tests/data.test.ts` spot-checks the output (known ayahs, footnote markers, tafsir groups, gradings).
5. **Report:** prints per-chunk sizes plus data notes (skipped empty hadith, unclassified grades).
   `manifest.json` lists chunks, sizes and sources for the About page.

`npm run data:fetch` downloads hadith; `npm run data` builds (~4 s); `npm test` checks.

### Generated chunks (measured 2026-10-23, gzipped)

| Chunk | Gzipped | When loaded |
|---|---|---|
| `quran`: surahs, Uthmani, Saheeh International, footnotes | 586 KB | Immediately |
| `translit`: simple + word by word | 394 KB | Right after `quran`, in the background |
| `tafsir` (Al-Mukhtasar) | 519 KB | First verse detail |
| `indopak` | 277 KB | Only if the IndoPak script is chosen |
| `topics` 116 KB, `themes` 40 KB, `mutashabihat` 34 KB, `similar` 18 KB | 208 KB | First topic search / verse detail |
| `hadith-<book>`: English + gradings + sections | 418–1,148 KB each, 4.0 MB total | First search of that book |
| `hadith-<book>-ar`: Arabic, aligned with the rows above | 558–1,336 KB each, 5.2 MB total | First hadith detail or Arabic query in that book |
| **Everything** | **11.2 MB** | "Download all for offline" in settings |

Hadith counts after dropping empty numbers: Bukhari 7,580, Muslim 7,360, Abu Dawud 5,272, Tirmidhi 3,926,
Nasa'i 5,679, Ibn Majah 4,340. Numbering follows hadith-api (sunnah.com-style, some fractional like 402.2), so
Bukhari numbers differ from the old CLI's dataset (7,277 entries).
Bukhari and Muslim have no per-hadith gradings; the app labels them "Sahih (collection)".

Still to add (milestone 5): `aliases.json`, hand-curated names → refs (`ayatul kursi` → 2:255, `inna lillahi` → 2:156, …).

## Search design

Runs in the worker. Steps for each query:

1. **Reference parsing** (`src/lib/search/reference.ts`), pinned above results as "go to":
   `2:255`, `2 255`, `2:255-257`, `112`, `baqarah 255` / `baqra 255` / `al imran 190` (typo-tolerant surah names,
   spelling folds like yaseen→yasin), `surah mulk`, bare exact names (`fatiha`), `البقرة ٢٥٥`, `سورة يس`,
   `bukhari 1`, `sahih bukhari 6018`, `muslim #8`, `abu dawood 402.2`, `tirmizi 2516`.
   Words like "allah" are never read as surah names. Aliases (`ayatul kursi`) come in milestone 5.
2. **Term matching** (`src/lib/search/engine.ts`). Every query term must match a word of the document, in any order.
   Each segment (one field of one collection: Quran English / transliteration / Arabic ×2, each hadith book's
   English / Arabic) has an inverted word index; terms are matched once against a vocabulary shared per script:
   - tier 3 **exact**: word contains the term (1 letter: whole word; 2 letters: word prefix)
   - tier 2 **typo**: one insertion/deletion/substitution/transposition (uFuzzy single-error), terms ≥ 4 letters
   - tier 1 **abbreviation**: letters in order within one word, fzf-style (`ptnc` → patience), terms ≥ 3 letters
   The exact pass runs first; the fuzzy tiers are added only if it finds < 20 results. Both fuzzy tiers keep
   the first letter, so they only scan vocabulary words starting with it. The rarest term is processed first;
   later terms are checked only against the remaining candidates.
3. **Ranking:** weakest term tier × 30, + per-term word-boundary bonus (prefix +4, whole word +10),
   + phrase bonus for the top 300 (+25, +10 if on word boundaries), + 10 for an exact transliteration match,
   − 3·log₂(1 + length/100). Best field per document wins.
4. **Spelling folds:**
   - Quran Arabic is indexed both with the dagger alif dropped and as ا, so الرحمن, العالمين and الصلاة all match the Uthmani text.
   - Transliteration drops Tanzil's AA/`/` marks and folds oo→u, ee→i, doubled letters, dh→th (`alqayyum` ↔ `alqayyoomu`).
5. **Filters:** Quran / Hadith / all; a surah filter means Quran only, a book filter means those books only;
   minimum grade uses one bucket per hadith (the most common across scholars, ties toward the weaker bucket;
   Bukhari and Muslim count as sahih).
6. **Highlighting:** match ranges are found in normalized text and mapped back to the display text
   (`normalize-map.ts`, verified identical to the regex normalizers over all data). Long hadith are cut to a
   ~280-character snippet around the first match.
7. **Worker** (`worker.ts`): Quran → transliteration → six books (English, fetched in parallel); hadith Arabic on
   the first Arabic query. The latest query re-runs as each chunk lands.

Measured 2026-10-23 (desktop, warm): ~5 ms per keystroke, 10 ms average per query, 30 ms for the first Arabic
query; in the browser the Quran is searchable after ~0.3 s and all books after ~1.2 s from a local server.
`tests/search.test.ts` holds the ranking checks and prints timings.

Still to come (milestone 5):
- **Source-finder mode** for pasted or remembered quotes that don't match the translation's words
  (`actions are judged by intentions` → Bukhari 1); tracked as `it.todo` in the ranking tests.
- **Topic matches:** the query is fuzzy-matched against QUL topic names and hadith section names, shown as
  chips ("Topic: Patience · 48 ayahs", "Book of Fasting · Bukhari") that filter the results.

## UI design (milestone 3; agreed 2026-10-23)

Guidance from the ui-ux-pro-max and apple-design skills (accessibility, touch, empty states, motion,
pre-delivery checklist); their generated "design system" targeted marketing pages and wasn't used as-is.

**Decisions**
- **Phone:** search bar at the **bottom**, within thumb reach, with filter chips just above it; results scroll above.
- **Quran results show the translation only;** the Arabic shows in the verse view. Arabic-script queries show Arabic as the main text.
- **Desktop (≥ 1024px): side by side.** Results on the left, the opened verse or hadith on the right; ↑/↓ moves the
  selection and updates the right pane. Narrower screens use the phone layout.

**Screens (hash routes)**
| Route | Screen |
|---|---|
| `#/?q=…&in=quran&sahih=1` | Search. Query and filters live in the URL; typing replaces the history entry, opening a result pushes one |
| `#/2:255` | Verse: Arabic, translation, footnotes, previous/next ayah, "Read surah". Room for tafsir, similar ayahs, mutashabihat, theme (M5) and bookmark/share (M6) |
| `#/surah/2` | Surah reader: names, Meccan/Medinan, ayah count, bismillah, all ayahs with ayah-number markers; `#/surah/2/255` scrolls to an ayah |
| `#/bukhari/1` | Hadith: English, Arabic (loaded on open), book and chapter, gradings table (scholar → grade) |

**Behaviour**
- Desktop keys: `/` or Ctrl+K focus search, ↑/↓ move, Enter open, Esc back. Phone: Back returns to results with scroll kept.
- Filters: chips (All · Quran · Hadith · Sahih only) plus a filter sheet (surah picker, hadith books).
- Empty search: tappable examples showing what works (references, Arabic, transliteration).
  No results: concrete suggestions (fewer words, switch Quran/Hadith, turn off Sahih only).
- Loading: a small "loading hadith 3/6" note only while partial.
- Results: 30 at a time, more appended on scroll (no virtualization needed at this scale).

**Look**
- Calm, paper-like, no ornament. **Four themes** (`src/styles/tokens.css`), picked from the palette button in the filter row:
  - **Paper**: warm off-white and ink
  - **Sepia**: tan and brown
  - **Dusk**: warm charcoal
  - **Night**: cool slate
  **Auto** (the default) follows the system setting, Paper by day and Night at night. The choice is saved and applied
  before first paint. Dark themes keep body text near 10–11:1 rather than the maximum; the first near-black dark
  theme (15.6:1) glared. `tests/contrast.test.ts` checks every pair in every theme.
- Latin: system font stack. **Quran Arabic: Scheherazade New** (SIL, OFL, 79 KB), chosen over Amiri Quran and Noto
  Naskh by screenshot comparison for legibility at phone sizes. Hadith Arabic: Noto Naskh Arabic.
  Fonts self-hosted (offline), Arabic loaded only when shown.
- Our Uthmani text uses Tanzil's standard-Unicode conventions (U+0652 sukun, tatweel before dagger alif), so any Unicode
  Quran font renders it; QPC fonts would need QUL's QPC script instead. The IndoPak text uses QPC-style marks
  (U+06E1 sukun) and **needs a matching IndoPak font** when that script option is added (milestone 6).
- Display fixes: pause marks (ۖ ۗ ۚ …) are joined to the preceding word, and the last word stays with the ayah marker,
  so neither starts a line on its own.
- Lucide SVG icons, no emoji. Transitions 150–200 ms, off under reduced motion.
- 44px touch targets, visible focus, AA contrast in both themes, `lang="ar" dir="rtl"` on Arabic, grades labelled
  in text (not colour alone), result count announced to screen readers.

**Build**
- Plain Svelte 5 components + CSS custom properties (tokens.css); no UI kit, no Tailwind. Small custom hash router.
- Worker gains detail requests (ayah with context, surah, hadith with Arabic) so data stays off the main thread.
- Before handing over: ui-ux-pro-max pre-delivery checklist, screenshots of both themes at 375px and desktop.

## Features for v1

**Finding**
- Results update on every keystroke, with fzf-style + typo-tolerant fuzzy matching
- Reference jumps and aliases (`2:255`, `baqarah 255`, `ayatul kursi`, `bukhari 1`)
- Transliteration search
- Arabic search (normalized, so diacritics are optional)
- Paste a quote to find its source
- Android share target: share selected text from any app into the search
- Search by topic (QUL topics + ayah themes for the Quran, section names for hadith)
- Filters by corpus, surah, book, and grading
- Shareable links (`#/2:255`, `#/bukhari/1`); `/` and Ctrl+K focus the search box on desktop

**Reading**
- Verse detail: Arabic, translation, transliteration, previous/next ayahs, link to read the full surah
- Full surah reader
- Hadith detail: English + Arabic, book/section, gradings with scholar names, colour-coded sahih / hasan / da'if
- Saheeh International footnotes; the theme of the ayah's passage ("Hypocrites and the consequences of hypocrisy · 2:8–16")
- **Similar ayahs** (QUL) on the verse detail, with the shared words highlighted
- **Mutashabihat:** "This phrase also appears in 12 ayahs", with the phrase highlighted and each occurrence listed
- Choice of Arabic script: Uthmani or IndoPak
- **Tafsir summary** (English Al-Mukhtasar) inline, plus a link to the full tafsir on quran.com

**Personal**
- Bookmarks with tags (IndexedDB)
- Search history (can be cleared or turned off)
- Hadith of the day (verse of the day shipped in milestone 4)
- Copy (text + citation) and system share
- **Share as picture card:** Arabic + translation + citation rendered to PNG; light/dark styles; square and story sizes
- Dark mode (follows the system, with a manual toggle); separate font sizes for Arabic and translation
- About page with sources, licenses and data versions

## Project layout

```
quran-search/
├── scripts/            # fetch, normalize, emit, validate
├── data-src/
│   ├── qul/            # manual QUL downloads (committed) + SOURCES.md
│   └── hadith/         # fetched by script (gitignored)
├── public/data/        # generated chunks (built in CI, not committed)
├── src/
│   ├── lib/text/       # normalization (shared with scripts/)
│   ├── lib/hadith/     # grade classification
│   ├── lib/search/     # worker, query parser, ranking
│   ├── lib/data/       # chunk types, loading, caching
│   ├── lib/store/      # IndexedDB: bookmarks, history, settings
│   ├── lib/card/       # picture-card renderer
│   ├── routes/         # search, verse, surah, hadith, bookmarks, settings, about
│   └── components/
├── tests/
└── .github/workflows/deploy.yml
```

## Milestones

1. ✅ **Data pipeline** (2026-10-23): fetch + normalize + validate everything; sizes measured; licensing reviewed (confirmation from QUL still pending).
2. ✅ **Search core** (2026-10-23): worker, query parser, fuzzy matching, reference jumps, ranking tests; plus a bare search page to try it.
3. ✅ **UI shell** (2026-10-23): search page, results paged on scroll, verse / surah / surah index / hadith screens,
   hash routing, side-by-side desktop layout, four themes with a switcher, copy/share.
4. ✅ **PWA** (2026-10-23): named **Mufahras** (repo `omeiirr/mufahras`), app icon (م on the accent green), installable
   web manifest, Android share target, offline support, deploy to GitHub Pages via `.github/workflows/deploy.yml`.
   Offline: the service worker precaches the app, fonts, icons and the Quran; the worker stores every other data
   chunk itself, reads cache first (filenames are content-hashed), and deletes chunks no longer in the manifest.
   This doesn't depend on the service worker intercepting the worker, which it doesn't on a first visit.
   The start screen shows what's stored, with a one-tap download of the rest (hadith Arabic, ~5 MB).
   **Logo** (`public/icons/`, source `scripts/icon-source.svg`): a gold Amiri meem inside a gold 8-point star frame
   over a faint star tiling, on the accent green. The maskable icon keeps the star inside the 80% safe zone; the
   favicon drops the tiling. The glyph is centred and sized by its measured ink, not its font box.
   **Verse of the day** (moved up from milestone 6): a start-screen card, the same verse for everyone on a date,
   picked by a fixed hash from ~117 short ayahs with self-contained openings (supplications, "O you who have
   believed…", statements about Allah), so it repeats about three times a year.
   **Notifications (deferred, 2026-10-23):** the web can't schedule local notifications reliably. The two options
   are Periodic Background Sync (no server; Chrome/Edge installed apps only; Chrome picks the time) and Web Push
   (fixed time on every platform, including iPhone and Firefox; needs a small server such as a Cloudflare Worker
   cron). If it's added, the notification is the daily verse and tapping it opens the verse.
5. ✅ **Enrichment** (2026-10-24):
   - **Aliases** (`src/lib/search/aliases.ts`): 34 well-known names for verses, surahs and hadith ("ayatul kursi",
     "amana rasul", "heart of the quran", "hadith jibril"), each target checked against its text in tests.
     Hadith numbers follow hadith-api, which differs from sunnah.com for Muslim.
   - **Source finder:** for queries with ≥ 4 meaningful words that match few results strictly, rank texts
     by shared rare words, reranked by contiguity (query words within a short stretch), with Quran ayah pairs
     scored together (a quote can span 112:1–2) and an ayah preferred over a hadith quoting it. Results come
     after all strict matches under "Close matches", marked "5 of 6 words". The fuzzy pass is skipped for these
     long queries; it produced thousands of weak matches.
   - **Topic and chapter chips** above results (QUL topics; hadith book chapters), each opening a topic page
     (`#/topic/<id>`) or chapter page (`#/<book>/book/<n>`).
   - **Verse screen:** the passage theme, the Al-Mukhtasar explanation (collapsible), topics (most specific
     first), similar ayahs with the shared words highlighted, and repeated phrases (mutashabihat) with every
     occurrence. Loaded after the verse itself is shown.
   - The build writes spaces inside a QUL word as no-break spaces, so word positions in QUL data map exactly
     to our text (tested for all 6,236 ayahs).
6. ✅ **Personal** (2026-10-24): a menu drawer (☰ in the dock, slides from the start edge) with Library
   (bookmarks, search history, surahs, hadith collections, the graph), Theme, Reading (text size, Arabic size,
   transliteration), Offline, Privacy (history on/off, clear) and About (install, about and credits, feedback).
   Bookmarks with tags in IndexedDB, with export/import; recent searches on the start screen; hadith of the day
   (direct sayings from Bukhari's and Muslim's reminder chapters, ~310 hadith); share as an image (square or
   story, light or dark, through the system share sheet or a download). The build places hadith that
   hadith-api left without a chapter by the chapters' number ranges (300 in Bukhari, 145 in Muslim).
   **Still open:** the IndoPak script. Its text uses private-use glyphs (1,383 in 1,218 ayahs) that only QUL's
   IndoPak font draws; it needs that font (QUL account download).

Each milestone ends with something usable on a phone.

## Risks and open items

- **Licensing:** QUL datasets have no explicit per-resource licence (see "QUL licensing status").
  Get confirmation from QUL before the public launch. If a resource is refused, fall back to: fawazahmed0
  translations (Unlicense), quran.com tafsir links only (no bundled summary), and dropping that one enrichment feature.
- **Download size:** all six books with Arabic come to several MB; lazy loading per book handles this, but measure on a slow 3G connection.
- **Ranking quality:** fuzzy matching over long hadith texts can surface noise. The fixed-query ranking tests guard against regressions.
- **iOS PWA limits:** no share target on iOS, and storage can be evicted. Request persistent storage and keep
  the export/import of bookmarks on the future list.

## Similar-verses graph (added 2026-10-24)

`#/graph` and `#/graph/<s>:<a>`: every ayah with similar verses as a node (1,644), every QUL similar pair as an
edge (2,336), coloured Meccan/Medinan with colours validated by the dataviz skill's script for each theme.
Layout computed at build time with d3-force; the page is a lazily loaded canvas with pan, zoom, pinch,
nearest-node hover, and a card listing the selected verse's links as text. Linked from the start screen and
from each verse's "Similar verses" section. Details and lessons: `docs/TECHNICAL.md` §13.

## Possible future features

- **"Report a mistake" link** on each verse and hadith screen: opens the repo's "Mistake in a text" issue form
  (`.github/ISSUE_TEMPLATE/1-text-mistake.yml`) with the reference, the text shown and a link back already filled in
  (via the `template=` and field query parameters). Nothing is sent automatically; submitting needs a GitHub account.
- **Search by meaning** ("dealing with anxiety") with a small on-device embedding model (optional ~20–30 MB download)
- Ayah audio recitation (streamed), with a choice of reciter and verse-by-verse highlighting
- More translations and side-by-side view (Urdu, Bengali, Indonesian, … are already in the sources)
- Word-by-word translation and morphology / root explorer (QUL)
- Full tafsirs (Ibn Kathir, Maarif-ul-Quran) as optional downloads
- More collections: Muwatta Malik, Nawawi's 40, 40 Hadith Qudsi, Riyad as-Salihin
- Hifz / memorization mode: hide text, test recall, track progress; quiz on mutashabihat (similar phrases that are easy to mix up)
- Bookmark export/import and optional sync (e.g. via a GitHub gist)
- Browser address-bar search (OpenSearch) and a browser extension for right-click → "Find source"
- Native wrappers (Tauri for desktop with a global hotkey, Capacitor for app stores)
- CLI v2 sharing the same generated data files
