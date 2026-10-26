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

/**
 * A printed mushaf's pages, line by line. A line is [0, surah] for a surah's name, [1] for the
 * bismillah, or [2, centered, fromAyah, fromPos, toAyah, toPos] for a run of words: ayah indices, and
 * word positions in the ayah's `ar` (0-based; a position equal to the word count is the ayah marker).
 */
export interface MushafChunk {
  name: string;
  pages: MushafLine[][];
}
export type MushafLine = [0, number] | [1] | [2, 0 | 1, number, number, number, number];

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

/** The 99 Names of Allah: [number, Arabic, transliteration, English name, meaning], in Tirmidhi 3507's order. */
export type NamesOfAllahChunk = [number, string, string, string, string][];

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

/**
 * Search by meaning: how to read meaning-vectors (written by scripts/build-meaning.ts). Rows are the
 * verses in index order, then each book in turn: its hadith rows in order, except those in its skip list
 * (rows with no English).
 */
export interface MeaningChunk {
  /** Model files under models/<dir>/: [path, bytes]; runtime: bytes of ONNX Runtime's WebAssembly. */
  model: { dir: string; files: [string, number][]; runtime: number };
  queryPrefix: string;
  dims: number;
  /** int8 value = round(component × scale). */
  scale: number;
  quran: number;
  /** Everything to download, compressed as served (gzip estimate): model, runtime and vectors. */
  download: number;
  /** [book, rows in its HadithChunk, rows without a vector]. */
  books: [HadithBookId, number, number[]][];
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
