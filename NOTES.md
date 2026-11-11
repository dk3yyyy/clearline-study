# Build notes and source decisions

## Scope decision

This pass builds the complete application shell and the Door Supervisor-first study data from the supplied SIA specification pack. It does not claim to be the full 1,700-question production bank. The coverage report is the honest count.

## Exam format decisions

- Door Supervisor: U1 72 questions / 110 minutes; DS U2 50 / 75; U3 20 / 30; U4 30 / 45 with an 80% pass mark. Source: SIA Get Training, April 2022, page 22 and page 24.
- Security Officer: U1 72 / 110; SO U2 60 / 90; U3 20 / 30. Source: same document, page 22.
- CCTV: U2 40 / 60, 70% MCQ, 80% workbook short answer. Source: same document, page 22.
- CViT: 40 / 60, 70%. Source: same document, page 22.
- Close Protection: 52-question main MCT at 70%; CP DSR 29 at 72%; CP PI 30 at 80%; terror awareness 10 at 70%. Source: pages 22-24.
- Refresher paper sizes are marked `unconfirmed` in `config/exam_formats.json`. The refresher specifications describe the learning areas, not a fixed MCQ paper.
- Vehicle Immobilisation has no MCQ paper in the supplied material; it is shown as legacy/NI only.

## Version decisions

- The pack's common, DS, SG, CCTV, CViT and DS PI specifications are the 2021 editions.
- CP, CP PI and CP DSR are the 2022 editions.
- DS and SG refreshers are 2024; CP PI refresher is 2025.
- `sia-get-licensed.txt` is the May 2026 edition.
- No newer specification was found in the supplied pack. Check the GOV.UK hub before publishing a new version.

## Content gaps

- No statute text was supplied, so questions avoid citing Act sections unless the specification itself states the fact.
- The supplied practice PDFs are not used as evidence.
- Several specifications are syllabi, not textbooks. Some objectives therefore have no question; `syllabus/COVERAGE_REPORT.md` records those objectives rather than inventing content.
- Physical intervention questions are knowledge-only. No technique instructions are included.

## Design decisions

- The app is a static vanilla ES-module SPA. It has no build step, no accounts, no backend and no third-party runtime dependency beyond Google Fonts.
- Progress uses `localStorage`, keyed `clearline-study-v1`.
- Shared units are stored once in `syllabus.json` and queried by every qualification that includes them.
- The site uses the Clearline design language from the earlier prototype: warm paper, near-black ink, burnt-orange signal, moss for correct states.
