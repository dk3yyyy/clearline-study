# Question draft schema

Write one JSON object per line. Do not add markdown fences. Do not edit any other file.

```json
{
  "unit": "DS-U2",
  "objective_id": "DS-U2-S2-O1",
  "difficulty": 2,
  "stem": "A customer refuses a search at the door. What should the door supervisor do?",
  "options": ["Search them anyway", "Refuse entry and explain the condition of entry", "Call the police immediately", "Confiscate their bag"],
  "answer_index": 1,
  "explanation": "A search at the door is a condition of entry. If the customer refuses, the door supervisor can refuse entry rather than search without consent.",
  "source_chunk_ids": ["sia-ds-specification-2021#DS-U2-S2"],
  "source_quote": "the importance of obtaining permission to search",
  "requires_human_review": false
}
```

Rules:
- Four unique options. Exactly one is correct under the cited source.
- `answer_index` is 0-3.
- Use plain B1-B2 English. Avoid "all of the above" and "none of the above".
- Do not write questions about how to perform a physical technique. PI questions may cover law, duty of care, risk and positional asphyxia only.
- Do not invent section numbers, fees, dates or statistics.
- `source_quote` must be 25 words or fewer copied from the cited source text.
- Every question needs a real `objective_id` from `syllabus/syllabus.json`.
- Vary the correct answer position.
