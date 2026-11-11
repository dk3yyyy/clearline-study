# Download report

## What was acquired

The build started from the supplied `SIA-Study-Pack.zip`, which contains 17 SIA specification PDFs with matching text extracts. All files are SIA publications published on GOV.UK under the Open Government Licence v3.0.

- 34 files copied into `sources/`: 17 PDFs and 17 text extracts.
- 17 records in `sources/manifest.json`.
- Page counts in the manifest are taken from the text page breaks in the supplied extracts, not from a PDF page-tree read. Re-check them before quoting page numbers publicly.

## Not acquired in this pass

The full instruction file lists statutes, PACE codes, HSE guidance, NPSA guidance and other GOV.UK publications. They are not present in the supplied pack and were not downloaded in this pass. This means questions based on statute sections, PACE, the Licensing Act 2003, HSE guidance and NPSA guidance remain a documented gap.

The following supplied files were not ingested as evidence:

- `sia-practice-questions.pdf`
- `sia-door-supervisor-practice-questions.pdf`
- `prison-officer-practice-questions.pdf`

They are practice papers, not OGL specifications. Their wording is excluded from the question bank.

## Excluded sources

No ProtectUK/NaCTSO, College of Policing APP, PSHE Association, awarding-organisation or commercial mock-test material is present. No SIA, GOV.UK, HSE or NPSA logos or images are used.

## Next download pass

Use `scripts/download.sh` to check and fetch the official URLs listed in the instruction file. Review `manifest.json` after every run and keep the current-version decisions in `NOTES.md`.
