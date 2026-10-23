# Mufahras مُفَهْرَس

Find any verse of the Quran or hadith of the six major collections as you type. Fuzzy matching, typo-tolerant,
works offline, installable on phone and desktop.

**Use it:** https://omeiirr.github.io/mufahras/

The name means "indexed", after *al-Muʿjam al-Mufahras*, the classic Quran concordance for finding a verse from a
word you remember.

## What it searches

- **Quran:** Uthmani Arabic, Saheeh International translation with footnotes, transliteration
- **Hadith:** Sahih al-Bukhari, Sahih Muslim, Sunan Abi Dawud, Jamiʿ at-Tirmidhi, Sunan an-Nasaʾi, Sunan Ibn Majah,
  in English and Arabic, with each scholar's grading

Try `patience prayer`, `patiance` (typos are fine), `ptnc pryr` (abbreviations), `2:255`, `baqarah 255`,
`bukhari 1`, `qul huwa allahu ahad`, or Arabic without diacritics: `الحمد لله رب العالمين`.

On Android, install it and it appears in the system Share menu: share any text to find its source.

## Development

```sh
npm install
npm run data:fetch   # download the hadith collections (pinned version)
npm run dev          # http://localhost:5173 (add -- --host to open it from a phone)
npm test             # search ranking, data integrity, contrast checks
npm run build        # builds data + app into dist/
```

Everything runs in the browser: the data is split into JSON chunks, indexed in a Web Worker and searched there.
See [PLAN.md](PLAN.md) for the design, data pipeline and roadmap.

Successor to [quran-cli](https://github.com/omeiirr/quran-cli).

## Data and credits

Quran data from the [Quranic Universal Library (QUL)](https://qul.tarteel.ai) by Tarteel (Quran text prepared by
[Tanzil](https://tanzil.net)); hadith from [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api).
Full credits in [NOTICE](NOTICE). Not affiliated with or endorsed by any of these sources.
