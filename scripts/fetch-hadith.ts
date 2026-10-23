// Downloads the six hadith books (English + Arabic with diacritics) from fawazahmed0/hadith-api
// at a pinned commit into data-src/hadith/. Existing files are kept unless --force is passed.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HADITH_BOOKS } from '../src/lib/data/types.ts';
import { HADITH_API_COMMIT } from './sources.ts';

const BASE = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@${HADITH_API_COMMIT}/editions`;
const OUT = join(import.meta.dirname, '..', 'data-src', 'hadith');
const force = process.argv.includes('--force');

async function download(url: string, attempts = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i >= attempts) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

mkdirSync(OUT, { recursive: true });
const jobs = HADITH_BOOKS.flatMap((book) =>
  (['eng', 'ara'] as const).map(async (lang) => {
    const file = join(OUT, `${lang}-${book}.json`);
    if (existsSync(file) && !force) return console.log(`kept       ${lang}-${book}`);
    const text = await download(`${BASE}/${lang}-${book}.min.json`);
    JSON.parse(text); // fail early on a truncated download
    writeFileSync(file, text);
    console.log(`downloaded ${lang}-${book} (${(text.length / 1e6).toFixed(1)} MB)`);
  }),
);
await Promise.all(jobs);
writeFileSync(join(OUT, 'SOURCE.json'), JSON.stringify({ repo: 'fawazahmed0/hadith-api', commit: HADITH_API_COMMIT }, null, 2));
