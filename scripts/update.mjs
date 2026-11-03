// Pulls engine improvements (kit, scripts, skills, page…) from the template repo into a
// Night School made from it. Only the paths listed in the template's `engine` change: the
// curriculum, lessons and progress stay yours. Upstream changes since the last sync are
// applied as a 3-way patch, so engine edits made here (a new kit component) are kept.
//   node scripts/update.mjs status   what changed upstream since the last sync
//   node scripts/update.mjs apply    apply it (conflicts are left as markers)
//   node scripts/update.mjs mark     record the upstream commit this repo matches (used by /setup)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, repoSlug } from './common.mjs';

const FILE = path.join(ROOT, 'template.json');
const tpl = JSON.parse(readFileSync(FILE, 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const cmd = process.argv[2];

if (!['status', 'apply', 'mark'].includes(cmd)) {
  console.error('usage: node scripts/update.mjs status|apply|mark');
  process.exit(1);
}
if (repoSlug() === tpl.repo) {
  console.log(`This is the template itself (${tpl.repo}): nothing to update from.`);
  process.exit(0);
}

// `repo` is a GitHub owner/name, or any git URL or path.
const urls = /^[\w.-]+\/[\w.-]+$/.test(tpl.repo) ? [`https://github.com/${tpl.repo}.git`, `git@github.com:${tpl.repo}.git`] : [tpl.repo];
let head = null;
for (const url of urls) {
  try {
    git('fetch', '--quiet', '--no-tags', url, tpl.branch);
    head = git('rev-parse', 'FETCH_HEAD');
    break;
  } catch {}
}
if (!head) {
  console.error(`Can't fetch ${tpl.repo}: ask its owner for read access (and run \`gh auth setup-git\`).`);
  process.exit(2);
}
const upstream = JSON.parse(git('show', `${head}:template.json`));
const engine = upstream.engine;

// The upstream commit this repo last matched: the recorded one, else the closest by engine diff.
const known = (sha) => {
  try {
    git('cat-file', '-e', `${sha}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
let base = tpl.synced && known(tpl.synced) ? tpl.synced : null;
if (!base) {
  let best = Infinity;
  for (const sha of git('rev-list', '--max-count=400', head).split('\n')) {
    const n = git('diff', '--name-only', sha, 'HEAD', '--', ...engine).split('\n').filter(Boolean).length;
    if (n < best) [best, base] = [n, sha];
    if (n === 0) break;
  }
}
const save = (sha) => writeFileSync(FILE, JSON.stringify({ ...tpl, engine, synced: sha }, null, 2) + '\n');

if (cmd === 'mark') {
  save(base);
  console.log(`synced: ${base.slice(0, 7)} (${git('log', '-1', '--format=%s', base)})`);
  process.exit(0);
}

const log = git('log', '--format=%h %ad %s', '--date=short', `${base}..${head}`, '--', ...engine);
if (!log) {
  console.log(`Up to date with ${tpl.repo} (${head.slice(0, 7)}).`);
  if (cmd === 'apply') save(head);
  process.exit(0);
}
if (cmd === 'status') {
  console.log(`Upstream changes since ${base.slice(0, 7)}:\n${log}\n`);
  console.log(git('diff', '--stat', base, head, '--', ...engine));
  process.exit(0);
}

const dirty = git('status', '--porcelain', '--', ...engine);
if (dirty) {
  console.error(`Commit or discard local changes to engine files first:\n${dirty}`);
  process.exit(1);
}
const patch = path.join(ROOT, '.cache', 'upstream.patch');
mkdirSync(path.dirname(patch), { recursive: true });
writeFileSync(patch, execFileSync('git', ['diff', '--binary', base, head, '--', ...engine], { cwd: ROOT, maxBuffer: 1 << 28 }));
let ok = true;
try {
  git('apply', '--3way', patch);
} catch (e) {
  ok = false;
  console.error(String(e.stderr || e.message).trim());
}
save(head);
const conflicts = git('diff', '--name-only', '--diff-filter=U');
console.log(`Applied ${tpl.repo} ${base.slice(0, 7)}..${head.slice(0, 7)}:\n${log}`);
if (conflicts) console.log(`\nConflicts to resolve:\n${conflicts}`);
else if (!ok) console.log('\nSome hunks did not apply: see the errors above.');
process.exit(conflicts || !ok ? 3 : 0);
