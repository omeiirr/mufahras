# Quran & Hadith Search — Plan

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

1. **Reference parsing** (checked first, exact):
   `2:255`, `2 255`, `baqarah 255` (fuzzy surah name), `bukhari 1`, `muslim 8`, aliases.
   A match is pinned to the top as a "Go to" result.
2. **Mode selection:**
   - Short query (≤ ~8 words): **fuzzy mode** with uFuzzy (`intraMode: 1`, so one typo per term is tolerated).
     Ranking: exact phrase > all terms whole-word > all terms prefix > fuzzy/typo matches; ties broken by shorter text.
   - Long query (pasted quote): **source-finder mode**, which ranks by word-overlap / n-gram similarity
     instead of fuzzy matching (fuzzy matching of a whole paragraph is slow and ranks poorly).
     Shows "Best match: Bukhari 6018 (93% overlap)".
   - Arabic script in the query: search the normalized Arabic field.
3. **Topic matches:** the query is also fuzzy-matched against QUL topic names and hadith section names;
   matches appear as chips ("Topic: Patience · 48 ayahs", "Book of Fasting · Bukhari") that filter the results.
4. **Filters:** Quran / Hadith / both, surah, hadith book, and minimum grading (e.g. "Sahih only").
5. Matches are highlighted using uFuzzy's ranges.

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
- Verse / hadith of the day
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
2. **Search core:** worker, query parser, fuzzy mode, reference jumps, ranking tests against a fixed set of queries.
3. **UI shell:** search page, virtualized results, verse and hadith detail, surah reader, hash routing, dark mode.
4. **PWA:** offline caching, installability, share target, per-book downloads, deploy to Pages.
5. **Enrichment:** topics, similar ayahs, tafsir summary, aliases, transliteration search, source-finder mode.
6. **Personal:** bookmarks + tags, history, verse/hadith of the day, picture cards, settings, about page.

Each milestone ends with something usable on a phone.

## Risks and open items

- **Licensing:** QUL datasets have no explicit per-resource licence (see "QUL licensing status").
  Get confirmation from QUL before the public launch. If a resource is refused, fall back to: fawazahmed0
  translations (Unlicense), quran.com tafsir links only (no bundled summary), and dropping that one enrichment feature.
- **Download size:** all six books with Arabic come to several MB; lazy loading per book handles this, but measure on a slow 3G connection.
- **Ranking quality:** fuzzy matching over long hadith texts can surface noise. The fixed-query ranking tests guard against regressions.
- **iOS PWA limits:** no share target on iOS, and storage can be evicted. Request persistent storage and keep
  the export/import of bookmarks on the future list.

## Possible future features

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
