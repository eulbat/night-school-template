---
name: update
description: Bring improvements from the Night School template (animation kit, scripts, skills, artifact page, render workflow) into this Night School, keeping the learner's curriculum, lessons and progress. Use for "/update", "update night school", "get the latest template changes".
---

# Update

The template's engine paths (listed in `template.json` → `engine`) get the upstream changes made
since the last sync, applied as a 3-way patch. The curriculum, lessons, progress, README and
artifact URL are never touched.

1. `node scripts/update.mjs status`. "This is the template itself" or "Up to date": say so
   and stop. Exit code 2: they
   need read access to the template repo (`gh auth setup-git`, or ask its owner).
2. Summarize the upstream commits in plain words (what they'll notice: new kit components, page
   changes, better quizzes…) and ask for a go-ahead.
3. `node scripts/update.mjs apply`. On conflicts (exit 3), resolve each file keeping both
   intents: their local additions (e.g. kit components the nightly agent added) and the
   upstream change. Then:
   ```bash
   npm ci --no-audit --no-fund --silent   # if package-lock.json changed
   npm run check
   ```
   If the check now fails on `curriculum.json` (a new setting upstream), add it with a sensible
   value, asking the learner when it's a matter of taste.
4. If `artifact/night-school.html` changed: read all of it, then republish their page with the
   `Artifact` tool (`file_path` `artifact/night-school.html`, `url` from
   `artifact/artifact.json`). Pass `capabilities` (the object in `artifact/capabilities.json`)
   only if that file changed too. Then refresh the settings document: `node
   scripts/config-doc.mjs` and `ArtifactData` `set` collection `meta`, doc_id `config`,
   `file_path` `out/db/config.json` (`get` it first for `if_version`).
5. If `.claude/skills/setup/routine-prompt.md` changed: `RemoteTrigger` `list`, find
   "Night School: nightly lesson" and update its prompt (`{{REPO}}` = this repo's
   `<owner>/<name>`).
6. Commit and push:
   ```bash
   git add -A && git commit -m "Update Night School engine from the template" && git push
   ```
