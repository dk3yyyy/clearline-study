#!/usr/bin/env python3
"""Rebuild corpus/chunks.jsonl from the syllabus tree.

Each session becomes one chunk with the session aim and objectives. The
syllabus is the authoritative structure; chunk text is the source material used
for a citation, not a substitute for the full specification.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    syllabus = json.loads((ROOT / "syllabus" / "syllabus.json").read_text())
    rows = []
    for unit in syllabus["units"].values():
        for session in unit["sessions"]:
            source = session.get("source") or {}
            text = "\n".join([session["title"], session.get("summary", "")] + [o["text"] for o in session["objectives"]])
            rows.append({
                "chunk_id": f"{source.get('doc_id', unit['id'])}#{session['id']}",
                "doc_id": source.get("doc_id", unit["id"]),
                "title": source.get("doc_title", unit["name"]),
                "heading_path": [session["title"]],
                "page_start": None,
                "page_end": None,
                "text": text,
                "unit_tags": [unit["id"]],
                "qualifications": unit.get("qualifications", []),
                "jurisdiction": "EW",
                "licence": "OGL-3.0",
                "source_url": source.get("url", ""),
            })
    target = ROOT / "corpus" / "chunks.jsonl"
    with target.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"wrote {target.relative_to(ROOT)} ({len(rows)} chunks)")


if __name__ == "__main__":
    main()
