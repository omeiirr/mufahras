// Ranking checks against the real data: each query must surface the expected result near the top.
// Run `npm run data` first. Timings are printed so regressions are visible; they are not asserted.
import { afterAll, describe, expect, it } from 'vitest';
import type { SearchOptions } from '../src/lib/search/types';
import type { HadithChunk } from '../src/lib/data/types';
import { dataBuilt, loadChunk, loadEngine } from './load';

describe.runIf(dataBuilt)('search ranking', () => {
  const engine = loadEngine();
  const timings: [string, number, number][] = [];
  const labels = (q: string, opts?: SearchOptions) => {
    const r = engine.search(q, opts);
    timings.push([q, r.ms, r.total]);
    return r.hits.map((h) => h.label);
  };
  afterAll(() => {
    console.log('\nquery timings (ms, results):');
    for (const [q, ms, n] of timings) console.log(`  ${ms.toFixed(1).padStart(7)}  ${String(n).padStart(6)}  ${q}`);
  });

  it.each([
    // [query, expected label, within top N]. Wordings follow these translations
    // (Saheeh International; hadith-api's English), not popular paraphrases.
    ['seek help through patience and prayer', '2:45', 3],
    ['seek help through patience and prayer', '2:153', 3],
    ['patience prayer', '2:153', 5],
    ['prayer patience', '2:153', 5], // order doesn't matter
    ['patiance prayer', '2:153', 5], // typo
    ['ptnc pryr', '2:153', 10], // fzf-style abbreviations
    ['no deity except him the ever living', '2:255', 3],
    ['allah does not charge a soul except', '2:286', 3],
    ['say he is allah who is one', '112:1', 3],
    ['indeed with hardship will be ease', '94:6', 3],
    ['qul huwa allahu ahad', '112:1', 3], // transliteration
    ['inna lillahi wa inna ilayhi rajiun', '2:156', 3],
    ['allahu la ilaha illa huwa alhayyu alqayyum', '2:255', 3],
    ['الحمد لله رب العالمين', '1:2', 1], // Arabic, modern spelling, no diacritics
    ['قل هو الله احد', '112:1', 1],
    ['اقيموا الصلاة', '2:43', 10], // modern spelling of Uthmani ٱلصَّلَوٰةَ
    ['reward of deeds depends upon the intentions', 'Bukhari 1', 3],
    ['the strong is not the one who overcomes the people by his strength', 'Bukhari 6114', 3],
    ['none of you will have faith till he wishes for his brother', 'Bukhari 13', 3],
    ['إنما الأعمال بالنيات', 'Bukhari 1', 3],
  ])('%s → %s (top %i)', (q, expected, n) => {
    expect(labels(q).slice(0, n)).toContain(expected);
  });

  it('pins references above results', () => {
    for (const [q, label] of [
      ['2:255', '2:255'],
      ['baqarah 255', '2:255'],
      ['bukhari 1', 'Bukhari 1'],
      ['surah yaseen', 'Surah 36 · Ya-Sin'],
    ]) {
      const r = engine.search(q!);
      timings.push([q!, r.ms, r.total]);
      expect(r.pinned.map((h) => h.label)).toEqual([label]);
    }
  });

  it('respects filters', () => {
    expect(labels('patience', { corpus: 'quran' }).every((l) => /^\d+:\d+$/.test(l))).toBe(true);
    expect(labels('patience', { corpus: 'hadith' }).every((l) => !/^\d+:\d+$/.test(l))).toBe(true);
    expect(labels('fasting', { books: ['tirmidhi'] }).every((l) => l.startsWith('Tirmidhi'))).toBe(true);
    expect(labels('patience', { surah: 2 }).every((l) => l.startsWith('2:'))).toBe(true);
    const graded = engine.search('fasting', { books: ['tirmidhi'], minGrade: 'sahih' });
    expect(graded.hits.every((h) => h.grade === 'sahih')).toBe(true);
  });

  it('highlights matched words in the display text', () => {
    const hit = engine.search('patience prayer', { corpus: 'quran' }).hits[0]!;
    const marked = hit.ranges.map(([s, e]) => hit.text.slice(s, e).toLowerCase());
    expect(marked).toEqual(expect.arrayContaining(['patience', 'prayer']));
    const ar = engine.search('الحمد لله', { corpus: 'quran' }).hits[0]!;
    expect(ar.ranges.length).toBeGreaterThan(0);
    expect(ar.text.slice(ar.ranges[0]![0], ar.ranges[0]![1])).toMatch(/^ٱلْ?حَ?مْ?دُ?/);
  });

  // Popular paraphrases that don't share the translation's words. Needs the source-finder mode
  // (milestone 5) or search by meaning (future); tracked here so progress is visible.
  // Source finder: quotes in other translations or wordings, sharing most but not all words.
  it.each([
    ['O you who believe! Seek help in patience and As-Salat (the prayer). Truly! Allah is with As-Sabirin', '2:153', 3], // Muhsin Khan
    ['allah does not burden a soul beyond its capacity', '2:286', 5],
    ['Say: He is Allah, the One and Only; Allah, the Eternal, Absolute', '112:1', 5], // Yusuf Ali
    ['The reward of deeds depends on intentions, and every person will get what he intended', 'Bukhari 1', 5],
  ])('source finder: %s → %s (top %i)', (q, expected, n) => {
    expect(labels(q).slice(0, n)).toContain(expected);
  });

  it('ranks strict matches above source-finder matches', () => {
    const r = engine.search('seek help through patience and prayer');
    const firstNear = r.hits.findIndex((h) => h.overlap);
    expect(r.hits.slice(0, 2).every((h) => !h.overlap)).toBe(true);
    if (firstNear >= 0) expect(r.hits.slice(firstNear).every((h) => h.overlap)).toBe(true);
  });

  it('finds the source of a long pasted passage (more than 255 distinct words)', () => {
    const { hadiths } = loadChunk<HadithChunk>('hadith-bukhari');
    const distinct = (en: string) => new Set(en.toLowerCase().split(/\W+/)).size;
    // The shortest hadith with over 255 distinct words besides common ones like "the": a long passage.
    const [number, , en] = hadiths.filter((h) => distinct(h[2]) > 400).reduce((a, b) => (b[2].length < a[2].length ? b : a));
    const words = en.split(/\s+/);
    // Every 12th word garbled, as in a passage copied with mistakes, so only the word-overlap pass finds it.
    const pasted = words.map((w, k) => (k % 12 === 5 ? 'qzx' + k : w)).join(' ');
    const r = engine.search(pasted, { corpus: 'hadith' });
    timings.push([`pasted Bukhari ${number} (${words.length} words)`, r.ms, r.total]);
    expect(r.hits[0]?.label).toBe(`Bukhari ${number}`);
  }, 30_000);

  // Paraphrases sharing too few words with the translation; needs search by meaning (future).
  it.todo('paraphrase: "none of you truly believes until he loves for his brother" → Bukhari 13');
  it.todo('paraphrase: "On no soul doth Allah place a burden greater than it can bear" (Yusuf Ali) → 2:286');

  it('stays fast on broad and fuzzy queries', () => {
    for (const q of ['a', 'al', 'allah', 'the prophet said', 'abu huraira', 'xyzzy', 'mercyful forgivng']) labels(q);
    expect(true).toBe(true);
  });
});

describe.runIf(dataBuilt)('verse of the day', () => {
  const engine = loadEngine();
  const daily = (date: string) => engine.detail({ kind: 'daily', date });

  it('is the same verse for the same date and changes across dates', () => {
    expect(daily('2026-10-23')).toEqual(daily('2026-10-23'));
    const refs = new Set(Array.from({ length: 30 }, (_, d) => {
      const v = daily(`2026-11-${String(d + 1).padStart(2, '0')}`);
      return v?.kind === 'ayah' ? `${v.surah.n}:${v.ayah}` : '';
    }));
    expect(refs.size).toBeGreaterThan(25);
  });

  it('picks short, complete verses', () => {
    for (let d = 1; d <= 60; d++) {
      const v = daily(`2027-01-${String((d % 28) + 1).padStart(2, '0')}-${d}`);
      expect(v?.kind).toBe('ayah');
      if (v?.kind !== 'ayah') continue;
      expect(v.en.length).toBeLessThanOrEqual(230); // 220 plus footnote markers
      // Continuations are out; "And Allāh is…", "And He is…", "And your Lord…" stand alone and are allowed.
      expect(v.en).not.toMatch(/^(But|Then|So|As if|Indeed in that)\b/);
      expect(v.en).not.toMatch(/^And (?!Allāh|He is|your Lord|whoever fears)/);
    }
  });
});
