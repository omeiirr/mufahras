// Turns a text into its search-by-meaning vector: tokenize, run the 8-bit ONNX model, take the first
// token's output (CLS pooling), normalize. Shared by the meaning worker and the data build, so the two
// compute vectors the same way. One text per run: the 8-bit model scales each run's values together, so
// batching would shift every vector slightly (see data-src/vectors/README.md).
import { Tokenizer } from '@huggingface/tokenizers';
import type * as Ort from 'onnxruntime-web';

/** Longer texts are cut to this many tokens, special tokens included, as when the vectors were built. */
export const MAX_TOKENS = 256;

export class Embedder {
  private constructor(
    private ort: typeof Ort,
    private session: Ort.InferenceSession,
    private tokenizer: Tokenizer,
  ) {}

  static async create(ort: typeof Ort, model: Uint8Array, tokenizerJson: object, tokenizerConfig: object): Promise<Embedder> {
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    return new Embedder(ort, session, new Tokenizer(tokenizerJson, tokenizerConfig));
  }

  /** Token ids with [CLS] … [SEP], truncated like the Python tokenizer: the first tokens, then [SEP]. */
  tokens(text: string): number[] {
    const ids = this.tokenizer.encode(text).ids;
    return ids.length > MAX_TOKENS ? [...ids.slice(0, MAX_TOKENS - 1), ids[ids.length - 1]!] : ids;
  }

  async embed(text: string): Promise<Float32Array> {
    const ids = this.tokens(text);
    const tensor = (fill: (i: number) => number) =>
      new this.ort.Tensor('int64', BigInt64Array.from({ length: ids.length }, (_, i) => BigInt(fill(i))), [1, ids.length]);
    const feeds: Record<string, Ort.Tensor> = { input_ids: tensor((i) => ids[i]!), attention_mask: tensor(() => 1) };
    if (this.session.inputNames.includes('token_type_ids')) feeds.token_type_ids = tensor(() => 0);
    const out = await this.session.run(feeds);
    const hidden = out[this.session.outputNames[0]!]!;
    const dims = hidden.dims[2]!;
    const cls = Float32Array.from((hidden.data as Float32Array).subarray(0, dims));
    for (const t of Object.values(out)) t.dispose();
    let norm = 0;
    for (const x of cls) norm += x * x;
    norm = Math.sqrt(norm);
    for (let i = 0; i < dims; i++) cls[i]! /= norm;
    return cls;
  }
}
