// Text normalization shared by the data pipeline and the search worker.
// Both sides must use exactly these functions, or queries and indexed text won't line up.

// Harakat, Quranic annotation marks, dagger alif, and tatweel.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const ARABIC_SCRIPT = /[؀-ۿ]/;

/**
 * Folds Arabic so that diacritics and spelling variants don't matter:
 * strips marks, unifies alif forms, ى→ي, ة→ه, ؤ→و, ئ→ي, and drops standalone hamza.
 * With hamza dropped, normalized Uthmani text equals normalized Uthmani-simple text.
 */
export function normalizeArabic(s: string): string {
  return s
    .replace(ARABIC_MARKS, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^ء-ي]+/g, ' ')
    .trim();
}

/**
 * Folds Latin text (translations, transliteration): drops footnote superscripts and
 * apostrophe-like marks, strips diacritics (Allāh → allah, ḥ → h), lowercases, and
 * reduces everything else to single spaces.
 */
export function normalizeLatin(s: string): string {
  return s
    .replace(/[¹²³⁰-⁹]/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ʿʾʼ'`’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function hasArabic(s: string): boolean {
  return ARABIC_SCRIPT.test(s);
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** 12 → "¹²", used for footnote markers inside translation text. */
export function superscript(n: number): string {
  return String(n).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)]!);
}
