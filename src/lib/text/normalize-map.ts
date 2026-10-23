// Character-by-character versions of normalizeLatin / normalizeArabic that also record, for every
// output character, which input character it came from. Used to turn match ranges found in
// normalized text back into ranges in the display text. tests/normalize-map.test.ts checks that
// the output is identical to the regex versions over the whole corpus.

import { daggerToAlif } from './normalize';

export interface Mapped {
  text: string;
  /** map[j] = index in the original string of normalized character j. */
  map: number[];
}

const LATIN_MARK = /[\u0300-\u036F]/g;
const LATIN_DROP = /[\u00B9\u00B2\u00B3\u2070-\u2079]/;
const APOSTROPHES = /[ʿʾʼ'`’‘]/g;
const LATIN_KEEP = /[a-z0-9]/;

const ARABIC_MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;
const ARABIC_LETTER = /[\u0621-\u064A]/;
const ARABIC_FOLD: Record<string, string> = { ٱ: 'ا', أ: 'ا', إ: 'ا', آ: 'ا', ى: 'ي', ة: 'ه', ؤ: 'و', ئ: 'ي', ء: '' };

function build(s: string, fold: (ch: string) => string, keep: RegExp): Mapped {
  let text = '';
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    for (const out of fold(ch)) {
      if (keep.test(out)) {
        if (pendingSpace && text) {
          text += ' ';
          map.push(i);
        }
        pendingSpace = false;
        text += out;
        map.push(i);
      } else {
        pendingSpace = true;
      }
    }
    i += ch.length;
  }
  return { text, map };
}

function foldLatin(ch: string): string {
  const c = ch.charCodeAt(0);
  // ASCII fast path; most characters of English text take it.
  if (c < 128) return c >= 65 && c <= 90 ? String.fromCharCode(c + 32) : c === 39 || c === 96 ? '' : ch;
  return LATIN_DROP.test(ch) ? '' : ch.normalize('NFKD').replace(LATIN_MARK, '').toLowerCase().replace(APOSTROPHES, '');
}

export function normalizeLatinMapped(s: string): Mapped {
  return build(s, foldLatin, LATIN_KEEP);
}

export function normalizeArabicMapped(s: string, daggerAsAlif = false): Mapped {
  return build(daggerAsAlif ? daggerToAlif(s) : s, (ch) => (ARABIC_MARK.test(ch) ? '' : (ARABIC_FOLD[ch] ?? ch)), ARABIC_LETTER);
}

const TRAILING_MARK = /[\u0300-\u036F\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

/**
 * Converts [start, end) ranges in normalized text to ranges in the original text, extending each end
 * over trailing combining marks so Arabic harakat stay inside the highlight.
 */
export function mapRanges(m: Mapped, original: string, ranges: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [s, e] of ranges) {
    if (s >= e || e > m.map.length) continue;
    const start = m.map[s]!;
    let end = m.map[e - 1]! + 1;
    if (original.charCodeAt(end - 1) >= 0xd800 && original.charCodeAt(end - 1) <= 0xdbff) end++;
    while (end < original.length && TRAILING_MARK.test(original[end]!)) end++;
    const last = out[out.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}
