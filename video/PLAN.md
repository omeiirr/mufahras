# Mufahras launch video: plan (draft for approval)

A 55-second launch video, made with HyperFrames (HTML compositions rendered to MP4). The pace is slow, there's
room to breathe, and Islamic geometry appears at the moments that carry meaning.

## 1. Idea

**"The index, in your pocket."** For generations, finding a verse from a word you remembered meant *al-Muʿjam
al-Mufahras*, a concordance of every word of the Quran. The video opens on that tradition: the pages of an
index, drawn in line art (not a photo of the real book). An eight-pointed star draws itself and grows into a
tessellation. The tessellation folds into the app icon, and the app takes over: type a few words you remember,
and the source appears.

Tone: calm, reverent, confident. No hype words, no countdowns, no fast cuts. Each scene holds a beat after its
point lands.

## 2. Format

| | Proposal | Alternative |
|---|---|---|
| Aspect | **9:16, 1080×1920** (Reels, Shorts, Status, X; it's a phone app) | 16:9 1920×1080 for YouTube and the README, as a second render of the same scenes laid out wider |
| Length | **~55 s** | 45 s cut (drop scene 8 and shorten 9) |
| Frame rate | 30 fps (60 only helps the typing; not worth double the render) | 60 fps |
| Captions | **Burned in**, always on (most people watch muted) | Separate .srt as well |

## 3. Visual style

- **Colours, from the app and its icon** (so the video and the app look the same):
  | Role | Colour | Source |
  |---|---|---|
  | Ground (dark scenes) | `#1f242c` | Night theme background |
  | Ground (light scenes) | `#faf8f3` | Paper theme background |
  | Primary | `#1f6b57` | Paper accent, icon green |
  | Gold (geometry, highlights) | `#e6c77e` | Icon's meem and star |
  | Soft teal (accents on dark) | `#8cc5c0` | Night accent |
  | Ink | `#1f1d1a` / `#d3d9e1` | Paper / Night ink |

  The film starts dark (Night), moves to light (Paper) when the app starts helping, and ends dark again with
  gold. That arc reads as night to dawn without saying it.
- **Type:** Scheherazade New for the Arabic, the app's own Quran font (OFL). Latin titles in **Fraunces** or
  **Cormorant Garamond** (OFL; warm, bookish, echoes the concordance). Captions in **Inter** (OFL). Fonts are
  bundled locally, so the render is deterministic.
- **Geometry:** all generated as SVG in code, not stock clips, so it's crisp at any size and matches the
  icon exactly:
  - the **khatam**, an eight-pointed star of two squares (۞, the icon's star);
  - an **8-fold tessellation** grown from it (stars and crosses);
  - a **girih-style line field** for transitions.
  Motion: lines draw themselves (stroke-dashoffset) in gold on dark, at 1.5–3 s per draw, with easing that
  settles; patterns rotate very slowly (≤ 2° per second). Used **only at four moments**: the opening, the
  turn to search by meaning, the similar-verses graph (the constellation of verses rhymes with the pattern),
  and the close. Elsewhere it's a faint 4% watermark texture at most.
- **Screens** are real captures of the app, shown inside a minimal phone outline (a thin rounded rectangle,
  no brand of phone), with soft shadow. The camera moves slowly: pushes in to the part that matters, never
  spins. Tapped words and new results get a gentle gold underline or glow, not arrows or circles.
- **No faces, no people, no animals.** Nothing that imitates the mushaf page layout. The Quran's text is never
  animated letter by letter or distorted; it fades in whole and holds.

## 4. Audio (halal options)

No musical instruments and no music-like percussion in any option.

| Option | What | Notes |
|---|---|---|
| **A (recommended)** | **Voice-over plus a soft natural ambience** (light wind, a distant courtyard fountain), CC0 from Freesound, mixed low. Quiet foley where it helps: a page turn in the opening, very soft key taps while typing. | Your own voice reads best (warm, real, correct pronunciation of *Mufahras*, *ayah*, *Bukhari*). A local TTS (Kokoro, Apache-2.0) is the fallback, but it mispronounces Arabic names; I'd write them phonetically and you'd judge. |
| B | A, plus **a short recitation** at the opening, alone with no voice-over over it: *رَّبِّ زِدْنِي عِلْمًا* ("My Lord, increase me in knowledge", 20:114). | It fits the theme of seeking knowledge beautifully. But recitation in a promotional video needs care: it must never sit under other sound, and the reciter's audio licence must be confirmed (EveryAyah files are widely reused, but the licence isn't stated). |
| C | **No voice-over:** captions carry the words; ambience and foley only. | Simplest, fully under our control, works muted. Less personal. |
| D | A vocal-only nasheed | Not recommended: hard to license, and some scholars object to vocal effects that imitate instruments. |

## 5. Every feature, and what the video shows

The app has more than 55 slow seconds can show. Six features get **a scene each**; the rest appear together
in one **"and more" scene** (a slow drift across a grid of screens, each labelled) and in the closing card.

| Feature | In the video |
|---|---|
| Search as you type: typos, any order, abbreviations | **Scene 3** |
| Arabic without diacritics; transliteration | **Scene 3** (a second query) |
| References: `2:255`, `baqarah 255`, `surah yaseen`, well-known names (`ayatul kursi`), hadith numbers | Scene 7, labelled |
| Finding a quote worded differently ("close matches") | **Scene 4** |
| **Search by meaning** (on-device, offline, beta) | **Scene 5** |
| Filters: Quran / Hadith / Sahih only | Scene 4, visible in passing |
| Verse screen: explanation (Al-Mukhtasar), passage theme, topics, neighbours | **Scene 6** |
| Word by word: tap a word for its meaning and transliteration | **Scene 6** |
| Similar verses and repeated phrases (mutashabihat) | Scene 6 (in passing), scene 7 |
| Hadith screen: the six collections, Arabic, chapter, each grading by scholar | Scene 4 (opens a hadith), scene 7 |
| Browsing: 114 surahs, collections by chapter, topics, the 99 Names, duas of the Quran, sajdah verses | Scene 7, labelled |
| **Similar-verses graph** | **Scene 7**, the geometric moment |
| Verse and hadith of the day | Scene 2 (start screen) |
| Bookmarks with tags, history, export/import | Scene 7, labelled |
| Share as an image (square or story, light or dark) | Scene 7, labelled |
| Four themes, text sizes, transliteration | Scene 7: the same verse cross-fading Paper → Sepia → Dusk → Night |
| Sakinah mode (only search and reading) | Scene 7, labelled |
| Works offline; install as an app; desktop side by side with keys | Scene 8 |
| Free, no accounts, no ads, no tracking, open source | Scene 8 and the end card |

## 6. Storyboard (~55 s)

Voice-over (Option A) is ~115 words, read slowly (about 2.1 words a second, with pauses).

| # | Time | Picture | Words (voice-over and caption) |
|---|---|---|---|
| 1 | 0:00–0:07 | Dark ground. Line-art pages of an index turn slowly; columns of Arabic words. A gold eight-pointed star draws itself in the centre, then grows outward into a tessellation that fills the frame. | "For generations, finding a verse from a word you remembered meant a book like this: *al-Muʿjam al-Mufahras*, an index of every word." |
| 2 | 0:07–0:12 | The pattern folds inward into the star; the gold meem appears: the icon. Title **Mufahras · مُفَهْرَس**. It dissolves into the phone: the start screen, verse of the day. Night shifts to Paper. | "Mufahras carries that index into your pocket." |
| 3 | 0:12–0:20 | Typing `patiance` (a typo), and results arrive under the fingers; the typo is forgiven. Then `الحمد لله رب العالمين` without diacritics → 1:2. | "Type what you remember: misspelled, out of order, in English, Arabic or transliteration. The source appears as you type." |
| 4 | 0:20–0:27 | Typing a half-remembered sentence; a "close match" hadith appears; tap → the hadith screen, its gradings table glowing softly. | "Half a hadith someone quoted? It finds the source, with the grading of every scholar." |
| 5 | 0:27–0:35 | A girih line field sweeps across: the pause before the new idea. Typing `dealing with anxiety`; "By meaning" appears: **94:6, *with hardship will be ease***, which holds. Small caption: *on your device, offline*. | "And when you can't remember the words at all, search by meaning: it finds verses and hadith that say what you mean. On your device." |
| 6 | 0:35–0:42 | 94:6 opens. Tap an Arabic word → the word card (meaning, transliteration). Slow scroll past the explanation and similar verses. | "Every verse comes with its explanation, word by word, and the verses that share its words." |
| 7 | 0:42–0:49 | The **graph**: verse nodes appear like stars, joining into clusters, gold on dark; it eases back into a grid of screens drifting slowly, each labelled: *Surahs · Hadith by chapter · 99 Names · Duas · Bookmarks · Share as image · Themes · Sakinah mode*. | "Browse the surahs, the six hadith collections, the Names of Allah, the duas of the Quran, and more." |
| 8 | 0:49–0:53 | The phone goes offline (an airplane icon), and a search still works. | "Free. No accounts, no ads. It works offline." |
| 9 | 0:53–0:58 | The pattern returns and settles around the icon. **Mufahras**, `omeiirr.github.io/mufahras`, *open source*. Holds. | "Mufahras. Find any verse or hadith." |

## 7. Screens to capture

All captured from the built app by a Playwright script at phone size (412×915 CSS px at 3× = 1236×2745,
cropped to the frame), in the Paper theme unless noted:

1. Start screen with the verse and hadith of the day (and Night for the opening shot)
2. Search: typing `patiance` → results
3. Search: `الحمد لله رب العالمين` → 1:2
4. Search: a half-remembered hadith sentence → close matches
5. Hadith screen with its gradings table
6. Search by meaning: `dealing with anxiety` → "By meaning" with 94:6
7. Verse screen 94:6 with the word card open
8. Verse screen scrolled: explanation, similar verses
9. Similar-verses graph (Night)
10. Surah index
11. Hadith collections → a book's chapters
12. The 99 Names of Allah
13. Duas of the Quran
14. Bookmarks with tags
15. Share card (picture of a verse)
16. The same verse in all four themes
17. Menu drawer: Sakinah mode, search by meaning
18. Offline: a search with the network off
19. (16:9 cut only) Desktop side by side

Typing scenes are **recorded as video** (Chrome's screencast at 3×), not faked, so every result shown is what the
app really returns. Still screens are PNG screenshots. The capture script lives in `video/capture/` and runs
against `npm run preview`, so it can be re-run after any UI change.

## 8. Build

- **Install:** `npm i -g hyperframes` (global, as you prefer), version 0.8.192; plus its agent skills
  (`npx hyperframes skills update`). It needs Node 22+ (have 22.23) and FFmpeg (installed).
- **Project:** `video/` in this repo: `index.html` (the composition), `scenes/*.html`, `geometry.js`
  (pattern generators), `assets/` (captures, fonts, audio), `capture/` (Playwright script). Renders
  go to `video/out/` (gitignored). Preview with `hyperframes preview`, render with `hyperframes render`.
- **Animation:** GSAP timelines (HyperFrames' default adapter), deterministic seek, so renders match previews.
- **Checks before you see it:** I render, then watch it frame by frame: at least 3 s per caption, no text
  smaller than 42 px at 1080 width, text clear of the platform UI zones (top 220 px, bottom 380 px on 9:16),
  Arabic shaped correctly, audio peaks at −1 dBFS and loudness around −14 LUFS.
- **Delivery:** `mufahras-launch-9x16.mp4` (H.264, ~15 MB) and a poster frame. The 16:9 version is optional.

## 9. Where I think something better can be done

1. **A shorter loop for the README.** A 10-second silent loop (scene 3 then 5) as a GIF/WebM at the top of the
   README shows the app faster than any screenshot. Cheap to cut from the same project.
2. **Real queries over pretty ones.** I'd rather show `patiance` and a slightly clumsy half-sentence than
   polished queries. They're what people actually type, and the point is that the app copes.
3. **Search by meaning is beta.** I'd label it *beta* on screen, so the launch doesn't over-promise; it misses
   about one query in ten.
4. **Your voice over TTS.** Two minutes of recording on a phone in a quiet room, read from the script above,
   will sound better than any synthetic voice; I'd clean it up (noise, levels) with FFmpeg.
5. **Skip the recitation (Option B)** unless the licence is clear and you're comfortable with it in a promotion.
   The opening works with the page turn and the star drawing in near-silence.

## 10. Decisions needed from you

1. Theme and idea: "the index, in your pocket", night to dawn.
2. Format: 9:16 only, or 16:9 as well.
3. Audio: A, B or C; and your voice or TTS.
4. Storyboard and script: changes to any line.
5. The README loop: yes or no.
