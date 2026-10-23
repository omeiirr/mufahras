// Checks the generated files in public/data/ (run `npm run data` first).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  HadithArabicChunk,
  HadithChunk,
  Manifest,
  MutashabihatChunk,
  QuranChunk,
  SimilarChunk,
  TafsirChunk,
  Theme,
  Topic,
  TranslitChunk,
} from '../src/lib/data/types';
import { HADITH_BOOKS } from '../src/lib/data/types';
import { normalizeArabic } from '../src/lib/text/normalize';

const DIR = join(import.meta.dirname, '..', 'public', 'data');
const built = existsSync(join(DIR, 'manifest.json'));
const manifest: Manifest = built ? JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) : ({} as Manifest);
const load = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, manifest.chunks[name]!.file), 'utf8'));

describe.runIf(built)('generated data', () => {
  const quran = load<QuranChunk>('quran');
  const at = (s: number, a: number) => quran.surahs[s - 1]!.start + a - 1;

  it('has 114 surahs and 6,236 ayahs in every per-ayah file', () => {
    expect(quran.surahs).toHaveLength(114);
    expect(quran.surahs.reduce((n, s) => n + s.count, 0)).toBe(6236);
    for (const arr of [quran.ar, quran.en, load<TranslitChunk>('translit').simple, load<TranslitChunk>('translit').wbw, load<string[]>('indopak'), load<TafsirChunk>('tafsir').text])
      expect(arr).toHaveLength(6236);
  });

  it('places known ayahs at the right index', () => {
    // Compared normalized: the order of stacked marks (shadda + vowel) differs between typing and Tanzil.
    expect(normalizeArabic(quran.ar[at(1, 1)]!)).toBe('بسم الله الرحمن الرحيم');
    expect(quran.en[at(2, 255)]).toMatch(/^Allāh - there is no deity except Him, the Ever-Living/);
    expect(quran.en[at(114, 6)]).toMatch(/jinn and mankind/);
  });

  it('drops ayah-number markers from the Arabic', () => {
    expect(quran.ar.every((a) => !/[٠-٩]/.test(a))).toBe(true);
  });

  it('has one footnote per superscript marker', () => {
    for (const [i, notes] of Object.entries(quran.footnotes)) {
      const markers = quran.en[Number(i)]!.match(/[\u00B9\u00B2\u00B3\u2070-\u2079]+/g) ?? [];
      expect(markers.length, `ayah index ${i}`).toBe(notes.length);
    }
    expect(quran.en.filter((t, i) => /[\u00B9\u00B2\u00B3\u2070-\u2079]/.test(t) && !quran.footnotes[i])).toEqual([]);
  });

  it('resolves tafsir group pointers to heads that cover them', () => {
    const tafsir = load<TafsirChunk>('tafsir');
    expect(tafsir.text[at(2, 4)]).toBe(at(2, 3));
    expect(tafsir.groups[at(37, 167)]).toEqual([at(37, 167), at(37, 170)]);
  });

  it('links topics, themes, similar ayahs and mutashabihat to valid ayahs', () => {
    const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < 6236;
    const topics = load<Topic[]>('topics');
    const patience = topics.find((t) => t.name === 'Patience');
    expect(patience?.ayahs).toContain(at(2, 153));
    expect(topics.every((t) => t.ayahs.every(valid))).toBe(true);
    expect(load<Theme[]>('themes').every(([a, b]) => valid(a) && valid(b) && a <= b)).toBe(true);
    expect(Object.values(load<SimilarChunk>('similar')).flat().every(([i]) => valid(i))).toBe(true);
    const m = load<MutashabihatChunk>('mutashabihat');
    expect(Object.values(m.byAyah).flat().every((id) => m.phrases[id])).toBe(true);
  });

  it.each(HADITH_BOOKS)('%s: rows and Arabic line up, sections exist', (id) => {
    const book = load<HadithChunk>(`hadith-${id}`);
    const arabic = load<HadithArabicChunk>(`hadith-${id}-ar`);
    expect(arabic).toHaveLength(book.hadiths.length);
    expect(book.hadiths.every(([, section, en], i) => book.sections[section] !== undefined && (en || arabic[i]))).toBe(true);
    expect(book.hadiths.every(([, , , grades]) => grades.every(([s]) => book.scholars[s]))).toBe(true);
  });

  it('keeps known hadith texts and gradings', () => {
    const bukhari = load<HadithChunk>('hadith-bukhari');
    expect(bukhari.hadiths.find((h) => h[0] === 1)?.[2]).toMatch(/intention/);
    const tirmidhi = load<HadithChunk>('hadith-tirmidhi');
    const t6 = tirmidhi.hadiths.find((h) => h[0] === 6)!;
    expect(t6[3].map(([s, g]) => `${tirmidhi.scholars[s]}: ${g}`)).toContain('Al-Albani: Sahih');
  });
});

describe.runIf(built)('hadith chapters', () => {
  it('places hadith the source left without a chapter by their chapter number ranges', () => {
    const bukhari = load<HadithChunk>('hadith-bukhari');
    expect(bukhari.hadiths.filter((h) => h[1] === 0).length).toBeLessThan(10);
    expect(bukhari.sections[0]).toBe('Not in a chapter');
    // Bukhari 299 ("…take a bath from a single pot…") is in Menstrual Periods.
    expect(bukhari.sections[bukhari.hadiths.find((h) => h[0] === 299)![1]]).toBe('Menstrual Periods');
    const muslim = load<HadithChunk>('hadith-muslim');
    expect(muslim.hadiths.filter((h) => h[1] === 0).every((h) => h[0] <= 92)).toBe(true);
  });
});
