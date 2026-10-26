// Loads the generated chunks from public/data/ into a SearchEngine, for tests.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HADITH_BOOKS, type Manifest } from '../src/lib/data/types';
import { SearchEngine } from '../src/lib/search/engine';

const DIR = join(import.meta.dirname, '..', 'public', 'data');
export const dataBuilt = existsSync(join(DIR, 'manifest.json'));

export function loadChunk<T>(name: string): T {
  const manifest: Manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
  return JSON.parse(readFileSync(join(DIR, manifest.chunks[name]!.file), 'utf8'));
}

export function loadEngine(): SearchEngine {
  const engine = new SearchEngine();
  engine.addQuran(loadChunk('quran'));
  engine.addTranslit(loadChunk('translit'));
  engine.addTafsir(loadChunk('tafsir'));
  engine.addThemes(loadChunk('themes'));
  engine.addTopics(loadChunk('topics'));
  engine.addSimilar(loadChunk('similar'));
  engine.addMutashabihat(loadChunk('mutashabihat'));
  engine.addGraph(loadChunk('graph'));
  engine.addWords(loadChunk('words'));
  engine.addNamesOfAllah(loadChunk('names-of-allah'));
  engine.addMushaf(loadChunk('mushaf'));
  for (const book of HADITH_BOOKS) {
    engine.addHadith(loadChunk(`hadith-${book}`));
    engine.addHadithArabic(book, loadChunk(`hadith-${book}-ar`));
  }
  return engine;
}
