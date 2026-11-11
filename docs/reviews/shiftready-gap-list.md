# ShiftReady gap list

**Reviewed:** 11 November 2026
**Build:** `dc626cb` plus the follow-up changes in this working tree.
**Sources of evidence:** the completed content review in `docs/reviews/content.md`, the earlier writing review in `docs/reviews/writing.md`, browser checks of the local build, and direct data checks. The learner-UX and engineering agents hit the delegation timeout at 24 minutes; their areas were re-checked directly against the current build rather than treated as finished reports.

## Verdict

The design package is now applied and the main teaching loop works: syllabus, practice with cited feedback, timed mock, result review, missed-question list, and practical checklists. The build is honest about being independent and draft, and the worst factual error found in the first content review (GHB as Class C) has been corrected against the 2022 order.

The site is not yet a trustworthy exam-preparation product. The question bank is still a 365-record draft with incomplete semantic grounding, 199 of 497 objectives have no question, and 14 of the 17 configured paper rows are shorter than their published count. Those are content and measurement problems, not visual ones.

## P0 — publication blockers

1. **The live bank is draft and semantically unverified.** `site/data/questions.json` contains 365 records, all `status: "draft"`. `questions/VERIFICATION_REPORT.md` says the grounding pass has not run. A direct check finds 69 of 365 source quotes are not exact substrings of any cited chunk, and 198 quote the learning objective rather than the sentence that proves the answer. The UI now labels those as “Syllabus objective” or “Source reference”, but the underlying bank still needs review.
2. **Coverage is still 365 questions against the brief’s 1,450+ target.** 298 of 497 objectives have at least one question; 199 have none. EFAW has no unit or question, VI has no questions, CP-MAIN has 25 of a 52-question paper, and CP covers 18% of its objectives.
3. **Most mock papers are short.** 14 of 17 configured paper rows cannot fill the published count: U1 is 60/72 for DS, SO and CCTV; SO-U2 is 40/60; CP-MAIN is 25/52; CP-DSR is 12/29; CP-PI is 10/30; CViT is 13/40; the refreshers are 15–20/30; EFAW is 0/20. The setup now labels short banks and unconfirmed formats, but a shortened paper is still not the published paper.
4. **The source base cannot support the law, arrest, use-of-force or first-aid claims.** The corpus is 91 chunks, essentially the SIA specifications plus one Home Office circular. The brief’s statutes, PACE codes, HSE guidance, NPSA material and Licensing Act guidance are still absent. Questions that assert powers or duties from a syllabus bullet are not grounded in the legal text.

## P1 — materially wrong or misleading

1. **The syllabus tree is corrupted in places.** At least 11 merged objectives remain, including `U3-CONFLICT-S5-O12` at roughly 3,400 characters; U3-S5 scenario examples are still stored as objectives. This makes coverage percentages and “objectives to revisit” unreliable.
2. **Questions are bucketed into the wrong objectives.** 17 of the 25 U4-PI questions sit under one objective. Several U3 questions cite a session that differs from their objective. A mock result can therefore aggregate unrelated questions under one label.
3. **Human-review flags are incomplete.** 50 records are flagged, but several physical-intervention and first-aid items are still unflagged, and the app does not gate flagged records from practice or mock use.
4. **Question style gives away the answer.** The correct option is the longest in 264 of 365 questions (72%). The brief’s style lint asks for the opposite. Many CP and U4 items are syllabus-glossary recall rather than applied scenarios.
5. **Exam-format metadata is partly unconfirmed.** CP-MAIN and CP-DSR timers were not in the source; the refresher counts are defaults. The UI now says “format unconfirmed” for the CP and refresher configs, but the underlying numbers still need confirmation. The CP terror-threat paper and the U1 incident-report practical are not represented.
6. **The result screen cannot be compared with an SIA result.** It now says “mock pass mark” and flags unconfirmed formats, which is correct, but a short paper still uses the full timer, so its pass mark is not a like-for-like measure.
7. **The design package’s product shell is incomplete.** There is no `/styleguide`, no settings route for theme/text size/reset/export, no PWA or offline mode, no self-hosted font files, and no Open Graph image. These are explicitly listed in the package’s definition of done.
8. **Some accessible names and state handling still need work.** The source links and studied toggles now have unique labels, the mock table has a caption and column scopes, and feedback is announced. Remaining gaps: no flag/unflag controls, no visible text-size setting, and no focus move on ordinary route changes. The result heading now receives focus after submission.

## P2 — quality and traceability

1. `questions/bank.jsonl` records lack `type`, `version` and `created_by`; `spec_version` is `"2021"` for almost everything, including 2022 and 2024/2025 documents.
2. Chunk records have `page_start: null` and `page_end: null`; practice citations name the document but not the page or section.
3. `sources/manifest.json` now carries URLs for most documents, but several records still lack `unit_tags`, HTTP status and status history.
4. The app still uses a few internal words in public copy (“route” in a couple of empty states, “CVIT”/“CViT” inconsistently).
5. Fonts are loaded from Google Fonts; the package asks for self-hosted subsets and a Lighthouse 95 mobile target.
6. There is no operator/contact identity. Reports no longer promise an external review loop, but “independent” is still unattributed.
7. Some secondary links still use arrows; the package asks to keep the arrow for the main action only.
8. The README and `ATTRIBUTION.md` still describe an earlier build; `ATTRIBUTION.md` also mentions practice-paper PDFs used for format reference, which the brief says to avoid.

## Missing

- 1,085+ questions to reach the brief’s 1,450 minimum.
- EFAW syllabus and questions; VI objectives and questions.
- CP terror-threat-awareness paper, CP portfolio unit, and U1 practical checklist.
- Statutes, PACE, HSE, NPSA, Licensing Act and CCTV code sources.
- Semantic grounding report and human sign-off for PI, force, arrest and first-aid items.
- A real settings screen (theme, text size, reset, import/export).
- `/styleguide`, PWA/offline support, self-hosted fonts, Open Graph image.
- Page/section references in citations.
- A named operator or a deliberate statement that the site is anonymous.

## Improvements now in place

- ShiftReady tokens, type, dark/light theme, inline no-flash theme script, amber study-pass card, and a shield favicon.
- Current SIA specification links on every session; all 14 URLs return HTTP 200.
- Mock setup labels unconfirmed formats, disables a start button when a unit has no questions, and shows the actual available count.
- The last mock question now says “Submit paper” and submits; paper state and timer recover after reload via `sessionStorage`.
- Practice feedback labels an objective statement as “Syllabus objective” and a non-exact quote as “Source reference”; the actual PDF is linked.
- GHB, GBL and 1,4-BD are now taught as Class B with the 2022 Home Office circular as a source; rohypnol is separated as Class C.
- Content date is fixed instead of generated from today; draft notice appears on the question card; report copy no longer promises an unreachable reviewer.
- Header syllabus/practice/mock links follow the qualification being studied instead of always jumping to DS.

## Five highest-priority actions

1. **Do not treat the bank as verified.** Run the grounding pass with the answer key hidden, reject quotes that do not entail the key, and add a publication flag. Keep every unreviewed record visibly draft.
2. **Build the missing legal and guidance corpus, then re-cite.** Without the statutes and PACE/HSE/NPSA documents, law, arrest, force and first-aid questions cannot be defended.
3. **Expand the bank and repair the syllabus tree.** Split the merged objectives, remove scenario bullets from the objective count, remap the 17 U4 questions, and fill EFAW, VI and CP.
4. **Make every mock either complete or explicitly not a full paper.** Fill the short banks, confirm CP/refresher timers, add the CP terror paper and U1 practical, and stop running a published-length timer on a short paper without saying so.
5. **Finish the product shell.** Add settings/text size, `/styleguide`, self-hosted fonts, an OG image, PWA support and the missing accessibility state controls, then repeat the 360/768/1440 both-theme pass.
