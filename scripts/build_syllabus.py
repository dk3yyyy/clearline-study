#!/usr/bin/env python3
"""Rebuild syllabus/syllabus.json from the SIA specification text extracts.

The parser is deliberately conservative: it reads Session headings, the Aim, and
top-level bullet objectives. Sub-bullets are appended to the parent objective.
It does not invent objectives that are not in the specification text.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from syllabus_corrections import apply_corrections

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sources" / "00-sia-specs"
SPECS = {
    "sia-common-specification-2021": ("U1-COMMON", "SIA Common Security Industry Knowledge specification (2021)", "https://assets.publishing.service.gov.uk/media/6061dd69e90e072d8f8b8638/sia-common-specification-2021.pdf"),
    "sia-conflict-management-specification-2021": ("U3-CONFLICT", "SIA Conflict Management specification (2021)", "https://assets.publishing.service.gov.uk/media/6061dd35d3bf7f5ce4f581ba/sia-conflict-management-specification-2021.pdf"),
    "sia-physical-intervention-specification-2021": ("U4-PI", "SIA Physical Intervention Skills specification (2021)", "https://assets.publishing.service.gov.uk/media/6061f2bee90e072d9d0d4214/sia-physical-intervention-specification-2021.pdf"),
    "sia-ds-specification-2021": ("DS-U2", "SIA Door Supervision specification (2021)", "https://assets.publishing.service.gov.uk/media/6061f28d8fa8f55b6fae563f/sia-ds-specification-2021.pdf"),
    "sia-sg-specification-2021": ("SO-U2", "SIA Security Guarding specification (2021)", "https://assets.publishing.service.gov.uk/media/6061f318e90e072d97f87650/sia-sg-specification-2021.pdf"),
    "sia-cctv-specification-2021": ("CCTV-U2", "SIA Public Space Surveillance (CCTV) specification (2021)", "https://assets.publishing.service.gov.uk/media/6061f2e8d3bf7f5ce74c29f3/sia-cctv-specification-2021.pdf"),
    "sia-cp-specification-2022": ("CP-MAIN", "SIA Close Protection specification (2022)", "https://assets.publishing.service.gov.uk/media/62389474e90e0779a0082628/sia-cp-specification-2022.pdf"),
    "sia-cp-physical-intervention-specification-2022": ("CP-PI", "SIA Close Protection Physical Intervention specification (2022)", "https://assets.publishing.service.gov.uk/media/6238955a8fa8f540eb4c12f6/sia-cp-physical-intervention-specification-2022.pdf"),
    "sia-cp-ds-responsiblities-specification-2022": ("CP-DSR", "SIA Door Supervision Responsibilities for Close Protection specification (2022)", "https://assets.publishing.service.gov.uk/media/623895ace90e0779a4d55815/sia-cp-ds-responsiblities-specification-2022.pdf"),
    "sia-cvit-specification-2021": ("CVIT", "SIA Cash and Valuables in Transit specification (2021)", "https://assets.publishing.service.gov.uk/media/6061dc888fa8f55b67fb3612/sia-cvit-specification-2021.pdf"),
    "sia-ds-refresher-specification-2024": ("DS-REF", "SIA Door Supervisor Refresher specification (2024)", "https://assets.publishing.service.gov.uk/media/670f919e3b919067bb483246/sia-ds-refresher-specification-2024.pdf"),
    "sia-sg-refresher-specification-2024": ("SG-REF", "SIA Security Guarding Refresher specification (2024)", "https://assets.publishing.service.gov.uk/media/670f91c1080bdf716392f438/sia-sg-refresher-specification-2024.pdf"),
    "sia-cp-physical-intervention-refresher-specification-2025": ("CP-REF", "SIA Close Protection Physical Intervention Refresher specification (2025)", "https://assets.publishing.service.gov.uk/media/68add0a9960e2d135b4c8e3c/sia-cp-physical-intervention-refresher-specification-2025.pdf"),
    "sia-vi-specification": ("VI", "SIA Vehicle Immobilisation specification", "https://assets.publishing.service.gov.uk/media/5f857671d3bf7f6b99980884/sia-vi-specification.pdf"),
}


def clean(value: str) -> str:
    value = value.replace("\f", "\n")
    return re.sub(r"\n\s*Page \d+ of \d+\s*\n", "\n", value).strip()


def parse(text: str):
    text = clean(text)
    headings = list(re.finditer(r"^(Session\s*\d+[a-c]?\s*:\s*.+)$", text, re.M))
    sessions = []
    for index, match in enumerate(headings):
        block = text[match.start():headings[index + 1].start() if index + 1 < len(headings) else len(text)]
        title = match.group(1).strip()
        aim_match = re.search(r"Aim[s]?\s*:\s*(.+?)(?=\n\s*Objectives|\n\s*By the end|\Z)", block, re.S | re.I)
        aim = re.sub(r"\s+", " ", aim_match.group(1)).strip(" •\n") if aim_match else ""
        objective_match = re.search(r"Objectives?\s*:?", block, re.I)
        part = block[objective_match.end():] if objective_match else ""
        objectives, current = [], None
        for raw in part.splitlines():
            stripped = raw.strip()
            if not stripped:
                continue
            if re.match(r"^(Appendix|Section\s+\d|Page\s+\d|Scenario situations)", stripped, re.I):
                break
            bullet = re.match(r"^(\s*)[•\-]\s+(.*)$", raw)
            sub = re.match(r"^(\s*)o\s+(.*)$", raw)
            if bullet and len(bullet.group(1)) <= 8:
                if current:
                    objectives.append(current)
                current = bullet.group(2).strip()
            elif sub and current:
                current += " " + sub.group(2).strip()
            elif current and not stripped.startswith(("Aim", "By the end", "Session")):
                current += " " + stripped
        if current:
            objectives.append(current)
        objectives = [re.sub(r"\s+", " ", o).strip() for o in objectives if len(o) > 8]
        sessions.append({"title": title, "aim": aim, "objectives": objectives})
    return sessions


def main():
    current = json.loads((ROOT / "syllabus" / "syllabus.json").read_text())
    for doc_id, (unit_id, doc_title, url) in SPECS.items():
        path = SOURCES / f"{doc_id}.txt"
        if not path.exists() or unit_id not in current["units"]:
            continue
        parsed = parse(path.read_text(errors="ignore"))
        for number, session in enumerate(parsed, 1):
            session["id"] = f"{unit_id}-S{number}"
            session["summary"] = session.pop("aim") or session["title"]
            session["source"] = {"doc_id": doc_id, "doc_title": doc_title, "url": url}
            session["objectives"] = [{"id": f"{unit_id}-S{number}-O{i}", "text": text} for i, text in enumerate(session["objectives"], 1)]
        current["units"][unit_id]["sessions"] = parsed
        print(f"{unit_id}: {len(parsed)} sessions, {sum(len(s['objectives']) for s in parsed)} objectives")
    (ROOT / "syllabus" / "syllabus.json").write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
