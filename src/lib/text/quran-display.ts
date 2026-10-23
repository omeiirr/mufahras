// Line-breaking fixes for displaying Uthmani text. Both keep the string length, so highlight
// ranges computed on the original text stay valid.

/** In the text, pause marks (ۖ ۗ ۘ ۙ ۚ ۛ ۜ) are separate tokens after a space; join them to the word before. */
export function attachPauseMarks(ar: string): string {
  return ar.replace(/ (?=[ۖ-ۜ])/g, ' ');
}

/** Splits off the last word so it can be kept on one line with the ayah-number marker. */
export function splitLastWord(ar: string): [string, string] {
  const text = attachPauseMarks(ar);
  const at = text.lastIndexOf(' ');
  return at < 0 ? ['', text] : [text.slice(0, at + 1), text.slice(at + 1)];
}
