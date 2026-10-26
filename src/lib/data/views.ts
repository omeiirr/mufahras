// Shapes the worker returns for detail screens. Built from the loaded chunks in SearchEngine.
import type { GradeClass } from '../hadith/grades';
import type { HadithBookId, Surah } from './types';

export type DetailRequest =
  /** extra: wait for the tafsir/topics/similar chunks (~0.7 MB) before answering. */
  | { kind: 'ayah'; surah: number; ayah: number; extra?: boolean }
  | { kind: 'surah'; surah: number }
  /** arabic: wait for the book's Arabic chunk (large) before answering. */
  | { kind: 'hadith'; book: HadithBookId; number: number; arabic?: boolean }
  | { kind: 'surahs' }
  | { kind: 'topic'; id: number }
  | { kind: 'graph' }
  | { kind: 'section'; book: HadithBookId; n: number }
  /** Verse of the day for a local date (YYYY-MM-DD); the same verse for everyone on that date. */
  | { kind: 'daily'; date: string }
  /** Hadith of the day (Bukhari or Muslim), the same for everyone on a date. */
  | { kind: 'hadith-daily'; date: string }
  | { kind: 'books' }
  | { kind: 'words'; surah: number; ayah: number }
  /** Library lists: duas of the Quran, sajdah verses, the topic index, the repeated-phrases index. */
  | { kind: 'duas' }
  | { kind: 'sajdah' }
  | { kind: 'topics' }
  | { kind: 'phrases' }
  | { kind: 'names-of-allah' }
  /** Every verse that hadith mention, with how many. */
  | { kind: 'in-hadith' }
  /** The printed mushaf's pages that hold a surah. */
  | { kind: 'mushaf'; surah: number };

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
  /** Tafsir, theme, topics, similar ayahs, repeated phrases; absent until their chunks have loaded. */
  extra?: AyahExtra;
}

export interface MentioningHadith {
  book: HadithBookId;
  short: string;
  number: number;
  grade: GradeClass;
  /** The start of its English. */
  en: string;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

export interface AyahExtra {
  /** Al-Mukhtasar. from/to: the ayahs (same surah) this explanation covers; usually just this one. */
  tafsir?: { text: string; from: number; to: number };
  /** The passage's theme and the ayahs it spans. */
  theme?: { text: string; from: number; to: number };
  topics: { id: number; name: string; count: number }[];
  /** Ayahs with shared wording; ranges are the shared words in that ayah's Arabic. */
  similar: (AyahRef & { name: string; ar: string; en: string; ranges: [number, number][] })[];
  /** Mutashabihat: phrases this ayah shares with others; ranges are the phrase in this ayah's Arabic. */
  phrases: { text: string; ranges: [number, number][]; count: number; refs: (AyahRef & { name: string })[] }[];
  /** Hadith that quote or cite this verse, sahih first. */
  hadith: MentioningHadith[];
}

export interface TopicDetail {
  kind: 'topic';
  id: number;
  name: string;
  nameAr: string;
  description: string;
  /** Every way down to this topic from the top, each path ending with its direct parent. */
  paths: { id: number; name: string }[][];
  /** Its subtopics, all the way down. */
  children: TopicNode[];
  related: { id: number; name: string }[];
  ayahs: (AyahRef & { name: string; en: string })[];
  /** All ayahs in the topic; ayahs holds the first TOPIC_LIMIT. */
  total: number;
  /** Ayahs in it and in its subtopics. */
  totalWithin: number;
}

export interface TopicNode {
  id: number;
  name: string;
  /** Ayahs in the topic and its subtopics. */
  count: number;
  children: TopicNode[];
}

export interface SectionDetail {
  kind: 'section';
  book: HadithBookId;
  title: string;
  short: string;
  n: number;
  name: string;
  hadiths: { number: number; en: string; grade: GradeClass }[];
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
  /** Verses the hadith quotes or cites, in Quran order. */
  verses: (AyahRef & { name: string })[];
  prev?: number;
  next?: number;
}

export interface GraphNode extends AyahRef {
  name: string;
  place: 'makkah' | 'madinah';
  /** Translation, shortened for tooltips. */
  en: string;
  x: number;
  y: number;
  degree: number;
}

export interface GraphDetail {
  kind: 'graph';
  nodes: GraphNode[];
  /** [node a, node b, similarity score 50–100]. */
  edges: [number, number, number][];
}

export interface WordsDetail {
  kind: 'words';
  /** One per QUL word of the ayah, in order. meaning is '' until QUL's word-by-word translation is added. */
  words: { ar: string; translit: string; meaning: string }[];
}

export interface AyahListDetail {
  kind: 'ayah-list';
  list: 'duas' | 'sajdah' | 'in-hadith';
  /** count: for in-hadith, how many hadith mention the verse. */
  ayahs: (AyahRef & { name: string; ar: string; en: string; count?: number })[];
}

export interface TopicsDetail {
  kind: 'topics';
  /** Top-level topics with at least 3 ayahs in them or under them, by name, each with its whole tree. */
  topics: TopicNode[];
}

export interface PhrasesDetail {
  kind: 'phrases';
  /** Repeated phrases, most repeated first. */
  phrases: { text: string; count: number; refs: (AyahRef & { name: string })[] }[];
}

export interface NamesOfAllahDetail {
  kind: 'names-of-allah';
  names: { number: number; ar: string; translit: string; en: string; meaning: string }[];
}

export interface MushafDetail {
  kind: 'mushaf';
  surah: number;
  /** Whole pages, so they can hold the end of the surah before or the start of the one after. */
  pages: { n: number; lines: MushafLineView[] }[];
}

export type MushafLineView =
  | { kind: 'surah'; surah: number; name: string }
  | { kind: 'bismillah' }
  /** Lines never cross a surah boundary; `marker` words are ayah numbers, `first` an ayah's first word. */
  | { kind: 'ayah'; surah: number; centered: boolean; words: { text: string; ayah: number; marker: boolean; first: boolean }[] };

export interface BooksDetail {
  kind: 'books';
  books: { id: HadithBookId; title: string; short: string; count: number; sections: { n: number; name: string; count: number }[] }[];
}

export type Detail = AyahDetail | SurahDetail | SurahList | HadithDetail | TopicDetail | SectionDetail | GraphDetail | BooksDetail | WordsDetail | AyahListDetail | TopicsDetail | PhrasesDetail | NamesOfAllahDetail | MushafDetail;

/** Suggested browse links shown above results: a QUL topic, or a chapter (book) of a hadith collection. */
export interface Chip {
  kind: 'topic' | 'section';
  label: string;
  sub: string;
  path: string;
}
