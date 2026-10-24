// Verse-screen extras and topic pages, built from the QUL chunks loaded after the Quran: tafsir
// (Al-Mukhtasar), passage themes, topics, similar ayahs and mutashabihat. Kept apart from the search
// engine, which only needs the topic names for chips.
import type { MutashabihatChunk, QuranChunk, SimilarChunk, Surah, TafsirChunk, Theme, Topic } from '../data/types';
import type { AyahExtra, AyahRef, PhrasesDetail, TopicDetail, TopicsDetail } from '../data/views';
import { normalizeLatin } from '../text/normalize';
import { wordRangesToChars, wordSpans } from '../text/quran-display';

/** Ayahs listed on a topic page; the biggest topics have thousands. */
export const TOPIC_LIMIT = 300;
const SIMILAR_LIMIT = 5;
const PHRASE_LIMIT = 4;
const PHRASE_REFS = 40;
const TOPICS_PER_AYAH = 8;

export class Enrichment {
  tafsir?: TafsirChunk;
  similar?: SimilarChunk;
  phrases?: MutashabihatChunk;
  private themes?: Theme[];
  private themeAt?: Int32Array;
  private topics?: Topic[];
  private topicById = new Map<number, Topic>();
  private topicsOfAyah = new Map<number, number[]>();
  private childrenOf = new Map<number, number[]>();
  /** Normalized topic names, for chip matching. */
  private topicNames: string[] = [];

  constructor(private quran: QuranChunk) {}

  get ready(): boolean {
    return !!(this.tafsir && this.similar && this.phrases && this.themes && this.topics);
  }

  setThemes(themes: Theme[]): void {
    this.themes = themes;
    this.themeAt = new Int32Array(this.quran.ar.length).fill(-1);
    themes.forEach(([a, b], k) => this.themeAt!.fill(k, a, b + 1));
  }

  setTopics(topics: Topic[]): void {
    this.topics = topics;
    for (const t of topics) {
      this.topicById.set(t.id, t);
      for (const i of t.ayahs) {
        let list = this.topicsOfAyah.get(i);
        if (!list) this.topicsOfAyah.set(i, (list = []));
        list.push(t.id);
      }
      for (const p of t.parents) {
        let list = this.childrenOf.get(p);
        if (!list) this.childrenOf.set(p, (list = []));
        list.push(t.id);
      }
    }
    this.topicNames = topics.map((t) => normalizeLatin(t.name));
  }

  /**
   * Some QUL topic names are fragments of their parent ("nature of", "patience during"); those are
   * shown with the parent: "Allah › nature of". A topic can have several parents: prefer one that also
   * contains `ayah` (on a verse screen), otherwise the biggest.
   */
  label(t: Topic, ayah?: number): string {
    if (!/^[a-z]/.test(t.name)) return t.name;
    const parents = t.parents.map((p) => this.topicById.get(p)).filter((p): p is Topic => !!p);
    const parent =
      (ayah !== undefined ? parents.find((p) => p.ayahs.includes(ayah)) : undefined) ?? parents.sort((a, b) => b.ayahs.length - a.ayahs.length)[0];
    return parent ? `${parent.name} › ${t.name}` : t.name;
  }

  /**
   * A fragment name ("nature of") only makes sense next to a parent that is about this verse too. QUL has
   * some that don't fit (topic 339 "nature of", under "Goddesses of the pagan Arabs", lists 2:255), so
   * on a verse screen those are left out.
   */
  private readsAlone(t: Topic, ayah: number): boolean {
    return !/^[a-z]/.test(t.name) || t.parents.some((p) => this.topicById.get(p)?.ayahs.includes(ayah));
  }

  // ---- positions

  private surahOf(i: number): Surah {
    return this.quran.surahs.find((s) => i >= s.start && i < s.start + s.count)!;
  }

  private ref(i: number): AyahRef & { name: string } {
    const s = this.surahOf(i);
    return { surah: s.n, ayah: i - s.start + 1, name: s.nameSimple };
  }

  // ---- verse screen

  forAyah(i: number): AyahExtra {
    const q = this.quran;
    const s = this.surahOf(i);
    const ayahNo = (k: number) => k - s.start + 1;

    let tafsir: AyahExtra['tafsir'];
    if (this.tafsir) {
      const t = this.tafsir.text[i];
      const head = typeof t === 'number' ? t : i;
      const [a, b] = this.tafsir.groups[head] ?? [i, i];
      const text = this.tafsir.text[head];
      if (typeof text === 'string') tafsir = { text, from: ayahNo(a), to: ayahNo(b) };
    }

    const k = this.themeAt?.[i] ?? -1;
    const th = k >= 0 ? this.themes![k] : undefined;
    const theme = th ? { text: th[2], from: ayahNo(th[0]), to: ayahNo(th[1]) } : undefined;

    // Most specific first: a topic with 12 ayahs says more about this verse than "Allah" with 2,700.
    const topics = (this.topicsOfAyah.get(i) ?? [])
      .map((id) => this.topicById.get(id)!)
      .filter((t) => t.ayahs.length >= 2 && this.readsAlone(t, i))
      .sort((a, b) => a.ayahs.length - b.ayahs.length)
      .slice(0, TOPICS_PER_AYAH)
      .map((t) => ({ id: t.id, name: this.label(t, i), count: t.ayahs.length }));

    const similar = (this.similar?.[i] ?? []).slice(0, SIMILAR_LIMIT).map(([j, , , words]) => ({
      ...this.ref(j),
      ar: q.ar[j]!,
      en: q.en[j]!,
      ranges: wordRangesToChars(q.ar[j]!, words),
    }));

    const phrases = (this.phrases?.byAyah[i] ?? [])
      .map((id) => this.phrases!.phrases[id]!)
      .map((p) => {
        const [src, from, to] = p.source;
        const srcWords = wordSpans(q.ar[src]!);
        const text = q.ar[src]!.slice(srcWords[from - 1]?.[0] ?? 0, srcWords[to - 1]?.[1] ?? 0);
        const others = Object.keys(p.occurrences)
          .map(Number)
          .filter((j) => j !== i)
          .sort((a, b) => a - b);
        return {
          text,
          length: to - from + 1,
          ranges: wordRangesToChars(q.ar[i]!, p.occurrences[i] ?? []),
          count: others.length,
          refs: others.slice(0, PHRASE_REFS).map((j) => this.ref(j)),
        };
      })
      .filter((p) => p.count > 0 && p.text)
      // Longer phrases are the distinctive ones; then the ones that recur most.
      .sort((a, b) => b.length - a.length || b.count - a.count)
      .slice(0, PHRASE_LIMIT)
      .map(({ length: _, ...p }) => p);

    return { tafsir, theme, topics, similar, phrases };
  }

  // ---- topic pages and chips

  topicDetail(id: number): TopicDetail | null {
    const t = this.topicById.get(id);
    if (!t) return null;
    const named = (ids: number[]) => ids.flatMap((x) => (this.topicById.has(x) ? [{ id: x, name: this.topicById.get(x)!.name }] : []));
    return {
      kind: 'topic',
      id: t.id,
      name: this.label(t),
      nameAr: t.nameAr,
      description: t.description,
      parents: named(t.parents),
      children: (this.childrenOf.get(id) ?? [])
        .map((c) => this.topicById.get(c)!)
        .filter((c) => c.ayahs.length)
        .sort((a, b) => b.ayahs.length - a.ayahs.length)
        .map((c) => ({ id: c.id, name: c.name, count: c.ayahs.length })),
      related: named(t.related),
      ayahs: t.ayahs.slice(0, TOPIC_LIMIT).map((i) => ({ ...this.ref(i), en: this.quran.en[i]! })),
      total: t.ayahs.length,
    };
  }

  get hasTopics(): boolean {
    return !!this.topics;
  }

  get hasPhrases(): boolean {
    return !!this.phrases;
  }

  /** The topic index: top-level topics (no parents) with at least 3 ayahs, each with its children. */
  topicsIndex(): TopicsDetail {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    return {
      kind: 'topics',
      topics: (this.topics ?? [])
        .filter((t) => !t.parents.length && t.ayahs.length >= 3)
        .map((t) => ({
          id: t.id,
          name: t.name,
          count: t.ayahs.length,
          children: (this.childrenOf.get(t.id) ?? [])
            .map((c) => this.topicById.get(c)!)
            .filter((c) => c.ayahs.length >= 2)
            .map((c) => ({ id: c.id, name: this.label(c), count: c.ayahs.length }))
            .sort(byName),
        }))
        .sort(byName),
    };
  }

  /** Every repeated phrase, most repeated first, with where it occurs. */
  phrasesIndex(): PhrasesDetail {
    const q = this.quran;
    return {
      kind: 'phrases',
      phrases: Object.values(this.phrases?.phrases ?? {})
        .map((p) => {
          const [src, from, to] = p.source;
          const w = wordSpans(q.ar[src]!);
          const refs = Object.keys(p.occurrences)
            .map(Number)
            .sort((a, b) => a - b);
          return { text: q.ar[src]!.slice(w[from - 1]?.[0] ?? 0, w[to - 1]?.[1] ?? 0), count: refs.length, refs: refs.slice(0, PHRASE_REFS).map((i) => this.ref(i)) };
        })
        .filter((p) => p.text && p.count > 1)
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)),
    };
  }

  /** Topics whose names match a short query, best first. */
  matchTopics(query: string, limit = 3): { id: number; name: string; count: number }[] {
    if (!this.topics) return [];
    const scored: [number, number][] = [];
    this.topicNames.forEach((name, k) => {
      const score = nameMatch(query, name);
      if (score > 0 && this.topics![k]!.ayahs.length >= 2) scored.push([k, score + Math.min(5, Math.log2(this.topics![k]!.ayahs.length))]);
    });
    return scored
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([k]) => ({ id: this.topics![k]!.id, name: this.label(this.topics![k]!), count: this.topics![k]!.ayahs.length }));
  }
}

/**
 * How well a normalized query names a topic or chapter: exact > name starts with it > every query word
 * starts a word of the name. 0 = no match. Short names win ties, so "Patience" beats "patience during".
 */
export function nameMatch(q: string, name: string): number {
  if (!q || !name) return 0;
  const shortness = Math.max(0, 10 - name.split(' ').length * 2);
  if (name === q) return 40 + shortness;
  if (name.startsWith(`${q} `) || (q.length >= 4 && name.startsWith(q))) return 25 + shortness;
  const words = name.split(' ');
  const qs = q.split(' ');
  if (qs.every((w) => w.length >= 3 && words.some((x) => x.startsWith(w)))) return 15 + shortness;
  return 0;
}
