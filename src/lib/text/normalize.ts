// Text normalization shared by the data pipeline and the search worker.
// Both sides must use exactly these functions, or queries and indexed text won't line up.

// Harakat, Quranic annotation marks, dagger alif, and tatweel.
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

/**
 * Folds Arabic so that diacritics and spelling variants don't matter:
 * strips marks, unifies alif forms, ى→ي, ة→ه, ؤ→و, ئ→ي, and drops standalone hamza.
 * With hamza dropped, normalized Uthmani text equals normalized Uthmani-simple text.
 */
export function normalizeArabic(s: string, daggerAsAlif = false): string {
  return (daggerAsAlif ? daggerToAlif(s) : s)
    .replace(ARABIC_MARKS, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^\u0621-\u064A]+/g, ' ')
    .trim();
}

/**
 * Uthmani spelling writes many long-a sounds with a dagger alif (ٰ) where modern spelling has a full
 * alif: ٱلْعَـٰلَمِينَ (al-ʿālamīn), ٱلصَّلَوٰةَ (aṣ-ṣalāh). Dropping the dagger (the default) matches
 * Uthmani-simple and words like الرحمن; turning it into ا matches what people type for العالمين
 * and الصلاة. The Quran's Arabic is indexed both ways.
 *
 * Every replacement keeps the string length (tatweel stands in for removed letters, and is dropped
 * later), so normalize-map.ts can apply the same step and keep its index map aligned.
 */
export function daggerToAlif(s: string): string {
  return s
    .replace(/([ىي][\u064B-\u065F]*)\u0670/g, (_, before: string) => `${before}\u0640`)
    .replace(/و([\u064B-\u065F]*)\u0670/g, (_, marks: string) => `\u0640${marks}ا`)
    .replace(/\u0670/g, 'ا');
}

/**
 * Folds Latin text (translations, transliteration): drops footnote superscripts and
 * apostrophe-like marks, strips diacritics (Allāh → allah, ḥ → h), lowercases, and
 * reduces everything else to single spaces.
 */
export function normalizeLatin(s: string): string {
  return s
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[ʿʾʼ'`’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Folds transliteration spelling variants, applied after normalizeLatin to both the transliteration
 * text and query terms searched against it: qayyoom/qayyum, raheem/rahim, allah/alah, dhalika/thalika.
 */
export function foldTranslit(s: string): string {
  return s
    .replace(/dh/g, 'th')
    .replace(/oo|ou/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/([a-z])\1+/g, '$1');
}

/**
 * Tanzil's ASCII transliteration writes ʿayn as "AA" (baAAda) and hamza as "/" (ta/khuthuhu).
 * Dropped before normalizeLatin so "baada" / "ba'da" and "takhudhuhu" match.
 */
export function stripTanzilMarks(s: string): string {
  return s.replace(/AA/g, '').replace(/\//g, '');
}

export function hasArabic(s: string): boolean {
  return ARABIC_SCRIPT.test(s);
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** 12 → "¹²", used for footnote markers inside translation text. */
export function superscript(n: number): string {
  return String(n).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)]!);
}
