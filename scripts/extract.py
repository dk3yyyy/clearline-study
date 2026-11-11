#!/usr/bin/env python3
"""Refresh text extracts from the source PDFs.

The supplied pack already includes .txt extracts. If pdftotext is available it is
used; otherwise pymupdf is tried; otherwise the existing extract is kept and the
file is reported as skipped. This script never invents text.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sources"


def extract_with_pdftotext(pdf: Path, out: Path) -> bool:
    if not shutil.which("pdftotext"):
        return False
    result = subprocess.run(["pdftotext", "-layout", str(pdf), str(out)], capture_output=True)
    return result.returncode == 0 and out.exists() and out.stat().st_size > 0


def extract_with_pymupdf(pdf: Path, out: Path) -> bool:
    try:
        import fitz  # type: ignore
    except Exception:
        return False
    doc = fitz.open(pdf)
    text = "\n".join(page.get_text() for page in doc)
    if text.strip():
        out.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-extract even when a text file exists")
    args = parser.parse_args()
    for pdf in sorted(SOURCES.rglob("*.pdf")):
        out = pdf.with_suffix(".txt")
        if out.exists() and not args.force:
            print(f"keep {out.relative_to(ROOT)}")
            continue
        if extract_with_pdftotext(pdf, out) or extract_with_pymupdf(pdf, out):
            print(f"extracted {out.relative_to(ROOT)}")
        else:
            print(f"SKIP {pdf.relative_to(ROOT)}: no text extractor and no readable text layer")


if __name__ == "__main__":
    main()
