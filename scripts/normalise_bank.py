#!/usr/bin/env python3
"""Re-derive review_category, requires_human_review and spec_version on the bank.

Run after editing question text so the flag and version fields follow the text
instead of drifting. The pass is idempotent and never turns an existing human
review flag off: a flagged record whose text matches no policy keyword keeps
`review_category: ["other"]`.

This does not rewrite drafts or regenerate IDs.
"""
from __future__ import annotations

import json
from pathlib import Path

from review_policy import categories_for, requires_human_review, spec_version_for

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "questions" / "bank.jsonl"


def main() -> None:
    rows = [json.loads(line) for line in BANK.read_text(encoding="utf-8").splitlines() if line.strip()]
    newly_flagged = 0
    for row in rows:
        was_flagged = bool(row.get("requires_human_review"))
        categories = categories_for(row)
        row["review_category"] = categories
        row["requires_human_review"] = requires_human_review(categories)
        row["spec_version"] = spec_version_for(row.get("source_chunk_ids", []))
        if row["requires_human_review"] and not was_flagged:
            newly_flagged += 1
    BANK.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n", encoding="utf-8")
    print(
        f"updated {len(rows)} records; {sum(row['requires_human_review'] for row in rows)} flagged "
        f"({newly_flagged} newly); {sum(1 for row in rows if row['review_category'] == ['other'])} kept as other"
    )


if __name__ == "__main__":
    main()
