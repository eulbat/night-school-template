// Decide what tonight's lesson is. Deterministic: rotation slot + first unused
// curriculum item in that track. Prints JSON for the nightly agent.
//   node scripts/next.mjs
import { curriculum, language, lessons, loadReviews, today } from './common.mjs';

const cur = curriculum();
const done = lessons();
const used = new Set(done.map((l) => l.curriculumId));
const number = (done.at(-1)?.number ?? 0) + 1;
const slotTrack = cur.rotation[(number - 1) % cur.rotation.length];

const remaining = (t) => cur.tracks[t].lessons.filter((l) => !used.has(l.id));

let track = slotTrack;
let extendTrack = null;
if (remaining(track).length === 0) {
  extendTrack = track; // the agent should append new lessons to this track, then re-run
}
const item = remaining(track)[0] ?? null;
const trackLessons = done.filter((l) => l.track === track);
const reviews = loadReviews();
const weak = Object.values(reviews.items)
  .filter((r) => r.track === track && r.box === 1 && r.history.at(-1)?.result !== 'solid')
  .map((r) => ({ lesson: r.lesson, concept: r.concept }));

console.log(
  JSON.stringify(
    {
      number,
      date: today(),
      language: `${language().name} (${language().code})`,
      track,
      trackLabel: cur.tracks[track].label,
      pacing: cur.tracks[track].pacing ?? null,
      style: cur.tracks[track].style ?? null,
      item,
      folder: item ? `lessons/${String(number).padStart(4, '0')}-<slug>` : null,
      extendTrack,
      previousInTrack: trackLessons.slice(-3).map((l) => ({ number: l.number, title: l.title, curriculumId: l.curriculumId })),
      upNextInTrack: remaining(track).slice(1, 3).map((l) => l.title),
      weakConceptsInTrack: weak,
    },
    null,
    2,
  ),
);
