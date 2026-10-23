import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Manifest, QuranChunk } from '../src/lib/data/types';
import { ReferenceParser } from '../src/lib/search/reference';

const DIR = join(import.meta.dirname, '..', 'public', 'data');
const manifest: Manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
const quran: QuranChunk = JSON.parse(readFileSync(join(DIR, manifest.chunks.quran!.file), 'utf8'));
const p = new ReferenceParser(quran.surahs);

describe('ReferenceParser', () => {
  it.each([
    ['2:255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['2 255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['2.255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['2:255-257', { kind: 'ayah', surah: 2, ayah: 255, ayahTo: 257 }],
    ['112', { kind: 'surah', surah: 112 }],
    ['baqarah 255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['Al-Baqarah 255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['baqara:255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['baqra 255', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['al imran 190', { kind: 'ayah', surah: 3, ayah: 190 }],
    ['imran 190', { kind: 'ayah', surah: 3, ayah: 190 }],
    ['yaseen 1', { kind: 'ayah', surah: 36, ayah: 1 }],
    ['kahf 10', { kind: 'ayah', surah: 18, ayah: 10 }],
    ['surah yaseen', { kind: 'surah', surah: 36 }],
    ['surah mulk', { kind: 'surah', surah: 67 }],
    ['fatiha', { kind: 'surah', surah: 1 }],
    ['rahman', { kind: 'surah', surah: 55 }],
    ['البقرة ٢٥٥', { kind: 'ayah', surah: 2, ayah: 255 }],
    ['سورة يس', { kind: 'surah', surah: 36 }],
    ['bukhari 1', { kind: 'hadith', book: 'bukhari', number: 1 }],
    ['Sahih Bukhari 6018', { kind: 'hadith', book: 'bukhari', number: 6018 }],
    ['muslim #8', { kind: 'hadith', book: 'muslim', number: 8 }],
    ['abu dawood 402.2', { kind: 'hadith', book: 'abudawud', number: 402.2 }],
    ['tirmizi 2516', { kind: 'hadith', book: 'tirmidhi', number: 2516 }],
    ["nasa'i 5", { kind: 'hadith', book: 'nasai', number: 5 }],
    ['ibn majah 224', { kind: 'hadith', book: 'ibnmajah', number: 224 }],
  ])('%s', (q, expected) => {
    expect(p.parse(q)).toEqual(expected);
  });

  it.each(['2:287', '115', '0', 'patience', 'seek help through patience and prayer', 'light', 'allah', ''])('rejects %s', (q) => {
    expect(p.parse(q)).toBeNull();
  });
});
