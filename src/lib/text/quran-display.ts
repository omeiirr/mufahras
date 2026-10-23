// Helpers for displaying Uthmani text. The build joins QUL's words with plain spaces and writes any
// space inside a word (before a pause mark, after the rub el-hizb sign U+06DE, in a split word) as a no-break space, so a plain
// space always separates two QUL words and marks never wrap away from their word.

/** Splits off the last word so it can be kept on one line with the ayah-number marker. */
export function splitLastWord(ar: string): [string, string] {
  const at = ar.lastIndexOf(' ');
  return at < 0 ? ['', ar] : [ar.slice(0, at + 1), ar.slice(at + 1)];
}

/** Character spans of each QUL word in an ayah's Arabic; QUL's word numbers (1-based) index this array. */
export function wordSpans(ar: string): [number, number][] {
  const spans: [number, number][] = [];
  for (let start = 0; start <= ar.length; ) {
    const end = ar.indexOf(' ', start);
    const stop = end < 0 ? ar.length : end;
    if (stop > start) spans.push([start, stop]);
    start = stop + 1;
  }
  return spans;
}

/** Converts QUL word ranges (1-based, inclusive) to character ranges in the ayah's Arabic. */
export function wordRangesToChars(ar: string, ranges: [number, number][]): [number, number][] {
  const spans = wordSpans(ar);
  return ranges.flatMap(([from, to]) => {
    const a = spans[from - 1];
    const b = spans[Math.min(to, spans.length) - 1];
    return a && b ? [[a[0], b[1]] as [number, number]] : [];
  });
}
