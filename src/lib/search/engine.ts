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
import { HADITH_BOOKS } from '../data/types';
import { DUAS } from '../data/duas';
import type { WordsChunk } from '../data/types';
import { wordSpans } from '../text/quran-display';
import type { GraphChunk, HadithArabicChunk, HadithBookId, HadithChunk, MutashabihatChunk, QuranChunk, SimilarChunk, TafsirChunk, Theme, Topic, TranslitChunk } from '../data/types';
import type { AyahDetail, AyahLine, Chip, Detail, DetailRequest, HadithDetail, SectionDetail } from '../data/views';
import { classifyGrade, gradeRank, summarizeGrades, type GradeClass } from '../hadith/grades';
import { foldTranslit, hasArabic, normalizeArabic, normalizeLatin, stripTanzilMarks } from '../text/normalize';
import { mapRanges, normalizeArabicMapped, normalizeLatinMapped, type Mapped } from '../text/normalize-map';
import { Enrichment, nameMatch } from './enrich';
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
/** Source finder: tried when a query of at least this many meaningful words matches fewer than SOURCE_BELOW strictly. */
const SOURCE_MIN_WORDS = 3;
const SOURCE_BELOW = 10;

// Words too common to say anything about the source of a quote.
const EN_STOP = new Set(
  'a an the and or of to in on at for with by from is are was were be been being it its this that these those he she they we you i me my your his her their our them him us as do does did so but if then than which who whom what when where how there here has have had will shall would should can could may might o oh all any some such into out up down over about upon unto said says say'.split(' '),
);
const AR_STOP = new Set('في من على الي عن ان ما لا و يا ثم او قد لم لن هو هي'.split(' '));
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
  overlap?: [number, number];
  /** Source finder: the next ayah, when the match spans two. */
  next?: number;
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
  /** Section number -> its rows, and normalized section names for chip matching. */
  sectionRows: Map<number, number[]>;
  sectionNames: [number, string][];
}

/** "The Book of Fasting" / "Chapters On Fasting" -> "fasting", for matching chapter names to queries. */
const sectionKey = (name: string) => normalizeLatin(name).replace(/^(the )?(book|chapters?) (of|on|about) (the )?/, '');
const CHIP_TOPICS = 2;

/**
 * Hadith of the day: the text opens with the narrator and goes straight to the Prophet's ﷺ words
 * ("Narrated Abu Huraira: The Prophet (ﷺ) said, …", "Abu Huraira reported Allah's Messenger (ﷺ) as saying: …").
 * Stories, questions and rulings tied to an occasion read badly on a card out of context.
 */
const SAYING_OPENING =
  /^(Narrated [^:]{2,60}:\s*|[^:.]{2,60} (reported|narrated) (that )?)(the Prophet|Allah's Messenger|the Messenger of Allah)\s*\(ﷺ\)\s*(said|as saying)[,:]?\s*["“]?/i;
const NOT_STANDALONE = /(similar|same as|another chain|this hadith|transmitted|with a slight variation)/i;
/**
 * Chapters daily reminders come from (hadith-api section numbers at the pinned commit; names checked in
 * tests/enrich.test.ts). Bukhari: Belief, Knowledge, Virtues of the Qur'an, Good Manners (Al-Adab),
 * Invocations, To make the Heart Tender (Ar-Riqaq), Oneness of Allah. Muslim: Faith, Manners and Etiquette,
 * Virtue and Good Manners, Knowledge, Remembrance and Supplication, Repentance, Zuhd and Softening of Hearts.
 */
export const DAILY_HADITH_SECTIONS: Partial<Record<HadithBookId, number[]>> = {
  bukhari: [2, 3, 66, 78, 80, 81, 97],
  muslim: [1, 38, 45, 47, 48, 50, 55],
};
const CHIP_SECTIONS = 2;

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
  private extra?: Enrichment;

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
    this.extra = new Enrichment(chunk);
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
      sectionRows: chunk.hadiths.reduce((m, h, row) => m.set(h[1], [...(m.get(h[1]) ?? []), row]), new Map<number, number[]>()),
      sectionNames: Object.entries(chunk.sections).map(([n, name]) => [Number(n), sectionKey(name)]),
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
    const offset = opts.offset ?? 0;
    const pinned = this.pinned(query);

    const arabic = hasArabic(query);
    const nq = arabic ? normalizeArabic(query) : normalizeLatin(query);
    const terms = [...new Set(nq.split(' ').filter(Boolean))];
    if (!terms.length) return { query, pinned: offset ? [] : pinned, chips: [], hits: [], total: 0, ms: performance.now() - t0 };

    const segments = this.segments.filter((s) => (arabic ? s.field === 'ar' : s.field !== 'ar') && this.corpusAllowed(s.corpus, opts));
    // Long queries skip the fuzzy pass: with many words, one-typo and abbreviation matches on every
    // word add up to thousands of weak hits. The source finder below handles them instead.
    const long = terms.filter((t) => t.length > 1 && !(arabic ? AR_STOP : EN_STOP).has(t)).length >= 4;
    let found = this.run(segments, terms, false, arabic, opts);
    if (found.length < FUZZY_BELOW && !long) found = this.run(segments, terms, true, arabic, opts);

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

    // Source finder: a long query (a pasted quote, a remembered sentence) that matched little strictly
    // may still share most of its words with the source, in another translation or wording.
    // These come after every strict match.
    if (ranked.length < SOURCE_BELOW) {
      const near = this.overlap(segments, terms, arabic, opts, best);
      ranked.push(...near);
    }

    // Close matches highlight only the meaningful words they were matched on, not "a" or "its".
    const content = terms.filter((t) => t.length > 1 && !(arabic ? AR_STOP : EN_STOP).has(t));
    const hits = ranked
      .slice(offset, offset + limit)
      .map((c) => this.present({ ref: this.refOf(c), score: c.score, tier: c.tier, field: c.seg.field, overlap: c.overlap }, c.overlap ? content : terms));
    // Chips also accompany a surah-name match ("hajj" is Surah 22 and a topic), not a numeric reference.
    const chips = offset || (pinned.length && /\d/.test(query)) ? [] : this.chips(query, opts);
    return { query, pinned: offset ? [] : pinned, chips, hits, total: ranked.length, ms: performance.now() - t0 };
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

  /**
   * Documents sharing at least half of the query's meaningful words (each word matched as a whole word,
   * a word prefix, or with one typo), ranked by how rare the shared words are (IDF) times the share,
   * plus a bonus for query word pairs that appear side by side. Skips documents already in `exclude`.
   */
  private overlap(segments: Segment[], terms: string[], arabic: boolean, opts: SearchOptions, exclude: Map<string, Candidate>): Candidate[] {
    const stop = arabic ? AR_STOP : EN_STOP;
    const content = terms.filter((t) => t.length > 1 && !stop.has(t));
    if (content.length < SOURCE_MIN_WORDS) return [];
    const need = Math.max(2, Math.ceil(content.length / 2));

    const best = new Map<string, Candidate>();
    for (const seg of segments) {
      const { index } = seg;
      const n = index.size;
      const allowed = this.allowedDocs(seg, opts);
      const weight = new Float32Array(n);
      const count = new Uint8Array(n);
      const touched: number[] = [];
      const perTerm: { seen: Uint8Array; idf: number }[] = [];
      for (const term of seg.fold ? content.map(seg.fold) : content) {
        const seen = new Uint8Array(n);
        const docs: number[] = [];
        for (const [w, q] of this.matchWords(term, true, arabic).list) {
          // Whole words, word prefixes and one-typo matches; not letters inside other words or abbreviations.
          if (!((q - 1) % 3 >= 1 || tierOf(q) === 2)) continue;
          for (const d of index.postings(w) ?? [])
            if (!seen[d]) {
              seen[d] = 1;
              docs.push(d);
            }
        }
        const idf = Math.log(1 + n / (1 + docs.length));
        perTerm.push({ seen, idf });
        for (const d of docs) {
          if (!count[d]) touched.push(d);
          count[d] = count[d]! + 1;
          weight[d] = weight[d]! + idf;
        }
      }
      // A quote can run across two ayahs ("Say: He is Allah, the One…; Allah, the Eternal…" is 112:1–2),
      // so Quran ayahs are also scored together with the next ayah of the same surah.
      const nextInSurah = (d: number) => {
        if (seg.corpus !== 'quran') return -1;
        const s = this.quran!.surahs.find((x) => d >= x.start && d < x.start + x.count)!;
        return d + 1 < s.start + s.count ? d + 1 : -1;
      };
      for (const d of touched) {
        if (allowed && !allowed(d)) continue;
        let c = count[d]!;
        let w = weight[d]!;
        let len = index.lengths[d]!;
        let next: number | undefined;
        const e = nextInSurah(d);
        if (e >= 0 && count[e]) {
          let c2 = 0;
          let w2 = 0;
          for (const t of perTerm)
            if (t.seen[d] || t.seen[e]) {
              c2++;
              w2 += t.idf;
            }
          if (c2 > c) [c, w, len, next] = [c2, w2, len + index.lengths[e]!, e];
        }
        if (c < need) continue;
        const ref = seg.corpus === 'quran' ? `q${d}` : `h${seg.corpus}:${d}`;
        if (exclude.has(ref)) continue;
        const share = c / content.length;
        const score = w * share - Math.log2(1 + len / (seg.field === 'translit' ? 2 : 1) / 100);
        const prev = best.get(ref);
        if (!prev || score > prev.score) best.set(ref, { seg, doc: d, tier: 3, score, overlap: [c, content.length], next });
      }
    }

    // Rerank the leaders by contiguity: a quote's words sit together in its source, while a long hadith
    // can collect the same words scattered over paragraphs. Score = query words found within the best
    // short stretch of the text, then word pairs found side by side, then the first-pass score.
    const ranked = [...best.values()].sort((a, b) => b.score - a.score).slice(0, PHRASE_CANDIDATES);
    const span = Math.max(8, Math.round(content.length * 2));
    for (const c of ranked) {
      const terms = c.seg.fold ? content.map(c.seg.fold) : content;
      const text = c.seg.hay[c.doc]! + (c.next !== undefined ? ` ${c.seg.hay[c.next]!}` : '');
      const words = text.split(' ');
      const hits: [number, number][] = []; // [word position, term index]
      words.forEach((w, pos) => terms.forEach((t, k) => w.startsWith(t) && hits.push([pos, k])));
      let window = 0;
      for (let i = 0, j = 0; j < hits.length; j++) {
        while (hits[j]![0] - hits[i]![0] >= span) i++;
        window = Math.max(window, new Set(hits.slice(i, j + 1).map(([, k]) => k)).size);
      }
      let pairs = 0;
      for (let k = 1; k < terms.length; k++) if (text.includes(`${terms[k - 1]} ${terms[k]}`)) pairs++;
      // Hadith often quote verses in their own translation (Muslim 330 quotes 2:286). Someone typing a verse's
      // wording wants the verse, so an ayah beats a hadith that matches at most one more word.
      const quranBonus = c.seg.corpus === 'quran' ? 12 : 0;
      c.score = window * 10 + pairs * 4 + quranBonus + c.score * 0.3;
    }
    return ranked.sort((a, b) => b.score - a.score);
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
    if (target.name) {
      // A well-known name: show it, with the reference it resolves to underneath.
      const ref = target.kind === 'hadith' ? hit.label : target.kind === 'surah' ? `Surah ${target.surah}` : target.ayahTo ? `${target.surah}:${target.ayah}–${target.ayahTo}` : hit.label;
      hit.sublabel = `${ref} · ${target.kind === 'hadith' ? hit.sublabel : (this.quran!.surahs[target.surah - 1]?.nameSimple ?? '')}`;
      hit.label = target.name;
      if (target.kind === 'surah') hit.path = `surah/${target.surah}`;
      return [hit];
    }
    if (target.kind === 'surah') {
      const s = this.quran!.surahs[target.surah - 1]!;
      hit.label = `Surah ${s.n} · ${s.nameSimple}`;
      hit.path = `surah/${s.n}`;
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

  // ---------------------------------------------------------------- detail screens

  // ---- QUL extras (loaded after the Quran; see worker.ts)

  addTafsir(c: TafsirChunk): void {
    this.extra!.tafsir = c;
  }
  addThemes(c: Theme[]): void {
    this.extra!.setThemes(c);
  }
  addTopics(c: Topic[]): void {
    this.extra!.setTopics(c);
  }
  addSimilar(c: SimilarChunk): void {
    this.extra!.similar = c;
  }
  addMutashabihat(c: MutashabihatChunk): void {
    this.extra!.phrases = c;
  }
  addGraph(c: GraphChunk): void {
    this.graph = c;
  }
  addWords(c: WordsChunk): void {
    this.words = c;
  }
  private words?: WordsChunk;
  private graph?: GraphChunk;

  private graphDetail(): Detail | null {
    const g = this.graph;
    const q = this.quran;
    if (!g || !q) return null;
    const degree = new Array<number>(g.nodes.length).fill(0);
    for (const [a, b] of g.edges) {
      degree[a]!++;
      degree[b]!++;
    }
    return {
      kind: 'graph',
      nodes: g.nodes.map(([i, x, y], k) => {
        const s = q.surahs.find((sur) => i >= sur.start && i < sur.start + sur.count)!;
        const en = q.en[i]!.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '');
        return { surah: s.n, ayah: i - s.start + 1, name: s.nameSimple, place: s.place, en: en.length > 160 ? `${en.slice(0, en.lastIndexOf(' ', 150))}…` : en, x, y, degree: degree[k]! };
      }),
      edges: g.edges,
    };
  }

  /** Topic and hadith-chapter names matching a short query, as browse chips. */
  private chips(query: string, opts: SearchOptions): Chip[] {
    const q = normalizeLatin(query);
    if (!q || hasArabic(query) || q.split(' ').length > 3) return [];
    const out: Chip[] = [];
    if (opts.corpus !== 'hadith' && !opts.books?.length)
      for (const t of this.extra?.matchTopics(q, CHIP_TOPICS) ?? []) out.push({ kind: 'topic', label: t.name, sub: `Topic · ${t.count} ayahs`, path: `topic/${t.id}` });
    if (opts.corpus !== 'quran' && !opts.surah) {
      const found: [number, Chip][] = [];
      for (const [id, b] of this.books) {
        if (opts.books?.length && !opts.books.includes(id)) continue;
        for (const [n, name] of b.sectionNames) {
          const score = nameMatch(q, name);
          const count = b.sectionRows.get(n)?.length ?? 0;
          if (score && count)
            found.push([score + Math.min(5, Math.log2(count)), { kind: 'section', label: b.chunk.sections[n]!, sub: `${BOOKS[id].short} · ${count} hadith`, path: `${id}/book/${n}` }]);
        }
      }
      out.push(...found.sort((a, b) => b[0] - a[0]).slice(0, CHIP_SECTIONS).map(([, c]) => c));
    }
    return out;
  }

  hasQuran(): boolean {
    return !!this.quran;
  }

  /** Data for a detail screen, or null if the reference doesn't exist (or its data isn't loaded). */
  detail(req: DetailRequest): Detail | null {
    const q = this.quran;
    if (!q) return null;
    if (req.kind === 'surahs') return { kind: 'surahs', surahs: q.surahs };
    if (req.kind === 'daily') {
      const i = this.dailyIndex(req.date);
      const s = q.surahs.find((x) => i >= x.start && i < x.start + x.count)!;
      return this.detail({ kind: 'ayah', surah: s.n, ayah: i - s.start + 1 });
    }
    if (req.kind === 'hadith') return this.hadithDetail(req.book, req.number);
    if (req.kind === 'topic') return this.extra?.topicDetail(req.id) ?? null;
    if (req.kind === 'graph') return this.graphDetail();
    if (req.kind === 'hadith-daily') return this.dailyHadith(req.date);
    if (req.kind === 'books') return this.booksDetail();
    if (req.kind === 'duas' || req.kind === 'sajdah') {
      // Sajdah verses carry the prostration sign ۩ (U+06E9) in the text: the 15 verses of prostration.
      const refs =
        req.kind === 'duas'
          ? DUAS.map((r) => r.split(':').map(Number) as [number, number]).map(([s, a]) => q.surahs[s - 1]!.start + a - 1)
          : q.ar.flatMap((a, i) => (a.includes('\u06E9') ? [i] : []));
      return {
        kind: 'ayah-list',
        list: req.kind,
        ayahs: refs.map((i) => {
          const s = q.surahs.find((x) => i >= x.start && i < x.start + x.count)!;
          return { surah: s.n, ayah: i - s.start + 1, name: s.nameSimple, ar: q.ar[i]!, en: q.en[i]! };
        }),
      };
    }
    if (req.kind === 'topics') return this.extra?.hasTopics ? this.extra.topicsIndex() : null;
    if (req.kind === 'phrases') return this.extra?.hasPhrases ? this.extra.phrasesIndex() : null;
    if (req.kind === 'words') {
      const s = q.surahs[req.surah - 1];
      if (!s || !this.words || req.ayah < 1 || req.ayah > s.count) return null;
      const i = s.start + req.ayah - 1;
      const ar = q.ar[i]!;
      return {
        kind: 'words',
        words: wordSpans(ar).map(([a, b], k) => ({ ar: ar.slice(a, b), translit: this.words!.translit[i]?.[k] ?? '', meaning: this.words!.meaning?.[i]?.[k] ?? '' })),
      };
    }
    if (req.kind === 'section') return this.sectionDetail(req.book, req.n);
    const s = q.surahs[req.surah - 1];
    if (!s) return null;
    if (req.kind === 'surah')
      return {
        kind: 'surah',
        surah: s,
        ayahs: Array.from({ length: s.count }, (_, k) => this.ayahLine(s.start + k, k + 1)),
        prev: q.surahs[s.n - 2],
        next: q.surahs[s.n],
      };
    if (req.ayah < 1 || req.ayah > s.count) return null;
    const i = s.start + req.ayah - 1;
    const prevSurah = q.surahs[s.n - 2];
    const nextSurah = q.surahs[s.n];
    const detail: AyahDetail = {
      kind: 'ayah',
      surah: s,
      ...this.ayahLine(i, req.ayah),
      extra: this.extra?.ready ? this.extra.forAyah(i) : undefined,
      translit: this.translit?.wbw[i] ?? '',
      prev: req.ayah > 1 ? { surah: s.n, ayah: req.ayah - 1 } : prevSurah ? { surah: prevSurah.n, ayah: prevSurah.count } : undefined,
      next: req.ayah < s.count ? { surah: s.n, ayah: req.ayah + 1 } : nextSurah ? { surah: nextSurah.n, ayah: 1 } : undefined,
    };
    return detail;
  }

  private dailyPool?: number[];

  /**
   * Ayahs that read well on their own in a small card. A length-and-punctuation rule alone picked story
   * fragments ("As if they had never prospered therein") and verses pointing back ("Indeed in that are
   * signs"), so the pool keeps openings that stand alone: supplications, direct address, and statements
   * about Allah. The date picks one with a fixed hash, so it's the same for everyone and needs no server.
   */
  private dailyIndex(date: string): number {
    const q = this.quran!;
    const opening = /^(Our Lord|My Lord|O you who have believed|O mankind|O humanity|Indeed, Allāh|Allāh is|Allāh -|And Allāh is|And your Lord|Indeed, my Lord|Indeed, your Lord|Say, "He is Allāh|So remember Me|Indeed, with hardship|And whoever fears Allāh|And He is|He is Allāh)/;
    this.dailyPool ??= q.en.flatMap((raw, i) => {
      const en = raw.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '').trim();
      const dialogue = /["“”]/.test(en.replace(/^Say, "|"$/g, ''));
      const ok = en.length >= 30 && en.length <= 220 && opening.test(en) && !dialogue && /[.!?]["')\]]*$/.test(en);
      return ok ? [i] : [];
    });
    let h = 0x811c9dc5; // FNV-1a
    for (let k = 0; k < date.length; k++) h = Math.imul(h ^ date.charCodeAt(k), 0x01000193) >>> 0;
    return this.dailyPool[h % this.dailyPool.length]!;
  }

  private ayahLine(i: number, ayah: number): AyahLine {
    const q = this.quran!;
    return { ayah, ar: q.ar[i]!, en: q.en[i]!, footnotes: q.footnotes[i] ?? [] };
  }

  private dailyHadithPool?: [HadithBookId, number][];


  /**
   * Hadith of the day: from Bukhari and Muslim (sahih by consensus), of a length that fits a card, quoting
   * the Prophet ﷺ, and not one of the "this hadith has been narrated through another chain" entries that
   * only make sense next to the one before. A fixed hash of the date picks one.
   */
  private dailyHadith(date: string): HadithDetail | null {
    if (!this.dailyHadithPool) {
      this.dailyHadithPool = [];
      for (const id of ['bukhari', 'muslim'] as const) {
        const b = this.books.get(id);
        if (!b) return null;
        const sections = new Set(DAILY_HADITH_SECTIONS[id]);
        b.chunk.hadiths.forEach(([number, section, en]) => {
          if (sections.has(section) && en.length >= 90 && en.length <= 380 && SAYING_OPENING.test(en) && !NOT_STANDALONE.test(en))
            this.dailyHadithPool!.push([id, number]);
        });
      }
    }
    if (!this.dailyHadithPool.length) return null;
    let h = 0x811c9dc5;
    for (let k = 0; k < date.length; k++) h = Math.imul(h ^ date.charCodeAt(k), 0x01000193) >>> 0;
    const [book, number] = this.dailyHadithPool[h % this.dailyHadithPool.length]!;
    return this.hadithDetail(book, number);
  }

  private booksDetail(): Detail {
    return {
      kind: 'books',
      books: HADITH_BOOKS.flatMap((id) => {
        const b = this.books.get(id);
        if (!b) return [];
        return [
          {
            id,
            title: BOOKS[id].title,
            short: BOOKS[id].short,
            count: b.chunk.hadiths.length,
            sections: [...b.sectionRows]
              .sort((x, y) => x[0] - y[0])
              .map(([n, rows]) => ({ n, name: b.chunk.sections[n] ?? '', count: rows.length })),
          },
        ];
      }),
    };
  }

  private sectionDetail(book: HadithBookId, n: number): SectionDetail | null {
    const b = this.books.get(book);
    const rows = b?.sectionRows.get(n);
    if (!b || !rows) return null;
    const info = BOOKS[book];
    return {
      kind: 'section',
      book,
      title: info.title,
      short: info.short,
      n,
      name: b.chunk.sections[n] ?? '',
      hadiths: rows.map((r) => {
        const [number, , en] = b.chunk.hadiths[r]!;
        return { number, en: en.length > 280 ? `${en.slice(0, en.lastIndexOf(' ', 270))}…` : en, grade: b.grade[r]! };
      }),
    };
  }

  private hadithDetail(book: HadithBookId, number: number): HadithDetail | null {
    const b = this.books.get(book);
    const row = b?.byNumber.get(number);
    if (!b || row === undefined) return null;
    const [, section, en, grades] = b.chunk.hadiths[row]!;
    const info = BOOKS[book];
    return {
      kind: 'hadith',
      book,
      title: info.title,
      short: info.short,
      number,
      section: { n: section, name: b.chunk.sections[section] ?? '' },
      en,
      ar: b.arabic?.[row] ?? '',
      grades: grades.map(([s, grade]) => ({ scholar: b.chunk.scholars[s] ?? '', grade, cls: classifyGrade(grade) })),
      summary: b.grade[row]!,
      sahihCollection: info.sahihCollection,
      prev: b.chunk.hadiths[row - 1]?.[0],
      next: b.chunk.hadiths[row + 1]?.[0],
    };
  }

  // ---------------------------------------------------------------- presentation

  present(hit: Hit, terms: string[]): PresentedHit {
    const { ref, field, tier, overlap } = hit;
    let text: string;
    let label: string;
    let sublabel: string;
    let secondary: string | undefined;
    let grade: GradeClass | undefined;
    let path: string;

    if (ref.kind === 'ayah') {
      const q = this.quran!;
      const s = q.surahs.find((x) => ref.i >= x.start && ref.i < x.start + x.count)!;
      label = `${s.n}:${ref.i - s.start + 1}`;
      path = label;
      sublabel = s.nameSimple;
      text = field === 'ar' ? q.ar[ref.i]! : field === 'translit' ? this.translit!.wbw[ref.i]! : q.en[ref.i]!;
      if (field !== 'en') secondary = q.en[ref.i];
    } else {
      const b = this.books.get(ref.book)!;
      const [number, section, en] = b.chunk.hadiths[ref.row]!;
      label = `${BOOKS[ref.book].short} ${formatHadithNumber(number)}`;
      path = `${ref.book}/${number}`;
      sublabel = b.chunk.sections[section] ?? '';
      text = field === 'ar' ? (b.arabic?.[ref.row] ?? '') : en;
      grade = b.grade[ref.row];
    }

    let ranges = terms.length ? this.highlight(text, terms, field, tier) : [];
    if (ref.kind === 'ayah' && field === 'translit' && terms.length && ranges.length < terms.length) {
      // The match may have been in the other scheme; show whichever covers more terms.
      const simple = stripTanzilMarks(this.translit!.simple[ref.i]!);
      const alt = this.highlight(simple, terms, field, tier);
      if (alt.length > ranges.length) [text, ranges] = [simple, alt];
    }
    ({ text, ranges } = snippet(text, ranges));
    return { ref, key: refKey(ref), path, label, sublabel, field, tier, text, secondary, ranges, grade, overlap };
  }

  private highlight(text: string, terms: string[], field: Field, tier: Tier): [number, number][] {
    if (field !== 'ar') {
      const m = normalizeLatinMapped(text);
      return mapRanges(m, text, termRanges(m, terms, tier));
    }
    // Arabic: whichever dagger-alif reading matches more of the query.
    // Arabic highlights cover whole words: colouring part of a joined word reads as a rendering glitch.
    const plain = normalizeArabicMapped(text);
    const alif = normalizeArabicMapped(text, true);
    const a = wholeWords(plain.text, termRanges(plain, terms, tier));
    const b = wholeWords(alif.text, termRanges(alif, terms.map((t) => normalizeArabic(t, true)), tier));
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

/** Widens ranges to the whole space-separated words they touch. */
function wholeWords(text: string, ranges: [number, number][]): [number, number][] {
  return ranges.map(([s, e]) => {
    while (s > 0 && text[s - 1] !== ' ') s--;
    while (e < text.length && text[e] !== ' ') e++;
    return [s, e];
  });
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

/** Cuts long texts (hadith) to a window around the densest run of highlights, shifting ranges to match. */
function snippet(text: string, ranges: [number, number][]): { text: string; ranges: [number, number][] } {
  if (text.length <= SNIPPET) return { text, ranges };
  // Start at the highlight that has the most others within one snippet's length after it.
  let first = ranges[0]?.[0] ?? 0;
  let most = 0;
  for (let i = 0; i < ranges.length; i++) {
    let n = 0;
    for (let j = i; j < ranges.length && ranges[j]![1] - ranges[i]![0] <= SNIPPET - 100; j++) n++;
    if (n > most) [most, first] = [n, ranges[i]![0]];
  }
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
