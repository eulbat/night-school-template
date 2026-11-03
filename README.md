# 🌙 Night School

A daily lesson, made while you sleep.

On the nights you choose, a Claude Code cloud routine writes the next lesson of your curriculum:
a narrated script, flat and colourful explainer animations, a quiz, and notes with a deep dive. GitHub
Actions voices it (Kokoro TTS, free), renders it with Remotion and publishes the video. The
routine then uploads video, chapters, deep dive and quiz to your **Night School artifact** (link
in [`artifact/artifact.json`](artifact/artifact.json)), where you watch, read, and get quizzed by
a Socratic tutor (hints, never answers) with spaced-repetition reviews.

**Browse everything:** the artifact's library, or [INDEX.md](INDEX.md) (by track, by tag, what's coming up).

## Start your own

1. On GitHub, open [eulbat/night-school-template](https://github.com/eulbat/night-school-template)
   and click **Use this template → Create a new repository** (private is fine). Or:
   `gh repo create <you>/night-school --private --template eulbat/night-school-template --clone`
2. Open your new repo in Claude Code and run **`/setup`**. It asks about you, your themes and
   your rhythm, writes your curriculum, clears the previous lessons, creates your Night School
   artifact and your nightly routine.
3. Later: `/setup` again to change themes or rhythm, `/update` to get improvements made to the
   template (new animations, better quizzes) without touching your lessons.

Your copy is fully yours: your routine pushes to your repo, your GitHub Actions render the
videos, and your artifact keeps your progress.

## Tracks

Tracks, lesson order, the mix between them and the lesson days live in
[`curriculum/curriculum.json`](curriculum/curriculum.json). Edit it to reorder, add or drop
lessons (or run `/setup`). When a track runs out, the nightly agent extends it.

## Commands (in Claude Code)

| | |
|---|---|
| `/today` | Open today's lesson in the artifact (or quiz in the terminal) |
| `/quiz [n or topic]` | Quiz on any lesson |
| `/lessons [query]` | Search, replay, stats |

## How it works

```
night  cloud routine ──▶ lessons/NNNN-slug/{lesson.json, quiz.json, notes.md}
                         src/lessons/LNNNN.tsx  ──git push──▶ GitHub
       GitHub Action ──▶ Kokoro TTS ─▶ Remotion render ─▶ release "lesson-NNNN" + `media` branch
       cloud routine ──▶ uploads MP4 + lesson doc (chapters, deep dive, quiz) to the artifact
morning  artifact ──▶ watch ─▶ Socratic tutor (Claude) ─▶ progress in the artifact (Leitner boxes)
```

- Video toolkit: `src/kit/` (mascot, icons, graphs, matrices, plots, arrows, camera, captions).
- Language: `"language"` in `curriculum/curriculum.json` (English, French, Spanish, Italian,
  Brazilian Portuguese, Hindi; Japanese and Mandarin are experimental). Lessons, quizzes, the
  tutor and the video's own words follow it; the page's buttons stay in English.
- Voice: Kokoro, one narrator per track, set by `"voice"` on each track in
  `curriculum/curriculum.json`; the voices for each language are listed in
  `src/kit/languages.json`, and a voice's first letter sets its pronunciation (`a` American
  English, `b` British, `f` French…). A `"voice"` in a lesson.json overrides it.
- Re-render a lesson: Actions → *Render lesson videos* → *Run workflow* with the lesson number.

## Local development

```bash
npm ci
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx numpy   # Python ≥ 3.10
.venv/bin/python scripts/tts.py 1 --estimate   # timings without voice (or drop --estimate)
npm run studio                                  # live preview
npm run stills -- 1                             # quick stills
npm run render -- 1                             # full MP4
```
