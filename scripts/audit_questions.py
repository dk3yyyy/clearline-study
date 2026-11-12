#!/usr/bin/env python3
"""Audit question drafts without changing them.

This is deliberately stricter than the importer. It checks that every quote is
an exact substring of one of the cited chunks, not just that a quote exists.
Run it after a draft pass and before importing or publishing.

It also prints the two coverage measures that the public reports must not hide:
objectives with no question, and the share of items whose correct option is the
longest. Neither is an error on its own; both have to be visible.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "questions" / "bank.jsonl"
DRAFTS = ROOT / "questions" / "drafts"
SOURCE = BANK if BANK.exists() else None
CHUNKS = ROOT / "corpus" / "chunks.jsonl"
SYLLABUS = ROOT / "syllabus" / "syllabus.json"
META = re.compile(r"\b(learner|learners|objective|specification requires?|must be able to|session)\b", re.I)
HIGH_RISK = re.compile(r"\b(force|arrest|restrain|restraint|physical intervention|choke|strangl|asphyxia|first aid|recovery position|drug|weapon)\b", re.I)
UNITS = ["U1-COMMON", "U3-CONFLICT", "U4-PI", "DS-U2", "SO-U2", "CCTV-U2", "CP-MAIN", "CP-PI", "CP-DSR", "CVIT", "DS-REF", "SG-REF", "CP-REF", "VI"]


def load_jsonl(path: Path):
    rows = []
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if line.strip():
            rows.append((number, json.loads(line)))
    return rows


def main() -> int:
    chunks = {row["chunk_id"]: row.get("text", "") for row in (json.loads(line) for line in CHUNKS.read_text().splitlines() if line.strip())}
    syllabus = json.loads(SYLLABUS.read_text())
    all_objectives = {
        o["id"]: o
        for unit in syllabus["units"].values()
        for session in unit["sessions"]
        for o in session["objectives"]
    }
    objectives = set(all_objectives)
    rows = []
    sources = [SOURCE] if SOURCE else sorted(DRAFTS.glob("*.jsonl"))
    for path in sources:
        for line, row in load_jsonl(path):
            rows.append((path.name, line, row))

    by_unit = Counter(row.get("unit") for _, _, row in rows)
    bad = defaultdict(list)
    seen = {}
    meta = []
    high_risk_unflagged = []
    flag_errors = []
    for filename, line, row in rows:
        unit = row.get("unit", "?")
        quote = str(row.get("source_quote", "")).strip()
        source_ids = row.get("source_chunk_ids") or []
        if not source_ids or not any(cid in chunks for cid in source_ids):
            bad[unit].append((filename, line, row.get("stem", ""), "missing chunk"))
        elif not any(quote in chunks.get(cid, "") for cid in source_ids):
            bad[unit].append((filename, line, row.get("stem", ""), "quote not exact in cited chunk"))
        if len(quote.split()) > 25:
            bad[unit].append((filename, line, row.get("stem", ""), "quote over 25 words"))
        if row.get("objective_id") not in objectives:
            bad[unit].append((filename, line, row.get("stem", ""), "objective missing"))
        elif not str(all_objectives[row["objective_id"]].get("text", "")).strip():
            bad[unit].append((filename, line, row.get("stem", ""), "question points at an empty objective"))
        if META.search(str(row.get("stem", ""))):
            meta.append((filename, line, row.get("stem", "")))
        key = re.sub(r"[^a-z0-9]+", " ", str(row.get("stem", "")).lower()).strip()
        if key in seen:
            bad[unit].append((filename, line, row.get("stem", ""), f"duplicate stem with {seen[key]}"))
        seen[key] = f"{filename}:{line}"
        if HIGH_RISK.search(str(row.get("stem", "")) + " " + str(row.get("explanation", ""))) and not row.get("requires_human_review"):
            high_risk_unflagged.append((filename, line, row.get("stem", "")))
        if not isinstance(row.get("review_category"), list):
            flag_errors.append((filename, line, row.get("id", ""), "missing review_category"))
        elif bool(row["review_category"]) != bool(row.get("requires_human_review")):
            flag_errors.append((filename, line, row.get("id", ""), "review flag does not match review_category"))

    bad = {unit: entries for unit, entries in bad.items() if entries}

    print(f"records: {len(rows)}")
    print(f"units: {len(by_unit)}")
    print(f"meta-question hits: {len(meta)}")
    print(f"high-risk unflagged: {len(high_risk_unflagged)}")
    print(f"review-flag errors: {len(flag_errors)}")
    for unit in UNITS:
        if not by_unit.get(unit):
            continue
        print(f"{unit}: {by_unit[unit]} records, {len(bad.get(unit, []))} problems")

    covered = {row.get("objective_id") for _, _, row in rows}
    print(f"\nobjective coverage: {len(covered & objectives)}/{len(objectives)} ({round(100 * len(covered & objectives) / len(objectives))}%)")
    print("uncovered objectives by unit:")
    for unit_id, unit in syllabus["units"].items():
        ids = [o["id"] for session in unit["sessions"] for o in session["objectives"]]
        missing = [oid for oid in ids if oid not in covered]
        if ids:
            print(f"  {unit_id}: {len(ids) - len(missing)}/{len(ids)} covered, {len(missing)} without a question")

    longest = sum(
        1
        for _, _, row in rows
        if len(str(row["options"][row["answer_index"]])) == max(len(str(option)) for option in row["options"])
    )
    print(f"\nlongest-option ratio: {longest}/{len(rows)} ({round(100 * longest / len(rows), 1)}%)")
    for unit in UNITS:
        unit_rows = [row for _, _, row in rows if row.get("unit") == unit]
        if not unit_rows:
            continue
        unit_longest = sum(
            1
            for row in unit_rows
            if len(str(row["options"][row["answer_index"]])) == max(len(str(option)) for option in row["options"])
        )
        print(f"  {unit}: {unit_longest}/{len(unit_rows)} ({round(100 * unit_longest / len(unit_rows), 1)}%)")

    if bad:
        print("\nProblems")
        for unit, entries in bad.items():
            for entry in entries:
                print(f"{unit} {entry[0]}:{entry[1]} | {entry[3]} | {entry[2][:100]}")
    if meta:
        print("\nMeta-question hits")
        for entry in meta[:20]:
            print(f"{entry[0]}:{entry[1]} | {entry[2]}")
    if high_risk_unflagged:
        print("\nHigh-risk unflagged")
        for entry in high_risk_unflagged[:20]:
            print(f"{entry[0]}:{entry[1]} | {entry[2]}")
    if flag_errors:
        print("\nReview-flag errors")
        for entry in flag_errors[:20]:
            print(f"{entry[0]}:{entry[1]} | {entry[2]} | {entry[3]}")
    return 1 if bad or meta or high_risk_unflagged or flag_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
