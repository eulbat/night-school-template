// Builds the artifact database document for a lesson → out/db/lesson-NNNN.json
//   npx tsx scripts/lesson-doc.ts 12 [videoAssetId]
// The Night School artifact stores one document per lesson in its `lessons`
// collection (doc id = 4-digit number). Chapters come from the voiced timings.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sceneOffsets, lessonDuration } from '../src/Lesson';
import { ROOT, lessonArg, lessonDir, pad, readTimings } from './lib';

const n = lessonArg();
const video = process.argv[3] || null;
const dir = lessonDir(n);
const meta = JSON.parse(readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
const quiz = JSON.parse(readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
const notes = readFileSync(path.join(dir, 'notes.md'), 'utf8');
const curriculum = JSON.parse(readFileSync(path.join(ROOT, 'curriculum', 'curriculum.json'), 'utf8'));
const timings = readTimings(n);
const human = (id: string) => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

const doc = {
  number: meta.number,
  slug: meta.slug,
  title: meta.title,
  subtitle: meta.subtitle,
  track: meta.track,
  trackLabel: curriculum.tracks[meta.track].label,
  trackName: curriculum.tracks[meta.track].name ?? curriculum.tracks[meta.track].label,
  trackColor: curriculum.tracks[meta.track].color ?? null,
  curriculumId: meta.curriculumId,
  date: meta.date,
  tags: meta.tags,
  objectives: meta.objectives,
  durationSec: Math.round(lessonDuration(timings) / 30),
  chapters: sceneOffsets(timings).map((s) => ({ id: s.id, label: human(s.id), t: Math.round(s.start / 30) })),
  transcript: meta.scenes.map((s: any) => ({ id: s.id, text: s.lines.map((l: any) => (typeof l === 'string' ? l : l.text)).join(' ') })),
  notes,
  quiz: quiz.questions,
  video,
};
const out = path.join(ROOT, 'out', 'db');
mkdirSync(out, { recursive: true });
const file = path.join(out, `lesson-${pad(n)}.json`);
writeFileSync(file, JSON.stringify(doc, null, 2));
console.log(file);
