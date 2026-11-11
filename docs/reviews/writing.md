# Writing review: Clearline Study

> **Current-build note (11 November, after the design pass):** the hero source claim, mock result language, content date, footer attribution and EFAW empty state have been revised. The draft-bank and quotation-labelling findings below still apply; the current consolidated list is in `docs/reviews/shiftready-gap-list.md`.


**Scope:** public copy in `site/index.html` and `site/assets/app.js`, the strings they render from `site/data/*.json`, and the rendered pages. Reviewed at HEAD `d7ed4dd` (working tree clean; `app.js` md5 `bfea0550…`), served locally at `127.0.0.1:8765` so the review matches the repo rather than the deployed build.

**Method:** inventoried the shell, templates and data strings; rendered 14 routes (home, qualification, syllabus, practice, practice-weak, mock setup, mock question, mock result, review, reports, checklists, about, two empty qualifications, 404); answered a practice question and a mock paper; opened the report dialog; cross-checked every source and status claim against `site/data/*.json`, `sources/manifest.json` and `questions/VERIFICATION_REPORT.md`.

**Verdict:** the site does read as an independent study resource. There is no price, account, upsell, urgency, testimonial or "guaranteed pass" anywhere, the second-person voice is consistent, and the study-first framing is genuine. The problem is not sales tone. It is that several load-bearing factual claims are false or stronger than the data supports, and the draft-bank disclosure is weaker than the bank's actual state. **Block** — 15 HIGH findings.

---

## Coverage and limits

- 328 distinct rendered strings across the 14 routes (204 longer than 20 characters), plus 365 question records (stem, four options, explanation, source quote) and 10 qualification descriptions.
- Every question record has four options, an explanation, `source_chunk_ids` and `source_quote`: 365/365.
- All 365 records are `status: "draft"`; 49 have `requires_human_review: true`; 316 have neither been reviewed nor queued for review.
- `questions/VERIFICATION_REPORT.md` states: "This is a structural verification pass. It does **not** prove that every answer is semantically supported by the cited chunk. That grounding check still has to be run before publication."
- 199/365 `source_quote` values are verbatim learning-outcome text from the syllabus, not evidence for the answer (normalised exact match). 148 are eight words or fewer; the two groups overlap (69), e.g. "understand the Approved Contractor Scheme" for a question whose correct answer is "The Approved Contractor Scheme".
- `sources/manifest.json` contains 17 files, all published by the Security Industry Authority. No Home Office, HSE, NPSA or legislation.gov.uk file exists in the build.
- Unconfirmed exam formats: `DS-REF`, `SG-REF`, `CP-REF`, `EFAW`; `CP` carries "confirm against current CP spec before publication".
- Not verified: I did not proofread all 365 stems/options line by line, and I did not re-open the 14 PDFs to re-derive each cited fact. Findings about citation honesty rest on the quote-to-objective match, the citation metadata and the project's own verification report.
- Browser-native `window.confirm` copy was read from code, not screenshotted.

---

## What works (do not lose it)

- "Study the material. Check the source." and "Read the objective. Then answer a question." set an educative contract, not a sales one.
- Consistent "you"; no "we" deflection; no exclamation marks; no "please", "oops" or "successfully".
- "Not correct." is calm and blameless. "Nothing to review yet." with one next action is a model empty state.
- OGL attribution, the non-affiliation sentence and the physical-intervention boundary ("must be learned from a qualified trainer") are present and correctly judged.
- "No account and no upload" / "stored in this browser" is consistent across practice, review and reports.
- "Draft question bank" exists on the home page, and draft notes exist in practice and mock setup. The instinct is right; the placement and strength are not.

---

## Terminology inventory

| Concept | Terms found in public copy | Issue |
| --- | --- | --- |
| Qualification | qualification, route, module, licence, qualification summary | "route" is internal routing jargon; EFAW is a module but is called a qualification; the licence helper uses "licence" for the same objects |
| Mock | mock paper, mock, paper, timed mock, "Paper setup" | "Paper setup" is not an action a learner recognises; "Review paper" promises a screen that does not exist |
| Review | Review (nav, tab, kicker), "Questions to review", "missed questions" | "Review" is a verb with no object; it reads as "review the site", not "review your mistakes" |
| Unit | unit, U1/U2/U3/U4, "U1 · Common", "DS · Unit 2" | Codes are unglossed and inconsistently expanded; the raw slug `U1-COMMON` reaches the question card |
| Source | source, cited source, specification, spec, "source document" | Four words for one thing; "specification" and "source" are used interchangeably |
| Report | Report an issue, Question reports, Question feedback, Save report, Open reports | Five names for one object and one action |
| Person | you (learner), "the site owner" (operator) | No contact route exists for "the site owner" |

Capitalisation is sentence case almost everywhere, but page titles mix declaratives with full stops ("Practice questions.", "Choose a paper.") and noun phrases without ("Door Supervisor", "Question reports"). Pick one policy for H1s.

---

# A. Missing copy

Copy that should exist and does not. These are not rewrites of existing strings.

| ID | Severity | Location | What is missing | Proposed copy | Why |
| --- | --- | --- | --- | --- | --- |
| A1 | HIGH | `site/assets/app.js:492` | A delivery route for reports. The page says "Export the JSON and send it to the site owner for review", but there is no email address, contact form or `mailto:` anywhere in `site/`. | Add a real address on About and here: "Reports stay in this browser. Export the file and email it to **[owner address]** so it can be checked." The owner must supply the address; do not ship a placeholder. | The only quality loop the site offers ends in an instruction the reader cannot follow. This is the definition of a dead end. |
| A2 | HIGH | `site/assets/app.js:328`, `:472` | Draft status at the point of use. The disclosure exists on the home hero (`:150`), practice setup (`:279`) and mock setup (`:370`), but disappears on the question card, the answer feedback and the whole result screen. | On the question card: "Draft question. Not checked against the source yet." On the result: "Draft questions. This result is not an SIA assessment." | A learner who lands directly on a practice URL, or who only reads the result, never learns the bank is unreviewed. All 365 records are drafts and the grounding check has not run. |
| A3 | HIGH | `site/assets/app.js:472` | A statement that a shortened or unconfirmed mock cannot be compared with the real exam. | Add under the score: "This paper is shorter than the published paper, so this result is not comparable to an SIA exam result." Where the format is unconfirmed: "The paper format for this qualification is unconfirmed." | "Below the pass mark" on 60 of 72 questions, or on a format whose own data says "unconfirmed", is a false signal about exam readiness. |
| A4 | MEDIUM | `site/assets/app.js:165` | A link for "Check GOV.UK". The sentence tells the reader to go to GOV.UK and gives them nowhere to go. Brief §5.2.1 requires the link. | "Check GOV.UK's guidance on SIA licences before you choose a training course." Link "guidance on SIA licences" to `https://www.gov.uk/guidance/apply-for-an-sia-licence`. | A referenced authority the reader cannot reach; costs a search at the exact decision point. |
| A5 | HIGH | `site/assets/app.js:530`, `site/index.html:53` | A real content date. "Last content build" is `new Date().toISOString().slice(0,10)`, so it always shows today. The brief's footer "as of" date is also absent; the footer shows only the year. | "Question bank: draft, last edited 11 November 2026. Sources checked 11 November 2026." Drive both from a build constant. | A freshness claim that updates itself is not a claim. On an honesty-positioned site this is the worst kind of fake trust signal. |
| A6 | MEDIUM | `site/index.html:53`, `site/assets/app.js:530` | Who operates the site. The non-affiliation sentence is there, but no person, project or contact is named anywhere. | "Clearline Study is run by **[name or handle]**. Contact: **[address]**." | "Independent" is asserted but unattributed. An independent resource with no accountable operator and no contact reads as anonymous, not independent. |
| A7 | MEDIUM | `site/assets/app.js:236`, `:328`, `:486` | A glossary for unit codes. "U1-COMMON", "U1 · Common", "DS · Unit 2", "U3 · Conflict" appear without expansion except in the unit title on the syllabus page. | Prefer names: "Common unit", "Door supervision unit", "Conflict management unit", "Physical intervention unit". If codes stay, add one line: "U1 is the common unit; U2 is role-specific; U3 is conflict management; U4 is physical intervention." | A new learner cannot tell whether "U1" is a unit, a level or a paper code. |

---

# B. Can improve

Grouped by the principle each row violates. One row per root cause; every location listed.

## B1. Honesty: source claims and result language

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| H1 | HIGH | `site/assets/app.js:147` | "Every answer points to the source document it came from." | "Practice answers link to the SIA specification they were written from. Mock reviews show the explanation only." | False twice: mock reviews carry no source (`:472` says so), and 199/365 practice "quotes" are learning outcomes, not evidence. "Every" is the word that breaks it. |
| H2 | HIGH | `site/assets/app.js:530` | "Each practice question includes the source quotation behind its answer." | Preferred: replace the 199 objective-derived quotes with the sentence that actually proves the answer. Minimum copy fix: "Each practice answer names the SIA specification it was written from. Where the specification states the fact directly, the wording is quoted." | 199/365 quote the learning outcome rather than the passage that proves the answer. Quotation marks are an evidentiary claim. |
| H3 | HIGH | `site/assets/app.js:327` | `Source: “${q.source_quote}” · <doc title>` | For objective-derived quotes: `Syllabus objective: ${q.source_quote} · Source: <doc title>` (no quotation marks). For real quotes: `Source: “…” · <doc title>`. | 199 quotes render as if the specification says them in that form. Example: the Run/Hide/Tell question cites `“understand what actions to take in response to a terrorist attack”` — a learning outcome, wrapped in quotes as proof. |
| H4 | HIGH | `site/assets/app.js:370` | "Pass mark from the source" | "Pass mark: 70% where confirmed" and, on unconfirmed rows, "Pass mark: unconfirmed" | Four formats are `"unconfirmed"` in `exam_formats.json` (DS-REF, SG-REF, CP-REF, EFAW), and the same screen prints "unconfirmed:" two lines below. The pill contradicts the warning. |
| H5 | HIGH | `site/assets/app.js:370` | Column header "Official"; pill "short bank" | Column "Published paper"; pill "60 of 72 available" | "Official" asserts a status the data does not support for CP and the refreshers. "Short bank" is build vocabulary at the moment of choosing a paper. |
| H6 | HIGH | `site/assets/app.js:370` | "Time stays at the official paper length." | "Time matches the published paper where the format is confirmed. Otherwise it is this mock's setting." | False for the four unconfirmed formats, and the sentence sits directly under a warning that says the format is unconfirmed. |
| H7 | HIGH | `site/assets/app.js:404` | `<h1>${format.questions}-question paper.</h1>` → "72-question paper." | `<h1>Unit 1 mock paper</h1>` with a subline "60 questions · 110 minutes · published paper: 72 questions" | The page announces 72 questions and immediately offers 60. The reader cannot tell which paper they are sitting. |
| H8 | HIGH | `site/assets/app.js:472` | "Above the pass mark." / "Below the pass mark." / "The published pass mark is 70%." | "Above the 70% mock pass mark." / "Below the 70% mock pass mark." / "This mock uses a 70% pass mark." | "Published" and the bare pass/fail headline read as an SIA result. For a shortened or unconfirmed paper, neither is true. |
| M31 | MEDIUM | `site/index.html:53`, `site/assets/app.js:530` | "Sources include the Security Industry Authority, Home Office, Health and Safety Executive, NPSA and legislation.gov.uk." | Keep the mandated OGL sentence, then add: "The current question bank draws on SIA specifications only." | All 17 manifest files and all 14 cited documents are SIA publications. The attribution is a licence notice for the project, but on the public page it reads as a description of what the answers rest on. |
| M1 | MEDIUM | `site/assets/app.js:194` | "72-question paper" beside "60 questions" on the unit row | "60 questions · published paper 72" | Same contradiction as H7, one click earlier. |
| M2 | MEDIUM | `site/assets/app.js:202` | "Best attempt" / "0 of 0 questions answered in this browser" | "Best mock score" / hide the sentence when the total is 0 | "Attempt" is ambiguous (practice or mock?) and "0 of 0" is a broken statistic on EFAW and VI. |
| M3 | MEDIUM | `site/assets/app.js:134` | "Level 2 Award · best 51%" | "Level 2 Award · best mock score 51%" | "best 51%" has no noun and no unit of measurement. |

## B2. Honesty: draft and empty-qualification states

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| H9 | HIGH | `site/assets/app.js:207` | "This qualification is in the syllabus, but it has no questions yet." followed by "The syllabus and source links are available." | "There is no syllabus or question set for this module yet." | Direct contradiction with `:206` ("No source-backed units") and with the page's own "UNITS 0". EFAW is a supporting module, not a qualification. |
| H10 | HIGH | `site/assets/app.js:411` | "Review paper" on the last question | "Submit paper" (and make the click submit) | The button does nothing. `:411` only advances when `index + 1 < questions.length`; on question 50 of 50 the label promises a review screen and the handler returns. Verified in the browser. |
| M4 | MEDIUM | `site/assets/app.js:206` | "No source-backed units are loaded for this route yet." | "No units are available for this qualification yet." | "Loaded" and "route" describe the build, not the subject. |
| M5 | MEDIUM | `site/assets/app.js:225` | "This route is in the scaffold. Its source specification has not been added to the study tree yet." | "The syllabus for this qualification has not been added yet." | "Scaffold" and "study tree" are repository words. This is the first thing a reader sees for a missing qualification. |
| M6 | MEDIUM | `site/assets/app.js:213` | "That route does not exist." | "We could not find that page. Check the address, or start from the home page." | Jargon plus no recovery instruction beyond the button. |
| M7 | MEDIUM | `site/assets/app.js:138` | "0/0 questions" and an empty progress bar on the EFAW and VI cards | "No questions yet" and no progress bar | The cards invite a click into an empty qualification and display a meaningless ratio. |
| M8 | MEDIUM | `site/data/syllabus.json:103` | "Low-priority legacy qualification; not issued in England and Wales." | "Legacy qualification. The licence is no longer issued in England and Wales." | "Low-priority" is the build order talking to the learner. It says their qualification does not matter. |
| M9 | MEDIUM | `site/assets/app.js:207` | "Questions will be added after the source material is reviewed." | "There are no questions for this module yet." | A promise with no owner and no date, on a page that has just contradicted itself about whether sources exist. |
| M10 | MEDIUM | `site/data/syllabus.json:7` | "Front-line venue security, conflict management and physical intervention." | "Licence-linked training for door supervisors: venue security, conflict management and physical intervention." | The description names topics but not the role, so it does not help the "which licence?" decision it sits beside. Same for SO/CCTV/CP (lines 20/32/43). |

## B3. Errors and recovery

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| M11 | MEDIUM | `site/assets/app.js:623` | `The study data could not load.` + `${error.message}` + "Check your connection and try again." | "The study material could not load. Check your connection and reload the page. If it still fails, the site is temporarily unavailable." | `${error.message}` renders strings like `./data/questions.json: 404` to a learner. Internal paths and status codes are not a recovery instruction. |
| M12 | MEDIUM | `site/assets/app.js:379` | "No questions loaded for this unit yet." | "No questions for this unit yet. Open the syllabus to read the objectives." | A toast with no next step, shown after the learner has already committed to starting a paper. |
| M13 | MEDIUM | `site/assets/app.js:419` | "You have 3 unanswered questions. Submit anyway?" | "You have 3 unanswered questions. They will be marked wrong. Submit the paper?" | The current wording hides the consequence; the skill's confirmation rule is to state what is lost. |
| M14 | MEDIUM | `site/assets/app.js:297` | "No questions in this filter yet." / "Read the syllabus for this unit, or choose another filter. The question bank is still being reviewed." | "No questions for this filter yet. Choose another unit, or open the syllabus." | "This unit" is wrong when the filter is weak or all-units. "Still being reviewed" contradicts the "draft" status and implies a review is underway. |
| M15 | MEDIUM | `site/assets/app.js:279` | "No questions match this filter yet." and, in the stage, a second empty card with "No questions in this filter yet." | Keep one empty state: the stage card, with "Choose another unit or clear the filter." | Two empty states stack on the practice-weak route, one in the sidebar and one in the stage. |
| M32 | MEDIUM | `site/assets/app.js:279` | "20 questions available for this filter." | "175 questions in this filter. Each set uses 20 at random." | The filter holds 175 DS questions; 20 is the set size. As written, the site undercounts its own bank by 155. |

## B4. Labels and actions

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| H11 | HIGH | `site/index.html:35` | "Choose a qualification" linking to `#/qual/DS` | "Start with Door Supervisor" (or build a real chooser and keep the label) | The label promises a choice; the link makes the choice for them, and on `/qual/DS` it links to the page you are already on. A learner looking for CCTV is sent to Door Supervisor with no explanation. |
| M16 | MEDIUM | `site/assets/app.js:148` | "Try a practice question" | "Start a practice set" (or auto-start one question) | The link lands on a setup screen that says "Choose a unit to start." No question appears. |
| M17 | MEDIUM | `site/assets/app.js:474` | "Try another paper" and "Paper setup" as two buttons for the same `examState = null; renderExam()` action | One button: "Choose another paper" | Same action, two names; "Paper setup" is not an action a learner would look for. |
| M18 | MEDIUM | `site/assets/app.js:472` | "Explanations and source quotations are in practice mode." | "This review shows the explanation. Open the syllabus for the source." | At the moment of reviewing mistakes, the copy sends the learner elsewhere and admits the result is less useful than practice. It also undercuts H1/H2. |
| M19 | MEDIUM | `site/assets/app.js:328` | `${q.unit}` → "U1-COMMON · question 1 of 20" | "Common unit · question 1 of 20" | The raw slug is the only place the code appears in that form, and it duplicates the friendly "U1 · Common" on the right. |
| L2 | LOW | `site/assets/app.js:486` | Nav/tab "Review"; page title "Questions to review." | Nav "Missed questions"; title unchanged | "Review" alone is a verb with no object. The page is specifically about wrong answers. |
| L3 | LOW | `site/assets/app.js:472` | "Weakest objectives" | "Objectives to revisit" | "Weakest" labels the person, not the topic; the rest of the site avoids judgement. |
| L4 | LOW | `site/assets/app.js:241` | "Session" as a stat label with value 11 | "Sessions" | Plural mismatch. Same latent issue at `:194` ("1 sessions") for any single-session unit. |
| L5 | LOW | `site/assets/app.js:370` | "1 papers" | "1 paper" | No plural handling. Only visible on CVIT/DS-REF/SG-REF/CP-REF today. |
| L6 | LOW | `site/assets/app.js:524` | "The practical is not simulated on this site. The site helps you arrive prepared." | "This site does not simulate the practical. Use the checklist to arrive prepared." | Third person twice; the rest of the page addresses "you". |
| L7 | LOW | `site/assets/app.js:139` | "Open qualification →" on the EFAW card | "Open module →" | EFAW is a supporting module, as its own kicker says. |

## B5. One voice, one vocabulary

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| M20 | MEDIUM | `site/assets/app.js:206`, `:213`, `:225`, `:161`, `:165` | "route" used for qualification, page and URL | "qualification" for the subject; "page" for a URL | Five uses of an internal routing word for two different concepts. |
| M21 | MEDIUM | `site/assets/app.js:161` | "CViT (Cash and Valuables in Transit)" while the card code is "CVIT" and About says "CViT" | "CViT" everywhere, including the card code; keep "CVIT" only as an internal `id` | Two spellings of the same qualification abbreviation on the same page. |
| M22 | MEDIUM | `site/assets/app.js:167` | "licenced premises" | "licensed premises" | The licensing term is "licensed premises"; "licenced" is a common variant but reads as a typo in a legal-context site. |
| M23 | MEDIUM | `site/index.html:59`, `:72`, `:64`; `site/assets/app.js:492` | "Question feedback" / "Report an issue" / "Save report" / "Question reports" / "Open reports" | One set: "Report a question" → "Save report on this device"; page "Saved reports" | Five names for one object and one action. |
| M24 | MEDIUM | `site/assets/app.js:530` | "the supplied study pack" | "this site" | The reader was not supplied a pack; this is build-language leaking into the trust page. |
| M25 | MEDIUM | `site/assets/app.js:165` | "These are the four front-line routes most learners ask about." | "These are the four front-line licences." | An unsupported claim about what learners ask. It is the only sentence on the site that invents audience research. |
| M26 | MEDIUM | `site/assets/app.js:161` | "Door Supervisor currently has the most practice questions." | Remove; replace with "Each qualification has its own units and question set." | A comparison that exists to steer the click. It is the closest the site comes to a sales nudge, and it is irrelevant to choosing a licence. |
| L8 | LOW | `site/assets/app.js:157` | "Common knowledge and conflict management" | "Unit 1 (common) and Unit 3 (conflict management)" | "Common knowledge" reads as general knowledge, not the name of the shared unit. |
| L9 | LOW | `site/assets/app.js:149` | "Open Government Licence sources" | "Sources you can check" | Licence vocabulary in a hero fact; the licence is already explained in the footer and About. |
| L10 | LOW | `site/assets/app.js:202` | Headings mix "Practice questions." and "Door Supervisor" | Use sentence case without terminal full stops for page titles | One policy per element type. |

## B6. Links and labels on links

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| M27 | MEDIUM | `site/assets/app.js:236`, `:238` | "Open specification" repeated for every objective and every session — 75 identical links on the DS syllabus page | Session link: "Open the SIA Common specification (2021)". Objective links: "Open source: Common specification, session 1" or fold them into the session link | Screen-reader users navigate by link list; 75 identical names give no destination. Even visually, the page is a wall of the same link. |
| M28 | MEDIUM | `site/assets/app.js:236` | `aria-label="Mark objective ${oi + 1} studied"` | `aria-label="Mark objective ${oi + 1} studied: ${objective.text}"` and, when done, "Mark objective … not studied" | Numbering restarts each session, so the page has eleven "Mark objective 1 studied" buttons; the label neither names the objective nor describes the toggle's current action. |
| L11 | LOW | `site/index.html:59` | `aria-label="Close"` on the dialog close button | "Close report form" | Name the action and the object. |

## B7. Plain words and presentation

| ID | Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| M29 | MEDIUM | `site/assets/app.js:236` | Learning outcomes rendered verbatim in lower case: "define the key purpose of the private security industry" | "Define the key purpose of the private security industry." | 64 objectives on the DS page start mid-sentence. It reads like unedited source extraction, which undermines the "written for learners" claim. Apply sentence case at build time, not by hand. |
| M30 | MEDIUM | `site/assets/app.js:513` | "Practical assessment areas are added when the spec gives enough detail to list them without teaching the technique." | "This checklist appears when the specification lists the practical areas without requiring technique instruction." | "Spec" and "teaching the technique" are internal editorial reasoning. |
| L12 | LOW | `site/index.html:64` | "The answer key is wrong" | "The marked answer is wrong" | "Answer key" is teacher jargon; learners say "the answer". |
| L13 | LOW | `site/index.html:71` | Placeholder "What should be checked?" | "e.g. the quoted source does not mention this rule" | A placeholder should show an example, not ask a question. |
| L14 | LOW | `site/assets/app.js:492` | "Storage / Local" | "Saved in this browser" | "Local" is a developer's word for a learner's device. |
| L15 | LOW | `site/assets/app.js:491` | `new Date(r.at).toLocaleString()` | `new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(r.at))` | The site is `en-GB`; the runtime default can render US order and a 12-hour clock. |
| L16 | LOW | `site/assets/app.js:470` | "Your answer: not answered" | "Not answered" | Doubles "answer" and reads as a system message. |
| L17 | LOW | `site/assets/app.js:530` | "Last content build" | "Question bank last edited" | "Build" is release vocabulary; the reader cares when the content changed. |
| L18 | LOW | `site/assets/app.js:492` | Kicker "Question quality" | Remove, or "About reports" | The page is a report list, not a quality programme. |

---

## C. Source-claim ledger

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| "Every answer points to the source document it came from." | `app.js:147` | **False** | Mock result carries no citations (`app.js:472`); 199/365 quotes are learning outcomes, not evidence. |
| "Each practice question includes the source quotation behind its answer." | `app.js:530` | **False for 199/365** | Normalised exact match against `syllabus.json` objective text. Example: `U1-COMMON-0001` quotes "define the key purpose of the private security industry". |
| "The syllabus map and question bank are built from SIA specifications published on GOV.UK." | `app.js:530` | **True** | All 14 cited `doc_id`s are SIA specs; all 17 manifest files are SIA publications. |
| "Sources include … Home Office … HSE … NPSA … legislation.gov.uk." | `index.html:53`, `app.js:530` | **Not supported by this build** | `sources/manifest.json`: 17/17 publisher = Security Industry Authority. Keep the mandated OGL notice, but scope it. |
| "Pass mark from the source" | `app.js:370` | **False for 4 explicit + CP** | `exam_formats.json:127,139,151,163` are `"unconfirmed"`; the CP record says "confirm … before publication". |
| "Time stays at the official paper length." | `app.js:370` | **False for 4 explicit + CP** | Same records; these times are defaults, not published formats. |
| "The published pass mark is 70%." (where the format uses 70%) | `app.js:472` | **Misleading** | 70% is the mark this mock applies; the paper may be shortened. The configured mark is 80 for CP-PI and 72 for CP-DSR, so "published" is not doing any work. |
| "The bank is still in draft." | `app.js:370` | **True** | 365/365 `status: draft`. |
| "Marked for human review where they touch use of force, arrest, physical intervention or first aid." | `app.js:530` | **True but incomplete** | 49 flagged; 316 unflagged and unreviewed. The sentence implies the rest have passed review. |
| "This build does not copy questions or wording from awarding organisation sample papers or commercial mock-test sites." | `app.js:530` | **Consistent with the repo** | No such files in `sources/`; cannot be proven from the site. |
| "Last content build: 2026-11-11" | `app.js:530` | **False as a date claim** | Generated from `new Date()` on every render. |

---

## D. Five highest-priority copy fixes

1. **Make the mock result honest.** Rewrite the result headline, the "published pass mark" sentence and the paper title (`app.js:404`, `:472`), and add the shortened/unconfirmed-paper caveat (A3). This is where a learner forms a belief about exam readiness; right now the page says "72-question paper" while marking 60, and "published pass mark" for formats its own data calls unconfirmed.
2. **Stop calling learning outcomes "source quotations."** Fix `app.js:147`, `:327` and `:530`, and replace the 199 objective-derived quotes with real supporting sentences. The site's central promise ("check the source") is currently false for 55% of the bank.
3. **Put the draft status where the answer is.** Add a one-line draft notice to the question card and the result (`app.js:328`, `:472`), and say plainly on About that the grounding check has not run and 316 questions are not queued for human review. The current disclosure is present but reads as if review has happened.
4. **Close the report loop or stop promising it.** The dialog (`index.html:59–72`) should say "Saved on this device. Nothing is sent." and the reports page (`app.js:492`) needs a real contact address, or it must stop telling learners to send the file to an owner who cannot be reached.
5. **Fix the dead and contradictory actions.** "Review paper" must submit or open a review (`app.js:411`); "Choose a qualification" must not go straight to Door Supervisor (`index.html:35`); and the EFAW page must stop claiming a syllabus exists (`app.js:207`). Each is a label that promises something the click does not deliver.

---

## Verdict

**Block.** The voice and positioning pass: this is an independent study resource, not a sales page, course funnel or portfolio. The factual copy does not pass. The mock result language, the source-quotation claim and the draft disclosure all tell the learner more certainty than the data supports, and the report loop ends nowhere. Fix the HIGH rows before calling the copy finished.
