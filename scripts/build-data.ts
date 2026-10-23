// Turns the raw sources in data-src/ into the app's data files in public/data/:
// validates them, writes content-hashed chunks, and records sizes and sources in manifest.json.
// Exits non-zero if any validation check fails.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import { classifyGrade } from '../src/lib/hadith/grades.ts';
import { HADITH_BOOKS } from '../src/lib/data/types.ts';
import type {
  ChunkInfo,
  HadithBookId,
  HadithArabicChunk,
  HadithChunk,
  HadithRow,
  IndopakChunk,
  Manifest,
  MutashabihatChunk,
  Phrase,
  QuranChunk,
  SimilarChunk,
  Source,
  Surah,
  TafsirChunk,
  Theme,
  Topic,
  TranslitChunk,
} from '../src/lib/data/types.ts';
import { superscript } from '../src/lib/text/normalize.ts';
import { HADITH_API_COMMIT } from './sources.ts';

const ROOT = join(import.meta.dirname, '..');
const QUL = join(ROOT, 'data-src', 'qul');
const HADITH = join(ROOT, 'data-src', 'hadith');
const OUT = join(ROOT, 'public', 'data');
const AYAH_COUNT = 6236;

// ---------------------------------------------------------------- validation

const errors: string[] = [];
const notes: string[] = [];
function check(ok: boolean, msg: string): void {
  if (!ok) errors.push(msg);
}

// ---------------------------------------------------------------- reading QUL archives

/** QUL downloads are zips (even the one named .bz2). Returns every file inside, by name. */
function unzipQul(prefix: string): Record<string, Uint8Array> {
  const name = readdirSync(QUL).find((f) => f.startsWith(prefix));
  if (!name) throw new Error(`data-src/qul: no file starting with "${prefix}"`);
  return unzipSync(readFileSync(join(QUL, name)));
}

function qulJson<T>(prefix: string, inner?: string): T {
  const files = unzipQul(prefix);
  const key = Object.keys(files).find((k) => k.endsWith(inner ?? '.json'));
  if (!key) throw new Error(`${prefix}: no ${inner ?? '.json'} inside archive`);
  return JSON.parse(new TextDecoder().decode(files[key]));
}

function qulSqlite(prefix: string): DatabaseSync {
  const files = unzipQul(prefix);
  const key = Object.keys(files).find((k) => k.endsWith('.db'));
  if (!key) throw new Error(`${prefix}: no .db inside archive`);
  const path = join(mkdtempSync(join(tmpdir(), 'quran-search-')), 'data.db');
  writeFileSync(path, files[key]!);
  return new DatabaseSync(path, { readOnly: true });
}

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------- Quran

type QulSurah = {
  id: number;
  name: string;
  name_simple: string;
  name_arabic: string;
  revelation_order: number;
  revelation_place: 'makkah' | 'madinah';
  verses_count: number;
  bismillah_pre: boolean;
};
const surahMeta = qulJson<Record<string, QulSurah>>('quran-metadata-surah-name');
const surahs: Surah[] = [];
for (let n = 1, start = 0; n <= 114; n++) {
  const s = surahMeta[n];
  if (!s) throw new Error(`surah metadata missing for ${n}`);
  surahs.push({
    n,
    name: s.name,
    nameSimple: s.name_simple,
    nameAr: s.name_arabic,
    place: s.revelation_place,
    order: s.revelation_order,
    count: s.verses_count,
    start,
    bismillah: s.bismillah_pre,
  });
  start += s.verses_count;
}
const keys = surahs.flatMap((s) => Array.from({ length: s.count }, (_, i) => `${s.n}:${i + 1}`));
check(keys.length === AYAH_COUNT, `surah metadata gives ${keys.length} ayahs, expected ${AYAH_COUNT}`);
const indexOf = new Map(keys.map((k, i) => [k, i]));
function ayahIndex(key: string, ctx: string): number {
  const i = indexOf.get(key.trim());
  if (i === undefined) throw new Error(`${ctx}: unknown ayah key "${key}"`);
  return i;
}

/** Collects per-ayah values, checking every ayah is present and non-empty. */
function perAyah<V>(name: string, src: Record<string, V>, get: (v: V, key: string) => string): string[] {
  return keys.map((k) => {
    const v = src[k];
    const text = v === undefined ? '' : get(v, k).trim();
    check(text !== '', `${name}: missing or empty ${k}`);
    return text;
  });
}

// Uthmani script is word-level; the last word of each ayah is its number marker (e.g. "٢٥٥").
type QulWord = { surah: string; ayah: string; word: string; text: string };
const words = qulJson<Record<string, QulWord>>('uthmani.json');
const wordsByAyah = new Map<string, [number, string][]>();
for (const w of Object.values(words)) {
  const k = `${w.surah}:${w.ayah}`;
  let list = wordsByAyah.get(k);
  if (!list) wordsByAyah.set(k, (list = []));
  list.push([Number(w.word), w.text]);
}
const ar = perAyah('uthmani', Object.fromEntries(wordsByAyah), (ws) =>
  ws
    .sort((a, b) => a[0] - b[0])
    .map(([, t]) => t)
    .filter((t) => t !== '' && !/^[٠-٩]+$/.test(t))
    .join(' '),
);

type QulTranslation = { t: string; f: Record<string, string> };
const sahih = qulJson<Record<string, QulTranslation>>('en-sahih-international');
const footnotes: Record<number, string[]> = {};
const en = perAyah('sahih-international', sahih, (v, k) => {
  const notesHere: string[] = [];
  const text = v.t.replace(/<sup foot_note="(\d+)">(\d+)<\/sup>/g, (_, id: string, n: string) => {
    const note = v.f[id];
    check(note !== undefined, `sahih-international ${k}: footnote ${id} has no text`);
    notesHere.push(stripHtml(note ?? ''));
    return superscript(Number(n));
  });
  check(!/<[a-z/]/i.test(text), `sahih-international ${k}: unexpected HTML left: ${text.slice(0, 80)}`);
  if (notesHere.length) footnotes[indexOf.get(k)!] = notesHere;
  return text;
});

const translit = perAyah('transliteration-simple', qulJson<Record<string, { t: string }>>('transliteration-simple'), (v) => v.t);

const wbw = qulJson<Record<string, string>>('english-wbw-transliteration');
const wbwByAyah = new Map<string, [number, string][]>();
for (const [loc, t] of Object.entries(wbw)) {
  const [s, a, w] = loc.split(':');
  const k = `${s}:${a}`;
  let list = wbwByAyah.get(k);
  if (!list) wbwByAyah.set(k, (list = []));
  list.push([Number(w), t]);
}
const translitWbw = perAyah('english-wbw-transliteration', Object.fromEntries(wbwByAyah), (ws) =>
  ws
    .sort((a, b) => a[0] - b[0])
    .map(([, t]) => t)
    .join(' '),
);

const quran: QuranChunk = { surahs, ar, en, footnotes };
const translitChunk: TranslitChunk = { simple: translit, wbw: translitWbw };

const indopak: IndopakChunk = perAyah('indopak', qulJson<Record<string, { text: string }>>('indopak'), (v) => v.text);

// ---------------------------------------------------------------- tafsir (Al-Mukhtasar)

type QulTafsir = { text: string; ayah_keys?: string[] } | string;
const tafsirSrc = qulJson<Record<string, QulTafsir>>('abridged-explanation-of-the-quran');
const tafsir: TafsirChunk = { text: [], groups: {} };
keys.forEach((k, i) => {
  const v = tafsirSrc[k];
  if (typeof v === 'string') {
    tafsir.text.push(ayahIndex(v, `tafsir ${k}`));
  } else {
    const text = v ? stripHtml(v.text) : '';
    check(text !== '', `tafsir: missing or empty ${k}`);
    tafsir.text.push(text);
    if (v?.ayah_keys) {
      const idx = v.ayah_keys.map((a) => ayahIndex(a, `tafsir ${k}`));
      tafsir.groups[i] = [Math.min(...idx), Math.max(...idx)];
    }
  }
});
tafsir.text.forEach((t, i) => {
  if (typeof t !== 'number') return;
  const head = tafsir.groups[t];
  check(typeof tafsir.text[t] === 'string' && !!head && head[0] <= i && i <= head[1], `tafsir: ${keys[i]} points to ${keys[t]}, which isn't a group covering it`);
});

// ---------------------------------------------------------------- topics, themes, similar ayahs, mutashabihat

/** "2:45, 2:153, 3:200-202" → ayah indices (ranges expanded, duplicates removed, mushaf order). */
function parseAyahList(list: string, ctx: string): number[] {
  const out = new Set<number>();
  for (const part of list.split(',').map((p) => p.trim()).filter(Boolean)) {
    const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new Error(`${ctx}: bad ayah reference "${part}"`);
    const [, s, from, to] = m;
    for (let a = Number(from); a <= Number(to ?? from); a++) out.add(ayahIndex(`${s}:${a}`, ctx));
  }
  return [...out].sort((a, b) => a - b);
}

type TopicRow = {
  topic_id: number;
  name: string;
  arabic_name: string | null;
  parent_id: number | null;
  thematic_parent_id: number | null;
  ontology_parent_id: number | null;
  description: string | null;
  ayahs: string | null;
  related_topics: string | null;
};
const topicsDb = qulSqlite('topics');
const topicRows = topicsDb.prepare('SELECT * FROM topics ORDER BY topic_id').all() as TopicRow[];
const topicIds = new Set(topicRows.map((t) => t.topic_id));
const topics: Topic[] = topicRows.map((t) => {
  const ctx = `topic ${t.topic_id}`;
  const ids = (s: string | null) =>
    (s ?? '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((x) => x > 0 && topicIds.has(x));
  return {
    id: t.topic_id,
    name: t.name.trim(),
    nameAr: (t.arabic_name ?? '').trim(),
    parents: [...new Set([t.parent_id, t.thematic_parent_id, t.ontology_parent_id].filter((p): p is number => !!p && topicIds.has(p)))],
    description: stripHtml(t.description ?? ''),
    ayahs: parseAyahList(t.ayahs ?? '', ctx),
    related: ids(t.related_topics),
  };
});
// Keep topics that point at ayahs, plus any topic that is a parent of a kept one (needed for the hierarchy).
const keepTopic = new Set(topics.filter((t) => t.ayahs.length).map((t) => t.id));
for (let grew = true; grew; ) {
  grew = false;
  for (const t of topics)
    if (keepTopic.has(t.id))
      for (const p of t.parents)
        if (!keepTopic.has(p)) {
          keepTopic.add(p);
          grew = true;
        }
}
const topicsOut = topics.filter((t) => keepTopic.has(t.id));
notes.push(`topics: kept ${topicsOut.length} of ${topics.length} (${topics.length - topicsOut.length} have no ayahs and no children)`);

const themesDb = qulSqlite('ayah-themes');
const themeRows = themesDb.prepare('SELECT theme, surah_number, ayah_from, ayah_to FROM themes').all() as {
  theme: string;
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
}[];
const themes: Theme[] = themeRows
  .map((r): Theme => {
    const ctx = `theme "${r.theme}"`;
    return [ayahIndex(`${r.surah_number}:${r.ayah_from}`, ctx), ayahIndex(`${r.surah_number}:${r.ayah_to}`, ctx), r.theme.trim()];
  })
  .sort((a, b) => a[0] - b[0]);
const themed = new Set(themes.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
notes.push(`themes: cover ${themed.size} of ${AYAH_COUNT} ayahs`);

type QulMatch = { matched_ayah_key: string; score: number; coverage: number; match_words: [number, number][] };
const matchSrc = qulJson<Record<string, QulMatch[]>>('matching-ayah');
const similar: SimilarChunk = {};
let similarPairs = 0;
for (const [k, list] of Object.entries(matchSrc)) {
  similar[ayahIndex(k, 'matching-ayah')] = list
    .map((m): [number, number, number, [number, number][]] => [ayahIndex(m.matched_ayah_key, `matching-ayah ${k}`), m.score, m.coverage, m.match_words])
    .sort((a, b) => b[1] - a[1]);
  similarPairs += list.length;
}

type QulPhrase = { source: { key: string; from: number; to: number }; ayah: Record<string, [number, number][]> };
const phraseSrc = qulJson<Record<string, QulPhrase>>('Mutashabihat', 'phrases.json');
const phraseVerses = qulJson<Record<string, number[]>>('Mutashabihat', 'phrase_verses.json');
const phrases: Record<number, Phrase> = {};
for (const [id, p] of Object.entries(phraseSrc)) {
  const ctx = `mutashabihat phrase ${id}`;
  const occurrences: Record<number, [number, number][]> = {};
  for (const [k, ranges] of Object.entries(p.ayah)) {
    // The source repeats some ranges (e.g. 16:28 lists [17,19] twice).
    const unique = [...new Map(ranges.map((r) => [r.join('-'), r])).values()];
    occurrences[ayahIndex(k, ctx)] = unique;
  }
  phrases[Number(id)] = { source: [ayahIndex(p.source.key, ctx), p.source.from, p.source.to], occurrences };
}
const byAyah: Record<number, number[]> = {};
let danglingPhraseRefs = 0;
for (const [k, ids] of Object.entries(phraseVerses)) {
  const known = ids.filter((id) => phrases[id]);
  danglingPhraseRefs += ids.length - known.length;
  if (known.length) byAyah[ayahIndex(k, 'phrase_verses')] = known;
}
if (danglingPhraseRefs) notes.push(`mutashabihat: dropped ${danglingPhraseRefs} ayah→phrase references to phrases not in phrases.json`);
const mutashabihat: MutashabihatChunk = { phrases, byAyah };

// ---------------------------------------------------------------- hadith

type ApiHadith = { hadithnumber: number; text: string; grades: { name: string; grade: string }[]; reference: { book: number; hadith: number } };
type ApiEdition = { metadata: { name: string; sections: Record<string, string> }; hadiths: ApiHadith[] };
const readHadith = (file: string): ApiEdition => {
  try {
    return JSON.parse(readFileSync(join(HADITH, file), 'utf8'));
  } catch {
    throw new Error(`data-src/hadith/${file} missing or unreadable; run \`npm run data:fetch\``);
  }
};

const unclassifiedGrades = new Map<string, number>();
const hadithChunks: [HadithChunk, HadithArabicChunk][] = HADITH_BOOKS.map((id: HadithBookId) => {
  const eng = readHadith(`eng-${id}.json`);
  const ara = readHadith(`ara-${id}.json`);
  const arByNumber = new Map(ara.hadiths.map((h) => [h.hadithnumber, h.text.trim()]));
  const scholars: string[] = [];
  const scholarIndex = (name: string) => {
    let i = scholars.indexOf(name);
    if (i < 0) i = scholars.push(name) - 1;
    return i;
  };
  const sections: Record<number, string> = {};
  for (const [n, name] of Object.entries(eng.metadata.sections)) sections[Number(n)] = name.trim() || (n === '0' ? 'Introduction' : `Book ${n}`);

  let empty = 0;
  let enOnly = 0;
  let arOnly = 0;
  const hadiths: HadithRow[] = [];
  const arabic: HadithArabicChunk = [];
  for (const h of eng.hadiths) {
    const enText = h.text.trim();
    const arText = arByNumber.get(h.hadithnumber) ?? '';
    if (!enText && !arText) {
      empty++;
      continue;
    }
    if (!arText) enOnly++;
    if (!enText) arOnly++;
    check(sections[h.reference.book] !== undefined, `${id} ${h.hadithnumber}: section ${h.reference.book} not in metadata`);
    const grades = h.grades
      .filter((g) => g.grade.trim() && g.grade.trim() !== '-')
      .map((g): [number, string] => {
        const grade = g.grade.trim();
        if (classifyGrade(grade) === 'other') unclassifiedGrades.set(grade, (unclassifiedGrades.get(grade) ?? 0) + 1);
        return [scholarIndex(g.name.trim()), grade];
      });
    hadiths.push([h.hadithnumber, h.reference.book, enText, grades]);
    arabic.push(arText);
  }
  const numbers = new Set(hadiths.map((h) => h[0]));
  check(numbers.size === hadiths.length, `${id}: duplicate hadith numbers`);
  check(hadiths.length > 3000, `${id}: only ${hadiths.length} hadiths, expected thousands`);
  notes.push(`${id}: ${hadiths.length} hadiths; skipped ${empty} empty numbers; ${enOnly} without Arabic; ${arOnly} without English`);
  return [{ id, name: eng.metadata.name, sections, scholars, hadiths }, arabic];
});
if (unclassifiedGrades.size)
  notes.push(
    `grades not sahih/hasan/daif/mawdu: ${[...unclassifiedGrades]
      .sort((a, b) => b[1] - a[1])
      .map(([g, n]) => `${g} (${n})`)
      .join(', ')}`,
  );

// ---------------------------------------------------------------- write

if (errors.length) {
  console.error(`\n${errors.length} validation error(s):`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const chunks: Record<string, ChunkInfo> = {};
function emit(name: string, data: unknown, items: number): void {
  const json = JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 10);
  const file = `${name}.${hash}.json`;
  writeFileSync(join(OUT, file), json);
  chunks[name] = { file, items, bytes: Buffer.byteLength(json), gzipBytes: gzipSync(json, { level: 9 }).length };
}

emit('quran', quran, AYAH_COUNT);
emit('translit', translitChunk, AYAH_COUNT);
emit('indopak', indopak, AYAH_COUNT);
emit('tafsir', tafsir, AYAH_COUNT);
emit('topics', topicsOut, topicsOut.length);
emit('themes', themes, themes.length);
emit('similar', similar, similarPairs);
emit('mutashabihat', mutashabihat, Object.keys(phrases).length);
for (const [c, arabic] of hadithChunks) {
  emit(`hadith-${c.id}`, c, c.hadiths.length);
  emit(`hadith-${c.id}-ar`, arabic, arabic.length);
}

const sources: Source[] = [
  { name: 'Quran text (Uthmani, IndoPak)', provider: 'Tanzil, via QUL', url: 'https://qul.tarteel.ai/resources/quran-script', license: 'Tanzil terms: verbatim, with attribution to tanzil.net', version: 'QUL download' },
  { name: 'Saheeh International translation', provider: 'Dar Abul-Qasim, via QUL', url: 'https://qul.tarteel.ai/resources/translation', license: '© Saheeh International', version: 'QUL download' },
  { name: 'Transliteration', provider: 'QUL', url: 'https://qul.tarteel.ai/resources/transliteration', license: 'Not stated', version: 'QUL download' },
  { name: 'Abridged Explanation of the Quran (Al-Mukhtasar)', provider: 'Tafsir Center for Quranic Studies, via QUL', url: 'https://qul.tarteel.ai/resources/tafsir', license: 'Not stated', version: 'QUL download' },
  { name: 'Topics, ayah themes, similar ayahs, mutashabihat', provider: 'QUL', url: 'https://qul.tarteel.ai/resources', license: 'Not stated', version: 'QUL download' },
  { name: 'Hadith (six books, English + Arabic, gradings)', provider: 'fawazahmed0/hadith-api', url: 'https://github.com/fawazahmed0/hadith-api', license: 'Unlicense', version: HADITH_API_COMMIT },
];
const manifest: Manifest = { version: 1, built: new Date().toISOString(), chunks, sources };
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// ---------------------------------------------------------------- report

const kb = (n: number) => `${(n / 1024).toFixed(0).padStart(6)} KB`;
console.log('\nchunk                  items        raw    gzipped');
for (const [name, c] of Object.entries(chunks)) console.log(`${name.padEnd(20)} ${String(c.items).padStart(7)} ${kb(c.bytes)} ${kb(c.gzipBytes)}`);
const total = Object.values(chunks).reduce((a, c) => [a[0]! + c.bytes, a[1]! + c.gzipBytes], [0, 0]);
console.log(`${'total'.padEnd(28)} ${kb(total[0]!)} ${kb(total[1]!)}`);
console.log('\nnotes:');
for (const n of notes) console.log(`  - ${n}`);
