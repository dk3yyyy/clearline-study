#!/usr/bin/env python3
"""Validate the exported site data before it can deploy.

This is deliberately structural. The stricter quote-to-corpus check lives in
scripts/audit_questions.py and runs after this file.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DATA = SITE / "data"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fail(message):
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main():
    syllabus = load(DATA / "syllabus.json")
    formats = load(DATA / "exam_formats.json")
    questions = load(DATA / "questions.json")
    checklists = load(DATA / "checklists.json")

    units = syllabus.get("units", {})
    qualifications = syllabus.get("qualifications", [])
    if not units or not qualifications:
        fail("syllabus must contain units and qualifications")
    if not isinstance(questions, list) or not questions:
        fail("question bank must be a non-empty array")

    qids = set()
    objective_ids = set()
    for unit_id, unit in units.items():
        if not isinstance(unit.get("sessions"), list):
            fail(f"unit {unit_id} has no sessions array")
        for session in unit["sessions"]:
            for objective in session.get("objectives", []):
                oid = objective.get("id")
                if not oid:
                    fail(f"unit {unit_id} has an objective without an id")
                if oid in objective_ids:
                    fail(f"duplicate objective id: {oid}")
                objective_ids.add(oid)

    qual_ids = {q.get("id") for q in qualifications}
    for q in qualifications:
        for unit_id in q.get("units", []):
            if unit_id not in units:
                fail(f"qualification {q.get('id')} references unknown unit {unit_id}")

    for q in questions:
        qid = q.get("id")
        if not qid or qid in qids:
            fail(f"missing or duplicate question id: {qid}")
        qids.add(qid)
        if q.get("unit") not in units:
            fail(f"{qid} references unknown unit {q.get('unit')}")
        if q.get("objective_id") not in objective_ids:
            fail(f"{qid} references unknown objective {q.get('objective_id')}")
        if len(q.get("options", [])) != 4:
            fail(f"{qid} must have exactly four options")
        if not isinstance(q.get("answer_index"), int) or not 0 <= q["answer_index"] < 4:
            fail(f"{qid} has an invalid answer_index")
        if not q.get("source_chunk_ids"):
            fail(f"{qid} has no source_chunk_ids")
        for qual_id in q.get("qualifications", []):
            if qual_id not in qual_ids:
                fail(f"{qid} references unknown qualification {qual_id}")

    for qual_id, config in formats.items():
        if qual_id not in qual_ids:
            fail(f"exam format references unknown qualification {qual_id}")
        for row in config.get("units", []):
            if row.get("unit") not in units:
                print(f"WARN: {qual_id} format references unit {row.get('unit')} with no syllabus entry")
                continue
            if row.get("questions", 0) < 1 or row.get("minutes", 0) < 1:
                fail(f"{qual_id}/{row.get('unit')} has an invalid paper size or duration")

    for unit_id in checklists:
        if unit_id not in units:
            fail(f"checklist references unknown unit {unit_id}")

    # The ?v= token is part of the cache contract. Refuse to ship a mixed build.
    tokens = set()
    for name in ("index.html", "assets/app.js", "sw.js"):
        path = SITE / name
        if not path.exists():
            fail(f"missing {name}")
        tokens.update(re.findall(r"2026\d{4}[a-z]{2}", path.read_text(encoding="utf-8")))
    if len(tokens) > 1:
        fail(f"mixed cache tokens: {sorted(tokens)}")

    print(f"{len(questions)} questions, {len(units)} units, {len(objective_ids)} objectives, "
          f"{len(qualifications)} qualifications, {len(formats)} exam formats, "
          f"{len(checklists)} checklists validated")
    print(f"cache token: {sorted(tokens)[0] if tokens else 'missing'}")


if __name__ == "__main__":
    main()
