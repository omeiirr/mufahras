import type { HadithBookId } from './types';

export interface BookInfo {
  id: HadithBookId;
  title: string;
  short: string;
  /** Whole collection is considered sahih; it has no per-hadith gradings. */
  sahihCollection: boolean;
  /** Spellings accepted in references like "bukhari 1" (already passed through normalizeLatin, spaces removed). */
  aliases: string[];
}

export const BOOKS: Record<HadithBookId, BookInfo> = {
  bukhari: { id: 'bukhari', title: 'Sahih al-Bukhari', short: 'Bukhari', sahihCollection: true, aliases: ['bukhari', 'bukhary', 'bukari', 'sahihbukhari', 'sahihalbukhari', 'bu'] },
  muslim: { id: 'muslim', title: 'Sahih Muslim', short: 'Muslim', sahihCollection: true, aliases: ['muslim', 'sahihmuslim', 'mu'] },
  abudawud: { id: 'abudawud', title: 'Sunan Abi Dawud', short: 'Abu Dawud', sahihCollection: false, aliases: ['abudawud', 'abudawood', 'abudaud', 'abidawud', 'sunanabidawud', 'sunanabudawud', 'dawud', 'ad'] },
  tirmidhi: { id: 'tirmidhi', title: "Jami' at-Tirmidhi", short: 'Tirmidhi', sahihCollection: false, aliases: ['tirmidhi', 'tirmizi', 'tirmithi', 'tirmidi', 'jamiattirmidhi', 'attirmidhi', 'ti'] },
  nasai: { id: 'nasai', title: "Sunan an-Nasa'i", short: "Nasa'i", sahihCollection: false, aliases: ['nasai', 'nasaai', 'nisai', 'annasai', 'sunanannasai', 'na'] },
  ibnmajah: { id: 'ibnmajah', title: 'Sunan Ibn Majah', short: 'Ibn Majah', sahihCollection: false, aliases: ['ibnmajah', 'ibnmaja', 'ibnmajahs', 'majah', 'sunanibnmajah', 'im'] },
};

/** Hadith numbers can be fractional in hadith-api (402.2); show them as-is. */
export function formatHadithNumber(n: number): string {
  return String(n);
}
