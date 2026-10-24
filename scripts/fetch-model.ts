// Downloads the search-by-meaning model files at the pinned revision into data-src/model/, checking
// each file's size and SHA-256. Files already present and correct are kept.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MODEL, MODEL_DIR } from './meaning.ts';

const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

for (const f of MODEL.files) {
  const dest = join(MODEL_DIR, f.path);
  if (existsSync(dest) && sha256(readFileSync(dest)) === f.sha256) continue;
  const url = `https://huggingface.co/${MODEL.id}/resolve/${MODEL.revision}/${f.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const got = sha256(bytes);
  if (bytes.length !== f.bytes || got !== f.sha256) throw new Error(`${f.path}: expected ${f.bytes} bytes, sha256 ${f.sha256}; got ${bytes.length}, ${got}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
  console.log(`model: ${f.path} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
console.log(`model: ${MODEL.id} @ ${MODEL.revision.slice(0, 7)} ready in data-src/model/`);
