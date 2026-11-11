# ShiftReady

An independent, source-linked study and mock-exam site for UK SIA licence-linked qualifications.

This repository is a working vertical slice of the build in `SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md`. It contains the source pack, a structured syllabus, a draft question bank with source references, the verification reports, and a static study app in `site/`.

## Run the site

```bash
cd site
python3 -m http.server 4180
```

Open `http://127.0.0.1:4180/`.

Production: **https://dk3yyyy.github.io/clearline-study/** (GitHub Pages, deployed from `main` by `.github/workflows/pages.yml`).

No npm install or build step is required. The app is plain HTML, CSS and ES modules. It can be deployed to Cloudflare Pages by uploading `site/` as the output directory.

## Project layout

```
sources/                 OGL specification, legal, guidance and CCTV packs plus manifest
corpus/chunks.jsonl      source chunks used for citations
syllabus/syllabus.json   qualification -> unit -> session -> objective tree
config/exam_formats.json paper sizes, timers, pass marks and source notes
questions/bank.jsonl     draft question records
site/                    deployable study app
scripts/                 re-runnable import, validation and export scripts
docs/                    build notes and question schema
```

## What is implemented

- Home with every qualification, per-unit progress and shared-unit progress.
- Learn mode with the specification tree, source links and an objective checklist.
- Practice mode with instant feedback, explanations and source quotations.
- Mock exam mode with configured paper sizes, a short-bank disclosure, timer, no feedback until submission, review and unit breakdown.
- Weak-spot drill built from locally stored wrong answers.
- Practical checklists for units with practical assessment areas.
- Local-only question reports with JSON export.
- Light and dark themes, keyboard focus states and reduced-motion support.

## Rebuild the data

```bash
python3 scripts/import_questions.py
python3 scripts/export_site_data.py
```

`import_questions.py` reads drafts from `questions/drafts/`, normalises IDs, drops duplicates and invalid records, writes `questions/bank.jsonl`, and produces `questions/VERIFICATION_REPORT.md` and `syllabus/COVERAGE_REPORT.md`. `export_site_data.py` copies the runtime data into `site/data/`.

## Run the checks

```bash
node --test
```

`tests/scoring.test.mjs` covers the marking rules in `site/assets/scoring.js`: the published pass marks (50/72 on the common unit, not 51), and the rule that a blank answer is not study progress. The same command runs in CI with the question-bank validation.

## Important limits

- The current question bank is an initial draft, not the 1,450-question minimum in the brief. `syllabus/COVERAGE_REPORT.md` lists every objective that still has no question.
- The source pack in this repository is the SIA specification pack supplied for this build. It does not contain every statute, code of practice or guidance document named in the full instructions.
- Questions touching use of force, arrest, physical intervention or first aid are marked for human review. Do not publish them without that review.
- The site is independent. It is not endorsed by the SIA or any awarding organisation.
- Progress is stored in `localStorage`. There is no account, backend, sync or payment flow.
