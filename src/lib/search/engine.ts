// The search engine. Pure: it is handed data chunks and answers queries, so it runs the same in the
// worker and in tests. See "Search design" in PLAN.md.
//
// Matching is per term and order-independent: every term must match a word of the document.
// Terms are matched against each segment's vocabulary (WordIndex), at a tier:
//   3 exact: the word contains the term (1-letter terms: whole word; 2 letters: word prefix)
//   2 typo: one insertion, deletion, substitution or transposition (uFuzzy single-error)
//   1 abbreviation: the term's letters in order within one word, fzf-style ("ptnc" → "patience")
// The exact pass runs first; the fuzzy tiers are added only when it finds fewer than FUZZY_BELOW
// results. Ranking: weakest term tier, then word boundaries, then a phrase bonus for the top
// candidates, minus a penalty for long texts.
import uFuzzy from '@leeoniya/ufuzzy';
import { BOOKS, formatHadithNumber } from '../data/books';
import type { HadithArabicChunk, HadithBookId, HadithChunk, QuranChunk, TranslitChunk } from '../data/types';
import { gradeRank, summarizeGrades, type GradeClass } from '../hadith/grades';
import { foldTranslit, hasArabic, normalizeArabic, normalizeLatin, stripTanzilMarks } from '../text/normalize';
import { mapRanges, normalizeArabicMapped, normalizeLatinMapped, type Mapped } from '../text/normalize-map';
import { ReferenceParser } from './reference';
import type { DocRef, Field, Hit, PresentedHit, RefTarget, SearchOptions, SearchResponse, Tier } from './types';
import { Vocabulary, WordIndex } from './word-index';

const ALPHA = 'a-z\\u0621-\\u064A';
const typoFuzzy = new uFuzzy({ alpha: ALPHA, intraMode: 1, intraSub: 1, intraTrn: 1, intraDel: 1, intraIns: 1 });
const abbrevFuzzy = new uFuzzy({ alpha: ALPHA, intraMode: 0, intraIns: Infinity });

const FUZZY_BELOW = 20;
const MIN_TYPO_LEN = 4;
const MIN_ABBREV_LEN = 3;
const PHRASE_CANDIDATES = 300;
const SNIPPET = 280;

// Word match quality, packed as (tier - 1) * 3 + boundary + 1, so 0 means "no match" and higher is better.
// boundary: 0 inside a word, 1 word prefix, 2 whole word.
const quality = (tier: Tier, boundary: 0 | 1 | 2) => (tier - 1) * 3 + boundary + 1;
const tierOf = (q: number) => (Math.floor((q - 1) / 3) + 1) as Tier;
const BOUNDARY_BONUS = [0, 4, 10];
const termScore = (q: number) => tierOf(q) * 30 + BOUNDARY_BONUS[(q - 1) % 3]!;

/** One searchable field of one collection. */
interface Segment {
  id: number;
  corpus: 'quran' | HadithBookId;
  field: Field;
  /** Applied to query terms and the phrase before matching this segment (transliteration spelling folds). */
  fold?: (s: string) => string;
  hay: string[];
  index: WordIndex;
}

interface Candidate {
  seg: Segment;
  doc: number;
  score: number;
  tier: Tier;
}

/** Words matching one term, with their match quality, as a list (for postings) and a map (for lookups). */
interface WordMatches {
  list: [string, number][];
  byWord: Map<string, number>;
}

interface HadithBookState {
  chunk: HadithChunk;
  arabic?: HadithArabicChunk;
  grade: GradeClass[];
  byNumber: Map<number, number>;
}

export class SearchEngine {
  private quran?: QuranChunk;
  private translit?: TranslitChunk;
  private parser?: ReferenceParser;
  private books = new Map<HadithBookId, HadithBookState>();
  private segments: Segment[] = [];
  /** One vocabulary per script, rebuilt lazily after segments are added. */
  private vocab: { latin?: Vocabulary; arabic?: Vocabulary } = {};
  /** Vocabulary matches per script + pass + term; typing changes one term at a time, so most hit. */
  private wordCache = new Map<string, WordMatches>();

  private addSegment(corpus: Segment['corpus'], field: Field, hay: string[], fold?: (s: string) => string): void {
    this.segments.push({ id: this.segments.length, corpus, field, fold, hay, index: new WordIndex(hay) });
    this.vocab = {};
    this.wordCache.clear();
  }

  private vocabulary(arabic: boolean): Vocabulary {
    const key = arabic ? 'arabic' : 'latin';
    return (this.vocab[key] ??= new Vocabulary(this.segments.filter((s) => (s.field === 'ar') === arabic).map((s) => s.index)));
  }

  addQuran(chunk: QuranChunk): void {
    this.quran = chunk;
    this.parser = new ReferenceParser(chunk.surahs);
    this.addSegment('quran', 'en', chunk.en.map(normalizeLatin));
    // Indexed under both dagger-alif readings (see daggerToAlif); queries are matched against each as typed.
    this.addSegment('quran', 'ar', chunk.ar.map((a) => normalizeArabic(a)));
    this.addSegment('quran', 'ar', chunk.ar.map((a) => normalizeArabic(a, true)));
  }

  addTranslit(chunk: TranslitChunk): void {
    this.translit = chunk;
    // Both schemes in one text, so either spelling style matches.
    const text = (s: string, i: number) => foldTranslit(`${normalizeLatin(stripTanzilMarks(s))} ${normalizeLatin(chunk.wbw[i] ?? '')}`);
    this.addSegment('quran', 'translit', chunk.simple.map(text), foldTranslit);
  }

  addHadith(chunk: HadithChunk): void {
    const info = BOOKS[chunk.id];
    this.books.set(chunk.id, {
      chunk,
      grade: chunk.hadiths.map(([, , , grades]) => summarizeGrades(grades.map(([, g]) => g), info.sahihCollection)),
      byNumber: new Map(chunk.hadiths.map((h, row) => [h[0], row])),
    });
    this.addSegment(chunk.id, 'en', chunk.hadiths.map(([, , en]) => normalizeLatin(en)));
  }

  addHadithArabic(book: HadithBookId, arabic: HadithArabicChunk): void {
    const state = this.books.get(book);
    if (!state) throw new Error(`addHadithArabic: load the ${book} chunk first`);
    state.arabic = arabic;
    this.addSegment(book, 'ar', arabic.map((a) => normalizeArabic(a)));
  }

  hasHadith(book: HadithBookId): boolean {
    return this.books.has(book);
  }

  hasHadithArabic(book: HadithBookId): boolean {
    return !!this.books.get(book)?.arabic;
  }

  search(query: string, opts: SearchOptions = {}): Omit<SearchResponse, 'partial'> {
    const t0 = performance.now();
    const limit = opts.limit ?? 30;
    const pinned = this.pinned(query);

    const arabic = hasArabic(query);
    const nq = arabic ? normalizeArabic(query) : normalizeLatin(query);
    const terms = [...new Set(nq.split(' ').filter(Boolean))];
    if (!terms.length) return { query, pinned, hits: [], total: 0, ms: performance.now() - t0 };

    const segments = this.segments.filter((s) => (arabic ? s.field === 'ar' : s.field !== 'ar') && this.corpusAllowed(s.corpus, opts));
    let found = this.run(segments, terms, false, arabic, opts);
    if (found.length < FUZZY_BELOW) found = this.run(segments, terms, true, arabic, opts);

    // Best candidate per document across its fields and spellings.
    const best = new Map<string, Candidate>();
    for (const c of found) {
      const key = refKey(this.refOf(c));
      const prev = best.get(key);
      if (!prev || c.score > prev.score) best.set(key, c);
    }
    const ranked = [...best.values()].sort((a, b) => b.score - a.score);

    // Phrase bonus only for the top candidates: it needs a scan of the text.
    if (terms.length > 1) {
      for (const c of ranked.slice(0, PHRASE_CANDIDATES)) {
        const text = c.seg.hay[c.doc]!;
        const phrase = c.seg.fold ? c.seg.fold(nq) : nq;
        if (text.includes(phrase)) c.score += 25 + (wholeWordAt(text, phrase) ? 10 : 0);
      }
      ranked.sort((a, b) => b.score - a.score);
    }

    const hits = ranked.slice(0, limit).map((c) => this.present({ ref: this.refOf(c), score: c.score, tier: c.tier, field: c.seg.field }, terms));
    return { query, pinned, hits, total: ranked.length, ms: performance.now() - t0 };
  }

  private corpusAllowed(corpus: Segment['corpus'], opts: SearchOptions): boolean {
    // A surah filter means Quran only; a book filter means those books only.
    if (opts.surah) return corpus === 'quran';
    if (opts.books?.length) return corpus !== 'quran' && opts.books.includes(corpus);
    const c = opts.corpus ?? 'all';
    return corpus === 'quran' ? c !== 'hadith' : c !== 'quran';
  }

  private allowedDocs(seg: Segment, opts: SearchOptions): ((doc: number) => boolean) | undefined {
    if (seg.corpus === 'quran' && opts.surah) {
      const s = this.quran!.surahs[opts.surah - 1]!;
      return (d) => d >= s.start && d < s.start + s.count;
    }
    if (seg.corpus !== 'quran' && opts.minGrade) {
      const grade = this.books.get(seg.corpus)!.grade;
      const min = gradeRank(opts.minGrade);
      return (d) => gradeRank(grade[d]!) >= min;
    }
    return undefined;
  }

  private run(segments: Segment[], terms: string[], fuzzy: boolean, arabic: boolean, opts: SearchOptions): Candidate[] {
    const out: Candidate[] = [];
    for (const seg of segments) {
      const { index } = seg;
      const allowed = this.allowedDocs(seg, opts);
      const score = new Float32Array(index.size);
      const minTier = new Uint8Array(index.size).fill(3);

      // Rarest term first: its postings give a small candidate set, and every later term is then
      // checked only against those candidates.
      const plan = (seg.fold ? terms.map(seg.fold) : terms)
        .map((term) => {
          const words = this.matchWords(term, fuzzy, arabic);
          let postings = 0;
          for (const [w] of words.list) postings += index.postings(w)?.length ?? 0;
          return { words, postings };
        })
        .sort((a, b) => a.postings - b.postings);

      let active: number[] | null = null;
      for (const { words, postings } of plan) {
        const next: number[] = [];
        const accept = (d: number, v: number) => {
          next.push(d);
          score[d] = score[d]! + termScore(v);
          minTier[d] = Math.min(minTier[d]!, tierOf(v));
        };
        let textCost = 0;
        if (active) for (const d of active) textCost += index.lengths[d]! / 6; // ≈ words to look up
        if (active && textCost < postings) {
          // Few candidates left: look their words up instead of merging postings.
          for (const d of active) {
            let v = 0;
            for (const w of seg.hay[d]!.split(' ')) v = Math.max(v, words.byWord.get(w) ?? 0);
            if (v) accept(d, v);
          }
        } else {
          const q = new Uint8Array(index.size);
          const touched: number[] = [];
          for (const [w, wq] of words.list)
            for (const d of index.postings(w) ?? []) {
              if (q[d] === 0) touched.push(d);
              if (wq > q[d]!) q[d] = wq;
            }
          for (const d of active ?? touched) {
            const v = q[d]!;
            if (v && (active || !allowed || allowed(d))) accept(d, v);
          }
        }
        active = next;
        if (!active.length) break;
      }

      // Transliteration holds two schemes per text, so halve its length; a transliteration match is a
      // strong sign the user is after a verse (they typed Arabic in Latin letters), so it gets a bonus.
      const translit = seg.field === 'translit';
      for (const d of active ?? []) {
        const tier = minTier[d] as Tier;
        const penalty = Math.log2(1 + index.lengths[d]! / (translit ? 2 : 1) / 100) * 3;
        out.push({ seg, doc: d, tier, score: score[d]! - penalty + (translit && tier === 3 ? 10 : 0) });
      }
    }
    return out;
  }

  /** Vocabulary words matching a term, with their match quality. */
  private matchWords(term: string, fuzzy: boolean, arabic: boolean): WordMatches {
    const key = `${arabic ? 'a' : 'l'}|${fuzzy ? 1 : 0}|${term}`;
    const cached = this.wordCache.get(key);
    if (cached) return cached;

    const vocab = this.vocabulary(arabic);
    const out: WordMatches = { list: [], byWord: new Map() };
    const add = (w: string, q: number) => {
      if (out.byWord.has(w)) return;
      out.byWord.set(w, q);
      out.list.push([w, q]);
    };
    const exact = term.length === 1 ? vocab.withPrefix(term).filter((w) => w === term) : term.length === 2 ? vocab.withPrefix(term) : vocab.containing(term);
    for (const w of exact) add(w, quality(3, w === term ? 2 : w.startsWith(term) ? 1 : 0));

    if (fuzzy && !/\d/.test(term)) {
      // Both fuzzy tiers keep the first letter (uFuzzy's single-error mode never changes it either),
      // so only words starting with it are scanned: a small slice of the vocabulary.
      const words = vocab.withPrefix(term[0]!);
      if (term.length >= MIN_TYPO_LEN) for (const i of typoFuzzy.filter(words, term) ?? []) add(words[i]!, quality(2, words[i]!.startsWith(term.slice(0, 2)) ? 1 : 0));
      if (term.length >= MIN_ABBREV_LEN) for (const i of abbrevFuzzy.filter(words, term) ?? []) add(words[i]!, quality(1, 0));
    }

    if (this.wordCache.size > 500) this.wordCache.clear();
    this.wordCache.set(key, out);
    return out;
  }

  private refOf(c: Candidate): DocRef {
    return c.seg.corpus === 'quran' ? { kind: 'ayah', i: c.doc } : { kind: 'hadith', book: c.seg.corpus, row: c.doc };
  }

  // ---------------------------------------------------------------- references

  private pinned(query: string): PresentedHit[] {
    const target = this.parser?.parse(query);
    if (!target) return [];
    const ref = this.resolve(target);
    if (!ref) return [];
    const hit = this.present({ ref, score: 0, tier: 3, field: 'en' }, []);
    if (target.kind === 'surah') {
      const s = this.quran!.surahs[target.surah - 1]!;
      hit.label = `Surah ${s.n} · ${s.nameSimple}`;
      hit.sublabel = `${s.count} ayahs · ${s.place === 'makkah' ? 'Meccan' : 'Medinan'}`;
    } else if (target.kind === 'ayah' && target.ayahTo) {
      hit.label = `${target.surah}:${target.ayah}–${target.ayahTo}`;
    }
    return [hit];
  }

  resolve(target: RefTarget): DocRef | null {
    if (target.kind === 'hadith') {
      const row = this.books.get(target.book)?.byNumber.get(target.number);
      return row === undefined ? null : { kind: 'hadith', book: target.book, row };
    }
    const s = this.quran?.surahs[target.surah - 1];
    if (!s) return null;
    return { kind: 'ayah', i: s.start + (target.kind === 'ayah' ? target.ayah - 1 : 0) };
  }

  // ---------------------------------------------------------------- presentation

  present(hit: Hit, terms: string[]): PresentedHit {
    const { ref, field, tier } = hit;
    let text: string;
    let label: string;
    let sublabel: string;
    let secondary: string | undefined;
    let grade: GradeClass | undefined;

    if (ref.kind === 'ayah') {
      const q = this.quran!;
      const s = q.surahs.find((x) => ref.i >= x.start && ref.i < x.start + x.count)!;
      label = `${s.n}:${ref.i - s.start + 1}`;
      sublabel = s.nameSimple;
      text = field === 'ar' ? q.ar[ref.i]! : field === 'translit' ? this.translit!.wbw[ref.i]! : q.en[ref.i]!;
      if (field !== 'en') secondary = q.en[ref.i];
    } else {
      const b = this.books.get(ref.book)!;
      const [number, section, en] = b.chunk.hadiths[ref.row]!;
      label = `${BOOKS[ref.book].short} ${formatHadithNumber(number)}`;
      sublabel = b.chunk.sections[section] ?? '';
      text = field === 'ar' ? (b.arabic?.[ref.row] ?? '') : en;
      grade = b.grade[ref.row];
    }

    let ranges = terms.length ? this.highlight(text, terms, field, tier) : [];
    if (ref.kind === 'ayah' && field === 'translit' && terms.length && ranges.length < terms.length) {
      // The match may have been in the other scheme; show whichever covers more terms.
      const simple = this.translit!.simple[ref.i]!;
      const alt = this.highlight(simple, terms, field, tier);
      if (alt.length > ranges.length) [text, ranges] = [simple, alt];
    }
    ({ text, ranges } = snippet(text, ranges));
    return { ref, key: refKey(ref), label, sublabel, field, tier, text, secondary, ranges, grade };
  }

  private highlight(text: string, terms: string[], field: Field, tier: Tier): [number, number][] {
    if (field !== 'ar') {
      const m = normalizeLatinMapped(text);
      return mapRanges(m, text, termRanges(m, terms, tier));
    }
    // Arabic: whichever dagger-alif reading matches more of the query.
    const plain = normalizeArabicMapped(text);
    const alif = normalizeArabicMapped(text, true);
    const a = termRanges(plain, terms, tier);
    const b = termRanges(alif, terms.map((t) => normalizeArabic(t, true)), tier);
    return b.length > a.length ? mapRanges(alif, text, b) : mapRanges(plain, text, a);
  }
}

/** Match ranges of the query terms within normalized text. */
function termRanges(m: Mapped, terms: string[], tier: Tier): [number, number][] {
  const ranges: [number, number][] = [];
  for (const term of terms) {
    let found = false;
    for (let at = m.text.indexOf(term); at >= 0; at = m.text.indexOf(term, at + term.length)) {
      // Short terms only count at a word start, matching how they were searched.
      if (term.length <= 2 && at > 0 && m.text[at - 1] !== ' ') continue;
      ranges.push([at, at + term.length]);
      found = true;
    }
    if (!found && tier < 3) {
      for (const uf of [typoFuzzy, abbrevFuzzy]) {
        const idxs = uf.filter([m.text], term);
        if (!idxs?.length) continue;
        const r = uf.info(idxs, [m.text], term).ranges[0] ?? [];
        for (let k = 0; k + 1 < r.length; k += 2) ranges.push([r[k]!, r[k + 1]!]);
        break;
      }
    }
  }
  ranges.sort((x, y) => x[0] - y[0]);
  return ranges;
}

export function refKey(ref: DocRef): string {
  return ref.kind === 'ayah' ? `q${ref.i}` : `h${ref.book}:${ref.row}`;
}

function wholeWordAt(text: string, phrase: string): boolean {
  for (let at = text.indexOf(phrase); at >= 0; at = text.indexOf(phrase, at + 1)) {
    const before = at === 0 || text[at - 1] === ' ';
    const after = at + phrase.length === text.length || text[at + phrase.length] === ' ';
    if (before && after) return true;
  }
  return false;
}

/** Cuts long texts (hadith) to a window around the first highlight, shifting ranges to match. */
function snippet(text: string, ranges: [number, number][]): { text: string; ranges: [number, number][] } {
  if (text.length <= SNIPPET) return { text, ranges };
  const first = ranges[0]?.[0] ?? 0;
  let start = Math.max(0, first - 80);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space >= 0 && space < first ? space + 1 : start;
  }
  let end = Math.min(text.length, start + SNIPPET);
  const space = text.lastIndexOf(' ', end);
  if (end < text.length && space > start + SNIPPET / 2) end = space;
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  const shift = prefix.length - start;
  return {
    text: prefix + text.slice(start, end) + suffix,
    ranges: ranges.filter(([s, e]) => s >= start && e <= end).map(([s, e]) => [s + shift, e + shift]),
  };
}
