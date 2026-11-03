---
name: today
description: Morning routine for Night School. Opens today's lesson in the Night School artifact (video + Socratic quiz), or runs the quiz in the terminal. Use for "/today", "today's lesson", "what's today's video".
---

# Today

The lesson, its deep dive and the quiz live in the **Night School artifact** (URL in
`artifact/artifact.json`).

1. `git pull --ff-only` (quietly) and read the newest `lessons/*/lesson.json`.
2. Announce it in two lines: `#<n> · <track> · <title>`, then the subtitle.
3. Check it's published: `ArtifactData` `get` collection `lessons`, doc_id `NNNN`.
   - Published with a `video` → open the artifact (`Artifact` tool, `action: "open"`) and say:
     watch it, then hit **Start quiz** in the right-hand panel.
   - Missing or `video` null → check the render (`gh run list --workflow render.yml -L 3`;
     on failure `gh run view <id> --log-failed | tail -40`) and offer to fix it, or to publish it
     now by following step 8 of `.claude/skills/nightly-lesson/SKILL.md` (the release video can
     be fetched locally with `gh release download lesson-NNNN -p '*.mp4' -D .cache/media`).
4. If they'd rather be quizzed here in the terminal, follow `.claude/skills/quiz/SKILL.md`.
