// Builds the artifact database document `meta/config` → out/db/config.json:
// the learner profile, lesson days and tracks the Night School page shows.
//   node scripts/config-doc.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, curriculum, language } from './common.mjs';

const cur = curriculum();
const doc = {
  learner: cur.learner,
  language: language().code,
  languageName: language().name,
  timezone: cur.timezone,
  schedule: cur.schedule,
  tracks: Object.entries(cur.tracks).map(([key, t]) => ({ key, name: t.name, short: t.short, label: t.label, color: t.color })),
};
const out = path.join(ROOT, 'out', 'db');
mkdirSync(out, { recursive: true });
const file = path.join(out, 'config.json');
writeFileSync(file, JSON.stringify(doc, null, 2));
console.log(file);
