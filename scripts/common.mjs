import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const pad = (n) => String(n).padStart(4, '0');

/** Today's date in the learner's timezone (YYYY-MM-DD), from curriculum.json `timezone`. */
export const today = (tz = process.env.TZ_LEARNER || curriculum().timezone || 'UTC') =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const addDays = (iso, d) => {
  const t = new Date(`${iso}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};

export const curriculum = () => JSON.parse(readFileSync(path.join(ROOT, 'curriculum', 'curriculum.json'), 'utf8'));

/** The curriculum's language: { code, name, … } from src/kit/languages.json. */
export const language = () => {
  const code = curriculum().language ?? 'en';
  return { code, ...JSON.parse(readFileSync(path.join(ROOT, 'src', 'kit', 'languages.json'), 'utf8'))[code] };
};

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/** True on a day with no lesson scheduled (curriculum.json `schedule.days`, default Mon–Fri). */
let lessonDays;
export const isOffDay = (iso) => {
  lessonDays ??= curriculum().schedule?.days ?? ['mon', 'tue', 'wed', 'thu', 'fri'];
  return !lessonDays.includes(WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]);
};

export const lessons = () =>
  readdirSync(path.join(ROOT, 'lessons'))
    .filter((d) => /^\d{4}-/.test(d))
    .sort()
    .map((d) => ({ dir: `lessons/${d}`, ...JSON.parse(readFileSync(path.join(ROOT, 'lessons', d, 'lesson.json'), 'utf8')) }));

export const repoSlug = () => {
  try {
    const url = execSync('git remote get-url origin', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = url.match(/github\.com[:/](.+?)(\.git)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

export const REVIEWS = path.join(ROOT, 'progress', 'reviews.json');
export const loadReviews = () =>
  existsSync(REVIEWS) ? JSON.parse(readFileSync(REVIEWS, 'utf8')) : { items: {}, sessions: [] };
