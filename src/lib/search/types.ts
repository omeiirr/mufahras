import type { HadithBookId } from '../data/types';
import type { Chip } from '../data/views';
import type { GradeClass } from '../hadith/grades';

export type DocRef = { kind: 'ayah'; i: number } | { kind: 'hadith'; book: HadithBookId; row: number };

/** What a reference-style query ("2:255", "baqarah 255", "bukhari 1", "ayatul kursi") points to. */
export type RefTarget = (
  | { kind: 'ayah'; surah: number; ayah: number; ayahTo?: number }
  | { kind: 'surah'; surah: number }
  | { kind: 'hadith'; book: HadithBookId; number: number }
) & {
  /** Set when the query was a well-known name (aliases.ts). */
  name?: string;
};

export interface SearchOptions {
  corpus?: 'all' | 'quran' | 'hadith';
  surah?: number;
  books?: HadithBookId[];
  /** Hide hadith graded below this bucket. */
  minGrade?: GradeClass;
  limit?: number;
  /** Skip this many hits (for loading more on scroll). */
  offset?: number;
}

/** How well the weakest query term matched: 3 exact, 2 one typo, 1 fzf-style abbreviation. */
export type Tier = 1 | 2 | 3;

export type Field = 'en' | 'translit' | 'ar';

export interface Hit {
  ref: DocRef;
  score: number;
  tier: Tier;
  field: Field;
  /** Source-finder match: [query words found, meaningful query words]. */
  overlap?: [number, number];
}

/** A hit prepared for display: label, a snippet of the matched field, and highlight ranges within it. */
export interface PresentedHit {
  ref: DocRef;
  key: string;
  /** Route path of the detail screen ("2:255", "bukhari/1", "surah/36"). */
  path: string;
  label: string;
  sublabel: string;
  field: Field;
  tier: Tier;
  text: string;
  /** Translation shown under an Arabic or transliteration match. */
  secondary?: string;
  ranges: [number, number][];
  grade?: GradeClass;
  /** Source-finder match: [query words found, meaningful query words]. */
  overlap?: [number, number];
}

export interface SearchResponse {
  query: string;
  pinned: PresentedHit[];
  /** Topics and hadith chapters whose names match the query. */
  chips: Chip[];
  hits: PresentedHit[];
  total: number;
  ms: number;
  /** Data still loading, so results may be incomplete. */
  partial: boolean;
}
