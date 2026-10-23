// Every alias must resolve, and its target must contain the text it's named after.
import { describe, expect, it } from 'vitest';
import { ALIASES } from '../src/lib/search/aliases';
import { dataBuilt, loadEngine } from './load';

// What the target's English must contain, so a numbering mistake can't slip through.
const EXPECT: Record<string, RegExp> = {
  'Ayat al-Kursi': /no deity except Him, the Ever-Living/,
  'Last two verses of Al-Baqarah': /The Messenger has believed/,
  'Ayat an-Nur': /Light/,
  'Dua of Yunus': /man of the fish/,
  'Rabbana atina': /Our Lord, give us in this world/,
  Hasbunallah: /Sufficient for us is Allāh/,
  Hasbiyallah: /Sufficient for me is Allāh/,
  'Inna lillahi': /Indeed we belong to Allāh/,
  'Rabbi zidni ilma': /increase me in knowledge/,
  'Dua of Musa': /expand .*my breast/,
  'The verse of debt': /contract a debt/,
  'Last verses of Al-Hashr': /He is Allāh, other than whom there is no deity/,
  '"I am near"': /I am near/,
  '"Do not despair of the mercy of Allah"': /do not despair of the mercy of Allāh/,
  'Kindness to parents': /to parents, good treatment/,
  'Hadith of intentions': /intention/,
  'Hadith of Jibril': /Gabriel/,
  'Islam is built on five': /Islam is based on .*five/,
  'The religion is sincerity': /Religion is sincerity/,
  'Be mindful of Allah': /Be mindful of Allah/,
  'Speak good or remain silent': /good or keep (quiet|silent)/,
  'The strong one controls himself': /strong is the one who controls himself/,
  'Love for your brother': /wishes for his .*brother/,
};

describe.runIf(dataBuilt)('aliases', () => {
  const engine = loadEngine();

  it.each(ALIASES.flatMap((a) => a.spellings.map((s) => [s, a.name] as const)))('%s → %s', (spelling, name) => {
    const r = engine.search(spelling);
    expect(r.pinned.map((h) => h.label)).toEqual([name]);
  });

  it.each(ALIASES.filter((a) => a.target.kind !== 'surah').map((a) => [a.name, a] as const))('%s points at the right text', (name, a) => {
    const t = a.target;
    const d = engine.detail(t.kind === 'hadith' ? { kind: 'hadith', book: t.book, number: t.number } : { kind: 'ayah', surah: t.surah, ayah: t.kind === 'ayah' ? t.ayah : 1 });
    expect(d, name).not.toBeNull();
    expect(d!.kind === 'ayah' || d!.kind === 'hadith' ? d!.en : '').toMatch(EXPECT[name]!);
  });

  it('accepts spelling variants and ignores case', () => {
    for (const q of ['Ayat al-Kursi', 'AYATUL KURSI', 'ayatulkursi', 'aayatul kursi', 'surah tabarak']) expect(engine.search(q).pinned[0]?.label, q).toBeTruthy();
  });

  it("doesn't pin ordinary searches", () => {
    for (const q of ['patience', 'allah', 'kursi', 'prayer']) expect(engine.search(q).pinned, q).toEqual([]);
  });
});
