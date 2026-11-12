#!/usr/bin/env python3
"""Write the unit/objective coverage report.

Coverage means "at least one question is attached to this objective". It is a
lower bound on teaching coverage, not proof that the objective is assessed: a
single recall item does not cover an outcome. The report states the uncovered
count in every unit so the site cannot present an empty objective as complete.

Usage:
    python3 scripts/coverage_report.py            # write reports
    python3 scripts/coverage_report.py --check    # fail on a unit/session that silently has no objectives
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "questions" / "bank.jsonl"
SYLLABUS = ROOT / "syllabus" / "syllabus.json"
CORPUS = ROOT / "corpus" / "chunks.jsonl"
MANIFEST = ROOT / "sources" / "manifest.json"
COVERAGE = ROOT / "docs" / "reviews" / "coverage.md"
SOURCE_COVERAGE = ROOT / "docs" / "reviews" / "source-coverage.md"


def load_rows() -> list[dict]:
    return [json.loads(line) for line in BANK.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> int:
    rows = load_rows()
    syllabus = json.loads(SYLLABUS.read_text(encoding="utf-8"))
    chunks = [json.loads(line) for line in CORPUS.read_text(encoding="utf-8").splitlines() if line.strip()]
    documents = json.loads(MANIFEST.read_text(encoding="utf-8"))

    by_unit = Counter(row["unit"] for row in rows)
    objective_text = {
        objective["id"]: objective.get("text", "")
        for unit in syllabus["units"].values()
        for session in unit["sessions"]
        for objective in session["objectives"]
    }
    covered = defaultdict(set)
    per_objective = Counter()
    for row in rows:
        covered[row["unit"]].add(row["objective_id"])
        per_objective[row["objective_id"]] += 1

    total_objectives = len(objective_text)
    total_covered = len({row["objective_id"] for row in rows} & set(objective_text))
    uncovered = total_objectives - total_covered

    lines = [
        "# Unit and objective coverage",
        "",
        f"Generated from `questions/bank.jsonl` and `syllabus/syllabus.json`. "
        f"**{total_covered}/{total_objectives} objectives ({round(100 * total_covered / total_objectives)}%) have at least one question. "
        f"{uncovered} objectives have none.**",
        "",
        "Coverage here means only that a question is tagged to the objective. It is not evidence that the "
        "objective is fully taught or assessed, and a unit is not complete because every row below exists.",
        "",
        "| Unit | Objectives | Covered | Uncovered | Questions | Most questions on one objective |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for unit_id, unit in syllabus["units"].items():
        ids = [objective["id"] for session in unit["sessions"] for objective in session["objectives"]]
        unit_covered = [oid for oid in ids if oid in covered[unit_id]]
        most = max((per_objective[oid] for oid in ids), default=0)
        lines.append(
            f"| {unit_id} | {len(ids)} | {len(unit_covered)} | {len(ids) - len(unit_covered)} | {by_unit.get(unit_id, 0)} | {most} |"
        )

    lines += ["", "## Objectives with no question", ""]
    for unit_id, unit in syllabus["units"].items():
        ids = [objective["id"] for session in unit["sessions"] for objective in session["objectives"]]
        missing = [oid for oid in ids if oid not in covered[unit_id]]
        if not missing:
            lines += [f"### {unit_id}", "", "Every objective has at least one tagged question.", ""]
            continue
        lines += [f"### {unit_id} — {len(missing)} uncovered", ""]
        lines += [f"- `{oid}` — {objective_text[oid]}" for oid in missing]
        lines.append("")

    empty_sessions = [
        (unit_id, session["id"], session.get("title", ""))
        for unit_id, unit in syllabus["units"].items()
        for session in unit["sessions"]
        if not session.get("objectives")
    ]
    lines += ["## Sessions with no objectives", ""]
    if empty_sessions:
        lines += [f"- {unit_id} `{session_id}` — {title}" for unit_id, session_id, title in empty_sessions]
    else:
        lines.append("Every session has at least one objective.")
    COVERAGE.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Keep the short public-facing summary in step with the bank.
    by_source_quote = Counter()
    for row in rows:
        objective = objective_text.get(row.get("objective_id", ""), "")
        if row.get("source_quote", "").strip() and row["source_quote"].strip() == objective.strip():
            by_source_quote[row["unit"]] += 1
    flagged = Counter(row["unit"] for row in rows if row.get("requires_human_review"))
    summary = [
        "# Source coverage",
        "",
        f"Generated from the exported bank. {len(rows)} questions; {sum(flagged.values())} flagged for review; "
        f"{len(documents)} source documents; {len(chunks)} chunks.",
        "",
        "| Unit | Questions | Objective-text quotes | Review flags |",
        "|---|---:|---:|---:|",
    ]
    for unit_id in syllabus["units"]:
        if not by_unit.get(unit_id):
            continue
        summary.append(f"| {unit_id} | {by_unit[unit_id]} | {by_source_quote.get(unit_id, 0)} | {flagged.get(unit_id, 0)} |")
    summary += [
        "",
        "Objective-text quotes are transparent in the UI but are syllabus outcomes, not external evidence. "
        "They stay draft-labelled. Units with no content-bearing source pack are listed in `DOWNLOAD_REPORT.md`.",
        "",
        f"Objective coverage is partial: {uncovered} of {total_objectives} objectives have no question. "
        "See `coverage.md`; absence of a question is not shown as complete elsewhere.",
    ]
    SOURCE_COVERAGE.write_text("\n".join(summary) + "\n", encoding="utf-8")

    print(f"wrote {COVERAGE.relative_to(ROOT)} and {SOURCE_COVERAGE.relative_to(ROOT)}")
    print(f"objective coverage {total_covered}/{total_objectives}; {uncovered} without a question")

    if "--check" in sys.argv:
        problems = []
        for unit_id, unit in syllabus["units"].items():
            ids = [objective["id"] for session in unit["sessions"] for objective in session["objectives"]]
            if by_unit.get(unit_id) and ids and not any(oid in covered[unit_id] for oid in ids):
                problems.append(f"{unit_id} has questions but no covered objective")
            for objective in unit["sessions"]:
                for item in objective.get("objectives", []):
                    if not str(item.get("text", "")).strip():
                        problems.append(f"{unit_id} {item['id']} has empty objective text")
        for problem in problems:
            print(f"CHECK: {problem}")
        return 1 if problems else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
