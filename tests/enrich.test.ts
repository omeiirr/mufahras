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
