// WCAG contrast of the colour tokens, for every theme. Text pairs need 4.5:1; focus rings and
// borders that carry meaning need 3:1.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(import.meta.dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}
function theme(name: string): Record<string, string> {
  const start = css.indexOf(`:root[data-theme='${name}']`);
  return tokens(css.slice(start, css.indexOf('}', start)));
}
const THEMES = ['paper', 'sepia', 'dusk', 'night'];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const TEXT: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['ink', 'mark'],
  ['ink', 'accent-soft'],
  ['ink-2', 'bg'],
  ['ink-2', 'surface'],
  ['ink-2', 'surface-2'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['accent-ink', 'accent'],
  ['sahih', 'surface'],
  ['hasan', 'surface'],
  ['daif', 'surface'],
  ['other', 'surface'],
  ['sahih', 'bg'],
  ['hasan', 'bg'],
  ['daif', 'bg'],
];
const UI: [string, string][] = [
  ['focus', 'bg'],
  ['focus', 'surface'],
];

describe.each(THEMES.map((n) => [n, theme(n)] as const))('%s theme', (_, t) => {
  it.each(TEXT)('text %s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(UI)('%s on %s ≥ 3', (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3);
  });
  it('defines every token', () => {
    expect(Object.keys(t).sort()).toEqual(Object.keys(theme('paper')).sort());
  });
});
