# SIA Study & Mock-Test Site: Instructions for the AI Agent

You are building a study and mock-exam website covering **every** UK SIA (Security Industry Authority) licence-linked qualification. All of them are first-class: each gets its own syllabus, learn mode, practice mode, mock exams and progress tracking.

| Code | Qualification | Units (shared units are written once and reused) |
|---|---|---|
| `DS` | Level 2 Award for Door Supervisors in the Private Security Industry | U1 Common, U2 Door Supervision, U3 Conflict Management, U4 Physical Intervention |
| `SO` | Level 2 Award for Security Officers in the Private Security Industry | U1 Common, U2 Security Officer, U3 Conflict Management |
| `CCTV` | Level 2 Award for CCTV Operators (Public Space Surveillance) | U1 Common, U2 CCTV |
| `CP` | Level 3 Certificate for Close Protection Operatives | CP main units, CP Physical Intervention, CP Door Supervisor Responsibilities (+ U1 Common if the current spec requires it) |
| `CVIT` | Level 2 Award for Cash and Valuables in Transit Operatives | CViT units |
| `DS-REF` | Door Supervisor Refresher (licence renewal) | Refresher sessions + PI refresher |
| `SG-REF` | Security Guard/Officer Refresher (licence renewal) | Refresher sessions |
| `CP-REF` | Close Protection Refresher (PI refresher) | CP PI refresher |
| `VI` | Vehicle Immobilisation (Northern Ireland only) | Optional / lowest priority |
| `EFAW` | First aid prerequisite (knowledge revision only) | Supporting module for DS, SO and CP |

Shared units (U1 Common, U3 Conflict Management) are stored once. Their questions are tagged with every qualification they belong to, so progress on U1 counts toward DS, SO and CCTV.

Work through the phases in order. Do not skip the verification steps. When something in this file conflicts with what you find in an official source, the official source wins. Note the conflict in `NOTES.md`.

---

## 0. Ground rules (read first)

### 0.1 Licensing: what you may and may not use
- **ALLOWED (Open Government Licence v3.0, "OGL"):** anything from `legislation.gov.uk`, `gov.uk` / `assets.publishing.service.gov.uk` (Home Office, SIA), `hse.gov.uk` / `books.hse.gov.uk`, `npsa.gov.uk`, `cps.gov.uk`, and the text of `ico.org.uk`. You may download these, extract text, and generate and publish questions from them.
- **Attribution is mandatory.** Put this in the site footer and in `ATTRIBUTION.md`:
  > Contains public sector information licensed under the Open Government Licence v3.0. Sources include the Security Industry Authority, Home Office, Health and Safety Executive, NPSA and legislation.gov.uk. This site is not endorsed by or affiliated with the SIA or any awarding organisation.
- **Never use logos**, and never use images from ICO, GOV.UK or HSE.
- **NOT ALLOWED to ingest or derive from:** ProtectUK / NaCTSO pages and PDFs (restricted licence, no modification); College of Policing APP (non-commercial licence); the PSHE Association Run Hide Tell pack; Pearson/Highfield/QNUK/SFJ/NOCN specifications, sample papers and workbooks; and any mock-test site (Get Licensed, GuardPass, Hurak, PassNova, London Security College, Securex, test-questions.com, Practice Test Geeks, etc.). Do not scrape them, paraphrase them or copy their questions.
- **Unverified licences: exclude** the Purple Guide, the Green Guide (SGSA), Resuscitation Council UK, St John Ambulance, FRANK, BSIA, Barnardo's, Ask for Angela and WAVE materials.
- Real SIA exam papers are confidential. Every question on the site must be **original**, generated from OGL facts.

### 0.2 Accuracy rules
- Every question must be traceable to a specific source chunk (document plus page or section). Store that reference.
- If you cannot support an answer from the downloaded sources, **do not create the question**.
- Prefer the **current** version of every document (see §1.4). Law changes: use legislation.gov.uk *revised* text (`/data.pdf`), not "as enacted".
- Scope is England & Wales law unless a question is explicitly tagged `scotland`.
- Physical intervention (DS Unit 4, CP PI and the PI refreshers): **knowledge questions only** (law, duty of care, risks, positional asphyxia warning signs as described in the SIA spec). Never describe techniques step by step. Add a site note that PI skills must be learned from a qualified trainer.

---

## 1. Phase 1: Acquire sources

### 1.1 Folder layout
```
sources/
  00-sia-specs/          # syllabus documents (what must be known)
  01-sia-regulatory/
  02-law/
  03-health-safety-fire/
  04-terrorism-martyns-law/
  05-safeguarding/
  06-licensing-door/
  07-cctv/
  manifest.json          # one entry per file: url, local_path, sha256, pages, licence, unit_tags, status
```

### 1.2 Download procedure
1. For every URL below, run `curl -sIL -o /dev/null -w "%{http_code}"` first. Log the status code.
2. Download with `curl -L --retry 3 -A "Mozilla/5.0"`. Check that the file is a real PDF (`file` / `pdfinfo`). HTML error pages saved as `.pdf` are a common failure.
3. If a legislation.gov.uk `/data.pdf` fails or times out (very large Acts), fall back to `<act-url>/contents` and save the HTML text instead.
4. If a GOV.UK asset URL 404s, open the parent GOV.UK publication page, find the current asset link, and update the manifest.
5. Record `licence: "OGL-3.0"` and the source publisher for every file.

### 1.3 SIA specifications (the syllabus; highest priority)
Hub page (check here for newer versions): https://www.gov.uk/guidance/read-the-specifications-for-sia-licence-linked-training

```
https://assets.publishing.service.gov.uk/media/6061dd69e90e072d8f8b8638/sia-common-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/6061f28d8fa8f55b6fae563f/sia-ds-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/63ef6d8f8fa8f5612b499c2c/door-supervisor-final-unit-content.pdf
https://assets.publishing.service.gov.uk/media/6061dd35d3bf7f5ce4f581ba/sia-conflict-management-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/6061f2bee90e072d9d0d4214/sia-physical-intervention-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/6061f318e90e072d97f87650/sia-sg-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/6061f2e8d3bf7f5ce74c29f3/sia-cctv-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/62389474e90e0779a0082628/sia-cp-specification-2022.pdf
https://assets.publishing.service.gov.uk/media/6238955a8fa8f540eb4c12f6/sia-cp-physical-intervention-specification-2022.pdf
https://assets.publishing.service.gov.uk/media/623895ace90e0779a4d55815/sia-cp-ds-responsiblities-specification-2022.pdf
https://assets.publishing.service.gov.uk/media/6061dc888fa8f55b67fb3612/sia-cvit-specification-2021.pdf
https://assets.publishing.service.gov.uk/media/670f919e3b919067bb483246/sia-ds-refresher-specification-2024.pdf
https://assets.publishing.service.gov.uk/media/670f91c1080bdf716392f438/sia-sg-refresher-specification-2024.pdf
https://assets.publishing.service.gov.uk/media/68add0a9960e2d135b4c8e3c/sia-cp-physical-intervention-refresher-specification-2025.pdf
https://assets.publishing.service.gov.uk/media/5f857671d3bf7f6b99980884/sia-vi-specification.pdf
https://assets.publishing.service.gov.uk/media/62457e3ed3bf7f32a93d3bb2/sia-get-training.pdf
https://assets.publishing.service.gov.uk/media/6929deb7b3b9afff34e9626b/sia-get-licensed.pdf
```
Notes:
- `sia-vi-specification.pdf` (vehicle immobilisation) is low priority. That licence is no longer issued in England & Wales.
- Check whether a newer Get Licensed edition (May 2026) or Get Training edition exists on GOV.UK. Use the newest one and keep older ones only for reference.

### 1.4 Content sources (the "answers"); all OGL

**SIA regulatory**
```
https://assets.publishing.service.gov.uk/media/627a2055e90e074ee7344bfa/sia-security-at-events.pdf
https://assets.publishing.service.gov.uk/media/6aec53871c837137040e7d85/Security_Industry_Authority_annual_reports_and_accounts_2025_to_2026.pdf
https://assets.publishing.service.gov.uk/media/69774e71276692606c0137fe/sia-annual-report-2024-25.pdf
https://assets.publishing.service.gov.uk/media/6a22aa52f56856fd11c0b09e/sia-strategic-plan-2026-2029.pdf
https://www.legislation.gov.uk/ukpga/2001/12/data.pdf
```
HTML pages to save as text: https://www.gov.uk/guidance/apply-for-an-sia-licence and https://www.gov.uk/government/publications/sia-licensing-first-aid-training-requirement/first-aid-training-requirement-for-door-supervisors-and-security-guards

**Law, powers, use of force, rights, data**
```
https://www.legislation.gov.uk/ukpga/1984/60/data.pdf
https://assets.publishing.service.gov.uk/media/5f1e7e6ee90e07456f3c484e/pace-code-g-2012.pdf
https://www.legislation.gov.uk/ukpga/1967/58/data.pdf
https://www.legislation.gov.uk/ukpga/2008/4/data.pdf
https://assets.publishing.service.gov.uk/media/5a7ac1fbe5274a319e77a853/self-defence-circular.pdf
https://www.cps.gov.uk/sites/default/files/documents/publications/Householders-2018.pdf
https://www.legislation.gov.uk/ukpga/1998/42/data.pdf
https://www.legislation.gov.uk/ukpga/2010/15/data.pdf
https://www.legislation.gov.uk/ukpga/2018/12/data.pdf
https://www.legislation.gov.uk/eur/2016/679/data.pdf
```
- PACE Code A: the 2015 PDF is superseded. Get the **2023 Code A** from the GOV.UK "PACE codes of practice" collection. Code G 2012 is current.
- CPS HTML (save text): https://www.cps.gov.uk/legal-guidance/self-defence-and-prevention-crime
- ICO HTML (text only): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/cctv-and-video-surveillance/

**Health, safety, fire, first aid**
```
https://www.legislation.gov.uk/ukpga/1974/37/data.pdf
https://www.legislation.gov.uk/uksi/1999/3242/data.pdf
https://www.legislation.gov.uk/uksi/2013/1471/data.pdf
https://www.legislation.gov.uk/uksi/1981/917/data.pdf
https://www.legislation.gov.uk/uksi/1996/341/data.pdf
https://www.legislation.gov.uk/uksi/1992/2793/data.pdf
https://www.hse.gov.uk/pubns/indg163.pdf
https://www.hse.gov.uk/pubns/indg453.pdf
https://books.hse.gov.uk/gempdf/indg244.pdf
https://books.hse.gov.uk/gempdf/indg73.pdf
https://books.hse.gov.uk/gempdf/indg69.pdf
https://www.hse.gov.uk/pubns/indg143.pdf
https://www.hse.gov.uk/pubns/priced/l64.pdf
https://www.hse.gov.uk/pubns/priced/l74.pdf
https://www.hse.gov.uk/pubns/indg214.pdf
https://www.legislation.gov.uk/uksi/2005/1541/data.pdf
https://www.merseyfire.gov.uk/media/1748/guide_7-large_places_of_assembly.pdf
https://www.cravendc.gov.uk/media/8576/fire-safety-risk-assessment.pdf
```
- The two fire-safety assembly guides are 2006 texts mirrored on fire-service and council sites. Use them for general concepts (fire triangle, extinguisher types, evacuation) only, not for current legal duties.
- Crowd management: HSG154 is **withdrawn**. Save the text of HSE's event-safety pages instead, e.g. https://www.hse.gov.uk/event-safety/crowd-management-controls.htm

**Terrorism & Martyn's Law**
```
https://www.legislation.gov.uk/ukpga/2025/10/data.pdf
https://www.legislation.gov.uk/ukpga/2025/10/pdfs/ukpgaen_20250010_en.pdf
https://assets.publishing.service.gov.uk/media/69d7c1ff4abe5b6c5ddf26c9/Web_accessible_PDF_-_Terrorism__Protection_of_Premises__Act_2025_Stat_Guidance.pdf
https://assets.publishing.service.gov.uk/media/6a54a9302467584757371da1/260703_-_Terrorism__Protection_of_Premises__Act_2025_-_Guidance_-_Notification_Requirement.pdf
https://assets.publishing.service.gov.uk/media/6ae86dc6713f8880fe546280/The_terrorism_protection_of_premises_act_2025_Martyns_law.pdf
https://www.legislation.gov.uk/ukpga/2015/6/data.pdf
https://assets.publishing.service.gov.uk/media/65e5a5bd3f69457ff1035fe2/14.258_HO_Prevent+Duty+Guidance_v5d_Final_Web_1_.pdf
https://www.npsa.gov.uk/system/files/documents/npsa-threat-recognition-guide.pdf
https://www.npsa.gov.uk/system/files/documents/NPSA%20Protecting%20Against%20Terrorism_0.pdf
https://www.npsa.gov.uk/system/files/documents/npsa-control-rooms-guidance-dec-2016.pdf
```
- For each NPSA PDF, check the licence line inside the document. If it says anything other than OGL, move it to `excluded/` and log it.
- Run Hide Tell / HOT principles appear in the SIA common specification itself. You may write questions from **the SIA spec's wording**, but not from ProtectUK pages.

**Safeguarding, vulnerability, spiking**
```
https://assets.publishing.service.gov.uk/media/65322ad1e839fd001486720d/2023_FOR_PUBLICATION_-_Criminal_exploitation_of_children_young_people_and_vulnerable_adults_county_lines1.pdf
https://assets.publishing.service.gov.uk/media/6ae9ee4d4bd624c77e5d68af/Modern_Slavery_Statutory_Guidance.pdf
https://www.legislation.gov.uk/ukpga/2015/30/data.pdf
https://www.legislation.gov.uk/ukpga/2003/42/data.pdf
```

**Licensing, door supervision offences, drugs, weapons**
```
https://assets.publishing.service.gov.uk/media/6ae4a70516c8facc203ad9d2/Revised_Section182_Guidance_PUBLICATION_.pdf
https://assets.publishing.service.gov.uk/media/6aa8076ca378ca4ee34ee25f/September_2026_S182_Guidance.pdf
https://www.legislation.gov.uk/ukpga/2003/17/data.pdf
https://www.legislation.gov.uk/asp/2005/16/data.pdf
https://www.legislation.gov.uk/ukpga/Vict/24-25/100/data.pdf
https://www.legislation.gov.uk/ukpga/1968/60/data.pdf
https://www.legislation.gov.uk/ukpga/1971/48/data.pdf
https://www.legislation.gov.uk/ukpga/1986/64/data.pdf
https://www.legislation.gov.uk/ukpga/Eliz2/1-2/14/data.pdf
https://www.legislation.gov.uk/ukpga/1988/33/data.pdf
https://www.legislation.gov.uk/ukpga/1997/21/data.pdf
https://www.legislation.gov.uk/ukpga/2019/17/data.pdf
https://www.legislation.gov.uk/ukpga/1971/38/data.pdf
https://www.legislation.gov.uk/ukpga/2016/2/data.pdf
https://assets.publishing.service.gov.uk/media/67b5d4c2b56d8b0856c2fecf/Section+179+of+the+Licensing+Act+2003+right+of+entry+to+premises+being+used+for+a+licensable+activity__2_.pdf
```
- **Section 182 guidance:** two files exist, both dated November 2026. Diff them and keep only the newest. The default is `6ae4a705…`. Delete the other and log the decision.

**CCTV**
```
https://assets.publishing.service.gov.uk/media/619b7b50e90e07044a559c9b/Surveillance_Camera_CoP_Accessible_PDF.pdf
https://assets.publishing.service.gov.uk/media/61a73dd6d3bf7f055c4b7723/E02688418_Surveillance_Camera_Code_EM_Accessible_v02.pdf
https://assets.publishing.service.gov.uk/media/6a8d69095a0c25165ae4642b/SC_Guide_for_Local_Authorities.pdf
https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1054263/Code_of_Practice-guide_to_the_12_principles.pdf
https://www.legislation.gov.uk/ukpga/2012/9/data.pdf
https://www.legislation.gov.uk/ukpga/2000/23/data.pdf
```

**Close Protection / CViT:** there are no dedicated OGL sources. Build these questions from the SIA CP/CViT specifications plus the general law (Theft Act robbery, use of force), HSE INDG73 (lone working) and INDG69 (violence), NPSA guidance, and FCDO travel advice (https://www.gov.uk/foreign-travel-advice, HTML) for CP threat assessment concepts.

### 1.5 Phase 1 acceptance criteria
- `manifest.json` lists every file with HTTP status, sha256, page count, licence and unit tags.
- `DOWNLOAD_REPORT.md` lists failures, fallbacks used, documents you excluded, and why.
- No file from §0.1's NOT ALLOWED list is present.

---

## 2. Phase 2: Extract and chunk

1. Extract text with `pdftotext -layout` (fallback: `pdfplumber`). Check each PDF has a text layer (`pdffonts`). If it is scanned, OCR it and flag it in the manifest.
2. Clean the text: strip running headers and footers, page numbers, and "Page X of Y"; fix hyphenated line breaks.
3. Chunk by **structure, not fixed size**:
   - Specs: one chunk per session / learning objective.
   - Acts: one chunk per section (keep the section number and title).
   - Guidance: one chunk per heading, roughly 300–800 words.
4. Save to `corpus/chunks.jsonl` with this schema:
```json
{"chunk_id":"s182-2026-11#para-10.10","doc_id":"s182-2026-11","title":"...","heading_path":["Chapter 10","Conditions"],"page_start":72,"page_end":73,"text":"...","unit_tags":["DS-U2"],"jurisdiction":"EW","licence":"OGL-3.0","source_url":"..."}
```
5. Unit tag vocabulary: `U1-COMMON`, `DS-U2`, `U3-CONFLICT`, `U4-PI`, `SO-U2`, `CCTV-U2`, `CP-MAIN`, `CP-PI`, `CP-DSR`, `CVIT`, `DS-REF`, `SG-REF`, `CP-REF`, `VI`, `EFAW`. Also keep a `qualifications` array on every chunk and question, e.g. `["DS","SO","CCTV"]` for U1 content.

---

## 3. Phase 3: Build the syllabus map

1. Parse each SIA specification into a tree: **Qualification → Unit → Session → Objective (learning outcome)**. Save it as `syllabus/syllabus.json`. Each objective gets a stable ID, e.g. `DS-U2-S2-O3`.
2. For each objective, retrieve the top supporting chunks from `corpus/chunks.jsonl` (keyword plus embedding search). Store `objective_id → [chunk_ids]` in `syllabus/coverage.json`.
3. Produce `syllabus/COVERAGE_REPORT.md` listing objectives with **no** supporting chunk. Those objectives get questions only if the SIA spec text itself states the fact. Otherwise leave them uncovered and report them.
4. **Exam formats for every qualification and unit:** read them from the *Get Training* document (question counts, durations, pass marks, practical components) and store them in `config/exam_formats.json`, keyed by qualification and unit. Do not hardcode them from memory. If a format is missing from Get Training, mark it `"source": "unconfirmed"` and set a sensible default (e.g. 40 questions, 60 minutes, 70%) that the owner can edit. Reference values to cross-check (flag any mismatch):
   - U1 Common (shared by DS, SO and CCTV): 72 MCQs, 110 minutes.
   - DS Unit 2: 50 MCQs plus practical (searching, communication devices).
   - SO Unit 2: MCQ paper (sources disagree, 50 or 60 questions; confirm) plus practical.
   - CCTV Unit 2: about 40 MCQs, 60 minutes, plus practical (operating CCTV equipment).
   - U3 Conflict Management and U4 Physical Intervention: an MCQ paper each plus practical.
   - CViT: about 40 MCQs, 60 minutes.
   - CP: multiple exams plus practical tasks over 140+ hours; take the structure from the CP spec and Get Training.
   - Refreshers: short MCQ papers plus practical.
   - MCQ pass mark: 70% unless the source says otherwise. Practicals: 100% (not testable on the site; show them as checklists).

---

## 4. Phase 4: Generate the question bank

### 4.1 Question schema (`questions/bank.jsonl`)
```json
{
  "id": "DS-U2-S1-O1-0007",
  "objective_id": "DS-U2-S1-O1",
  "unit": "DS-U2",
  "type": "mcq_single",
  "difficulty": 2,
  "stem": "Which of the following is a crime against property?",
  "options": ["Common assault", "Criminal damage", "Affray", "Battery"],
  "answer_index": 1,
  "explanation": "Criminal damage (Criminal Damage Act 1971, s1) is an offence against property; the others are offences against the person or public order.",
  "source_chunk_ids": ["cda-1971#s1"],
  "source_quote": "<= 25 words copied from the chunk that proves the answer>",
  "jurisdiction": "EW",
  "status": "draft",
  "created_by": "agent",
  "version": 1
}
```
`status` progresses `draft → auto_verified → human_reviewed → published`.

### 4.2 Generation rules
- One correct answer and **three plausible distractors**. Distractors must be clearly wrong according to the source, not merely "less good".
- SIA style: four options (A–D), single best answer, plain English, around B1–B2 reading level (users include non-native English speakers). No "all of the above" or "none of the above". No negatives unless emphasised in CAPS ("Which is NOT…").
- Mix the question types. Roughly 60% are knowledge-recall questions and 40% are scenarios ("A customer refuses a search at the door. What should the door supervisor do?"). Scenarios must still be answerable from the source.
- **Targets: all qualifications.** Aim for at least 8 questions per objective everywhere, with these minimum totals per unit:

  | Unit / qualification | Minimum questions |
  |---|---|
  | U1 Common (shared) | 300 |
  | DS U2 | 150 |
  | U3 Conflict Management (shared) | 100 |
  | U4 Physical Intervention (knowledge only) | 80 |
  | SO U2 | 150 |
  | CCTV U2 | 150 |
  | CP (all units combined) | 300 |
  | CViT | 100 |
  | DS-REF / SG-REF / CP-REF | 60 each |
  | EFAW revision | 80 |
  | VI (optional) | 40 |

  That is roughly 1,700 or more questions in total.
- **Build order:** shared units first (U1, U3), because they unlock several qualifications at once. Then DS U2, U4, SO U2, CCTV U2, the refreshers, CViT, CP, EFAW and VI. Ship a qualification as soon as its units meet their minimums; you don't need to wait for all of them.
- **CP and CViT have thin source material.** Prefer fewer, well-grounded questions over hitting the target. Report any shortfall in `COVERAGE_REPORT.md`.
- **Never** copy wording from mock-test sites or awarding organisation papers (you should not have any). Quotes are allowed only from OGL chunks, and only up to 25 words in `source_quote`.
- Avoid facts that change often (fees, dates, threat levels, counts) unless they are tagged `volatile: true` with an `as_of` date. Prefer stable principles.

### 4.3 Verification pipeline (must run on every question)
1. **Grounding check:** a separate model call receives ONLY the cited chunk(s) and the question. Without seeing the answer key, it must choose the answer and say whether the source supports it. Reject the question if its answer differs from the key or it is unsupported.
2. **Distractor check:** confirm that no distractor is also defensibly correct.
3. **Duplicate check:** reject the question if it has cosine similarity above 0.9 to an existing question (embedding the stem plus the correct answer).
4. **Currency check:** reject questions citing superseded documents (e.g. PACE Code A 2015, HSG154).
5. **Style lint:** four options, unique options, similar option lengths, the answer not always the longest, and an even spread of answer positions across the bank (randomise when publishing).
6. Write `questions/VERIFICATION_REPORT.md` with counts per status and rejection reasons.
7. Questions on use of force, arrest, physical intervention and first aid must be marked `requires_human_review: true` and must not be published until a human approves them.

---

## 5. Phase 5: Build the website

### 5.1 Stack and hosting
- Static site, deployable on **Cloudflare Pages** (the owner already uses `*.pages.dev`). Suggested stack: Vite + React + TypeScript + Tailwind. Questions ship as static JSON. No backend is required for v1.
- Progress is stored locally per user (IndexedDB/localStorage). Optional v2: Cloudflare D1/KV with simple named profiles so the two friends can compare scores.

### 5.2 Features (v1)
1. **Home:** cards for every qualification in the table at the top (DS, SO, CCTV, CP, CViT, the three refreshers, EFAW, and VI marked "NI only"), each with per-unit progress bars. Shared-unit progress shows on every qualification that includes it. Add a "Which licence do I need?" helper that describes each role in one sentence and links to GOV.UK.
2. **Learn mode:** browse the syllabus tree. Each objective shows a short **original** summary written from its source chunks, with citations (doc title plus section) linking to the source URL.
3. **Practice mode:** pick a unit or objective and get instant feedback with the explanation and the source reference.
4. **Mock exam mode:** uses `config/exam_formats.json` (question count, timer, 70% pass mark). Draws questions weighted by objective so they match the spec's coverage. There is no feedback until the end; the results page shows the score per unit and per objective, the weakest topics, and a review of every question.
5. **Weak-spot drill:** spaced repetition (e.g. SM-2) on missed questions.
6. **Practical checklists:** Units 2–4 practical assessment areas as tick-lists, with a note that they are assessed in class by a qualified trainer.
7. **Flag a question:** users can report errors. Store reports locally and export them as JSON for the owner to review.
8. Accessible (WCAG AA), mobile-first, dark/light theme, keyboard navigation.
9. Footer: the OGL attribution, the "not endorsed by the SIA" disclaimer, and an "as of" date for the content.

### 5.3 Do not
- Claim the questions are "real exam questions" or "guaranteed pass".
- Use SIA, GOV.UK or awarding organisation logos.
- Show physical intervention technique instructions or videos.

---

## 6. Deliverables checklist
```
/sources/**                      downloaded OGL documents + manifest.json
/corpus/chunks.jsonl
/syllabus/syllabus.json, coverage.json, COVERAGE_REPORT.md
/config/exam_formats.json
/questions/bank.jsonl, VERIFICATION_REPORT.md
/site/**                         deployable app
ATTRIBUTION.md, NOTES.md, DOWNLOAD_REPORT.md, README.md (how to run, rebuild, deploy)
scripts/                         download.sh, extract.py, chunk.py, build_syllabus.py, generate.py, verify.py, export_site_data.py
```
Every script must be re-runnable so the pipeline can be refreshed when sources change.

---

## 7. Known issues & upcoming changes (handle explicitly)
- **New SIA qualifications are planned for 2027.** The SIA consulted from August to October 2026. Final specifications are expected in winter 2026, and new qualifications later in 2027. Add a `spec_version` field to every question (`2021`). When new specs are published, re-run Phases 1–4 and keep old questions archived, not deleted.
- **Proposed changes to track:** first aid as a standing licence condition; changes to how learners prove their English level; spiking content extended to SG and CCTV; Martyn's Law awareness; searching wheelchairs and mobility aids; crime scene preservation.
- **Spiking:** check whether a standalone spiking offence has commenced. If not, current guidance treats spiking under OAPA 1861 ss23–24 (and SOA 2003 s61 where sexual intent applies).
- **Section 182 duplicates, PACE Code A 2023, the withdrawn HSG154 and the 2006 fire guides:** see §1.4.
- **First aid prerequisite:** since October 2024, EFAW for SIA purposes must cover life-threatening bleeding and opening airways.

---

## 8. Definition of done
- Every qualification in the scope table has a published question bank that meets its minimums in §4.2, or a documented shortfall in `COVERAGE_REPORT.md` explaining which objectives lack OGL sources. Human review is required for the flagged topics.
- 100% of objectives that have supporting sources are covered, across all qualifications.
- Mock exams reproduce the format in `config/exam_formats.json` for every unit of every qualification.
- The site builds with zero errors and is deployed to Cloudflare Pages, with the attribution footer visible.
- All reports present. No excluded-licence content anywhere in the repo.
