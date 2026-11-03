// Prints the GitHub release body for a lesson (summary, chapters with timestamps, links).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sceneOffsets } from '../src/Lesson';
import { lessonArg, lessonDir, readTimings } from './lib';

const n = lessonArg();
const dir = lessonDir(n);
const meta = JSON.parse(readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
const timings = readTimings(n);
const ts = (f: number) => {
  const s = Math.floor(f / 30);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const human = (id: string) => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const lines = [
  `**${meta.subtitle}**`,
  '',
  `Track: \`${meta.track}\` · Curriculum: \`${meta.curriculumId}\` · Tags: ${meta.tags.map((t: string) => `\`${t}\``).join(' ')}`,
  '',
  '### Chapters',
  ...sceneOffsets(timings).map((s) => `- \`${ts(s.start)}\` ${human(s.id)} (scene \`${s.id}\`)`),
  '',
  '### You should now be able to',
  ...meta.objectives.map((o: string) => `- ${o}`),
  '',
  `📝 Notes: [${path.basename(dir)}/notes.md](../../blob/main/lessons/${path.basename(dir)}/notes.md)`,
  '',
  '🧠 Quiz: open the repo in Claude Code and run `/today`.',
];
console.log(lines.join('\n'));
