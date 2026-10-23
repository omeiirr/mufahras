// wordSpans must split every ayah into exactly QUL's words (their count, minus the ayah-number marker),
// or similar-ayah and mutashabihat highlights would land on the wrong words.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { QuranChunk } from '../src/lib/data/types';
import { wordSpans } from '../src/lib/text/quran-display';
import { dataBuilt, loadChunk } from './load';

const QUL = join(import.meta.dirname, '..', 'data-src', 'qul');

describe.runIf(dataBuilt)('wordSpans', () => {
  it('matches QUL word counts for all 6,236 ayahs', () => {
    const zip = unzipSync(readFileSync(join(QUL, readdirSync(QUL).find((f) => f.startsWith('uthmani.json'))!)));
    const words: Record<string, { surah: string; ayah: string; text: string }> = JSON.parse(new TextDecoder().decode(Object.values(zip)[0]!));
    const counts = new Map<string, number>();
    for (const w of Object.values(words)) {
      if (/^[٠-٩]+$/.test(w.text.trim())) continue; // ayah-number marker
      const k = `${w.surah}:${w.ayah}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const quran = loadChunk<QuranChunk>('quran');
    const bad = quran.surahs.flatMap((s) =>
      Array.from({ length: s.count }, (_, k) => k).flatMap((k) => {
        const got = wordSpans(quran.ar[s.start + k]!).length;
        const want = counts.get(`${s.n}:${k + 1}`);
        return got === want ? [] : [`${s.n}:${k + 1} ${got}≠${want}`];
      }),
    );
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
