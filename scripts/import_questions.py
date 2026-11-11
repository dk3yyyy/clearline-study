#!/usr/bin/env python3
"""Import question drafts, validate their structure, and write the bank + reports.

This script does not perform semantic grounding. It checks the things a script can
check: required fields, option shape, objective membership, duplicate stems,
source-quote length, answer-position spread, and coverage. Questions touching
force/arrest/PI/first aid remain marked for human review.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFTS = ROOT / "questions" / "drafts"
BANK = ROOT / "questions" / "bank.jsonl"
VERIFY = ROOT / "questions" / "VERIFICATION_REPORT.md"
COVERAGE = ROOT / "syllabus" / "COVERAGE_REPORT.md"

MINIMUMS = {
    "U1-COMMON": 300, "DS-U2": 150, "U3-CONFLICT": 100, "U4-PI": 80,
    "SO-U2": 150, "CCTV-U2": 150, "CP-MAIN": 100, "CP-PI": 60,
    "CP-DSR": 40, "CVIT": 100, "DS-REF": 60, "SG-REF": 60, "CP-REF": 60,
    "VI": 40,
}
UNIT_ORDER = list(MINIMUMS)
HIGH_RISK = re.compile(r"\b(force|arrest|physical intervention|restrain|first aid|choke|strangle|asphyxia|positional)\b", re.I)


def load_jsonl(path: Path):
    rows, errors = [], []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}:{number}: {exc.msg}")
    return rows, errors


def normalise_stem(stem: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", stem.lower()).strip()


def main():
    syllabus = json.loads((ROOT / "syllabus" / "syllabus.json").read_text())
    chunks = [json.loads(line) for line in (ROOT / "corpus" / "chunks.jsonl").read_text().splitlines() if line.strip()]
    chunk_ids = {c["chunk_id"] for c in chunks}
    doc_ids = {c["doc_id"] for c in chunks}
    objectives = {}
    unit_meta = {}
    for uid, unit in syllabus["units"].items():
        unit_meta[uid] = unit
        for session in unit["sessions"]:
            for objective in session["objectives"]:
                objectives[objective["id"]] = {"unit": uid, "session": session["id"], "text": objective["text"]}

    raw, parse_errors = [], []
    for path in sorted(DRAFTS.glob("*.jsonl")):
        rows, errors = load_jsonl(path)
        raw.extend(rows)
        parse_errors.extend(errors)

    rejected = Counter()
    reasons = defaultdict(list)
    clean = []
    seen = set()
    for row in raw:
        stem = str(row.get("stem", "")).strip()
        options = row.get("options")
        unit = str(row.get("unit", "")).strip()
        objective_id = str(row.get("objective_id", "")).strip()
        source_ids = row.get("source_chunk_ids") or []
        quote = str(row.get("source_quote", "")).strip()
        answer = row.get("answer_index")
        explanation = str(row.get("explanation", "")).strip()
        if not stem or not explanation:
            rejected["missing stem or explanation"] += 1
            continue
        if not isinstance(options, list) or len(options) != 4 or any(not str(o).strip() for o in options):
            rejected["not four non-empty options"] += 1
            continue
        if len({str(o).strip().casefold() for o in options}) != 4:
            rejected["duplicate options"] += 1
            continue
        if not isinstance(answer, int) or not 0 <= answer < 4:
            rejected["bad answer_index"] += 1
            continue
        if unit not in unit_meta:
            rejected["unknown unit"] += 1
            continue
        if objective_id not in objectives:
            # Keep a usable question by attaching it to the first objective of its unit.
            unit_objectives = [oid for oid, meta in objectives.items() if meta["unit"] == unit]
            if not unit_objectives:
                rejected["no objective in unit"] += 1
                continue
            objective_id = unit_objectives[0]
            reasons["objective remapped"].append(stem[:90])
        if not isinstance(source_ids, list) or not source_ids:
            rejected["missing source_chunk_ids"] += 1
            continue
        if not quote:
            rejected["missing source_quote"] += 1
            continue
        if len(quote.split()) > 25:
            rejected["source quote over 25 words"] += 1
            continue
        key = normalise_stem(stem) + "|" + str(answer)
        if key in seen:
            rejected["duplicate stem + answer"] += 1
            continue
        seen.add(key)
        qualifications = unit_meta[unit].get("qualifications", [])
        review = bool(row.get("requires_human_review")) or bool(HIGH_RISK.search(stem + " " + explanation))
        clean.append({
            "unit": unit,
            "objective_id": objective_id,
            "qualifications": qualifications,
            "difficulty": int(row.get("difficulty", 2)) if str(row.get("difficulty", "2")).isdigit() else 2,
            "stem": stem,
            "options": [str(o).strip() for o in options],
            "answer_index": answer,
            "explanation": explanation,
            "source_chunk_ids": [str(s) for s in source_ids],
            "source_quote": quote,
            "spec_version": "2021",
            "jurisdiction": "EW",
            "status": "draft",
            "requires_human_review": review,
        })

    # Stable IDs grouped by unit.
    counters = Counter()
    clean.sort(key=lambda q: (UNIT_ORDER.index(q["unit"]) if q["unit"] in UNIT_ORDER else 99, q["objective_id"], q["stem"]))
    for q in clean:
        counters[q["unit"]] += 1
        q["id"] = f"{q['unit']}-{counters[q['unit']]:04d}"

    with BANK.open("w", encoding="utf-8") as handle:
        for q in clean:
            handle.write(json.dumps(q, ensure_ascii=False) + "\n")

    by_unit = Counter(q["unit"] for q in clean)
    by_answer = Counter(q["answer_index"] for q in clean)
    review_count = sum(1 for q in clean if q["requires_human_review"])
    target_total = sum(MINIMUMS.get(uid, 0) for uid in unit_meta)
    lines = [
        "# Question verification report", "",
        f"- Records read: **{len(raw)}**",
        f"- Records accepted: **{len(clean)}**",
        f"- Records rejected: **{sum(rejected.values())}**",
        f"- Structurally valid JSONL parse errors: **{len(parse_errors)}**",
        f"- Marked for human review: **{review_count}**",
        f"- Target minimum across units: **{target_total}**",
        f"- Actual bank size: **{len(clean)}**",
        "",
        "## What this report does and does not prove", "",
        "This is a structural verification pass. It does **not** prove that every answer is semantically supported by the cited chunk. That grounding check still has to be run before publication. Every record has `status: \"draft\"`.",
        "",
        "## Answer position spread", "",
    ]
    for index in range(4):
        lines.append(f"- {chr(65 + index)}: {by_answer.get(index, 0)}")
    lines += ["", "## Counts by unit", "", "| Unit | Questions | Minimum target |", "|---|---:|---:|"]
    for uid in unit_meta:
        lines.append(f"| {uid} | {by_unit.get(uid, 0)} | {MINIMUMS.get(uid, 0)} |")
    lines += ["", "## Rejection reasons", ""]
    if rejected:
        for reason, count in rejected.most_common():
            lines.append(f"- {reason}: {count}")
    else:
        lines.append("- None")
    if reasons["objective remapped"]:
        lines += ["", "## Remapped objective IDs", ""]
        lines += [f"- {stem}" for stem in reasons["objective remapped"][:30]]
    if parse_errors:
        lines += ["", "## JSONL parse errors", ""] + [f"- {e}" for e in parse_errors]
    VERIFY.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Coverage report
    covered = {q["objective_id"] for q in clean}
    cov = [
        "# Syllabus coverage report", "",
        "Coverage is measured as objectives with at least one question. A question attached to an objective is not proof that the objective is fully assessed; review the question quality.",
        "",
    ]
    for uid, unit in unit_meta.items():
        objective_ids = [o["id"] for s in unit["sessions"] for o in s["objectives"]]
        covered_here = [oid for oid in objective_ids if oid in covered]
        pct = round((len(covered_here) / len(objective_ids)) * 100) if objective_ids else 0
        cov += [f"## {uid} — {unit['name']}", "", f"- Objectives: {len(objective_ids)}", f"- Covered: {len(covered_here)} ({pct}%)", f"- Questions: {by_unit.get(uid, 0)} / target {MINIMUMS.get(uid, 0)}", ""]
        missing = [oid for oid in objective_ids if oid not in covered]
        if missing:
            cov.append("Uncovered objectives:")
            cov += [f"- `{oid}` — {objectives[oid]['text']}" for oid in missing]
            cov.append("")
        elif objective_ids:
            cov += ["Every objective in this unit has at least one drafted question.", ""]
        else:
            cov += ["No objectives are defined for this unit.", ""]
    COVERAGE.write_text("\n".join(cov) + "\n", encoding="utf-8")

    print(f"Accepted {len(clean)} questions; rejected {sum(rejected.values())}; review {review_count}.")
    print(f"Wrote {BANK.relative_to(ROOT)}, {VERIFY.relative_to(ROOT)}, {COVERAGE.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
