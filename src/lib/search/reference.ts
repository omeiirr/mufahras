// Parses reference-style queries: "2:255", "2 255-257", "112", "baqarah 255", "surah yaseen",
// "البقرة ٢٥٥", "bukhari 1", "abu dawood 402.2". Hadith numbers aren't checked here; the engine does that.
import { BOOKS } from '../data/books';
import type { HadithBookId, Surah } from '../data/types';
import { hasArabic, normalizeArabic, normalizeLatin } from '../text/normalize';
import type { RefTarget } from './types';

const ARTICLES = new Set(['al', 'an', 'at', 'ash', 'as', 'ad', 'adh', 'ar', 'az', 'ath', 'aal', 'ali']);

/** Folds transliteration spelling variants: yaseen/yasin, baqarah/baqara, al imran/aliimran. */
function fold(s: string): string {
  return s
    .replace(/ee/g, 'i')
    .replace(/oo|ou/g, 'u')
    .replace(/(.)\1/g, '$1')
    .replace(/h$/, '');
}

const compact = (s: string) => normalizeLatin(s).replace(/ /g, '');

// Words people search for as content that would otherwise fold into a surah name (allah → "ala" → Al-A'la).
const NOT_SURAH_NAMES = new Set(['allah', 'ala', 'alla']);

export class ReferenceParser {
  /** [surah number, folded name variant]; several variants per surah. */
  private names: [number, string][] = [];
  private arabicNames = new Map<string, number>();
  private books = new Map<string, HadithBookId>();

  constructor(private surahs: Surah[]) {
    for (const s of surahs) {
      const variants = new Set<string>([compact(s.nameSimple), compact(s.name)]);
      // Without the article: "Al-Baqarah" → "baqarah", "Ali 'Imran" → "imran".
      const [first, ...rest] = normalizeLatin(s.nameSimple).split(' ');
      if (first && ARTICLES.has(first) && rest.length) variants.add(rest.join(''));
      for (const v of variants) this.names.push([s.n, fold(v)]);
      this.arabicNames.set(normalizeArabic(s.nameAr), s.n);
      this.arabicNames.set(normalizeArabic(s.nameAr).replace(/^ال/, ''), s.n);
    }
    for (const b of Object.values(BOOKS)) for (const a of b.aliases) this.books.set(a, b.id);
  }

  parse(raw: string): RefTarget | null {
    const q = raw
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    if (!q) return null;

    let m = /^(\d{1,3})\s*[:.\s]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/.exec(q);
    if (m) return this.ayah(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : undefined);

    m = /^(\d{1,3})$/.exec(q);
    if (m) return this.surahRef(Number(m[1]));

    m = /^(.*?[^\d\s:.#-])[\s:#.-]*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+))?$/.exec(q);
    if (m) {
      const [, name = '', num = '', to] = m;
      const book = this.books.get(compact(name.replace(/^(sahih|sunan|jami)\s+/, '')));
      if (book) return { kind: 'hadith', book, number: Number(num) };
      if (!/^\d+$/.test(num)) return null;
      const surah = this.surahByName(name, true);
      return surah ? this.ayah(surah, Number(num), to ? Number(to) : undefined) : null;
    }

    // Name only: "surah yaseen" matches loosely; a bare word only on an exact (folded) name match.
    const prefixed = /^(?:surah|surat|sura|soorah)\s+(.+)$/.exec(q);
    const surah = this.surahByName(prefixed ? prefixed[1]! : q, !!prefixed);
    return surah ? { kind: 'surah', surah } : null;
  }

  private ayah(surah: number, ayah: number, ayahTo?: number): RefTarget | null {
    const s = this.surahs[surah - 1];
    if (!s || ayah < 1 || ayah > s.count) return null;
    if (ayahTo !== undefined && (ayahTo <= ayah || ayahTo > s.count)) ayahTo = undefined;
    return ayahTo === undefined ? { kind: 'ayah', surah, ayah } : { kind: 'ayah', surah, ayah, ayahTo };
  }

  private surahRef(n: number): RefTarget | null {
    return n >= 1 && n <= 114 ? { kind: 'surah', surah: n } : null;
  }

  /** Best surah for a typed name. Loose allows small typos and prefixes ("baqra", "kah"). */
  surahByName(name: string, loose: boolean): number | null {
    if (hasArabic(name)) {
      const a = normalizeArabic(name.replace(/^\s*(سوره|سورة)\s*/, ''));
      return this.arabicNames.get(a) ?? this.arabicNames.get(a.replace(/^ال/, '')) ?? null;
    }
    const plain = compact(name.replace(/^\s*(?:surah|surat|sura|soorah)\s+/, ''));
    if (!loose && NOT_SURAH_NAMES.has(plain)) return null;
    const q = fold(plain);
    if (q.length < 2) return null;
    let best: number | null = null;
    let bestCost = Infinity;
    for (const [n, v] of this.names) {
      let cost: number;
      if (v === q) cost = 0;
      else if (!loose) continue;
      else if (q.length >= 3 && v.startsWith(q)) cost = 0.5 + (v.length - q.length) / 100;
      else {
        const d = distance(q, v);
        if (d > Math.max(1, Math.floor(q.length / 4))) continue;
        cost = d;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = n;
      }
    }
    return best;
  }
}

/** Damerau-Levenshtein (optimal string alignment) distance. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  return d[a.length]![b.length]!;
}
