// Verse extras, topic and chapter pages, and browse chips, against the real data.
import { describe, expect, it } from 'vitest';
import type { AyahDetail, MushafDetail, SectionDetail, SurahDetail, TopicDetail } from '../src/lib/data/views';
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

  it('shows the topic tree: headings with no ayahs of their own, the 25 prophets, the path to a topic', () => {
    const index = engine.detail({ kind: 'topics' });
    if (index?.kind !== 'topics') throw new Error('no topics');
    const stories = index.topics.find((t) => t.name === 'Stories')!;
    expect(stories.count).toBeGreaterThan(1000);
    const prophets = stories.children.find((t) => t.name.startsWith('Prophets'))!;
    expect(prophets.name).toBe('Prophets (25 mentioned by name)');
    expect(prophets.children.map((t) => t.name)).toHaveLength(25);
    expect(prophets.children.map((t) => t.name)).toEqual(expect.arrayContaining(['Isaac', 'Job', 'John the Baptist', 'Jonah', 'Muhammad']));
    const job = prophets.children.find((t) => t.name === 'Job')!;
    expect(job.children.map((t) => t.name)).toContain('tested then rewarded');

    const moses = engine.detail({ kind: 'topic', id: prophets.children.find((t) => t.name === 'Moses')!.id }) as TopicDetail;
    expect(moses.paths.map((p) => p.map((t) => t.name))).toContainEqual(['Stories', 'Prophets (25 mentioned by name)']);
    expect(moses.children.map((t) => t.name)).toContain('parting of the Red Sea');
    expect(engine.detail({ kind: 'topic', id: stories.id })).toMatchObject({ total: 0, totalWithin: stories.count });
  });

  it('carries the fixes to QUL topics: spelling, merged duplicates, both prophet lists linked', () => {
    const index = engine.detail({ kind: 'topics' });
    if (index?.kind !== 'topics') throw new Error('no topics');
    const names = index.topics.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['Doctrine', 'Red Sea']));
    expect(names).not.toContain('Red sea');
    const moses = engine.detail({ kind: 'topic', id: 967 }) as TopicDetail;
    expect(moses.related.map((t) => t.name)).toContain('Musa');
    const shuaibsPeople = engine.detail({ kind: 'topic', id: 2305 }) as TopicDetail;
    expect(shuaibsPeople.ayahs.every((a) => a.surah === 7 && a.ayah >= 85 && a.ayah <= 93)).toBe(true);
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

describe.runIf(dataBuilt)('library lists', () => {
  const engine = loadEngine();

  it('lists the 15 sajdah verses', () => {
    const d = engine.detail({ kind: 'sajdah' });
    expect(d?.kind === 'ayah-list' && d.ayahs.map((a) => `${a.surah}:${a.ayah}`)).toEqual([
      '7:206', '13:15', '16:50', '17:109', '19:58', '22:18', '22:77', '25:60', '27:26', '32:15', '38:24', '41:38', '53:62', '84:21', '96:19',
    ]);
  });

  it('lists duas that each address Allah', () => {
    const d = engine.detail({ kind: 'duas' });
    if (d?.kind !== 'ayah-list') throw new Error('no duas');
    expect(d.ayahs.length).toBeGreaterThan(50);
    // Each addresses Allah, or continues the dua of the listed verse just before it (10:86 after 10:85).
    d.ayahs.forEach((a, k) => {
      const prev = d.ayahs[k - 1];
      const continues = prev?.surah === a.surah && prev.ayah === a.ayah - 1;
      if (!continues) expect(a.en, `${a.surah}:${a.ayah}`).toMatch(/\b(Our Lord|our Lord|My Lord|my Lord|O Allāh)\b|There is no deity except You|called (to|upon) his Lord/);
    });
  });

  it('indexes topics and repeated phrases', () => {
    const t = engine.detail({ kind: 'topics' });
    expect(t?.kind === 'topics' && t.topics.some((x) => x.name === 'Patience')).toBe(true);
    const p = engine.detail({ kind: 'phrases' });
    if (p?.kind !== 'phrases') throw new Error('no phrases');
    expect(p.phrases.map((x) => x.count)).toEqual([...p.phrases.map((x) => x.count)].sort((a, b) => b - a));
    expect(p.phrases.every((x) => x.count > 1 && x.text)).toBe(true);
  });
});

describe.runIf(dataBuilt)('the 99 Names of Allah', () => {
  const engine = loadEngine();

  it('has the 99 names in order, each complete', () => {
    const d = engine.detail({ kind: 'names-of-allah' });
    if (d?.kind !== 'names-of-allah') throw new Error('no names');
    expect(d.names).toHaveLength(99);
    expect(d.names.map((n) => n.number)).toEqual(Array.from({ length: 99 }, (_, k) => k + 1));
    expect(d.names[0]).toMatchObject({ translit: 'Ar-Rahman', en: 'The Most Merciful' });
    expect(d.names[98]).toMatchObject({ translit: 'As-Saboor', en: 'The Patient' });
    expect(d.names.every((n) => n.ar && n.translit && n.en && n.meaning)).toBe(true);
  });

  it('links to hadith that are about the ninety-nine names', () => {
    for (const [book, number] of [['bukhari', 7392], ['muslim', 6809], ['tirmidhi', 3507]] as const) {
      const h = engine.detail({ kind: 'hadith', book, number });
      expect(h?.kind === 'hadith' && h.en, `${book} ${number}`).toMatch(/ninety-nine names/i);
    }
  });
});

describe.runIf(dataBuilt)('mushaf pages', () => {
  const engine = loadEngine();
  const pagesOf = (surah: number) => engine.detail({ kind: 'mushaf', surah }) as MushafDetail;

  it('puts each surah on its pages of the Madani print', () => {
    expect(pagesOf(1).pages.map((p) => p.n)).toEqual([1]);
    expect(pagesOf(67).pages.map((p) => p.n)).toEqual([562, 563, 564]);
    expect(pagesOf(2).pages.map((p) => p.n)).toEqual(Array.from({ length: 48 }, (_, k) => k + 2));
    expect(pagesOf(114).pages.map((p) => p.n)).toEqual([604]);
    expect(pagesOf(67).pages[0]!.lines[0]).toMatchObject({ kind: 'surah', surah: 67 });
  });

  it('holds every word of every ayah, in order, once', () => {
    for (let surah = 1; surah <= 114; surah++) {
      const d = engine.detail({ kind: 'surah', surah }) as SurahDetail;
      const byAyah = new Map<number, string[]>();
      for (const p of pagesOf(surah).pages)
        for (const l of p.lines)
          if (l.kind === 'ayah' && l.surah === surah)
            for (const w of l.words) if (!w.marker) (byAyah.get(w.ayah) ?? byAyah.set(w.ayah, []).get(w.ayah)!).push(w.text);
      for (const a of d.ayahs) expect(byAyah.get(a.ayah)?.join(' '), `${surah}:${a.ayah}`).toBe(a.ar);
    }
  });
});

