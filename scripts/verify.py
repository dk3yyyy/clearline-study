#!/usr/bin/env python3
"""Run the structural verification pass over questions/drafts and the bank.

This is intentionally a wrapper around import_questions.py so there is one
implementation of the rules. Semantic grounding and human review are separate.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    result = subprocess.run([sys.executable, str(ROOT / "scripts" / "import_questions.py")], cwd=ROOT)
    if result.returncode:
        raise SystemExit(result.returncode)
    print("Verification report: questions/VERIFICATION_REPORT.md")
    print("Coverage report: syllabus/COVERAGE_REPORT.md")


if __name__ == "__main__":
    main()
