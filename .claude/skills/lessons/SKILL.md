---
name: lessons
description: Browse, search and replay past Night School lessons by track, tag or topic, and show learning stats. Use for "/lessons", "/lessons volcanoes", "show my progress", "replay the printing press lesson".
---

# Lessons

- The Night School artifact (URL in `artifact/artifact.json`) has the full library with track
  filters and tag search; open it with the `Artifact` tool (`action: "open"`) when they want to
  browse or rewatch.
- No argument: import progress first (`ArtifactData` `list` of `data/users/me/progress/reviews`
  and `.../sessions` with `out_dir` `.cache/progress`, then `node scripts/import-progress.mjs .cache/progress`),
  then show `node scripts/review.mjs stats` as a short summary (lessons per track, streak,
  concepts by box, reviews due), then the last 5 lessons (number, track, title, date).
- With a query: search `lessons/*/lesson.json` (title, subtitle, tags, track, curriculumId) and
  `notes.md`; list matches as `#n · track · title · tags`. Tag search is exact on tags first,
  then fuzzy.
- To replay one: open the artifact at `#LNNNN` (or `gh release download lesson-NNNN -p '*.mp4'
  -D .cache/videos --skip-existing` then `open` the file). Offer `/quiz <n>` afterwards.
- "What's coming up?" → `node scripts/next.mjs` plus the "Coming up" section of `INDEX.md`.
- The full browsable index is `INDEX.md` (also rendered on GitHub).
