---
name: setup
description: Set up your own Night School in a repo made from the template - interview the learner (background, themes, rhythm, voices), write their curriculum, clear the previous learner's lessons, create their Night School artifact and their nightly cloud routine. Use for "/setup", "set up night school", "make this mine", or to change themes or rhythm later.
---

# Setup

You're turning a copy of the Night School template into the learner's own: their themes, their
rhythm, their artifact, their nightly routine. Talk to them in plain words; they may not be an
engineer. Everything personal lives in `curriculum/curriculum.json` and `artifact/artifact.json`.

## 0. Check where we are

```bash
node -e "console.log(require('./template.json').repo)"   # the template
git remote get-url origin                               # this repo
gh auth status
```

- **This is the template itself** (origin is the template repo): stop. They need their own
  copy first. Offer to make it: `gh repo create <their-login>/night-school --private --template
  <template repo> --clone` (in the folder they choose, never inside this one), then tell them to
  open the new folder in Claude Code and run `/setup` again. If `gh` can't see the template,
  they need read access from its owner.
- `gh` not signed in: have them run `gh auth login` first.
- **Already set up** (`template.json` → `synced` isn't null): this is a change, not a first setup. Ask what they want to change (themes, rhythm, profile, voices), do only the matching
  steps below (2 for the curriculum, 7 for the rhythm), never step 3, and finish with step 8.

## 1. Interview

Ask in a few short rounds, one topic per round. Use `AskUserQuestion` where there are natural
options; ask open questions in plain chat. Suggest, don't interrogate: offer good defaults.

1. **Who they are**: role and background, what they already know well, comfort with math, and
   what they want from this (career move, curiosity, a specific project).
2. **Themes**: 1 to 5 subjects (tracks). For each: what exactly, their current level, anything
   to skip or emphasise. Propose a good order if they're unsure.
3. **Rhythm**: lesson days (every weekday · Mon/Wed/Fri · Tue/Thu · every day) and the time
   the routine runs, at night in their timezone (a few hours before they wake up; detect it with
   `readlink /etc/localtime`). Then the mix: how often each track comes up (e.g. "2 AI for
   every 1 history"). If a track should go slowly (hard subject, no background), note it.
4. **Language**: the language of the lessons, the quizzes and the tutor. One of the languages
   in `src/kit/languages.json`: English, French, Spanish, Italian, Brazilian Portuguese, Hindi,
   Japanese or Mandarin Chinese. Say plainly that Japanese and Mandarin are experimental: the
   free voice engine pronounces them roughly. The page's own buttons stay in English.
5. **Narrators**: one voice per track, from that language's `voices` in
   `src/kit/languages.json` (some languages have a single voice). For English, offer
   `am_michael` (American, warm), `af_heart` (American, bright), `bm_george` (British, calm),
   `bf_emma` (British, crisp). Default: a different one per track when there's a choice.

Then read back a short summary (profile, tracks, days and time, mix, language, voices) and get a yes
before writing anything.

## 2. Write `curriculum/curriculum.json`

Same shape as `.claude/skills/setup/example-curriculum.json` (`npm run check` validates it):

```json
{
  "learner": "2–3 sentences in the third person: background, level, math comfort, what they want.",
  "language": "en",
  "timezone": "America/New_York",
  "schedule": { "days": ["mon", "wed", "fri"], "time": "05:00" },
  "rotation": ["ml", "history", "ml"],
  "rotationNote": "One lesson per lesson day. Lesson N uses rotation[(N-1) % length]: …",
  "tracks": {
    "ml": {
      "name": "Machine Learning", "short": "ML", "label": "Machine Learning: how it really works",
      "color": "purple", "voice": "am_michael",
      "goal": "One sentence: what they'll understand at the end.",
      "pacing": "Only for slow tracks, e.g.: Slow track: the learner finds this hard. At most 2 new ideas per lesson, each worked through a tiny example, one running example reused across lessons.",
      "style": "Optional: how they want this track taught, e.g. Frame each lesson around a real historical source.",
      "lessons": [{ "id": "ml-01", "title": "…", "concepts": ["…", "…"] }]
    }
  }
}
```

- Write the track `name`, `short`, `label`, `goal` and lesson titles in the chosen language;
  keys and ids stay English kebab-case.
- Track keys: short kebab-case (`ml`, `history`, `jazz-theory`). `name` ≤ 26 characters (it's
  on the title card), `short` one word (the filter button). Colours: `purple`, `orange`,
  `blue`, `teal`, `pink`, `green`, `yellow`, `red`, a different one per track.
- **Lessons**: 10–12 per track, well sequenced. Lesson 1 of each track is the gentlest: the
  basic parts and vocabulary, never the advanced idea. Each lesson is one 3-minute video, so 2
  to 5 concepts, and each builds on the previous ones. When a track runs out, the nightly
  agent extends it on its own.
- **Rotation**: the mix as a list, at most ~10 entries, interleaved so the same track rarely
  comes twice in a row.

Run `npm run check` until it passes.

## 3. Clear the previous learner's lessons (first setup only)

```bash
git rm -rq --ignore-unmatch 'lessons/0*' 'src/lessons/L*.tsx'
node scripts/gen-registry.mjs
printf '{\n  "items": {},\n  "sessions": []\n}\n' >| progress/reviews.json
npm run index && npm run check
```

`reference/` stays: it's the style example the nightly agent copies. In `README.md`, replace the
first paragraph with one line saying whose Night School this is.

## 4. Their artifact

1. Read all of `artifact/night-school.html` (the Artifact tool needs the whole file read before
   publishing it), then publish it as a **new** artifact: `Artifact` `publish`, `file_path`
   `artifact/night-school.html`, no `url`, `icon` `moon`, `capabilities` = the object in
   `artifact/capabilities.json`.
2. Write the new URL to `artifact/artifact.json`: `{ "url": "<url>" }`.
3. `node scripts/config-doc.mjs`, then `ArtifactData` `set`, `url` the new one, collection
   `meta`, doc_id `config`, `file_path` `out/db/config.json`.

## 5. Remember which template version this is

`node scripts/update.mjs mark` records it in `template.json`, so `/update` can bring in later
improvements. If it can't reach the template, carry on and say `/update` will need read access.

## 6. Commit and push

```bash
git add -A && git commit -m "Set up Night School" && git push
```

Then check GitHub Actions can run and publish: `gh api repos/<their repo>/actions/permissions`
should say `"enabled": true`. If the repo belongs to an organization, its Settings → Actions →
Workflow permissions must allow "Read and write" (the render workflow publishes releases).

## 7. The nightly routine

Create it with the `schedule` skill (it handles the cloud environment and GitHub access), or
`RemoteTrigger` `create` if you already know the body shape:

- name `Night School: nightly lesson`; model `claude-opus-5-5`
- repository `https://github.com/<their repo>`
- allowed tools: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebSearch`, `WebFetch`,
  `ToolSearch`, `Artifact`, `ArtifactData`
- prompt: `.claude/skills/setup/routine-prompt.md` with `{{REPO}}` replaced by `<owner>/<name>`
- cron: `schedule.time` on `schedule.days` in `timezone`, **converted to UTC** (cron runs in
  UTC). Example: 05:00 Mon/Wed/Fri in New York is `0 9 * * 1,3,5` in summer (UTC−4). If the
  conversion crosses midnight, shift the days too. Tell them the time moves by an hour when
  daylight saving changes.

If they're changing the rhythm of an existing setup, `RemoteTrigger` `list`, find that
routine by name and `update` its `cron_expression` instead.

## 8. First lesson and wrap-up

Offer to run the routine now (`RemoteTrigger` `run`): lesson 1 then lands in the artifact in
about 30–40 minutes instead of tonight. Finish with:

- the artifact link (watch, quiz, ask the professor)
- the rhythm in their words ("every Mon, Wed and Fri, ready by 3:00")
- the commands: `/today`, `/quiz`, `/lessons`, `/setup` again to change themes or rhythm,
  `/update` to get template improvements
