# Content and curriculum review — Clearline Study

> **Current-build note (11 November, after the design pass):** the GHB item has been re-keyed to Class B with the 2022 Home Office circular as its source, the stale GOV.UK publication URLs have been replaced with live PDF links, the empty EFAW start button is disabled, and mock state now survives a reload. The coverage, grounding, syllabus-tree and source-corpus findings below are still open.


**Reviewed:** 11 November 2026
**Against:** `docs/SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md` §§0–8, with emphasis on 0, 1, 3, 4, 8.
**Live site checked:** https://dk3yyyy.github.io/clearline-study/ returns HTTP 200 and serves the same copy as `site/`.

## Verdict

The site is a good-looking shell around a 365-question **specification-recall draft**. It is not yet a study resource that can be trusted on law, and the public copy claims more provenance and coverage than the repository supports.

The central defect is not the question count. It is that the corpus contains only SIA syllabus documents (90 chunks, all objective bullet lists), so most answers are inferred from general knowledge and then "cited" to the learning objective that names the topic. The bank's own verification report says the semantic grounding check has not been run, and all 365 questions are live in practice and mock modes while still marked `draft`.

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 5 | Should not be publicly usable in this state |
| P1 | 8 | Materially wrong, misleading, or a required gate not met |
| P2 | 11 | Quality, metadata and traceability defects |

---

## What is actually in the repository

| Artefact | Actual | Brief requirement |
|---|---|---|
| Source documents | **17**, all SIA specs plus Get Training / Get Licensed (`sources/manifest.json`) | Specs **plus** statutes, PACE, HSE, NPSA, Licensing Act guidance, CCTV code (§1.4) |
| Corpus chunks | **90**, all syllabus objective lists, `page_start: null` on every chunk | Structured chunks with page/section refs (§2.3–2.4) |
| Objectives | **497** across 14 units | Qualification → unit → session → objective tree (§3.1) |
| Questions | **365**, all `status: "draft"` | ≥ 1,630 by the brief's own unit minimums (~1,700 stated) |
| Objectives with ≥ 1 question | **298 / 497** (60%) | 100% of source-backed objectives (§8) |
| Objectives with ≥ 8 questions | **2 / 497** | 8 per objective (§4.2) |
| Mock papers deliverable at published length | **3 / 18** | All (§8) |

`DOWNLOAD_REPORT.md:13` already discloses the missing source base: "statutes, PACE codes, HSE guidance, NPSA guidance and other GOV.UK publications … are not present … and were not downloaded in this pass." The review treats that as a P0 because the public site does not disclose it.

---

# P0 — publication blockers

## P0-1. 365 unverified draft questions are live, and the "source quote" is usually just the objective

**Evidence**

- `questions/VERIFICATION_REPORT.md:3-9` — 365 read, 365 accepted, **0 rejected**.
- `questions/VERIFICATION_REPORT.md:13` — "It does **not** prove that every answer is semantically supported by the cited chunk. That grounding check still has to be run before publication. Every record has `status: \"draft\"`."
- `site/assets/app.js:597` loads `questions.json` wholesale; there is no `status` filter anywhere in `app.js` (only `res.status` at line 594). Draft records are what the live site serves.
- 365/365 records in `site/data/questions.json` have `"status": "draft"`.

I checked the citation chain mechanically against `corpus/chunks.jsonl`:

| Check | Result |
|---|---:|
| `source_quote` is word-for-word the objective text for that objective | **199 / 365 (55%)** |
| `source_quote` appears anywhere in the cited chunk | 296 / 365 |
| `source_quote` does **not** appear in the cited chunk | **69 / 365** |

Example: `questions/bank.jsonl:26` (`U1-COMMON-0026`, citizen's arrest). The quote is *"know which offences a security officer can make a citizen's arrest for"* — a syllabus instruction, not a statement of which offences qualify. The answer ("theft is an indictable offence") is supplied by the author, not the cited source.

**Why it matters:** §0.2 requires every question to be traceable to a source chunk that supports the answer. A learning objective is not evidence. The pass is structurally valid but semantically unverified, and it is published.

**Fix:** do not export `draft` records to `site/data`; add a build assertion. Run the §4.3 grounding pass with the answer key hidden, and reject any question whose quote does not contain the fact being tested.

---

## P0-2. A live answer key is factually wrong: GHB is Class B, not Class C

**Evidence:** `questions/bank.jsonl:84` (`DS-U2-0024`), mirrored at `site/data/questions.json:2328`.

> "GHB and rohypnol are in which class?" — key: **Class C** — explanation: "GHB, rohypnol, anabolic steroids and other tranquilisers are Class C drugs."

The quoted source (`door-supervisor-final-unit-content.txt:164`) does say Class C, but it is a 2021 specification. GHB, GBL and 1,4-BD were reclassified to **Class B** by the Misuse of Drugs Act 1971 (Amendment) Order 2022, in force **13 April 2022** (GOV.UK circular 001/2022). Rohypnol remains Class C. The question conflates two drugs with different classes and teaches the pre-2022 position.

This is the clearest single failure of the brief's currency rule (§0.2: official source wins; §4.3.4 currency check). It is also a bad item independently: "Class D" is not a UK drug class, so the distractor set is invalid.

**Fix:** re-key as Class B for GHB/GBL, separate rohypnol (Class C), and add a currency review for every drug, arrest, evidence and licensing fact. Any wrong key is release-blocking.

---

## P0-3. Coverage is 22% of the brief, and two qualifications are empty shells

**Evidence:** `syllabus/COVERAGE_REPORT.md` and `questions/VERIFICATION_REPORT.md:24-39`.

| Unit | Questions | Brief minimum | Objectives covered |
|---|---:|---:|---:|
| U1-COMMON | 60 | 300 | 54 / 64 |
| U3-CONFLICT | 30 | 100 | 22 / 38 |
| U4-PI | 25 | 80 | 8 / 19 |
| DS-U2 | 60 | 150 | 43 / 46 |
| SO-U2 | 40 | 150 | 37 / 49 |
| CCTV-U2 | 35 | 150 | 30 / 31 |
| CP (main + PI + DSR) | 47 | 300 | 43 / 167 |
| CVIT | 13 | 100 | 13 / 16 |
| DS-REF / SG-REF / CP-REF | 55 | 180 | 48 / 67 |
| **EFAW** | **0** | **80** | **no unit at all** |
| **VI** | **0** | **40** | **0 / 0** |

- Total: **365 vs 1,630** by the brief's table (the brief rounds to "1,700").
- CP-MAIN alone: **24 of 133 objectives (18%)**, 25 questions.
- `syllabus/syllabus.json:92` defines EFAW with `"units": []`; there is no EFAW objective, session or question anywhere.
- VI has 11 sessions but **zero objectives** (`syllabus.json:3084`), so the syllabus page renders an empty tree.
- 199 objectives are uncovered, and `COVERAGE_REPORT.md` gives no explanation of which lack OGL sources, which §8 requires.

**Public overstatement:** the home page presents all ten qualifications as equivalent cards (`app.js:128-141`), with "365 practice questions" (line 149) but no per-qualification completeness signal. A learner opening EFAW gets an empty qualification; a CP learner gets 18% of the syllabus.

---

## P0-4. Mock exams cannot reproduce the published formats: 15 of 18 papers are short

**Evidence:** `config/exam_formats.json` vs `site/data/questions.json`; `site/assets/app.js:363-370` computes `actual = Math.min(format.questions, available)`.

| Qualification | Unit | Paper | Bank | Short |
|---|---|---:|---:|---:|
| DS / SO / CCTV | U1-COMMON | 72 | 60 | **12** |
| DS | U4-PI | 30 | 25 | 5 |
| SO | SO-U2 | 60 | 40 | **20** |
| CCTV | CCTV-U2 | 40 | 35 | 5 |
| CP | CP-MAIN | 52 | 25 | **27** |
| CP | CP-DSR | 29 | 12 | **17** |
| CP | CP-PI | 30 | 10 | **20** |
| CP | CP-REF | 30 | 15 | 15 |
| CVIT | CVIT | 40 | 13 | **27** |
| DS-REF / SG-REF | — | 30 | 20 | 10 each |
| CP-REF | — | 30 | 15 | 15 |
| EFAW | EFAW | 20 | 0 | **20** |

Only DS-U2 (60/50), DS-U3 (30/20) and SO-U3 (30/20) are deliverable at full length. For U1, every DS, SO and CCTV mock is the same 60 questions in a new order, because the bank equals the available count. The app is honest with a "short bank" pill, but the paper is still titled "72-question paper" (`app.js:404`) and the timer still runs the full official duration — 110 minutes for 60 questions gives 1.83 min/question instead of 1.53, so the practice conditions are easier than the real paper.

**Fix:** either raise the bank above each paper size, or disable "Start" below a defined threshold (e.g. 90% of paper) and stop calling it a full mock. Do not run the official timer on a short paper without an explicit note that time per question is inflated.

---

## P0-5. The source base cannot support the law, force, arrest and first-aid content, yet the site attributes those publishers

**Evidence**

- `sources/manifest.json` — 17 records: 14 specification documents, Get Training, Get Licensed. **No legislation, PACE, HSE, NPSA, Licensing Act s182, CCTV code or ICO document.**
- `DOWNLOAD_REPORT.md:13` confirms this.
- `site/index.html:53` and `site/assets/app.js:530` nevertheless say: "Sources include the Security Industry Authority, **Home Office, Health and Safety Executive, NPSA and legislation.gov.uk**."
- `ATTRIBUTION.md:5` claims "The primary source for this build is the SIA specification pack", which is accurate; the footer is not.

Consequences:

- Arrest questions (`U1-COMMON-0026`–`0030`) assert PACE s24A powers with no PACE text in the repo.
- Force questions (`U4-PI`, `CP-PI`, `CP-REF`) assert "reasonable and necessary" with no statute or CPS guidance.
- First-aid questions (`U1-COMMON-0044`) assert the recovery position with no Resuscitation Council/HSE first-aid source (and RCUK is on the unverified-licence list anyway).
- The only "evidence" is a syllabus bullet naming the topic.

This is both a content gap and an attribution misstatement. Naming HSE/NPSA/Home Office/legislation.gov.uk as sources when none of their documents are held is not a licence breach, but it is a false provenance claim on every page.

**Fix:** acquire the §1.4 documents and rebuild the chunks, or remove the unused publishers from the footer and `ATTRIBUTION.md` until they are genuinely used. Do not cite a statute section from a syllabus.

---

# P1 — materially wrong or misleading

## P1-1. The syllabus tree is corrupted in three places

- **Merged objectives.** 11 objectives are multi-objective blobs because bullet lists were collapsed. Worst: `U3-CONFLICT-S5-O12` is 3,391 characters (the whole scenario list); `CP-MAIN-S2-O1` 968; `U3-CONFLICT-S4-O4` 634; `U4-PI-S1-O2`, `-O3`, `-O4` 487–547. `COVERAGE_REPORT.md:45` reproduces the 3,391-character blob verbatim, so the public coverage report is unreadable.
- **Scenario bullets presented as objectives.** `U3-CONFLICT-S5` (`syllabus.json`, session 5) contains 12 "objectives" that are actually role-play scenario examples — "first aid situation", "lost property (coat/bag/keys etc.)", "arguments/fights", "failing to adhere to drinking-up times". They are not learning outcomes and cannot be taught or assessed as written.
- **Empty session and empty unit.** `U3-CONFLICT-S6` has 0 objectives; every VI session has 0 objectives.

- **Chunk boundaries are wrong.** `sia-common-specification-2021#U1-COMMON-S11` is headed "Session 11: Post incident management" but its text also contains the Appendix A standards-of-behaviour objectives ("wear clothing that is smart, presentable…"). Two different parts of the spec are one retrieval unit, so citations to it cannot be precise.

This is why U3 "coverage" is 58%: the denominator includes scenarios, not objectives. The syllabus map does not currently represent the specifications.

## P1-2. Questions are bucketed into the wrong objectives, so coverage and weakest-topic reporting are wrong

- `U4-PI-S1-O1` holds **17 of the 25** U4-PI questions, including positional asphyxia, reporting force, team support, risk assessment, monitoring a held person, acute behavioural disorder and disengagement. Those belong to different objectives.
- `U3-CONFLICT-S1-O1` ("identify the common situations involving conflict") holds **8** questions, all about de-escalation, communication barriers and escalation signs, and all citing S2 or S6 chunks — not S1.
- 16 questions cite a chunk whose session differs from their `objective_id`. Some are defensible cross-references (the `U1-COMMON-S1-O3` standards questions cite the S11 chunk, which is where the Appendix A standards text was merged), but the U3 cases are straightforwardly wrong: `U3-CONFLICT-0001` maps to S1-O1 and cites `#U3-CONFLICT-S6`; `-0002` to `-0008` map to S1-O1 and cite S2.

Consequence: the mock result's "weakest objectives" panel aggregates unrelated questions under one label, and the coverage report counts an objective as covered when nothing specific to it was asked. **The 298/497 coverage figure is an upper bound, not a measurement.**

`VERIFICATION_REPORT.md:45-70` lists 24 "remapped objective IDs" without saying what they were remapped to or why. This looks like keyword matching against question text, not objective-level authoring.

## P1-3. Exam format metadata contains invented and misplaced entries

- `config/exam_formats.json:29` — CP-MAIN "52 questions, **60 minutes**". Get Training (`sia-get-training.txt:991-996`) gives 52 questions and 70% but **no duration**. The 60 minutes is invented, and the UI calls it "official" (`app.js:370`).
- `config/exam_formats.json:30` — CP-DSR "29 questions, **45 minutes**". The source (`sia-get-training.txt:1020-1024`) gives 29 and 72% but no duration. Also invented.
- `config/exam_formats.json:32` — **CP-REF is listed as a unit of the CP qualification.** CP-REF is a separate refresher qualification. The CP mock page therefore offers a Close Protection refresher paper (`app.js:363`, rows are built from `config.units`, not syllabus units).
- **Missing CP paper.** Get Training lists "Principles of Terror Threat Awareness" as 10 questions / 20 minutes (`sia-get-training.txt:1026-1030`). It appears in CP-MAIN session 13 of the syllabus but has no exam format, and its objectives are all listed as uncovered.
- `config/exam_formats.json:42,48,54` — DS-REF, SG-REF and CP-REF are marked `"unconfirmed"` yet the page displays "Pass mark from the source" (`app.js:370`). The 30/45/70–80% values are sensible defaults, not source facts.
- `config/exam_formats.json:5-9` — U1 is marked `"practical": false`, but Get Training (`sia-get-training.txt:909-911`) requires an externally set incident-report practical for U1. There is no U1 practical checklist in `checklists.json`.
- `config/exam_formats.json:59-64` — EFAW has a 20-question paper but no syllabus and no questions.

## P1-4. The human-review gate is not enforced, including for physical intervention and first aid

The brief (§4.3.7) requires every use-of-force, arrest, physical-intervention and first-aid question to carry `requires_human_review: true` and not be published until approved.

- **8 of 25 U4-PI questions are `false`**, including "What must a door supervisor do while a person is being held?", "Which condition must a door supervisor be able to recognise…", "Which statement about physical interventions on the ground is correct?", and "Which description matches the techniques taught in the escorting session?".
- **5 of 10 CP-PI questions are `false`**, including the concentric-layers and physical-threat questions.
- **`U1-COMMON-0044`** (unconscious but breathing → recovery position) is first aid and is `false`.

Even where the flag is set (49 records), the app publishes them regardless. The flag currently has no effect other than documentation.

## P1-5. The bank has a strong answer-position cue and almost no depth per objective

- **The correct answer is the longest option in 264/365 questions (72%).** By unit: SO-U2 88%, CCTV-U2 86%, CVIT 85%, U1 80%, DS-U2 63%, CP-REF **100%**. The brief's style lint (§4.3.5) explicitly requires that the answer is not always the longest; this is a test-wiseness cue a learner can exploit.
- **264 of the 298 covered objectives have exactly one question.** Only 2 objectives have 8 or more. A mock that samples 72 U1 questions from a 60-question bank gives no objective-level diagnostic.
- Near-duplicate concepts exist, e.g. `U4-PI-0005` / `U4-PI-0011` both ask what positional asphyxia is, and `CP-REF-0006` / `CP-REF-0007` both ask whether the qualification confers powers.

## P1-6. Question style is specification-glossary recall, not professional knowledge

CP-MAIN is the clearest case. Of 25 questions:

- `CP-MAIN-0001` — "Where does the CP specification set these out?" Answer: "Appendix A".
- `CP-MAIN-0003` — "Which two types of reconnaissance must a CP operative be able to tell apart?" Answer: "Discreet and overt".
- `CP-MAIN-0005` — "Which procedures does the CP specification say are important?" Answer: "SOPs".
- `CP-MAIN-0025` — "Which route plan must a CP operative produce…?" Answer: "A primary and secondary route plan".

These test whether the learner has read the syllabus wording, not whether they can do the job. The U4-PI bank has the same problem in tautological form: "What should a door supervisor aim to do for everyone involved during a physical intervention?" → "Reduce the risk of harm to all parties"; "How should a door supervisor support colleagues…?" → "By working as a team and communicating". The explanation restates the answer.

The brief asks for roughly 40% scenarios (§4.2). Only a minority of items are genuine scenarios; most are one-line recall with an invented context sentence bolted on.

## P1-7. Public copy overstates what the bank supports

| Claim | Location | Reality |
|---|---|---|
| "Every answer points to the source document it came from." | `site/assets/app.js:147` | True only at document level; 55% of quotes are objective text, 69 are not in the cited chunk. |
| "Each practice question includes the source quotation behind its answer." | `site/assets/app.js:530` | Same defect. A quote that says "know which offences…" does not support an answer about theft. |
| "Pass mark from the source" | `site/assets/app.js:370` | False for DS-REF, SG-REF, CP-REF and EFAW, which are explicitly `unconfirmed` in `config/exam_formats.json:42-64`. |
| "Last content build: <today>" | `site/assets/app.js:530` | Renders `new Date()`, so it always says today. No build date exists. |
| Footer names Home Office, HSE, NPSA, legislation.gov.uk | `site/index.html:53`, `app.js:530` | None are in the source pack. |

These are not cosmetic. The site's differentiator is provenance; the copy currently asserts a standard the data does not meet.

## P1-8. The verification report is not the verification the brief requires, and its target is wrong

- `VERIFICATION_REPORT.md:13` states the grounding check "still has to be run". The report is a JSONL structural check, not §4.3's five-step pipeline (grounding, distractor, duplicate, currency, style).
- **0 rejections out of 365** is not a credible outcome for a first-pass LLM-generated bank; it indicates no semantic rejection step ran.
- The report's target is **1,450** (`VERIFICATION_REPORT.md:8`), not the brief's 1,630. The difference is CP (200 budgeted vs 300) and EFAW (omitted entirely). It also omits EFAW from the counts table (`VERIFICATION_REPORT.md:24-39`).
- `COVERAGE_REPORT.md:314` ends with **"Every objective has at least one drafted question."** This directly contradicts the 199 uncovered objectives listed above it. It is a template bug, but it is a false statement in a public-report folder.

---

# P2 — quality, metadata and traceability

1. **Question schema is incomplete.** All 365 records lack `type` (`mcq_single`), `version` and `created_by`, all required by §4.1. `type` is absent entirely; there is no way to distinguish question types.
2. **`spec_version` is wrong for most of the bank.** All 365 records say `"2021"`, including CP (2022), CP-PI/CP-DSR (2022), DS/SG refreshers (2024) and CP-REF (2025). This defeats §7's archive-on-spec-change logic.
3. **Citations have no page or section.** `corpus/chunks.jsonl` has `page_start: null` and `page_end: null` on all 90 chunks. The UI shows only a document title (`app.js:327`), not the section or page the brief requires (§5.2.2).
4. **Manifest is not the §1.1 manifest.** All 17 records lack `url`, `unit_tags`, HTTP status and `status` history; `sha256` is present. There is no way to re-check a source from the manifest.
5. **U1 practical is missing.** The incident-report assessment (`sia-get-training.txt:909-911`) has no checklist, and `config/exam_formats.json` sets `practical: false` for U1.
6. **EFAW/VI are invisible in the "About" scope.** `app.js:530` lists DS, SO, CCTV, CP, CViT and the refreshers, while the home page shows EFAW and VI cards. The two descriptions disagree.
7. **README says "not endorsed by the SIA, NATO or any awarding organisation"** (`README.md:58`). "NATO" is presumably a typo for NaCTSO, but as written it is a false and confusing statement in a public repo.
8. **`ATTRIBUTION.md:15` discloses use of practice-question PDFs** ("treated as reference material for format only"). The brief says awarding-organisation and commercial practice papers are not allowed and "you should not have any" (§0.1). Even format-only use should be removed and the disclosure deleted, not advertised.
9. **`DS-U2-0040`** treats "CCTV footage and a written log" as examples of **documentary evidence**. CCTV is generally real/electronic evidence; a written log is documentary. The key is at best imprecise.
10. **`CCTV-U2-0012`** says UAV pilots follow "the Air Navigation Order 2018". The principal order is the Air Navigation Order 2016; the 2018 instrument is an amendment order. The wording comes from the 2021 spec, but it is imprecise and should be re-checked against current CAA rules.
11. **`U1-COMMON-0026`** presents citizen's arrest as turning only on whether the offence is indictable. PACE s24A also requires reasonable grounds and that arrest is **necessary**; the explanation never mentions necessity. A learner could conclude any theft justifies arrest.
12. **Negative stem style.** `DS-REF-0015` ("What should the door supervisor avoid doing?") and `CVIT-0003` use negatives without the CAPS emphasis the brief requires (§4.2).
13. **Duplicate concepts.** `U4-PI-0005` vs `U4-PI-0011`; `CP-REF-0006` vs `CP-REF-0007`; `SO-U2-0005` vs `SO-U2-0012`. The duplicate check either did not run or used a threshold that missed conceptual duplicates.

---

# Missing vs can improve

## Missing (required by the brief, absent from the repo)

| # | Missing item | Evidence |
|---|---|---|
| M1 | The content corpus: statutes, PACE Code A/G, HSE guidance, NPSA, Licensing Act s182, CCTV code, ICO, Martyn's Law guidance | `manifest.json`; `DOWNLOAD_REPORT.md:13` |
| M2 | EFAW as a working module: syllabus, 80 questions, first-aid objectives | `syllabus.json:92` (`units: []`); 0 questions |
| M3 | VI objectives and 40 questions | `syllabus.json:3084`; all sessions 0 objectives |
| M4 | CP terror-threat-awareness paper (10 q / 20 min) | `config/exam_formats.json:26-34`; `sia-get-training.txt:1026-1030` |
| M5 | CP "Working as a Close Protection Operative" portfolio unit | `sia-get-training.txt:997-999`; absent from `syllabus.json` |
| M6 | 199 uncovered objectives, including 109 of CP-MAIN's 133 | `COVERAGE_REPORT.md` |
| M7 | ~1,265 questions to reach the brief's unit minimums | 365 vs 1,630 |
| M8 | U1 practical incident-report checklist | `checklists.json` has no U1 key |
| M9 | Confirmed refresher paper formats | `config/exam_formats.json:42-58` marked `unconfirmed` |
| M10 | Source URLs and page references on questions | `questions.json` has no `source_url`; chunks have null pages |

## Can improve (present but weak, wrong or overstated)

| # | Improvement | Evidence |
|---|---|---|
| I1 | Replace objective-text "quotes" with the sentence that proves the answer | 199/365 exact objective matches; 69 not in chunk |
| I2 | Re-key and re-check currency (GHB; drug classes; arrest necessity; evidence types; drone law) | `DS-U2-0024`; `U1-0026`; `DS-U2-0040`; `CCTV-U2-0012` |
| I3 | Fix the answer-length cue (72% longest; 100% in CP-REF) | computed from `questions.json` |
| I4 | Rebuild U3/CP/U4 objectives and remap questions out of bucket objectives | 17 in `U4-PI-S1-O1`; 8 in `U3-CONFLICT-S1-O1` |
| I5 | Rewrite CP-MAIN and U4-PI items as applied scenarios, not glossary lookups | `CP-MAIN-0001`–`0025`; `U4-PI-0012` etc. |
| I6 | Correct CP/CP-DSR timers; move CP-REF out of CP; add CP terror paper | `config/exam_formats.json:29-32` |
| I7 | Enforce `requires_human_review` for all PI and first-aid items, and gate publication on it | 13 PI items + `U1-0044` unflagged |
| I8 | Remove the unconfirmed "Pass mark from the source" claim | `app.js:370`; config `unconfirmed` entries |
| I9 | Replace the dynamic "Last content build" date with a real build timestamp | `app.js:530` |
| I10 | Remove Home Office/HSE/NPSA/legislation from attribution until used | `index.html:53`; `app.js:530` |
| I11 | Fix the false final line in the coverage report | `COVERAGE_REPORT.md:314` |
| I12 | Add `type`/`version`/`created_by`; correct `spec_version` per document | all 365 records |
| I13 | Add page/section to the practice citation | `app.js:327`; chunks null pages |
| I14 | Fix the "NATO" line and the practice-PDF disclosure | `README.md:58`; `ATTRIBUTION.md:15` |

---

# Five highest-priority actions

1. **Stop serving unverified drafts.** Add a `status === "published"` filter to `export_site_data.py` and `app.js`, set every current record to `draft`, and let practice/mock modes show an "in review" state. A live site that says "every answer points to the source" cannot serve 365 records whose own verification report admits the grounding check was never run.
   *Done when:* `site/data/questions.json` contains zero records without a passed grounding check, and mock start buttons are disabled for units below the paper count.

2. **Fix the wrong keys before anything else ships.** Re-key `DS-U2-0024` (GHB → Class B; rohypnol Class C separately; remove "Class D"), then run a documented currency pass over every drug, arrest, use-of-force, evidence and first-aid item against current OGL text. Add the §4.3.4 currency check to `verify.py` so a 2021 spec cannot silently override a 2022 statutory change.
   *Done when:* no question key contradicts legislation in force on the review date, and the currency check is enforced in CI.

3. **Build the missing factual corpus and re-cite the bank.** Download the §1.4 documents (PSIA 2001, PACE + Codes A/G, OAPA, Theft Act, MDA, Licensing Act 2003 + s182, HSWA, HSE INDG series, NPSA, CCTV code, ECHR/DPA), chunk them with page numbers, and require every question's `source_quote` to be a verbatim sentence from the cited chunk that entails the key.
   *Done when:* `corpus/chunks.jsonl` has page-bearing chunks from non-spec sources, and 0 questions have an objective-text quote.

4. **Rebuild the syllabus tree and remap the bank.** Split the 11 merged objectives; delete the U3-S5 scenario bullets from the objective tree (move them to a scenarios list); parse the VI objectives; add the CP terror unit and the CP portfolio unit; then remap every question to a specific objective and report the true coverage.
   *Done when:* no objective exceeds ~200 characters, no session has 0 objectives, and no objective holds more than its share of a unit's questions (kill the 17-in-one and 8-in-one buckets).

5. **Right-size the public promise, or the bank.** Either raise each unit to the §4.2 minimum, or label each qualification "partial — X of Y objectives covered" on the home card, qualification page and mock table. Correct the CP timers/nesting, mark unconfirmed refresher formats as such in the UI, remove unused publishers from the footer, and replace the dynamic build date with a real one.
   *Done when:* no page claims a source, pass mark or completeness the data does not have; every mock either meets its paper size or is visibly not a full mock.

---

## Scope and method note

I read the brief, all three reports, `manifest.json`, `exam_formats.json`, `checklists.json`, the full 365-record bank, the 497-objective syllabus, and the app's practice/exam rendering paths. Quantitative checks were run against the JSON (citation match, objective mapping, option-length distribution, per-paper shortfall, review flags). I did not independently re-solve all 365 questions; unit-level stem/answer inspection covered U1, U4-PI, CP-MAIN, DS-U2, SO-U2, CCTV-U2 and all refreshers, and the legal spot-checks are cited above. No app, data or report file was modified.
