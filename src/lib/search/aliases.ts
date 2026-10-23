// Well-known names for verses, surahs and hadith ("ayatul kursi", "heart of the quran", "hadith jibril").
// Matched exactly after the same folding as surah names (see ReferenceParser), so spelling variants
// like "ayat al-kursi" / "ayatulkursi" / "aayatul kursi" all hit. Every target is checked against the
// text in tests/aliases.test.ts. Hadith numbers follow hadith-api's numbering, which differs from
// sunnah.com for Muslim (e.g. "the religion is sincerity" is Muslim 196 here, 55 there).
import type { RefTarget } from './types';

export interface Alias {
  /** Display name, shown on the pinned result. */
  name: string;
  /** Ways people type it, Latin or Arabic. */
  spellings: string[];
  target: RefTarget;
}

const ayah = (surah: number, ayah: number, ayahTo?: number): RefTarget => (ayahTo ? { kind: 'ayah', surah, ayah, ayahTo } : { kind: 'ayah', surah, ayah });
const surah = (n: number): RefTarget => ({ kind: 'surah', surah: n });
const hadith = (book: 'bukhari' | 'muslim' | 'tirmidhi', number: number): RefTarget => ({ kind: 'hadith', book, number });

export const ALIASES: Alias[] = [
  // Verses
  { name: 'Ayat al-Kursi', spellings: ['ayatul kursi', 'ayat al kursi', 'ayat ul kursi', 'ayat kursi', 'ayatal kursi', 'throne verse', 'verse of the throne', 'آية الكرسي', 'اية الكرسي'], target: ayah(2, 255) },
  { name: 'Last two verses of Al-Baqarah', spellings: ['amana rasul', 'amanar rasul', 'aamanar rasool', 'amana ar rasul', 'last two verses of baqarah', 'last two ayat of baqarah', 'آمن الرسول', 'امن الرسول'], target: ayah(2, 285, 286) },
  { name: 'Ayat an-Nur', spellings: ['ayat an nur', 'ayatun nur', 'ayat al nur', 'light verse', 'verse of light', 'آية النور'], target: ayah(24, 35) },
  { name: 'Dua of Yunus', spellings: ['dua yunus', 'dua of yunus', 'dua of jonah', 'ayat karima', 'ayat e karima', 'ayate karima', 'la ilaha illa anta subhanaka', 'دعاء يونس'], target: ayah(21, 87) },
  { name: 'Rabbana atina', spellings: ['rabbana atina', 'rabbana aatina', 'rabbana atina fid dunya', 'ربنا آتنا', 'ربنا اتنا'], target: ayah(2, 201) },
  { name: 'Hasbunallah', spellings: ['hasbunallah', 'hasbunallahu wa nimal wakeel', 'hasbunallah wa nimal wakil', 'حسبنا الله'], target: ayah(3, 173) },
  { name: 'Hasbiyallah', spellings: ['hasbiyallah', 'hasbiyallahu la ilaha illa huwa', 'حسبي الله'], target: ayah(9, 129) },
  { name: 'Inna lillahi', spellings: ['inna lillahi', 'inna lillah', 'innalillahi', 'inna lillahi wa inna ilayhi rajiun', 'إنا لله', 'انا لله'], target: ayah(2, 156) },
  { name: 'Rabbi zidni ilma', spellings: ['rabbi zidni ilma', 'rabbi zidni ilman', 'رب زدني علما'], target: ayah(20, 114) },
  { name: 'Dua of Musa', spellings: ['rabbish rahli sadri', 'rabbi shrah li sadri', 'rabbishrahli sadri', 'dua of musa', 'رب اشرح لي صدري'], target: ayah(20, 25, 28) },
  { name: 'The verse of debt', spellings: ['ayat ad dayn', 'ayat al dayn', 'verse of debt', 'debt verse'], target: ayah(2, 282) },
  { name: 'Last verses of Al-Hashr', spellings: ['last verses of hashr', 'end of surah hashr', 'huwallahu alladhi', 'huwa allahu alladhi la ilaha illa huwa'], target: ayah(59, 22, 24) },
  { name: '"I am near"', spellings: ['i am near', 'inni qarib', 'فإني قريب'], target: ayah(2, 186) },
  { name: '"Do not despair of the mercy of Allah"', spellings: ['do not despair', 'la taqnatu', 'la taqnatu min rahmatillah', 'لا تقنطوا'], target: ayah(39, 53) },
  { name: 'Kindness to parents', spellings: ['verse of parents', 'kindness to parents', 'wa bil walidayni ihsana'], target: ayah(17, 23, 24) },

  // Surahs by other names
  { name: 'Al-Fatihah (Umm al-Kitab)', spellings: ['umm al kitab', 'ummul kitab', 'umm ul quran', 'al hamd', 'alhamd', 'sab al mathani', 'seven oft repeated', 'the opening', 'أم الكتاب', 'ام الكتاب'], target: surah(1) },
  { name: 'Ya-Sin (heart of the Quran)', spellings: ['heart of the quran', 'qalb al quran', 'qalbul quran', 'yaseen sharif'], target: surah(36) },
  { name: "Al-Mu'awwidhatayn", spellings: ['muawwidhatayn', 'muawwidhatain', 'muawwizatain', 'muawwizatayn', 'the two refuges', 'qul audhu', 'qul aoozu', 'المعوذتين', 'المعوذتان'], target: surah(113) },
  { name: 'Al-Isra (Bani Isra\'il)', spellings: ['bani israil', 'bani israel', 'bani isra il'], target: surah(17) },
  { name: "At-Tawbah (Bara'ah)", spellings: ['baraah', 'bara ah', 'barat'], target: surah(9) },
  { name: 'Al-Insan (Ad-Dahr)', spellings: ['ad dahr', 'surah dahr', 'dahr'], target: surah(76) },
  { name: "Ghafir (Al-Mu'min)", spellings: ['al mumin', 'surah mumin'], target: surah(40) },
  { name: 'Fussilat (Ha-Mim As-Sajdah)', spellings: ['ha mim sajdah', 'hamim sajdah', 'ha meem sajdah'], target: surah(41) },
  { name: 'Al-Mulk (Tabarak)', spellings: ['tabarak', 'tabarakalladhi', 'tabarak alladhi'], target: surah(67) },
  { name: 'Ash-Sharh (Alam Nashrah)', spellings: ['alam nashrah', 'alam nashrah laka', 'inshirah', 'al inshirah'], target: surah(94) },
  { name: "An-Naba ('Amma)", spellings: ['amma', 'amma yatasaalun', 'juz amma'], target: surah(78) },

  // Hadith
  { name: 'Hadith of intentions', spellings: ['innamal amalu binniyat', 'innamal aamalu binniyat', 'innamal amal bin niyat', 'hadith of intentions', 'actions are by intentions', 'actions are judged by intentions', 'إنما الأعمال بالنيات'], target: hadith('bukhari', 1) },
  { name: 'Hadith of Jibril', spellings: ['hadith jibril', 'hadith of jibril', 'hadith jibreel', 'hadith of gabriel', 'what is islam iman ihsan'], target: hadith('bukhari', 50) },
  { name: 'Islam is built on five', spellings: ['pillars of islam', 'five pillars', 'islam is built on five', 'buniyal islamu ala khams'], target: hadith('bukhari', 8) },
  { name: 'The religion is sincerity', spellings: ['ad din an nasihah', 'addeenu nasihah', 'deen is naseehah', 'religion is sincerity', 'الدين النصيحة'], target: hadith('muslim', 196) },
  { name: 'Be mindful of Allah', spellings: ['ihfazillah', 'ihfadhillah', 'ihfazillaha yahfazk', 'be mindful of allah', 'hadith of ibn abbas', 'guard allah and he will guard you'], target: hadith('tirmidhi', 2516) },
  { name: 'Speak good or remain silent', spellings: ['speak good or remain silent', 'speak good or keep silent', 'falyaqul khayran'], target: hadith('bukhari', 6018) },
  { name: 'The strong one controls himself', spellings: ['the strong man', 'strong is not the one who wrestles', 'laysa ash shadid'], target: hadith('bukhari', 6114) },
  { name: 'Love for your brother', spellings: ['love for your brother', 'love for his brother', 'la yuminu ahadukum hatta yuhibba'], target: hadith('bukhari', 13) },
];
