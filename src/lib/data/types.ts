// Shapes of the generated files in public/data/. Written by scripts/build-data.ts, read by the app.
// Ayahs are addressed by a global index 0..6235 in mushaf order; Surah.start maps a surah to its first index.

export interface Surah {
  n: number;
  name: string; // "Al-Fātiĥah"
  nameSimple: string; // "Al-Fatihah"
  nameAr: string;
  place: 'makkah' | 'madinah';
  order: number; // revelation order
  count: number;
  start: number;
  bismillah: boolean;
}

export interface QuranChunk {
  surahs: Surah[];
  /** Uthmani script; display text, never altered. */
  ar: string[];
  /** Saheeh International, footnote markers as superscript digits ("Allāh,¹"). */
  en: string[];
  /** Footnote texts per ayah index, in marker order. */
  footnotes: Record<number, string[]>;
}

/** Loaded right after the core Quran chunk; kept separate so first load stays small. */
export interface TranslitChunk {
  /** Tanzil ASCII transliteration ("baAAda"). */
  simple: string[];
  /** Word-by-word transliteration joined with spaces ("bis'mi l-lahi …"). */
  wbw: string[];
}

/** IndoPak script, per ayah index. */
export type IndopakChunk = string[];

export interface TafsirChunk {
  /** Explanation per ayah index; a number points to the group head whose text covers this ayah. */
  text: (string | number)[];
  /** Group head index → [first, last] ayah index covered. */
  groups: Record<number, [number, number]>;
}

export interface Topic {
  id: number;
  name: string;
  nameAr: string;
  parents: number[];
  description: string; // plain text
  ayahs: number[];
  related: number[];
}

/** [first ayah index, last ayah index, theme]. */
export type Theme = [number, number, string];

/** [ayah index, score 50–100, coverage %, matching word ranges (1-based, inclusive)]. */
export type SimilarAyah = [number, number, number, [number, number][]];
export type SimilarChunk = Record<number, SimilarAyah[]>;

export interface Phrase {
  /** Where the phrase is defined: [ayah index, first word, last word]. */
  source: [number, number, number];
  /** Ayah index → word ranges where the phrase occurs. */
  occurrences: Record<number, [number, number][]>;
}

/**
 * Word by word, per ayah index and QUL word number - 1: transliteration, and the English meaning when
 * QUL's word-by-word translation file is present (null otherwise). Loaded on the first word tapped.
 */
export interface WordsChunk {
  translit: string[][];
  meaning: string[][] | null;
}

/**
 * Similar-ayah graph with a layout computed at build time (d3-force), so the page draws at once.
 * nodes: [ayah index, x, y]; edges: [node a, node b, similarity score 50–100], each pair once.
 */
export interface GraphChunk {
  nodes: [number, number, number][];
  edges: [number, number, number][];
}

export interface MutashabihatChunk {
  phrases: Record<number, Phrase>;
  byAyah: Record<number, number[]>;
}

export const HADITH_BOOKS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'] as const;
export type HadithBookId = (typeof HADITH_BOOKS)[number];

/** [number, section, english, grades as [scholar index, grade text][]]. Numbers can be fractional (402.2). */
export type HadithRow = [number, number, string, [number, string][]];

/** Arabic text per row of the book's HadithChunk ("" if missing). Separate file, loaded on demand. */
export type HadithArabicChunk = string[];

export interface HadithChunk {
  id: HadithBookId;
  name: string;
  /** Section number → name. */
  sections: Record<number, string>;
  scholars: string[];
  hadiths: HadithRow[];
}

export interface ChunkInfo {
  file: string;
  items: number;
  bytes: number;
  gzipBytes: number;
}

export interface Source {
  name: string;
  provider: string;
  url: string;
  license: string;
  version: string;
}

export interface Manifest {
  version: 1;
  built: string;
  chunks: Record<string, ChunkInfo>;
  sources: Source[];
}
