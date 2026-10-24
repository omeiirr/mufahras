// Compiles src/lib/meaning/dot.wat into dot.wasm.ts (the module as base64, a few hundred bytes), so the
// app needs no wasm loader. Run after editing the .wat; a test checks the two are in step.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import wabt from 'wabt';

const DIR = join(import.meta.dirname, '..', 'src', 'lib', 'meaning');

export async function compileDot(): Promise<string> {
  const w = await wabt();
  const mod = w.parseWat('dot.wat', readFileSync(join(DIR, 'dot.wat'), 'utf8'), { simd: true });
  const { buffer } = mod.toBinary({});
  mod.destroy();
  return Buffer.from(buffer).toString('base64');
}

export const dotModuleSource = (b64: string) =>
  `// Generated from dot.wat by scripts/build-wasm.ts; do not edit.\nexport const DOT_WASM = '${b64}';\n`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const b64 = await compileDot();
  writeFileSync(join(DIR, 'dot.wasm.ts'), dotModuleSource(b64));
  console.log(`dot.wasm.ts: ${Buffer.from(b64, 'base64').length} bytes`);
}
