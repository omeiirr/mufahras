// Which verse or hadith each row of meaning-vectors belongs to (layout in MeaningChunk).
import type { MeaningChunk } from '../data/types';
import type { DocRef } from '../search/types';

export function refOfRow(meta: MeaningChunk, row: number): DocRef {
  if (row < meta.quran) return { kind: 'ayah', i: row };
  let at = row - meta.quran;
  for (const [book, rows, skip] of meta.books) {
    const withVectors = rows - skip.length;
    if (at < withVectors) {
      // The at-th row that has a vector: step past the skipped rows (sorted) at or before it.
      let r = at;
      for (const s of skip) if (s <= r) r++;
      return { kind: 'hadith', book, row: r };
    }
    at -= withVectors;
  }
  throw new Error(`vector row ${row} out of range`);
}
