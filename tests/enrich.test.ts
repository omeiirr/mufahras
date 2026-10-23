// Verse extras, topic and chapter pages, and browse chips, against the real data.
import { describe, expect, it } from 'vitest';
import type { AyahDetail, SectionDetail, TopicDetail } from '../src/lib/data/views';
import { normalizeArabic } from '../src/lib/text/normalize';
import { dataBuilt, loadEngine } from './load';

describe.runIf(dataBuilt)('verse extras', () => {
  const engine = loadEngine();
  const ayah = (surah: number, a: number) => engine.detail({ kind: 'ayah', surah, ayah: a }) as AyahDetail;
  const marked = (text: string, ranges: [number, number][]) => ranges.map(([s, e]) => normalizeArabic(text.slice(s, e)));

  it('has the tafsir summary, grouped where Al-Mukhtasar groups ayahs', () => {
    expect(ayah(2, 255).extra?.tafsir?.text.length).toBeGreaterThan(50);
    expect(ayah(2, 4).extra?.tafsir).toMatchObject({ from: 3, to: 4 });
  });

  it('has the passage theme', () => {
    expect(ayah(2, 10).extra?.theme).toMatchObject({ text: 'Hypocrites and the consequences of hypocrisy', from: 8, to: 16 });
  });

  it('lists topics, most specific first', () => {
    const topics = ayah(2, 153).extra!.topics;
    expect(topics.map((t) => t.name)).toEqual(expect.arrayContaining(['Patience']));
    expect(topics.map((t) => t.count)).toEqual([...topics.map((t) => t.count)].sort((a, b) => a - b));
  });

  it('marks the shared words of similar ayahs', () => {
    const s = ayah(1, 2).extra!.similar.find((x) => x.surah === 37 && x.ayah === 182)!;
    expect(s).toBeTruthy();
    expect(marked(s.ar, s.ranges).join(' ')).toBe('والحمد لله رب العلمين');
  });

  it('marks repeated phrases in the ayah', () => {
    const p = ayah(2, 23).extra!.phrases.find((x) => normalizeArabic(x.text) === 'من دون الله');
    expect(p).toBeTruthy();
    expect(p!.count).toBeGreaterThan(50);
    expect(marked(ayah(2, 23).ar, p!.ranges)).toEqual(['من دون الله']);
  });
});

describe.runIf(dataBuilt)('topic and chapter pages, chips', () => {
  const engine = loadEngine();

  it('builds a topic page', () => {
    const chip = engine.search('patience').chips.find((c) => c.kind === 'topic' && c.label === 'Patience');
    expect(chip).toBeTruthy();
    const t = engine.detail({ kind: 'topic', id: Number(chip!.path.split('/')[1]) }) as TopicDetail;
    expect(t.ayahs.map((a) => `${a.surah}:${a.ayah}`)).toContain('2:153');
  });

  it('suggests hadith chapters and builds the chapter page', () => {
    const chip = engine.search('fasting').chips.find((c) => c.kind === 'section' && c.sub.startsWith('Bukhari'));
    expect(chip?.label).toMatch(/Fasting/);
    const [book, , n] = chip!.path.split('/');
    const sec = engine.detail({ kind: 'section', book: book as 'bukhari', n: Number(n) }) as SectionDetail;
    expect(sec.hadiths.length).toBeGreaterThan(50);
  });

  it('respects filters and skips chips for long or reference queries', () => {
    expect(engine.search('patience', { corpus: 'hadith' }).chips.every((c) => c.kind === 'section')).toBe(true);
    expect(engine.search('fasting', { corpus: 'quran' }).chips.every((c) => c.kind === 'topic')).toBe(true);
    expect(engine.search('seek help through patience and prayer').chips).toEqual([]);
    expect(engine.search('2:255').chips).toEqual([]);
  });
});

describe.runIf(dataBuilt)('similar-verse graph', () => {
  const engine = loadEngine();
  const g = engine.detail({ kind: 'graph' });

  it('has every similar pair once, between real nodes, with a layout', () => {
    expect(g?.kind).toBe('graph');
    if (g?.kind !== 'graph') return;
    const seen = new Set<string>();
    for (const [a, b, score] of g.edges) {
      expect(a).not.toBe(b);
      expect(g.nodes[a] && g.nodes[b]).toBeTruthy();
      expect(score).toBeGreaterThanOrEqual(50);
      const key = [a, b].sort((p, q) => p - q).join('-');
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
    expect(g.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    const node = g.nodes.find((n) => n.surah === 1 && n.ayah === 2)!;
    expect(node.degree).toBeGreaterThan(5);
  });
});

describe.runIf(dataBuilt)('hadith of the day and collections index', () => {
  const engine = loadEngine();
  const daily = (date: string) => engine.detail({ kind: 'hadith-daily', date });

  it('is stable for a date, varies across dates, and opens with a saying of the Prophet', () => {
    expect(daily('2026-10-24')).toEqual(daily('2026-10-24'));
    const picks = Array.from({ length: 40 }, (_, d) => daily(`2027-02-${d}`));
    expect(new Set(picks.map((h) => (h?.kind === 'hadith' ? `${h.book}/${h.number}` : ''))).size).toBeGreaterThan(30);
    for (const h of picks) {
      expect(h?.kind).toBe('hadith');
      if (h?.kind !== 'hadith') continue;
      expect(['bukhari', 'muslim']).toContain(h.book);
      expect(h.en).toMatch(/(The Prophet|Allah's Messenger|the Messenger of Allah) \(ﷺ\) (said|as saying)/i);
    }
  });

  it('draws only from the reminder chapters, which still have the expected names', async () => {
    const { DAILY_HADITH_SECTIONS } = await import('../src/lib/search/engine');
    const names = (book: 'bukhari' | 'muslim') =>
      DAILY_HADITH_SECTIONS[book]!.map((n) => (engine.detail({ kind: 'section', book, n }) as { name: string } | null)?.name ?? '');
    for (const name of [...names('bukhari'), ...names('muslim')])
      expect(name).toMatch(/belief|faith|knowledge|qur'an|manners|adab|invocations|heart|riqaq|oneness|tawheed|virtue|remembrance|repentance|zuhd/i);
  });

  it('lists every collection with its chapters', () => {
    const d = engine.detail({ kind: 'books' });
    expect(d?.kind).toBe('books');
    if (d?.kind !== 'books') return;
    expect(d.books.map((b) => b.id)).toEqual(['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah']);
    expect(d.books.every((b) => b.sections.reduce((n, s) => n + s.count, 0) === b.count)).toBe(true);
  });
});

describe.runIf(dataBuilt)('word by word', () => {
  const engine = loadEngine();
  const words = (surah: number, ayah: number) => {
    const d = engine.detail({ kind: 'words', surah, ayah });
    return d?.kind === 'words' ? d.words : [];
  };

  it('pairs each Arabic word with its transliteration', () => {
    const w = words(1, 1);
    expect(w.map((x) => x.translit)).toEqual(["bis'mi", 'l-lahi', 'l-raḥmāni', 'l-raḥīmi']);
    expect(w[0]!.ar).toBe('بِسْمِ');
    expect(words(2, 255)).toHaveLength(50);
  });

  it('has a transliteration for every word except four gaps in the source', () => {
    const q = engine.detail({ kind: 'surahs' });
    if (q?.kind !== 'surahs') throw new Error('no surahs');
    const gaps: string[] = [];
    for (const s of q.surahs) for (let a = 1; a <= s.count; a++) if (words(s.n, a).some((w) => !w.translit)) gaps.push(`${s.n}:${a}`);
    expect(gaps).toEqual(['2:181', '8:6', '13:37', '36:52']);
  });
});

describe.runIf(dataBuilt)('word-by-word meanings', () => {
  const engine = loadEngine();
  const words = (surah: number, ayah: number) => {
    const d = engine.detail({ kind: 'words', surah, ayah });
    return d?.kind === 'words' ? d.words : [];
  };

  it('gives each word its English meaning, as plain text', () => {
    expect(words(1, 1).map((w) => w.meaning)).toEqual(['In (the) name', '(of) Allah', 'the Most Gracious', 'the Most Merciful']);
    expect(words(2, 255)[6]!.meaning).toBe('the Sustainer of all that exists');
    const q = engine.detail({ kind: 'surahs' });
    if (q?.kind !== 'surahs') throw new Error('no surahs');
    let missing = 0;
    for (const s of q.surahs)
      for (let a = 1; a <= s.count; a++)
        for (const w of words(s.n, a)) {
          if (!w.meaning) missing++;
          expect(w.meaning).not.toMatch(/<[a-z]/i);
        }
    expect(missing).toBeLessThan(10);
  });
});
