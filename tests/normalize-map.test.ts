// The mapped normalizers must produce exactly the same text as the regex versions, or highlight
// ranges drift. Checked over every text in the generated data (run `npm run data` first).
import { describe, expect, it } from 'vitest';
import { HADITH_BOOKS, type HadithArabicChunk, type HadithChunk, type QuranChunk, type TranslitChunk } from '../src/lib/data/types';
import { normalizeArabic, normalizeLatin } from '../src/lib/text/normalize';
import { mapRanges, normalizeArabicMapped, normalizeLatinMapped } from '../src/lib/text/normalize-map';
import { dataBuilt, loadChunk } from './load';

describe('normalize-map', () => {
  it('maps ranges back over diacritics', () => {
    const s = 'In the name of Allāh,¹ the Merciful';
    const m = normalizeLatinMapped(s);
    const at = m.text.indexOf('allah');
    expect(s.slice(...mapRanges(m, s, [[at, at + 5]])[0]!)).toBe('Allāh');
    const ar = 'ٱلْحَمْدُ لِلَّهِ';
    const ma = normalizeArabicMapped(ar);
    expect(ar.slice(...mapRanges(ma, ar, [[0, 5]])[0]!)).toBe('ٱلْحَمْدُ');
  });

  describe.runIf(dataBuilt)('matches the regex normalizers on all data', () => {
    const latin: string[] = [];
    const arabic: string[] = [];
    const quran = loadChunk<QuranChunk>('quran');
    const translit = loadChunk<TranslitChunk>('translit');
    latin.push(...quran.en, ...translit.simple, ...translit.wbw);
    arabic.push(...quran.ar);
    for (const b of HADITH_BOOKS) {
      latin.push(...loadChunk<HadithChunk>(`hadith-${b}`).hadiths.map((h) => h[2]));
      arabic.push(...loadChunk<HadithArabicChunk>(`hadith-${b}-ar`));
    }

    it(`latin (${latin.length} texts)`, () => {
      expect(latin.filter((t) => normalizeLatinMapped(t).text !== normalizeLatin(t)).slice(0, 3)).toEqual([]);
    }, 30_000);
    it(`arabic, both dagger readings (${arabic.length} texts)`, () => {
      expect(arabic.filter((t) => normalizeArabicMapped(t).text !== normalizeArabic(t)).slice(0, 3)).toEqual([]);
      expect(quran.ar.filter((t) => normalizeArabicMapped(t, true).text !== normalizeArabic(t, true)).slice(0, 3)).toEqual([]);
    }, 30_000); // walks ~40,000 texts character by character
  });
});
