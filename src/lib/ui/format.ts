import type { GradeClass } from '../hadith/grades';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]!);
}

/** End-of-ayah sign followed by the number; the Quran font draws them as one ornament. */
export function ayahMarker(n: number): string {
  return `۝${arabicDigits(n)}`;
}

export const GRADE_LABEL: Record<GradeClass, string> = {
  sahih: 'Sahih',
  hasan: 'Hasan',
  daif: "Da'if",
  mawdu: 'Fabricated',
  other: 'Ungraded',
};

export function placeName(place: 'makkah' | 'madinah'): string {
  return place === 'makkah' ? 'Meccan' : 'Medinan';
}
