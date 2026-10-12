# Filler register

Everything on the site that is a placeholder or needs confirming. On the page, placeholders are amber and prefixed "filler:" or "to do:". Run `npm run check:filler` to list what remains. The command exits with an error while any remain, so use it as a gate before sharing the link or removing the `noindex` tag.

## Data to replace (filler)

| Where | Placeholder | Replace with |
|---|---|---|
| Case page, "What I put in place" | 5 teams | The real number of teams on the tiger team |
| Case page, "The learning object" | Link to the Rise sample | URL of the Articulate Rise sample (the `holmes_articulate-sample` repo holds an export; it isn't deployed yet) |
| Case page, Results | 42 of 50 reps (pilot completion) | Real pilot completion, or remove the row |
| Case page, Results | 86% (average assessment score) | Real SCORM scores from a pilot, or remove the row |
| Case page, Results | 2.4 to 4.1 (self-rated confidence) | Real before and after ratings, or remove the row |
| Case page, Results | Rep quote | A real quote, with permission, or remove |
| Case page, Results | Manager quote | A real quote, with permission, or remove |
| Case page, footer | Contact link | Your preferred contact link |
| Storyboard, measurement table | "pulse not yet run" | Level 1 pulse results, or leave out the row |
| Storyboard, measurement table | average 86% | Real average score (same source as the case page) |

## Facts to confirm (to do)

| Where | What to confirm |
|---|---|
| Case page, "What I put in place" | Team count, and add a line on who sat on the tiger team |
| Case page, zones | That the zone wording matches how you taught it |
| Case page, Results and storyboard | What the 3% lift is a percentage of (total pipeline, opportunity count, or other) and the baseline |
| Case page, Results | Replace or delete every filler row and quote before sharing |
| Case page, reflection | Edit the draft into your own voice |

## Reported by you, not marked on the page

These come from your notes. They are written as approximate, but check each one.

- Baseline of zero Bedrock opportunities per month, two months after launch.
- About 50 reps, creating 1 to 2 Bedrock opportunities each per month over the following quarter. The page adds "roughly 50 to 100 a month for the team," which is 50 reps times 1 to 2.
- Reps carried 60 to 100 opportunities each, about half inherited with their new book.
- The five items in "What I put in place."
- Your title and team ("district manager for Inside Sales (Startups) at AWS").

A cross-check on the 3% (not on the page): 50 to 100 new Bedrock opportunities a month against 3,000 to 5,000 carried (50 reps times 60 to 100) works out to roughly 1% to 3%. That is consistent with a lift measured against open opportunities, but only you know how it was measured.

## Content to verify before sharing

- Bedrock facts change quickly. The module mentions Knowledge Bases and Guardrails by name and describes data handling and capacity options in general terms, with a note telling learners to check current AWS documentation. Re-read `public/module/js/content.js` against current docs.
- Confidentiality: check what your separation agreement allows you to say about internal results. A safe default is "approximately," with no dollar figures or customer names.
- The capacity description is public and industry-level on purpose. Internal allocation decisions are not described.
