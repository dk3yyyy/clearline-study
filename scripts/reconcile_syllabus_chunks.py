#!/usr/bin/env python3
"""Refresh the syllabus-derived chunk text from syllabus.json.

The source packs add their own chunks and must be preserved. This script only
touches chunks whose id is `<source doc_id>#<session id>` for a syllabus
session; it never deletes custom chunks.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNKS = ROOT / "corpus" / "chunks.jsonl"
SYLLABUS = ROOT / "syllabus" / "syllabus.json"


def main() -> None:
    syllabus = json.loads(SYLLABUS.read_text())
    expected = {}
    for unit in syllabus["units"].values():
        for session in unit["sessions"]:
            source = session.get("source") or {}
            chunk_id = f"{source.get('doc_id', unit['id'])}#{session['id']}"
            expected[chunk_id] = {
                "doc_id": source.get("doc_id", unit["id"]),
                "title": source.get("doc_title", unit["name"]),
                "heading_path": [session["title"]],
                "text": "\n".join([session["title"], session.get("summary", "")] + [o["text"] for o in session["objectives"]]),
                "unit_tags": [unit["id"]],
                "qualifications": unit.get("qualifications", []),
                "source_url": source.get("url", ""),
            }
    rows = [json.loads(line) for line in CHUNKS.read_text().splitlines() if line.strip()]
    changed = added = 0
    seen = set()
    for row in rows:
        patch = expected.get(row["chunk_id"])
        if not patch:
            continue
        seen.add(row["chunk_id"])
        for key, value in patch.items():
            if row.get(key) != value:
                row[key] = value
                changed += 1
    for chunk_id, patch in expected.items():
        if chunk_id not in seen:
            rows.append({
                "chunk_id": chunk_id,
                **patch,
                "page_start": None,
                "page_end": None,
                "jurisdiction": "EW",
                "licence": "OGL-3.0",
            })
            added += 1
    CHUNKS.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n")
    print(f"updated fields {changed}; added {added}; chunks {len(rows)}")


if __name__ == "__main__":
    main()
