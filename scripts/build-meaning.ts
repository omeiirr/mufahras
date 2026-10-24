// Search by meaning: turns the committed vectors (data-src/vectors/) into the app's chunks, after
// build-data.ts has written public/data/. Each text is rebuilt with the recipe in meaning.ts and its hash
// compared with the committed one; texts that changed (or are new) are re-embedded here with the same
// 8-bit model the app runs. Also copies the model files to public/models/.
//
// Output, listed in manifest.json:
//   meaning          layout: model folder, query prefix, scale, which hadith rows have vectors
//   meaning-vectors  int8 vectors, verses in index order, then each book's rows that have English
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as ort from 'onnxruntime-web/wasm';
import { HADITH_BOOKS, type HadithChunk, type Manifest, type MeaningChunk, type QuranChunk, type TafsirChunk } from '../src/lib/data/types.ts';
import { Embedder } from '../src/lib/meaning/embed.ts';
import { hadithText, MODEL, MODEL_DIR, RECIPE, ROOT, textHash, VECTORS_DIR, VECTORS_FILE, verseText, type VectorIndex } from './meaning.ts';

const DATA = join(ROOT, 'public', 'data');
const MODELS = join(ROOT, 'public', 'models');
const ORT_WASM = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist', 'ort-wasm-simd-threaded.wasm');
const manifest: Manifest = JSON.parse(readFileSync(join(DATA, 'manifest.json'), 'utf8'));
const chunk = <T>(name: string): T => JSON.parse(readFileSync(join(DATA, manifest.chunks[name]!.file), 'utf8'));

const index: VectorIndex = JSON.parse(readFileSync(join(VECTORS_DIR, 'index.json'), 'utf8'));
if (index.model !== MODEL.id || index.revision !== MODEL.revision || index.recipe !== RECIPE)
  throw new Error(`data-src/vectors/ was made with ${index.model}@${index.revision} recipe ${index.recipe}; expected ${MODEL.id}@${MODEL.revision} recipe ${RECIPE}. Regenerate it with eval/meaning-vectors.ipynb.`);
const stored = new Int8Array(readFileSync(join(VECTORS_DIR, VECTORS_FILE)).buffer.slice(0));
const dims = index.dims;
if (stored.length !== index.count * dims) throw new Error(`${VECTORS_FILE}: ${stored.length} bytes, expected ${index.count} × ${dims}`);
const storedRow = new Map(index.refs.map((r, i) => [r, i]));

for (const f of MODEL.files)
  if (!existsSync(join(MODEL_DIR, f.path))) throw new Error(`data-src/model/${MODEL.dir}/${f.path} missing; run \`npm run data:fetch\``);

// ---- the texts, in app order

const quran = chunk<QuranChunk>('quran');
const tafsir = chunk<TafsirChunk>('tafsir');
const texts: { ref: string; text: string }[] = [];
for (const s of quran.surahs) for (let a = 1; a <= s.count; a++) texts.push({ ref: `${s.n}:${a}`, text: verseText(quran, tafsir, s.start + a - 1) });
const books: MeaningChunk['books'] = [];
for (const id of HADITH_BOOKS) {
  const skip: number[] = [];
  const rows = chunk<HadithChunk>(`hadith-${id}`).hadiths;
  rows.forEach((row, r) => {
    const text = hadithText(row);
    if (text) texts.push({ ref: `${id} ${row[0]}`, text });
    else skip.push(r);
  });
  books.push([id, rows.length, skip]);
}

// ---- vectors: committed where the text is unchanged, re-embedded where it isn't

const out = new Int8Array(texts.length * dims);
const stale: number[] = [];
texts.forEach(({ ref, text }, i) => {
  const at = storedRow.get(ref);
  if (at !== undefined && index.hashes[at] === textHash(text)) out.set(stored.subarray(at * dims, (at + 1) * dims), i * dims);
  else stale.push(i);
});
if (stale.length) {
  console.log(`meaning: re-embedding ${stale.length} changed or new texts (${stale.slice(0, 5).map((i) => texts[i]!.ref).join(', ')}${stale.length > 5 ? ', …' : ''})`);
  ort.env.wasm.wasmBinary = readFileSync(ORT_WASM);
  ort.env.wasm.numThreads = 1;
  const file = (p: string) => readFileSync(join(MODEL_DIR, p));
  const embedder = await Embedder.create(ort, file('onnx/model_quantized.onnx'), JSON.parse(file('tokenizer.json').toString()), JSON.parse(file('tokenizer_config.json').toString()));
  for (const i of stale) {
    const v = await embedder.embed(texts[i]!.text);
    for (let j = 0; j < dims; j++) out[i * dims + j] = Math.max(-127, Math.min(127, Math.round(v[j]! * index.scale.q8)));
  }
}

// ---- write

function emit(name: string, bytes: Uint8Array, ext: string, items: number): void {
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const file = `${name}.${hash}.${ext}`;
  writeFileSync(join(DATA, file), bytes);
  manifest.chunks[name] = { file, items, bytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length };
}

rmSync(MODELS, { recursive: true, force: true });
for (const f of MODEL.files) {
  const dest = join(MODELS, MODEL.dir, f.path);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(MODEL_DIR, f.path), dest);
}
// ONNX Runtime's WebAssembly is emitted by Vite (the worker imports it); its size is for download progress.
const runtime = readFileSync(ORT_WASM);

const meta: MeaningChunk = {
  model: { dir: MODEL.dir, files: MODEL.files.map((f) => [f.path, f.bytes]), runtime: runtime.length },
  queryPrefix: MODEL.queryPrefix,
  dims,
  scale: index.scale.q8,
  quran: quran.en.length,
  books,
};
emit('meaning-vectors', new Uint8Array(out.buffer), 'bin', texts.length);
emit('meaning', new TextEncoder().encode(JSON.stringify(meta)), 'json', texts.length);
manifest.sources.push({
  name: 'Search-by-meaning model (snowflake-arctic-embed-s, 8-bit ONNX)',
  provider: 'Snowflake, via Hugging Face',
  url: `https://huggingface.co/${MODEL.id}`,
  license: 'Apache 2.0',
  version: MODEL.revision,
});
writeFileSync(join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2));

const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const modelBytes = MODEL.files.reduce((n, f) => n + f.bytes, 0);
console.log(`meaning: ${texts.length} vectors (${texts.length - stale.length} committed, ${stale.length} re-embedded), ${mb(out.length)}; model ${mb(modelBytes)} in public/models/, runtime ${mb(runtime.length)}`);
