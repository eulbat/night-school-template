// Converts the artifact's per-user progress (exported with ArtifactData `list`
// + `out_dir`) into progress/reviews.json, which next.mjs reads for weak concepts.
//   node scripts/import-progress.mjs <out_dir>
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { REVIEWS } from './common.mjs';

const root = process.argv[2];
if (!root) {
  console.error('usage: node scripts/import-progress.mjs <out_dir>');
  process.exit(1);
}
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.json')) files.push(p);
  }
};
walk(root);
const out = { items: {}, sessions: [] };
for (const f of files) {
  const doc = JSON.parse(readFileSync(f, 'utf8'));
  const kind = path.basename(path.dirname(f));
  if (kind === 'reviews') out.items[`${doc.lesson}:${doc.concept}`] = doc;
  else if (kind === 'sessions') out.sessions.push(doc);
}
out.sessions.sort((a, b) => (a.date + a.lesson).localeCompare(b.date + b.lesson));
mkdirSync(path.dirname(REVIEWS), { recursive: true });
writeFileSync(REVIEWS, JSON.stringify(out, null, 2) + '\n');
console.log(`progress: ${Object.keys(out.items).length} concepts, ${out.sessions.length} sessions`);
