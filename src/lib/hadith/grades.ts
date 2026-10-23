// hadith-api grade strings are free text: "Sahih", "Hasan Sahih", "Daif Isnaad", "Sahih Muslim (1480)", "-", …
// These buckets drive the grade colour and the "Sahih only" filter; the original string is always shown too.

export type GradeClass = 'sahih' | 'hasan' | 'daif' | 'mawdu' | 'other';

export function classifyGrade(grade: string): GradeClass {
  const g = grade.toLowerCase();
  if (/mawdu|batil|fabricat/.test(g)) return 'mawdu';
  // Checked before sahih/hasan so that e.g. "Munkar Daif" or "Sanad Daif" never count as authentic.
  if (/da['ʿ]?if|munkar|shadh|weak|ma['ʿ]?l(oo|u)l/.test(g)) return 'daif';
  // "Hasan Sahih" and "Sahih Lighairihi" are authentic, so sahih wins over hasan.
  if (/sahih|agreed upon|mutawatir/.test(g)) return 'sahih';
  if (/hasan/.test(g)) return 'hasan';
  return 'other';
}

const RANK: Record<GradeClass, number> = { sahih: 4, hasan: 3, other: 2, daif: 1, mawdu: 0 };

/** Ranks buckets from most to least authentic, for sorting and the minimum-grade filter. */
export function gradeRank(c: GradeClass): number {
  return RANK[c];
}
