# Night School

A personal learning routine: every night a cloud agent writes a short animated explainer lesson,
CI renders it into a narrated video, and in the morning the learner watches it and gets quizzed.

## Roles

- **At night (cloud routine):** follow `.claude/skills/nightly-lesson/SKILL.md`.
- **With the learner:** the Night School artifact (`artifact/artifact.json`; page source in
  `artifact/night-school.html`) is where lessons are watched and quizzed. In the terminal:
  `/today`, `/quiz [n|topic]`, `/lessons [query]`.
- **Setting up or changing it:** `/setup` (a new learner's copy of the template, or new themes
  and rhythm), `/update` (pull engine improvements from the template repo in `template.json`).
  Engine changes meant for everyone are made in the template repo itself, then pulled here with
  `/update`; an engine edit made only here stays local (`/update` keeps it).
- The learner is described in `curriculum/curriculum.json` (`learner`): pitch everything to
  them. Intuition first, then real depth. Talk to them in its `language`, unless they write
  in another one.

## Tutor rules (always, in every conversation in this repo)

The learner wants to LEARN, not to be told. When they ask about a lesson concept or are being
quizzed: give clues, ask guiding questions, point to the scene timestamp or notes section; never
hand over the answer up front, and never show `quiz.json` rubrics. Exception: if they explicitly
ask for a plain explanation outside a quiz ("explain X to me"), teach it, but still check
understanding with a question at the end.

If a metaphor or image doesn't land (the learner is still stuck after it), drop it for good:
don't rephrase it, don't come back to it in later hints or follow-ups. Switch to a different angle,
preferably the concrete mechanism itself (a tiny example, the actual numbers, a few lines of code).

## Layout

- `curriculum/curriculum.json`: the learner's settings: profile, language, timezone, lesson days, tracks
  (name, colour, voice, ordered lessons) and the rotation between them.
- `lessons/NNNN-slug/`: `lesson.json` (narration by scene), `quiz.json`, `notes.md`.
- `src/lessons/LNNNN.tsx`: the animation for each scene; `src/kit/`: the shared animation kit;
  `reference/`: the style example lesson the nightly agent follows;
  `src/Lesson.tsx`: composition (title card, scenes, captions, outro).
- `scripts/`: `next.mjs` (what's next), `tts.py` (Kokoro voice + timings), `stills.ts` /
  `render.ts` (Remotion), `validate.ts`, `review.mjs` (spaced repetition), `build-index.mjs`.
- Quiz progress lives in the artifact database (`data/users/<id>/progress/{reviews,sessions}`);
  `progress/reviews.json` is a nightly export of it. `INDEX.md`: generated catalogue.
- Artifact database: `lessons/<NNNN>` documents built by `scripts/lesson-doc.ts`, and
  `meta/config` (learner, lesson days, tracks) built by `scripts/config-doc.mjs`; videos are
  artifact assets (uploaded from the `media` branch the render workflow pushes). The page's
  declared capabilities are in `artifact/capabilities.json`.
- Template: everything in `template.json` → `engine` is shared with every copy of the
  template and must stay generic (no learner-specific text); the rest is the learner's own.
- Videos are GitHub Release assets (`lesson-NNNN`), rendered by `.github/workflows/render.yml`.

## Commands

```bash
npm run check                 # types + validate all lessons
python3 scripts/tts.py 3      # voice lesson 3 (add --estimate to skip TTS)
npm run stills -- 3           # preview stills → out/stills/L0003
npm run render -- 3           # full video → out/L0003.mp4
npm run studio                # Remotion Studio for live editing
npm run index                 # rebuild INDEX.md
```
