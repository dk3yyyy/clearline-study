#!/usr/bin/env python3
"""Deterministic human-review taxonomy for question records.

The UI tells learners that a review flag means the item covers force, drugs,
search, restraint or safeguarding. The original flag was set by a narrower
keyword list and drifted from that promise. This module derives categories
from the text already present on a record (stem and explanation), so the flag
can be reproduced by anyone and audited without a model call.

The brief also requires review of arrest and first-aid items, which the UI
sentence omits; those are separate categories here rather than being forced
into one of the five.

Categories are deliberately inclusive: a false positive costs a reviewer a
minute, a false negative can publish a wrong answer about force or first aid.
`other` preserves a pre-existing flag that matches none of the policy terms;
it is not a new judgement about the item.
"""
from __future__ import annotations

import re

CATEGORY_ORDER = ["force", "drugs", "search", "restraint", "safeguarding", "arrest", "first_aid", "other"]

CATEGORY_PATTERNS = {
    "force": [
        r"\buse of force\b", r"\busing force\b", r"\buse[sd]? force\b",
        r"\breasonable force\b", r"\bnecessary force\b", r"\bexcessive force\b",
        r"\bminimum force\b", r"\bproportionate force\b", r"\bphysical force\b",
        r"\bforce (?:may|can|must) be used\b", r"\bhow much force\b",
        r"\bdefend(?:ing|ed)? (?:self|yourself|others)\b",
        r"\bchoke\b", r"\bstrangl", r"\basphyxia\b", r"\bweapons?\b",
    ],
    "drugs": [
        r"\bdrugs?\b", r"\bcontrolled (?:drug|substance)s?\b", r"\bghb\b", r"\bgbl\b",
        r"\bcocaine\b", r"\bheroin\b", r"\bcannabis\b", r"\bketamine\b", r"\becstasy\b",
        r"\banabolic steroids?\b", r"\brohypnol\b",
    ],
    "search": [r"\bsearch(?:es|ing|ed)?\b"],
    "restraint": [
        r"\brestrain(?:t|ts|ing|ed)?\b", r"\bphysical intervention\b",
        r"\bpositional asphyxia\b", r"\bhandcuff", r"\bheld on the ground\b",
        r"\bholding (?:a|the) person\b",
    ],
    "safeguarding": [
        r"\bsafeguard", r"\bvulnerab", r"\bchild(?:ren)?\b", r"\byoung person\b",
        r"\bspiking\b", r"\btrafficking\b", r"\bmodern slavery\b", r"\babuse\b",
        r"\bduty of care\b",
    ],
    "arrest": [r"\barrest(?:s|ed|ing)?\b", r"\bcitizen'?s arrest\b"],
    "first_aid": [
        r"\bfirst aid\b", r"\brecovery position\b", r"\bcpr\b", r"\bunconscious\b",
        r"\bnot breathing\b", r"\bbleeding\b", r"\bburns?\b", r"\bchoking\b",
        r"\bcollapsed\b", r"\bmedical (?:help|advice|emergency)\b",
    ],
}

_COMPILED = {name: re.compile("|".join("(?:" + p + ")" for p in patterns), re.I) for name, patterns in CATEGORY_PATTERNS.items()}


def categories_for(record: dict) -> list[str]:
    """Return the review categories supported by the record's stem and explanation.

    Options are deliberately excluded: a distractor can mention a weapon or a
    search without the item being about either, and that noise would flag
    unrelated law or service questions.
    """
    text = " ".join([str(record.get("stem", "")), str(record.get("explanation", ""))])
    found = [name for name in CATEGORY_ORDER if name in _COMPILED and _COMPILED[name].search(text)]
    if not found and record.get("requires_human_review"):
        # Keep the existing reviewer's flag even when the policy vocabulary does
        # not name the reason. Never turn a human review flag off silently.
        found = ["other"]
    return found


def requires_human_review(categories: list[str]) -> bool:
    return bool(categories)


def spec_version_for(source_chunk_ids: list[str]) -> str:
    """Use the newest 2022-2025 source document year, else the 2021 baseline.

    The only document years used are those encoded in the manifest/doc ids; a
    statute's own year (for example PACE 1984) is not a specification version.
    """
    years = []
    for chunk_id in source_chunk_ids or []:
        match = re.search(r"-(20(?:2[2-5]))(?:$|-)", str(chunk_id).split("#")[0])
        if match:
            years.append(match.group(1))
    return max(years) if years else "2021"
