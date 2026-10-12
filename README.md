# Talking Bedrock with customers

An enablement case study, a playable learning module, a storyboard, and a SCORM 1.2 package, built to show enablement design and delivery for internal sales teams.

Status: draft. Figures marked "filler" on the site are placeholders. See `docs/FILLER-REGISTER.md`.

## What's here

| Path | What it is |
|---|---|
| `public/index.html` | The case page |
| `public/storyboard/` | The storyboard (generated from `content/storyboard.json`) |
| `public/module/` | The learning object: plain HTML, CSS, and JavaScript with a SCORM 1.2 wrapper |
| `public/downloads/` | The SCORM package built from the module |
| `content/storyboard.json` | Storyboard source |
| `scorm/` | Manifest template |
| `scripts/` | Build, test, and placeholder-check scripts |
| `docs/` | Filler register |

## Commands

Requires Node 18 or later. No dependencies.

```
npm run build:all      # regenerate the storyboard page and the SCORM zip
npm test               # content checks and SCORM wrapper tests against a mock LMS
npm run check:filler   # list placeholders still on the site
```

Rebuild the zip after any change under `public/module/`, and commit it.

## Editing the module

All learning content is in `public/module/js/content.js`. The player logic is in `app.js`; the SCORM wrapper is in `scorm.js`. Scoring is 12 points from three scenarios plus 5 from the knowledge check, with an 80% pass mark. If you change the number of scenarios or questions, update `scenarioMax` and `quizMax`; `npm test` checks they match.

## SCORM notes

SCORM 1.2, single SCO, mastery score 80. The module reports `lesson_status` (passed or failed), `score.raw`, `lesson_location`, and `suspend_data`. Outside an LMS it runs in browser mode and keeps progress in `localStorage`.

## Analytics

The site uses Vercel Web Analytics. Enable it once in the Vercel project (Analytics tab). Custom events: `open_module`, `open_storyboard`, `download_scorm`, `section_seen`, `zone_viewed`, and module events (`module_started`, `scene_viewed`, `scenario_answered`, `quiz_submitted`, `module_completed`). To see which application led to a visit, share links with UTM tags, for example `?utm_source=companyname&utm_medium=application`.

## Deploying

Vercel serves `public/` as a static site (see `vercel.json`). Pushes to `main` deploy automatically.
