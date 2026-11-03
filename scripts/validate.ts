// Validates every lesson: metadata, quiz, notes, and that each scene has a visual.
//   npx tsx scripts/validate.ts        (run via `npm run check`)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import LANGUAGES from '../src/kit/languages.json';
import { PALETTE } from '../src/kit/theme';
import { registry } from '../src/lessons/registry';
import { ROOT } from './lib';

const errors: string[] = [];
const warnings: string[] = [];
const curriculum = JSON.parse(readFileSync(path.join(ROOT, 'curriculum', 'curriculum.json'), 'utf8'));
const TRACKS = Object.keys(curriculum.tracks ?? {});
const LANG = (LANGUAGES as Record<string, { name: string; voices: string[]; spaces?: boolean }>)[curriculum.language];
const voiceOk = (v: string) => !LANG || LANG.voices.includes(v);
const curriculumIds = new Set<string>(
  Object.values(curriculum.tracks ?? {}).flatMap((t: any) => (t.lessons ?? []).map((l: any) => l.id)),
);

// curriculum.json: the learner's own settings (written by /setup)
{
  const err = (m: string) => errors.push(`curriculum.json: ${m}`);
  if (typeof curriculum.learner !== 'string' || !curriculum.learner.trim()) err('"learner" must describe the learner (background, level, goals)');
  if (!LANG) err(`"language" must be one of ${Object.keys(LANGUAGES).join(', ')}, got ${JSON.stringify(curriculum.language)}`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: curriculum.timezone });
  } catch {
    err(`"timezone" must be an IANA zone like "America/New_York", got ${JSON.stringify(curriculum.timezone)}`);
  }
  const days = curriculum.schedule?.days;
  if (!Array.isArray(days) || !days.length || days.some((d: string) => !['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(d)))
    err('"schedule.days" must list lesson days, e.g. ["mon", "wed", "fri"]');
  if (!TRACKS.length) err('needs at least one track');
  if (!Array.isArray(curriculum.rotation) || !curriculum.rotation.length) err('"rotation" must list track keys');
  for (const t of curriculum.rotation ?? []) if (!TRACKS.includes(t)) err(`rotation names unknown track "${t}"`);
  const ids = new Set<string>();
  for (const [key, t] of Object.entries<any>(curriculum.tracks ?? {})) {
    if (!/^[a-z0-9-]+$/.test(key)) err(`track key "${key}" must be kebab-case`);
    for (const k of ['name', 'short', 'label', 'goal']) if (!t[k]) err(`track ${key} missing "${k}"`);
    if (!(t.color in PALETTE)) err(`track ${key}: "color" must be one of ${Object.keys(PALETTE).join(', ')}`);
    if (t.voice && !voiceOk(t.voice)) err(`track ${key}: voice "${t.voice}" doesn't speak ${LANG.name}; use one of ${LANG.voices.join(', ')}`);
    if (!Array.isArray(t.lessons) || !t.lessons.length) err(`track ${key} has no lessons`);
    for (const l of t.lessons ?? []) {
      if (!l.id || !l.title || !Array.isArray(l.concepts)) err(`track ${key}: every lesson needs "id", "title" and "concepts"`);
      if (ids.has(l.id)) err(`duplicate curriculum id ${l.id}`);
      ids.add(l.id);
    }
  }
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const lineText = (l: any) => (typeof l === 'string' ? l : l?.text);

const dirs = readdirSync(path.join(ROOT, 'lessons')).filter((d) => /^\d{4}-/.test(d)).sort();
const seen = new Set<number>();

for (const d of dirs) {
  const dir = path.join(ROOT, 'lessons', d);
  const err = (m: string) => errors.push(`${d}: ${m}`);
  const warn = (m: string) => warnings.push(`${d}: ${m}`);
  let meta: any;
  try {
    meta = JSON.parse(readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
  } catch (e) {
    err(`lesson.json missing or invalid JSON (${(e as Error).message})`);
    continue;
  }
  const n = meta.number;
  if (!Number.isInteger(n) || d !== `${String(n).padStart(4, '0')}-${meta.slug}`) err(`folder name must be ${String(n).padStart(4, '0')}-${meta.slug}`);
  if (seen.has(n)) err(`duplicate lesson number ${n}`);
  seen.add(n);
  for (const k of ['title', 'subtitle', 'track', 'curriculumId', 'date', 'slug']) if (!meta[k]) err(`missing "${k}"`);
  if (!TRACKS.includes(meta.track)) err(`track must be one of ${TRACKS.join(', ')}`);
  if (meta.voice && !voiceOk(meta.voice)) err(`voice "${meta.voice}" doesn't speak ${LANG.name}`);
  if (meta.curriculumId && !curriculumIds.has(meta.curriculumId)) err(`curriculumId ${meta.curriculumId} not in curriculum.json`);
  if (!Array.isArray(meta.tags) || meta.tags.length < 3) err('needs at least 3 tags');
  if (meta.tags?.some((t: string) => !/^[a-z0-9-]+$/.test(t))) err('tags must be kebab-case');
  if (!Array.isArray(meta.objectives) || meta.objectives.length < 2 || meta.objectives.length > 4) err('needs 2–4 objectives');
  if (!Array.isArray(meta.scenes) || meta.scenes.length < 5) err('needs at least 5 scenes');
  const ids = new Set<string>();
  let total = 0;
  for (const s of meta.scenes ?? []) {
    if (!/^[a-z0-9-]+$/.test(s.id ?? '')) err(`scene id "${s.id}" must be kebab-case`);
    if (ids.has(s.id)) err(`duplicate scene id ${s.id}`);
    ids.add(s.id);
    if (!Array.isArray(s.lines) || s.lines.length === 0) err(`scene ${s.id} has no lines`);
    for (const l of s.lines ?? []) {
      const t = lineText(l);
      if (!t) err(`scene ${s.id} has an empty line`);
      else {
        total += words(t);
        if (LANG?.spaces !== false && words(t) > 30) warn(`scene ${s.id}: long line (${words(t)} words), captions read better under ~22`);
      }
    }
  }
  if (LANG?.spaces !== false && (total < 280 || total > 600)) warn(`narration is ${total} words (aim for 350–550 ≈ 2.5–4 min of video)`);

  // visuals
  const visuals = registry[n];
  if (!visuals) err(`no src/lessons/L${String(n).padStart(4, '0')}.tsx`);
  else {
    for (const id of ids) if (!visuals[id]) err(`scene "${id}" has no visual in L${String(n).padStart(4, '0')}.tsx`);
    for (const id of Object.keys(visuals)) if (!ids.has(id)) err(`visual "${id}" has no matching scene in lesson.json`);
  }

  // quiz
  const norm = (t: string) => t.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  const narration = norm((meta.scenes ?? []).flatMap((sc: any) => (sc.lines ?? []).map(lineText)).join(' '));
  const notesText = existsSync(path.join(dir, 'notes.md')) ? norm(readFileSync(path.join(dir, 'notes.md'), 'utf8')) : '';
  try {
    const quiz = JSON.parse(readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
    const qs = quiz.questions;
    if (!Array.isArray(qs) || qs.length < 4 || qs.length > 6) err('quiz needs 4–6 questions');
    const isBonus = (q: any) => q.type === 'bonus';
    const main = (qs ?? []).filter((q: any) => !isBonus(q));
    const open = main.filter((q: any) => q.format !== 'choice').length;
    if (main.length < 4 || main.length > 5) err(`main quiz (non-bonus) needs 4–5 questions, has ${main.length}`);
    if (open > 2) err(`main quiz has ${open} open questions: at most 2 (time budget: quiz ≈ 5–8 min)`);
    if ((qs ?? []).filter(isBonus).length > 1) err('at most one bonus question');
    for (const [i, q] of (qs ?? []).entries()) {
      for (const k of ['id', 'concept', 'type', 'question']) if (!q[k]) err(`quiz q${i + 1} missing "${k}"`);
      if (q.format === 'choice') {
        const opts = q.options;
        if (!Array.isArray(opts) || opts.length < 3 || opts.length > 5) err(`quiz q${i + 1}: choice questions need 3–5 options`);
        const right = (opts ?? []).filter((o: any) => o.correct === true).length;
        if (right < 1) err(`quiz q${i + 1}: mark at least one option "correct": true`);
        if (!!q.multi !== right > 1) err(`quiz q${i + 1}: set "multi": true exactly when more than one option is correct`);
        for (const o of opts ?? []) if (!o.text || !o.why) err(`quiz q${i + 1}: every option needs "text" and "why"`);
        if (isBonus(q)) err(`quiz q${i + 1}: the bonus question must be open-ended`);
      } else {
        if (q.format && q.format !== 'open') err(`quiz q${i + 1}: format must be "open" or "choice"`);
        if (!Array.isArray(q.hints) || q.hints.length < 2) err(`quiz q${i + 1} needs ≥2 hints`);
        if (!Array.isArray(q.rubric) || q.rubric.length < 1) err(`quiz q${i + 1} needs a rubric`);
      }
      if (!q.scene || !ids.has(q.scene)) err(`quiz q${i + 1} must reference a scene id ("scene") to rewatch`);
      // Questions come back weeks later as reviews, so they can't lean on the video's setup.
      const leans = /\b(the|this|that) (video|lesson)\b|\bexperiment [A-Z]\b|\b(previous|last|earlier) question\b/i;
      for (const t of [q.question, ...(q.options ?? []).flatMap((o: any) => [o.text, o.why])]) {
        const m = typeof t === 'string' && (t.match(leans) || (t === q.question && t.match(/^same\b/i)));
        if (m) err(`quiz q${i + 1}: "${m[0]}" leans on the lesson; questions come back as standalone reviews, so restate the setup`);
      }
      // Every question must be grounded in what the lesson actually says: `evidence` quotes
      // the narration (or, for bonus questions, the deep dive) verbatim.
      if (!Array.isArray(q.evidence) || q.evidence.length < 1) err(`quiz q${i + 1} needs "evidence": verbatim quotes from the narration (or notes for the bonus question)`);
      for (const ev of q.evidence ?? []) {
        const e = norm(ev);
        const inNarration = narration.includes(e);
        if (!inNarration && !notesText.includes(e)) err(`quiz q${i + 1}: evidence not found verbatim in narration or notes: "${ev}"`);
        if (!inNarration && !isBonus(q)) err(`quiz q${i + 1}: only the bonus question may rely on the deep dive; quote the narration`);
      }
    }
  } catch (e) {
    err(`quiz.json missing or invalid (${(e as Error).message})`);
  }

  if (!existsSync(path.join(dir, 'notes.md'))) err('notes.md missing');
  else {
    const notes = readFileSync(path.join(dir, 'notes.md'), 'utf8');
    const cut = notes.search(/^## Deep dive/m);
    if (cut < 0) err('notes.md needs a "## Deep dive" section');
    else {
      const w = (t: string) => (t.match(/\S+/g) || []).length;
      if (w(notes.slice(0, cut)) > 450) warn(`recap (before "## Deep dive") is ${w(notes.slice(0, cut))} words: keep it a 2-minute read (≤ 450)`);
      if (w(notes.slice(cut)) > 1200) warn(`deep dive is ${w(notes.slice(cut))} words: keep it a ~5-minute read (≤ 1100)`);
    }
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);
console.log(`${dirs.length} lesson(s) checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
