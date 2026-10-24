// Search by meaning: the scoring module, the vector layout, and the evaluation set as a gate. The gate
// runs the real 8-bit model (from data-src/model/, `npm run data:fetch`) on eval/meaning-queries.json
// against the built vectors, the way the app does, and fails if quality drops.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ort from 'onnxruntime-web/wasm';
import { describe, expect, it } from 'vitest';
import { compileDot } from '../scripts/build-wasm';
import { hadithText, MODEL, MODEL_DIR, textHash, VECTORS_DIR, verseText, type VectorIndex } from '../scripts/meaning';
import { HADITH_BOOKS, type HadithChunk, type Manifest, type MeaningChunk, type QuranChunk, type TafsirChunk } from '../src/lib/data/types';
import { DOT_WASM } from '../src/lib/meaning/dot.wasm';
import { Embedder } from '../src/lib/meaning/embed';
import { refOfRow } from '../src/lib/meaning/rows';
import { quantizeQuery, Scorer } from '../src/lib/meaning/score';
import { dataBuilt, loadChunk } from './load';

const ROOT = join(import.meta.dirname, '..');

describe('meaning scorer', () => {
  it('dot.wasm.ts is compiled from the current dot.wat (run `npm run wasm`)', async () => {
    expect(await compileDot()).toBe(DOT_WASM);
  });

  it('WebAssembly SIMD and plain JS rank the same', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const dims = 384;
    const vectors = Int8Array.from({ length: 2000 * dims }, () => Math.round(rand() * 127));
    const query = Float32Array.from({ length: dims }, rand);
    const simd = new Scorer(vectors.slice(), dims, 127);
    const js = new Scorer(vectors.slice(), dims, 127, false);
    expect(simd.simd).toBe(true);
    expect(simd.top(query, 30)).toEqual(js.top(query, 30));
    // and the dot products are exact
    const { q8 } = quantizeQuery(query);
    let want = 0;
    for (let j = 0; j < dims; j++) want += vectors[5 * dims + j]! * q8[j]!;
    expect(simd.dots(q8)[5]).toBe(want);
  });
});

describe.runIf(dataBuilt)('meaning vectors', () => {
  const manifest: Manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'manifest.json'), 'utf8'));
  const meta = loadChunk<MeaningChunk>('meaning');
  const quran = loadChunk<QuranChunk>('quran');
  const books = Object.fromEntries(HADITH_BOOKS.map((b) => [b, loadChunk<HadithChunk>(`hadith-${b}`)]));
  const vectors = new Int8Array(readFileSync(join(ROOT, 'public', 'data', manifest.chunks['meaning-vectors']!.file)).buffer.slice(0));
  const rows = vectors.length / meta.dims;

  /** Row → the reference style of the evaluation set ("2:255", "bukhari 13"). */
  const refName = (row: number): string => {
    const ref = refOfRow(meta, row);
    if (ref.kind === 'ayah') {
      const s = quran.surahs.find((x) => ref.i >= x.start && ref.i < x.start + x.count)!;
      return `${s.n}:${ref.i - s.start + 1}`;
    }
    return `${ref.book} ${books[ref.book]!.hadiths[ref.row]![0]}`;
  };

  it('has one vector per verse and per hadith with English, in the layout the app reads', () => {
    const hadithRows = HADITH_BOOKS.reduce((n, b) => n + books[b]!.hadiths.filter((h) => hadithText(h)).length, 0);
    expect(rows).toBe(quran.en.length + hadithRows);
    expect(meta.books.map(([b, n]) => [b, n])).toEqual(HADITH_BOOKS.map((b) => [b, books[b]!.hadiths.length]));
    expect(refName(0)).toBe('1:1');
    expect(refName(quran.en.length)).toBe(`bukhari ${books.bukhari!.hadiths[0]![0]}`);
    expect(refName(rows - 1)).toMatch(/^ibnmajah \d/);
  });

  it('was built from the committed vectors: the texts still match what was embedded', () => {
    const index: VectorIndex = JSON.parse(readFileSync(join(VECTORS_DIR, 'index.json'), 'utf8'));
    const tafsir = loadChunk<TafsirChunk>('tafsir');
    const hashOf = new Map(index.refs.map((r, i) => [r, index.hashes[i]]));
    let changed = 0;
    for (let row = 0; row < rows; row++) {
      const ref = refOfRow(meta, row);
      const text = ref.kind === 'ayah' ? verseText(quran, tafsir, ref.i) : hadithText(books[ref.book]!.hadiths[ref.row]!);
      if (hashOf.get(refName(row)) !== textHash(text)) changed++;
    }
    // A few changed texts are re-embedded by the build; many mean the recipe drifted from the notebook's.
    expect(changed, `${changed} texts differ from the ones embedded in data-src/vectors/`).toBeLessThan(rows * 0.01);
  });

  describe.runIf(existsSync(join(MODEL_DIR, MODEL.files[0].path)))('evaluation set', () => {
    it('finds an accepted answer in the top 10 for most queries', { timeout: 120_000 }, async () => {
      ort.env.wasm.wasmBinary = readFileSync(join(ROOT, 'node_modules', 'onnxruntime-web', 'dist', 'ort-wasm-simd-threaded.wasm'));
      ort.env.wasm.numThreads = 1;
      const file = (p: string) => readFileSync(join(MODEL_DIR, p));
      const embedder = await Embedder.create(ort, file('onnx/model_quantized.onnx'), JSON.parse(file('tokenizer.json').toString()), JSON.parse(file('tokenizer_config.json').toString()));
      const scorer = new Scorer(vectors, meta.dims, meta.scale);
      const queries: { query: string; kind: string; expect: Record<string, string[]>; also?: Record<string, string[]> }[] = JSON.parse(
        readFileSync(join(ROOT, 'eval', 'meaning-queries.json'), 'utf8'),
      );
      let hit = 0;
      let strict = 0;
      let rr = 0;
      const misses: string[] = [];
      const t0 = performance.now();
      for (const q of queries) {
        const top = scorer.top(await embedder.embed(meta.queryPrefix + q.query), 10).map((s) => refName(s.index));
        const first = top.findIndex((r) => r in q.expect || r in (q.also ?? {}));
        if (first >= 0) {
          hit++;
          rr += 1 / (first + 1);
        } else misses.push(q.query);
        if (top.some((r) => r in q.expect)) strict++;
      }
      const n = queries.length;
      const ms = (performance.now() - t0) / n;
      console.log(
        `\nmeaning evaluation: hit@10 ${Math.round((100 * hit) / n)}%, strict ${Math.round((100 * strict) / n)}%, MRR ${(rr / n).toFixed(2)}; ${ms.toFixed(0)} ms per query\n  missed: ${misses.join(' | ')}`,
      );
      // Measured 2026-10-24: 90% / 73% / 0.61 (eval/meaning-vectors.ipynb). Some slack for runtime differences.
      expect(hit / n).toBeGreaterThanOrEqual(0.85);
      expect(strict / n).toBeGreaterThanOrEqual(0.68);
    });
  });
});
