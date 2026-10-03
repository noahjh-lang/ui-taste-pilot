// Bundle-size budget for the static export (run after `npm run build`).
// The authenticated app is used heavily on mobile web, where JS size drives
// time-to-interactive, so CI fails if these budgets are exceeded.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = {
  /** All JavaScript, gzipped, including lazily loaded chunks. */
  total: 650,
  /** Any single chunk, gzipped. */
  largestChunk: 150,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const chunksDir = path.resolve(here, '../out/_next/static/chunks');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.js') ? [full] : [];
  });
}

const sizes = walk(chunksDir)
  .map((file) => ({
    file: path.relative(chunksDir, file),
    kb: gzipSync(readFileSync(file)).length / 1024,
  }))
  .sort((a, b) => b.kb - a.kb);
const total = sizes.reduce((s, x) => s + x.kb, 0);
const largest = sizes[0];

console.log(`JS total (gzip): ${total.toFixed(1)} KB / budget ${BUDGET_KB.total} KB`);
console.log(
  `Largest chunk:   ${largest?.kb.toFixed(1)} KB (${largest?.file}) / budget ${BUDGET_KB.largestChunk} KB`,
);
console.log('Top chunks:');
for (const s of sizes.slice(0, 5)) console.log(`  ${s.kb.toFixed(1).padStart(7)} KB  ${s.file}`);

const failures = [];
if (total > BUDGET_KB.total) failures.push('total JS');
if (largest && largest.kb > BUDGET_KB.largestChunk) failures.push('largest chunk');
if (failures.length) {
  console.error(`\nBundle budget exceeded: ${failures.join(', ')}`);
  process.exit(1);
}
