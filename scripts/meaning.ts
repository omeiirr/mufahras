// Search by meaning, build side: the pinned model, where its files live, and how each text is built for
// embedding. The recipe must match eval/meaning-vectors.ipynb, which made data-src/vectors/; a text whose
// hash no longer matches is re-embedded by build-meaning.ts.
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { HadithRow, QuranChunk, TafsirChunk } from '../src/lib/data/types.ts';

export const ROOT = join(import.meta.dirname, '..');

export const MODEL = {
  id: 'Snowflake/snowflake-arctic-embed-s',
  revision: 'e596f507467533e48a2e17c007f0e1dacc837b33',
  /** Served from /models/<dir>/; the revision in the name means a new model never meets an old cache. */
  dir: 'arctic-embed-s-e596f50',
  queryPrefix: 'Represent this sentence for searching relevant passages: ',
  files: [
    { path: 'onnx/model_quantized.onnx', bytes: 34015111, sha256: 'f93ff225320628d2e88baf2a395cae791b0e3b27edf5c70bf7b312a4d3260c14' },
    { path: 'tokenizer.json', bytes: 711649, sha256: '91f1def9b9391fdabe028cd3f3fcc4efd34e5d1f08c3bf2de513ebb5911a1854' },
    { path: 'tokenizer_config.json', bytes: 1433, sha256: '9ca59277519f6e3692c8685e26b94d4afca2d5438deff66483db495e48735810' },
  ],
} as const;

/** Downloaded model files (fetch-model.ts); not committed. */
export const MODEL_DIR = join(ROOT, 'data-src', 'model', MODEL.dir);
/** Committed vectors and their index (see data-src/vectors/README.md). */
export const VECTORS_DIR = join(ROOT, 'data-src', 'vectors');
export const VECTORS_FILE = 'arctic-s.q8.i8';
export const RECIPE = 1;

export interface VectorIndex {
  model: string;
  revision: string;
  dims: number;
  recipe: number;
  count: number;
  scale: { q8: number };
  refs: string[];
  hashes: string[];
}

// Same cleaning as the notebook: footnote markers out, whitespace collapsed.
const clean = (t: string) =>
  t
    .replace(/[¹²³⁰-₟]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Recipe 1, verse: translation, a space, its Al-Mukhtasar explanation (a group shares its head's). */
export function verseText(quran: QuranChunk, tafsir: TafsirChunk, i: number): string {
  let t = tafsir.text[i];
  if (typeof t === 'number') t = tafsir.text[t];
  return `${clean(quran.en[i]!)} ${clean(typeof t === 'string' ? t : '')}`.trim();
}

/** Recipe 1, hadith: the English as is. Rows without English get no vector. */
export const hadithText = (row: HadithRow): string => clean(row[2]);

export const textHash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 12);
