#!/usr/bin/env python3
"""Export the runtime data files used by site/."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_DATA = ROOT / "site" / "data"


def write_json(name: str, payload):
    target = SITE_DATA / name
    target.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {target.relative_to(ROOT)}")


def main():
    SITE_DATA.mkdir(parents=True, exist_ok=True)
    syllabus = json.loads((ROOT / "syllabus" / "syllabus.json").read_text())
    formats = json.loads((ROOT / "config" / "exam_formats.json").read_text())
    bank_path = ROOT / "questions" / "bank.jsonl"
    bank = [json.loads(line) for line in bank_path.read_text().splitlines() if line.strip()] if bank_path.exists() else []
    chunk_path = ROOT / "corpus" / "chunks.jsonl"
    chunks = {}
    chunk_meta = {}
    if chunk_path.exists():
        for line in chunk_path.read_text().splitlines():
            if line.strip():
                chunk = json.loads(line)
                chunks[chunk["chunk_id"]] = chunk.get("text", "")
                chunk_meta[chunk["chunk_id"]] = {
                    "title": chunk.get("title", ""),
                    "url": chunk.get("source_url", ""),
                }
    for question in bank:
        quote = question.get("source_quote", "")
        cited = question.get("source_chunk_ids", [])
        question["source_quote_exact"] = any(quote in chunks.get(cid, "") for cid in cited)
        source = next((chunk_meta[cid] for cid in cited if cid in chunk_meta), None)
        if source:
            question["source"] = source
    write_json("syllabus.json", syllabus)
    write_json("exam_formats.json", formats)
    write_json("questions.json", bank)
    checklist_source = ROOT / "config" / "checklists.json"
    if checklist_source.exists():
        write_json("checklists.json", json.loads(checklist_source.read_text()))
    else:
        write_json("checklists.json", {})
    print(f"questions: {len(bank)}")


if __name__ == "__main__":
    main()
