// Ranks every stored vector against a query vector. The vectors are int8 (data-src/vectors/README.md);
// the query is rounded to int8 too, with its own scale, which doesn't change the order. Scoring uses the
// WebAssembly SIMD module in dot.wat when the browser supports it, plain JS otherwise.
import { DOT_WASM } from './dot.wasm';

export interface Scored {
  /** Row in the vector file. */
  index: number;
  /** Cosine similarity, approximately (int8 rounding). */
  score: number;
}

/** The query as int8, scaled so its largest component is ±127; returns the scale used. */
export function quantizeQuery(q: Float32Array): { q8: Int8Array; scale: number } {
  let max = 0;
  for (const x of q) max = Math.max(max, Math.abs(x));
  const scale = max ? 127 / max : 1;
  return { q8: Int8Array.from(q, (x) => Math.round(x * scale)), scale };
}

export class Scorer {
  readonly count: number;
  private wasm?: { memory: WebAssembly.Memory; scores: (vecs: number, n: number, dims: number, q: number, out: number) => void };
  private qAt = 0;
  private outAt = 0;

  /** vectors: count × dims int8 values; vectorScale: int8 value = round(float × vectorScale). */
  constructor(
    private vectors: Int8Array,
    private dims: number,
    private vectorScale: number,
    simd = true,
  ) {
    this.count = vectors.length / dims;
    if (simd) this.wasm = this.instantiate();
  }

  get simd(): boolean {
    return !!this.wasm;
  }

  private instantiate(): Scorer['wasm'] {
    const bytes = Uint8Array.from(atob(DOT_WASM), (c) => c.charCodeAt(0));
    if (!WebAssembly.validate(bytes)) return undefined; // no SIMD in this browser
    const { exports } = new WebAssembly.Instance(new WebAssembly.Module(bytes));
    const memory = exports.memory as WebAssembly.Memory;
    // Layout: vectors at 0, then the query, then one int32 score per vector.
    this.qAt = this.vectors.length;
    this.outAt = Math.ceil((this.qAt + this.dims) / 4) * 4;
    const need = this.outAt + this.count * 4;
    memory.grow(Math.ceil(Math.max(0, need - memory.buffer.byteLength) / 65536));
    new Int8Array(memory.buffer, 0, this.vectors.length).set(this.vectors);
    this.vectors = new Int8Array(memory.buffer, 0, this.vectors.length); // the copy in wasm memory is the only one kept
    return { memory, scores: exports.scores as NonNullable<Scorer['wasm']>['scores'] };
  }

  /** Raw int8 dot products, one per vector. */
  dots(q8: Int8Array): Int32Array {
    if (this.wasm) {
      const { memory, scores } = this.wasm;
      new Int8Array(memory.buffer, this.qAt, this.dims).set(q8);
      scores(0, this.count, this.dims, this.qAt, this.outAt);
      return new Int32Array(memory.buffer, this.outAt, this.count);
    }
    const out = new Int32Array(this.count);
    const v = this.vectors;
    const d = this.dims;
    for (let i = 0, o = 0; i < this.count; i++, o += d) {
      let acc = 0;
      for (let j = 0; j < d; j++) acc += v[o + j]! * q8[j]!;
      out[i] = acc;
    }
    return out;
  }

  /** The k best rows for a unit-length query vector, best first. */
  top(query: Float32Array, k: number): Scored[] {
    const { q8, scale } = quantizeQuery(query);
    const dots = this.dots(q8);
    // Keep the k best in a small sorted array; 40,000 rows, k ≈ 30, so this beats sorting everything.
    const best: number[] = [];
    for (let i = 0; i < dots.length; i++) {
      const s = dots[i]!;
      if (best.length === k && s <= dots[best[k - 1]!]!) continue;
      let at = best.length;
      while (at > 0 && dots[best[at - 1]!]! < s) at--;
      best.splice(at, 0, i);
      if (best.length > k) best.pop();
    }
    return best.map((index) => ({ index, score: dots[index]! / (scale * this.vectorScale) }));
  }
}
