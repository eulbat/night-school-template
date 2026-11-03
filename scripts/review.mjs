// Spaced repetition (Leitner boxes) for quiz concepts.
//   node scripts/review.mjs due [--limit 3]
//   node scripts/review.mjs record <lesson> <concept> <solid|hinted|missed> [--question q2]
//   node scripts/review.mjs session <lesson> <solid> <hinted> <missed>
//   node scripts/review.mjs stats
//   node scripts/review.mjs quizzed <lesson>      → exit 0 if a quiz session exists for that lesson
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { REVIEWS, addDays, isOffDay, lessons, loadReviews, today } from './common.mjs';

const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 35 };
const [cmd, ...args] = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const data = loadReviews();
const save = () => {
  mkdirSync(path.dirname(REVIEWS), { recursive: true });
  writeFileSync(REVIEWS, JSON.stringify(data, null, 2) + '\n');
};
const now = today();

if (cmd === 'record') {
  const [lessonStr, concept, result] = args;
  const lesson = Number(lessonStr);
  if (!lesson || !concept || !['solid', 'hinted', 'missed'].includes(result)) {
    console.error('usage: record <lesson> <concept> <solid|hinted|missed> [--question qN]');
    process.exit(1);
  }
  const meta = lessons().find((l) => l.number === lesson);
  const key = `${lesson}:${concept}`;
  const item = data.items[key] ?? { lesson, concept, track: meta?.track, question: flag('question'), box: 0, history: [] };
  if (result === 'solid') item.box = Math.min(5, Math.max(1, item.box + 1));
  else if (result === 'hinted') item.box = Math.max(1, item.box);
  else item.box = 1;
  item.due = addDays(now, result === 'missed' ? 1 : INTERVALS[item.box]);
  item.history.push({ date: now, result });
  data.items[key] = item;
  save();
  console.log(`${key} → box ${item.box}, next review ${item.due}`);
} else if (cmd === 'session') {
  const [lesson, solid, hinted, missed] = args.map(Number);
  data.sessions.push({ date: now, lesson, solid, hinted, missed });
  save();
  console.log('session recorded');
} else if (cmd === 'due') {
  const limit = Number(flag('limit', 3));
  const due = Object.values(data.items)
    .filter((r) => r.due <= now)
    .sort((a, b) => a.box - b.box || a.due.localeCompare(b.due))
    .slice(0, limit);
  const meta = Object.fromEntries(lessons().map((l) => [l.number, l]));
  console.log(JSON.stringify(due.map((r) => ({ ...r, lessonTitle: meta[r.lesson]?.title, dir: meta[r.lesson]?.dir })), null, 2));
} else if (cmd === 'quizzed') {
  process.exit(data.sessions.some((s) => s.lesson === Number(args[0])) ? 0 : 1);
} else if (cmd === 'stats') {
  const items = Object.values(data.items);
  const byBox = [1, 2, 3, 4, 5].map((b) => items.filter((r) => r.box === b).length);
  // Consecutive quiz days back from today (or yesterday, if today's quiz isn't done yet).
  // A day with no lesson scheduled (a weekend, by default) is skipped, not a break.
  const dates = new Set(data.sessions.map((s) => s.date));
  let streak = 0;
  for (let d = dates.has(now) ? now : addDays(now, -1); dates.has(d) || isOffDay(d); d = addDays(d, -1)) {
    if (dates.has(d)) streak++;
  }
  const ls = lessons();
  const byTrack = {};
  for (const l of ls) byTrack[l.track] = (byTrack[l.track] ?? 0) + 1;
  console.log(
    JSON.stringify(
      {
        lessons: ls.length,
        quizzedLessons: new Set(data.sessions.map((s) => s.lesson)).size,
        streakDays: streak,
        lessonsByTrack: byTrack,
        conceptsByBox: { '1 (shaky)': byBox[0], 2: byBox[1], 3: byBox[2], 4: byBox[3], '5 (mastered)': byBox[4] },
        dueToday: items.filter((r) => r.due <= now).length,
      },
      null,
      2,
    ),
  );
} else {
  console.error('commands: due | record | session | stats | quizzed');
  process.exit(1);
}
