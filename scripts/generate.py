#!/usr/bin/env python3
"""Create a per-unit question-generation prompt pack.

No model call is made here. The script builds a bounded prompt for each unit from
the syllabus and source citations so the drafting step can be run with an LLM
under the rules in SIA-STUDY-SITE-AGENT-INSTRUCTIONS.md.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "questions" / "PROMPT_PACK.md"


def main():
    syllabus = json.loads((ROOT / "syllabus" / "syllabus.json").read_text())
    lines = [
        "# Question generation prompt pack", "",
        "Use one unit at a time. The model must not write a question unless the cited source chunk supports the answer.",
        "Write JSONL to `questions/drafts/<UNIT>.jsonl` using `docs/QUESTION_SCHEMA.md`.", "",
    ]
    for unit in syllabus["units"].values():
        if not unit["sessions"]:
            continue
        lines += [f"## {unit['id']} — {unit['name']}", "", f"Qualification tags: {', '.join(unit.get('qualifications', []))}", ""]
        for session in unit["sessions"]:
            source = session.get("source", {})
            lines += [f"### {session['id']} — {session['title']}", f"Source: {source.get('doc_title', '')} {source.get('url', '')}", f"Aim: {session.get('summary', '')}", "Objectives:"]
            lines += [f"- {o['id']}: {o['text']}" for o in session["objectives"]]
            lines.append("")
        lines += ["Rules: four options, one answer, no techniques, no invented section numbers, 25-word source quote. Leave uncertain objectives uncovered and report them.", ""]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
