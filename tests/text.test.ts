import { describe, expect, it } from 'vitest';
import { classifyGrade } from '../src/lib/hadith/grades';
import { hasArabic, normalizeArabic, normalizeLatin, superscript } from '../src/lib/text/normalize';

describe('normalizeArabic', () => {
  it('strips diacritics and Quranic marks', () => {
    expect(normalizeArabic('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ')).toBe('بسم الله الرحمن الرحيم');
  });
  it('unifies letter variants and drops hamza', () => {
    expect(normalizeArabic('أَإِآ مُصْطَفَى صَلَاة مُؤْمِن سَائِل سَمَاء')).toBe('ااا مصطفي صلاه مومن سايل سما');
  });
  it('matches the Uthmani-simple spelling of the same ayah', () => {
    expect(normalizeArabic('يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمُ')).toBe(normalizeArabic('يـأيها الناس اتقوا ربكم'));
  });
});

describe('normalizeLatin', () => {
  it('folds diacritics, apostrophes and footnote markers', () => {
    expect(normalizeLatin('In the name of Allāh,¹ the Entirely Merciful')).toBe('in the name of allah the entirely merciful');
    expect(normalizeLatin("Narrated 'Umar: ʿAbd ar-Raḥmān")).toBe('narrated umar abd ar rahman');
  });
});

describe('hasArabic / superscript', () => {
  it('detects Arabic script', () => {
    expect(hasArabic('patience صبر')).toBe(true);
    expect(hasArabic('patience')).toBe(false);
  });
  it('renders superscript digits', () => {
    expect(superscript(12)).toBe('¹²');
  });
});

describe('classifyGrade', () => {
  it.each([
    ['Sahih', 'sahih'],
    ['Hasan Sahih', 'sahih'],
    ['Sahih Lighairihi', 'sahih'],
    ['Sahih - Agreed Upon', 'sahih'],
    ['Sahih Bukhari (1023) Sahih Muslim (894)', 'sahih'],
    ['Hasan', 'hasan'],
    ['Isnaad Hasan', 'hasan'],
    ['Daif', 'daif'],
    ['Daif Isnaad', 'daif'],
    ['Sanad Daif', 'daif'],
    ['Munkar Daif', 'daif'],
    ['Shadh', 'daif'],
    ['Very Daif', 'daif'],
    ['Isnaad Malool', 'daif'],
    ['Mawdu', 'mawdu'],
    ['Batil', 'mawdu'],
    ['Maqtu', 'other'],
    ['Mursal', 'other'],
  ])('%s → %s', (grade, expected) => {
    expect(classifyGrade(grade)).toBe(expected);
  });
});
