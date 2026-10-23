// Shapes the worker returns for detail screens. Built from the loaded chunks in SearchEngine.
import type { GradeClass } from '../hadith/grades';
import type { HadithBookId, Surah } from './types';

export type DetailRequest =
  | { kind: 'ayah'; surah: number; ayah: number }
  | { kind: 'surah'; surah: number }
  /** arabic: wait for the book's Arabic chunk (large) before answering. */
  | { kind: 'hadith'; book: HadithBookId; number: number; arabic?: boolean }
  | { kind: 'surahs' }
  /** Verse of the day for a local date (YYYY-MM-DD); the same verse for everyone on that date. */
  | { kind: 'daily'; date: string };

export interface AyahLine {
  ayah: number;
  ar: string;
  en: string;
  footnotes: string[];
}

export interface AyahDetail extends AyahLine {
  kind: 'ayah';
  surah: Surah;
  /** Word-by-word transliteration, or '' if not loaded yet. */
  translit: string;
  prev?: { surah: number; ayah: number };
  next?: { surah: number; ayah: number };
}

export interface SurahDetail {
  kind: 'surah';
  surah: Surah;
  ayahs: AyahLine[];
  prev?: Surah;
  next?: Surah;
}

export interface SurahList {
  kind: 'surahs';
  surahs: Surah[];
}

export interface HadithGrade {
  scholar: string;
  grade: string;
  cls: GradeClass;
}

export interface HadithDetail {
  kind: 'hadith';
  book: HadithBookId;
  title: string;
  short: string;
  number: number;
  section: { n: number; name: string };
  en: string;
  /** '' when the book has no Arabic for this hadith. */
  ar: string;
  grades: HadithGrade[];
  summary: GradeClass;
  sahihCollection: boolean;
  prev?: number;
  next?: number;
}

export type Detail = AyahDetail | SurahDetail | SurahList | HadithDetail;
