---
name: nightly-lesson
description: Create tonight's Night School lesson (script, animated visuals, quiz, notes with a deep dive), push it so CI renders the video, then publish video + quiz to the Night School artifact. Used by the unattended nightly cloud routine.
---

# Nightly lesson

You are running **unattended, at night, in a cloud sandbox**. Nobody will answer questions. Make
sensible decisions yourself and finish with a pushed commit and a published lesson.

**Time budget: a lesson takes 10–15 minutes in total**: the video (2.5–4 min) plus the main
quiz (≈ 5–8 min: 4–5 questions, at most 2 open-ended, the rest pick-one). The deep dive is an
**optional** extra (≈ 5-minute read, ≤ 1100 words) and nothing required may depend on it.
`npm run check` enforces the quiz shape and warns on long notes.

**The learner** is described in `curriculum/curriculum.json` → `learner` (background, level,
what they want). Read it first and write for that person. Every lesson has two layers:
- **The video** is the intuitive layer: animated-explainer vulgarization that builds the mental
  model fast, and still lands on the precise mechanism and vocabulary.
- **The deep dive** (in `notes.md`) is the expert layer: the real mechanics, details,
  numbers, failure modes, trade-offs, and primary sources, pitched at the learner's own field
  and level. Gentle on *math* unless the profile says otherwise: assume high-school math and
  teach any math the lesson needs along the way.

A GitHub Action turns your commit into a narrated MP4 (Kokoro TTS + Remotion), publishes it as
release `lesson-NNNN`, and pushes the file to the `media` branch. You then publish the lesson
(video, chapters, deep dive, quiz) to the **Night School artifact** (URL in
`artifact/artifact.json`), where the learner watches it and is quizzed by a Socratic tutor.

**Language.** Write everything the learner reads or hears in the curriculum's `language`
(`next.mjs` prints it): narration, `say` hints, titles, objectives, quiz, notes, and the words
on screen in the animation. Identifiers stay in English kebab-case so the tooling can use them:
the slug, scene ids, tags, `concept` keys, curriculum ids, and the `## Deep dive` heading in
`notes.md` (the page splits the notes there and shows its own heading). The examples below are
in English; carry their spirit, not their words, into the lesson's language.

## 0. Setup and guard

```bash
git pull --ff-only || true
npm ci --no-audit --no-fund --silent
```

Import the learner's quiz progress from the artifact so `next.mjs` knows their weak concepts.
Load the `ArtifactData` tool (ToolSearch `select:Artifact,ArtifactData`), then `list` the
collections `data/users/me/progress/reviews` and `data/users/me/progress/sessions` (url from
`artifact/artifact.json`, `query.limit` 1000, `out_dir` `.cache/progress`), and run:

```bash
node scripts/import-progress.mjs .cache/progress    # writes progress/reviews.json
node scripts/next.mjs
```

If the artifact can't be read, skip the import and carry on.

- If the newest lesson in `lessons/` already has today's `date` (a re-run), **stop**: report
  "already generated" and do nothing else.
- If `extendTrack` is set, that track's curriculum is exhausted: append 6 new, well-sequenced
  lessons to it in `curriculum/curriculum.json` (same shape: `id` continuing the numbering,
  `title`, `concepts`), building on what's been covered, then re-run `node scripts/next.mjs`.

`next.mjs` gives you: lesson `number`, `date`, `track`, the curriculum `item` (title + concepts
to cover), the previous lessons in this track, `weakConceptsInTrack` (concepts the learner
recently struggled with in quizzes), and the track's `pacing` and `style` notes (or null).
The `style` note is how this learner wants this track taught: follow it.

**Slow tracks.** If `pacing` is set, it overrides the general guidance where they differ. In
particular: open with a ~45-second recap of the previous lesson in the track (the core idea with
its actual numbers, not just its name); at most 2 new ideas, each worked through a tiny numeric
example on screen; keep the running example the pacing note names; aim for 350–450 words at
`"speed": 0.9`; add a short "predict it yourself" scene (pose a question, pause a beat, then
answer it) before the recap. In the quiz, one main question re-tests a concept from an earlier
lesson in the track (reuse its `concept` key), and the first hint of every open question is a
concrete number or tiny example, not an image. A curriculum item whose title ends in "(review)"
is a consolidation lesson: no new ideas or vocabulary, only known ones replayed in new
situations, prioritising `weakConceptsInTrack`.

## 1. Prepare

1. Read `reference/L0001.tsx` (the reference lesson; its `lesson.json`, `quiz.json` and
   `notes.md` are in `reference/` too) and `src/kit/index.ts` plus the kit files it
   re-exports, so you know exactly what components exist and their props.
2. Read the `notes.md` of the previous 1–2 lessons in this track for continuity (callbacks,
   no repetition, consistent terminology).
3. Get the facts right. For anything recent, quantitative or easy to misremember (figures,
   sizes, specs, dates, names, how a process works step by step), check with web search when
   available. Prefer being correct and simple over impressive and wrong. Never invent citations.
4. If `weakConceptsInTrack` is non-empty, open with a ~15-second recap of the most relevant one
   (only if it's a real prerequisite for tonight).

## 2. Write the script: `lessons/NNNN-<slug>/lesson.json`

Shape (see `reference/lesson.json`):

```json
{
  "number": 12, "slug": "kebab-case-title", "curriculumId": "history-05", "track": "history",
  "date": "<date from next.mjs>", "title": "Title Case, ≤ 42 chars", "subtitle": "One intriguing line",
  "tags": ["3-7", "kebab-case", "tags"], "objectives": ["2-4 things the learner can now do"],
  "scenes": [{ "id": "kebab-id", "lines": ["One sentence per line.", {"text": "Caption", "say": "How to pronounce it"}] }]
}
```

- Folder name must be `NNNN-<slug>` (zero-padded number). Tags: the track key, the topic,
  and 2–5 specific concept tags that would
  help find the lesson again later (e.g. `printing-press`, `supply-and-demand`, `photosynthesis`).
- **Length**: 350–550 words of narration in total (≈ 2.5–4 minutes), 7–10 scenes, 3–6 lines per
  scene. **One sentence per line**, ideally 8–20 words: each line is one caption and one "beat"
  that visuals sync to.
- Use `say` when TTS would mispronounce something: acronyms ("D N A",
  "U N E S C O"), symbols, numbers with units ("ten to the power of twelve"), code identifiers.
  Write numbers out in `say` when in doubt.

### Explainer-style writing

- **Hook first** (scene 1): a surprising fact, a paradox or a concrete question. No "In this
  video we will…".
- **Assume zero background in the topic itself**, whatever the learner's own field. Define every term the first time it's used (what a cell, a bond, a chord is),
  and give the first lesson of a topic to the basic parts and vocabulary. Never open with the
  advanced idea (compound interest before saying what interest is).
- **First lesson of a track = gentlest lesson**: few ideas (3–4), each carried by one everyday
  picture that is also accurate (e.g. a voltage as water pressure in a pipe), no notation in the video
  (kets, Greek letters, formulas go to the deep dive), and plain-language names for every
  term. Better one idea understood than five ideas named.
- **Concrete before abstract**: start from a tiny, tangible example (one coin, one cell, one
  letter, one vote), then generalize.
- **One idea per scene**, building a chain. Each scene should earn the next one ("But there's a
  catch…").
- **Analogies, then the real thing**: an analogy is a ladder, not the destination. Always land
  on the precise mechanism and the correct vocabulary.
- **Numbers make it real**: orders of magnitude, latencies, costs, sizes.
- **Name the trade-off** where there is one: when it doesn't apply, what it costs, what the alternative is.
- **Vulgarize, then sharpen**: the first half builds intuition; at least one later scene goes
  "under the hood" with the precise mechanism: the real terms, a formula, the actual protocol
  messages or data structure, real numbers. The video should leave the learner feeling it
  was simple, not simplistic.
- Warm, curious, slightly playful; short sentences; second person ("you"). No filler, no hype.
- **Recap scene last**: 3 crisp takeaways, then one line teasing the next lesson in this track
  (use `upNextInTrack`).

## 3. Draw it: `src/lessons/LNNNN.tsx`

```tsx
import React from 'react';
import { defineLesson, useBeats, Abs, Pop, /* … */ } from '../kit';

export default defineLesson({
  'scene-id': () => {
    const b = useBeats();           // b[i] = frame where narration line i starts
    return (<> … </>);
  },
});
```

One component per scene id, keys exactly matching `lesson.json`. Rules of thumb:

- **Stage**: 1920×1080, 30 fps. Place things with `<Abs x y>` (centre anchor). Keep content
  between y≈80 and y≈880: captions are drawn at the bottom. Keep x within 120–1800.
- **Sync to narration**: every line should change something on screen. Use `b[i]` as `at=`
  for `Pop`, `Fade`, `Slide`, `Arrow`, etc. Use `out=` to clear things before the next idea
  (`<Fade at={b[0]} out={b[2]}>`). Things should appear *as they are mentioned*, not before.
- **The look**: flat shapes, bold saturated colours from `C`, the `Bit` mascot as the
  viewer's stand-in (curious, confused, delighted: use `mood`, `look`, `talking`, `idea`),
  gentle motion (`Float`, `Pulse`, travelling dots), a slow `Camera` push on key moments.
  One focal point at a time.
- **Show mechanisms, not slides**: animate the actual process. Packets travel along arrows,
  matrices fill in, nodes light up, a counter climbs, a graph draws itself.
  Compute animated values from `useCurrentFrame()` (see `scattering` and `sunset` in the reference lesson) when that makes the
  mechanism visible.
- **Minimal on-screen text**: labels of a few words, formulas, short code. Never paragraphs:
  the narration carries the explanation.
- You may write small local helper components (like `Wave` or `Molecule` in the reference lesson) with inline SVG for
  anything the kit lacks. If a helper is broadly reusable, add it to the kit (with a short doc
  comment) instead, without changing existing component behaviour.
- Sound: `<Sfx at name="pop|whoosh|ding|click|swell">` on big reveals only (≈ 1–3 per scene).
- Deterministic randomness only: `random('seed')`, never `Math.random()`.

## 4. Quiz: `lessons/NNNN-<slug>/quiz.json`

4–5 main questions plus 1 bonus that test **understanding, not recall**. Shape (see `reference/quiz.json`):

```json
{ "questions": [{
  "id": "q1", "concept": "kebab-concept-key", "type": "explain|predict|apply|debug|estimate|design",
  "scene": "scene-id-to-rewatch",
  "evidence": ["verbatim narration line(s) this question relies on"],
  "question": "…",
  "hints": ["gentle nudge", "narrower nudge", "almost there, but still not the answer"],
  "rubric": ["key point the answer must contain", "…"],
  "misconceptions": ["common wrong idea to watch for"]
}]}
```

- **Mix formats** to keep it lively: about half `"format": "choice"` questions (pick one; at
  most one of them pick-all-that-apply with `"multi": true`) and half open questions. Choice
  questions are graded instantly in the page:
  ```json
  { "id": "q2", "concept": "…", "type": "predict", "format": "choice", "scene": "…",
    "evidence": ["…"], "question": "…", "hints": [],
    "options": [
      { "text": "…", "correct": true,  "why": "why this is right (shown after it's picked)" },
      { "text": "…", "correct": false, "why": "why this is wrong, without revealing the right one" }
    ] }
  ```
  3–5 options, similar length and tone; every wrong option is a *plausible misconception*
  (the kind a smart learner would actually believe), never a joke option. Each `why` teaches
  something. Don't make the right answer guessable from wording ("always"/"never" traps,
  the longest option, echoing the question).
- Mix types: at least one *explain in your own words*, one *predict what happens if…*, and one
  *apply it to a new situation* (a small scenario to decide or design, a "what goes wrong
  if…" case, a case to diagnose).
- **Only quiz what the lesson actually taught.** Every non-bonus question must be answerable
  from the narration alone. Put 1–3 verbatim narration quotes in `"evidence": [...]` that
  contain everything the core rubric points need (`npm run check` rejects quotes it can't find).
  If a rubric point isn't backed by the narration, either add a narration line that teaches
  it or drop the point (or make it `Bonus:`).
- The `evidence` quotes only prove the *concept* was taught. The question itself should test
  the concept, not the wording: rephrase it, apply it to a new situation, ask for a prediction
  or a trade-off. Never ask the learner to repeat what the narration said.
- **One unambiguous ask per question.** Vague verbs like "gets its behaviour" or "works"
  invite several fair readings: name exactly what you want ("where do the values come
  from?", "what happens to w?"). Re-read each question as the learner would and make sure only
  one reading leads to the rubric.
- Core rubric points describe ideas at the level the video stated them ("prices go up when
  buyers compete for too few items"), never extra precision it didn't give.
- The main quiz must stand on the video alone. Add exactly one `"type": "bonus"` question, last.
  The page offers it as an **optional bonus** after the main quiz, because the deep dive is
  optional reading. It covers: trade-offs under constraints, how it goes
  wrong in practice, a back-of-the-envelope estimate, or "what would you choose and why".
  It's the one question allowed to rely on the deep dive: its `evidence` quotes `notes.md`.
- Don't label any part of the notes "optional" except by the structure itself (gist, then deep dive).
- Hints get progressively more specific but **never contain the answer**. Don't hang all the
  hints on one metaphor: if the first hint uses an image, the next ones come from a different
  angle (a concrete example, the mechanism, numbers). If the learner's progress shows they
  missed a concept taught through an analogy, re-teach it without that analogy.
- `concept` keys are stable identifiers used by spaced repetition. Reuse keys from earlier
  lessons when testing the same concept.

## 5. Notes: `lessons/NNNN-<slug>/notes.md`

Two parts, in this order (see `reference/notes.md`):

1. **The recap** (≈ 250–400 words, a 2-minute read): header line (`> **Track:** … · **Lesson N** · \`id\` · Tags: …`),
   the big idea, the key mechanism in plain words, a table or ASCII diagram where it helps.
2. `---` then **`## Deep dive`** (required heading, ≈ 600–1100 words, optional reading shown in
   its own tab) for the learner who wants to go further. It may point ahead to later lessons ("more on this in
   lesson history-05"), but the video and main quiz never rely on it:
   - the precise mechanism: for technical topics, runnable-looking code first (in a
     language the learner knows, else Python), message flows, data structures, complexity in words ("double the input, 4×
     the work"); for other topics, the closest equivalent (a worked example, a primary-source
     excerpt, real figures);
   - a table of orders of magnitude worth memorising (latencies, sizes, costs, FLOPs…);
   - how it goes wrong in practice and how people deal with it;
   - trade-offs and when *not* to use it; how it shows up at well-known companies/systems;
   - `### Further reading`: 2–4 primary sources you are confident exist (papers, RFCs,
     canonical docs, books, talks). Never invent citations.

**Math rules for the deep dive** (see the reference deep dive as the model):
- Code before equations. If an equation helps, show it *after* the code and read it aloud in
  plain words ("read `Δp/Δt` as: how much the price changes per day").
- Define every symbol and every math term in plain words the first time it appears. No Greek
  letters, sums or matrix notation without that.
- Optionally one `### Math corner` per lesson that teaches ONE math idea from scratch:
  intuition → tiny numeric example → a few lines of code → how it shows up in this lesson.
  Build cumulatively: check earlier lessons' Math corners (`grep -l "Math corner" lessons/*/notes.md`),
  reuse what was taught, and don't re-teach it. Good candidates: logarithms, exponentials,
  percentages, probability, vectors, big-O growth.
- Verify any code or numbers you show actually work (run them in Bash).
- Quiz rubrics must never require math notation; reasoning in words is a full answer.

No quiz answers spelled out as Q&A. Plain Markdown (rendered in the artifact): headings,
tables, fenced code; no HTML, no LaTeX (write math with Unicode/`code`).

## 6. Validate and self-review (loop up to 3 times)

```bash
npm run check                                    # types + lesson/quiz/notes validation
pip install -q numpy 2>/dev/null; python3 scripts/tts.py NNNN --estimate   # timings without TTS
npm run stills -- NNNN                           # renders out/stills/LNNNN/*.jpg
ffmpeg -loglevel error -y -pattern_type glob -i 'out/stills/LNNNN/*.jpg' -vf "scale=640:360,tile=4x6" -frames:v 1 out/sheet.jpg
```

(Replace NNNN with the number, e.g. `12`, and the 4-digit `L0012` in paths.)

`npm run check` must pass. If the stills render (Remotion needs to download Chrome; skip this
step if it can't), **look at `out/sheet.jpg`** (and individual stills if needed) and fix: overlapping
elements, text running off-screen or under the captions, empty-looking scenes, elements too
small to read, the "Missing visual" placeholder. Each scene's `-b` still should look like a
finished, balanced composition.

## 7. Publish

```bash
npm run index                 # regenerates INDEX.md
git add lessons src curriculum INDEX.md
git commit -m "Lesson NNNN: <title> [<track>]"
git push origin HEAD:main || git push origin HEAD:claude/lesson-NNNN
```

Never commit `out/`, `public/audio`, `models/` (gitignored). If pushing to `main` is refused, the
`claude/lesson-NNNN` branch is fine: the render workflow merges it into `main`.

## 8. Publish to the Night School artifact

The render takes ~5–10 minutes after your push. Wait for it, polling the `media` branch (each
Bash call under 10 minutes; give up after ~40 minutes in total):

```bash
for i in $(seq 1 9); do git fetch -q origin media 2>/dev/null && git ls-tree --name-only origin/media | grep -q "^NNNN.mp4$" && echo ready && break; sleep 60; done
```

When `NNNN.mp4` is there:

```bash
mkdir -p .cache/media public/audio/LNNNN && git archive origin/media | tar -x -C .cache/media
cp -f .cache/media/NNNN.timings.json public/audio/LNNNN/timings.json
```

0. Refresh the page settings: `node scripts/config-doc.mjs` → `out/db/config.json`, then
   `ArtifactData` `set`, collection `meta`, doc_id `config`, `file_path` that JSON (`get` it
   first and pass its `version` as `if_version` when it exists).
1. Upload the video: `Artifact` tool, `action: "publish"`, `url` from `artifact/artifact.json`,
   `file_path` `.cache/media/NNNN.mp4`, `asset: true`. Note the returned asset id.
2. `npx tsx scripts/lesson-doc.ts NNNN <assetId>` → `out/db/lesson-NNNN.json`.
3. `ArtifactData` `set`, collection `lessons`, doc_id `NNNN` (4 digits), `file_path` that JSON.
   If the document already exists, `get` it first and pass its `version` as `if_version`.
4. Catch-up: `ArtifactData` `list` collection `lessons`; for any lesson whose `video` is null and
   whose `NNNN.mp4` is on the `media` branch, do steps 1–3 for it too. If a lesson in the repo
   has no document at all yet, publish it with `video` null so its quiz and notes are available.

Never republish the artifact page itself (only assets and database documents). If the render
never shows up, publish the document with `video` null (`npx tsx scripts/lesson-doc.ts NNNN`
needs timings: run `python3 scripts/tts.py NNNN --estimate` first) and say so in the summary.

Finish with a 3-line summary: lesson number + title + track, word count / scene count, whether
the video was published to the artifact, and anything you were unsure about.
