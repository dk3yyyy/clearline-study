#!/usr/bin/env python3
"""Small, explicit corrections to parsed syllabus objectives.

The parser is intentionally mechanical, so two kinds of defect survive a
rebuild: statute years mistyped in the source specification, and one bullet
whose sub-bullets were flattened into a 968-character string. Neither is
guessed here: the corrected years are the enacted years of the named Acts and
the split criteria are the fifteen sub-bullets in Session 2 of the 2022 CP
specification. No assessment criterion is dropped.

Run directly to apply the corrections to syllabus/syllabus.json, or let
build_syllabus.py call apply_corrections() during a rebuild.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CP_MAIN_S2_O1_LEAD = (
    "understand and explain the parts of civil, criminal and common law that have an impact "
    "on the role of a close protection operative* – including, but not limited to:"
)

# Sub-bullets from the 2022 CP specification, with the four statute years
# corrected to the years the Acts were enacted. The specification text prints
# Criminal Law Act 1996, Freedom of Information Act 2018, Offences against the
# Person Act 1998 and Road Traffic Act 2018; those instruments do not exist.
CP_MAIN_S2_O1_CRITERIA = [
    "Data Protection Act 2018 and the General Data Protection Regulation (GDPR) – Control and access of confidential information",
    "Corporate Manslaughter and Homicide Act 2007, Criminal Law Act 1967, Equality Act 2010 and Freedom of Information Act 2000",
    "Health and Safety at Work Act 1974",
    "Human Rights Act 1998",
    "Misuse of Drugs Act 1971, Regulation of Investigatory Powers Act 2000 and Road Traffic Act 1988",
    "Criminal Justice & Public Order Act 1994 (specifically Trespass)",
    "Offences against the Person Act 1861",
    "Criminal Damage Act 1971",
    "current relevant legislation, regulations, codes of practice and guidelines relating to using physical intervention within close protection",
    "Private Hire Vehicles (London) Act 1998",
    "Breach of the Peace",
    "Citizen's Arrest",
    "Use of Force",
    "Defending Self, Others and Property",
    "Harassment",
]

# Other parser-merged objectives. Same rule: keep the source's lead sentence
# as the parent objective and give each sub-bullet its own stable sub-ID.
SPLITS = {
    ("U4-PI", "U4-PI-S1-O2"): (
        "understand the risks associated with using physical intervention",
        [
            "identify the risk factors involved with the use of physical interventions",
            "identify the differences between defensive physical skills and physical interventions",
            "identify positive alternatives to physical intervention",
            "state the signs and symptoms associated with acute behavioural disorder/excited (or agitated) delirium and psychosis",
            "state the specific risks associated with positional (or restraint) asphyxia",
            "state the specific risks associated with prolonged physical interventions",
        ],
    ),
    ("U4-PI", "U4-PI-S1-O3"): (
        "understand how to reduce the risk associated with physical intervention",
        [
            "state the specific risks of incidents on the ground, and the importance of dealing with these appropriately",
            "identify ways of reducing the risk of harm to all parties involved during physical interventions",
            "state the importance of dynamic risk assessment in situations where physical intervention skills are used",
            "state how to manage and monitor a person being held",
            "state the actions to be taken in a medical emergency",
        ],
    ),
    ("U4-PI", "U4-PI-S1-O4"): (
        "understand the good practice to follow after physical intervention has been used",
        [
            "state responsibilities during and immediately following physical intervention",
            "state the importance of keeping physical intervention knowledge and skills current",
            "state the importance of accessing help and support following an incident",
            "state the importance of reflecting on and learning from previous physical intervention situations",
            "state the importance of reporting fully on the use of force",
            "state how to provide support to colleagues during a physical intervention",
        ],
    ),
}

# The 2021 conflict specification puts a footnote about scenario design inside
# the fourth bullet. It is guidance, not an assessment criterion, so it belongs
# on the session rather than in the objective text.
U3_S4_NOTE = (
    "In using the term ‘customer’ we recognise that conflict situations may arise in the security "
    "industry from interaction with a number of different people, which includes customers, clients, "
    "colleagues etc. For the purposes of convenience these are described as ‘other persons’. To ensure "
    "each scenario has a clear focus it should be carefully selected and aligned to the relevant session "
    "learning objectives. Scenarios should include issues relating to employment equality, disability "
    "and discrimination."
)


def _replace_with_sub_objectives(objectives: list[dict], objective_id: str, lead: str, criteria: list[str]) -> None:
    parent = next((item for item in objectives if item.get("id") == objective_id), None)
    if not parent:
        return
    parent["text"] = lead
    prefix = objective_id + "."
    objectives[:] = [item for item in objectives if not item.get("id", "").startswith(prefix)]
    index = objectives.index(parent)
    objectives[index + 1:index + 1] = [
        {"id": f"{prefix}{number}", "text": text} for number, text in enumerate(criteria, 1)
    ]


def apply_corrections(unit: dict) -> None:
    """Apply idempotent corrections to one syllabus unit in place."""
    unit_id = unit.get("id")
    for session in unit.get("sessions", []):
        objectives = session.get("objectives", [])
        for (split_unit, objective_id), (lead, criteria) in SPLITS.items():
            if split_unit == unit_id:
                _replace_with_sub_objectives(objectives, objective_id, lead, criteria)
        if unit_id == "U3-CONFLICT" and session.get("id") == "U3-CONFLICT-S4":
            parent = next((item for item in objectives if item.get("id") == "U3-CONFLICT-S4-O4"), None)
            if parent:
                parent["text"] = (
                    "high risk scenario: an obvious risk situation that demands accurate threat "
                    "assessment, decision-making skills and safe practice."
                )
            session["notes"] = [U3_S4_NOTE]

    if unit_id != "CP-MAIN":
        return
    session = next((item for item in unit.get("sessions", []) if item.get("id") == "CP-MAIN-S2"), None)
    if not session:
        return
    _replace_with_sub_objectives(session.get("objectives", []), "CP-MAIN-S2-O1", CP_MAIN_S2_O1_LEAD, CP_MAIN_S2_O1_CRITERIA)


def main() -> None:
    path = ROOT / "syllabus" / "syllabus.json"
    syllabus = json.loads(path.read_text(encoding="utf-8"))
    for unit in syllabus["units"].values():
        apply_corrections(unit)
    path.write_text(json.dumps(syllabus, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"applied syllabus corrections to {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
