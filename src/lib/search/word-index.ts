// Inverted index over one segment's normalized texts: each unique word → the documents containing it.
// Term matching (exact, typo, abbreviation) runs once per term over a Vocabulary shared by all
// segments of the same script; each segment then looks up postings for the matched words.

export class WordIndex {
  private postingsByWord = new Map<string, Uint32Array>();
  /** Normalized text length per document, for the length penalty. */
  readonly lengths: Uint32Array;

  constructor(texts: string[]) {
    const byWord = new Map<string, number[]>();
    this.lengths = new Uint32Array(texts.length);
    texts.forEach((text, doc) => {
      this.lengths[doc] = text.length;
      if (!text) return;
      for (const w of text.split(' ')) {
        let list = byWord.get(w);
        if (!list) byWord.set(w, (list = []));
        if (list[list.length - 1] !== doc) list.push(doc);
      }
    });
    for (const [w, docs] of byWord) this.postingsByWord.set(w, Uint32Array.from(docs));
  }

  get size(): number {
    return this.lengths.length;
  }

  words(): IterableIterator<string> {
    return this.postingsByWord.keys();
  }

  /** Documents containing word (ascending, unique), or undefined if none. */
  postings(word: string): Uint32Array | undefined {
    return this.postingsByWord.get(word);
  }
}

/** Sorted unique words of several indexes. */
export class Vocabulary {
  readonly words: string[];

  constructor(indexes: WordIndex[]) {
    const all = new Set<string>();
    for (const ix of indexes) for (const w of ix.words()) all.add(w);
    this.words = [...all].sort();
  }

  /** Words starting with prefix (binary search). */
  withPrefix(prefix: string): string[] {
    let lo = 0;
    let hi = this.words.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.words[mid]! < prefix) lo = mid + 1;
      else hi = mid;
    }
    const out: string[] = [];
    for (let i = lo; i < this.words.length && this.words[i]!.startsWith(prefix); i++) out.push(this.words[i]!);
    return out;
  }

  containing(sub: string): string[] {
    return this.words.filter((w) => w.includes(sub));
  }
}
