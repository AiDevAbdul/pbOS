# /coach-interview — I/O contract

## CLI
```
node skills/coach-interview/coach-interview.js next <slug>
node skills/coach-interview/coach-interview.js record <slug> --layer <L> --id <ID> --q "<question>" --a "<answer>"
node skills/coach-interview/coach-interview.js detect <slug>
node skills/coach-interview/coach-interview.js audit-evidence <slug>
node skills/coach-interview/coach-interview.js synthesize <slug> --in <discovery.json>
```

## `interview_answers.json` (schemas/interview_answers.js)
```json
{
  "slug": "jane",
  "goal_archetype": "consultant_leadgen",
  "archetype_confidence": 0.6,
  "answers": [{ "layer": "context_intent", "question_id": "ci1", "question": "...", "answer": "..." }],
  "evidence_signals": { "sample_count": 3, "topics": ["writing", "systems"], "note": "..." },
  "completed_layers": []
}
```

## `discovery.json` (authored by Claude, consumed by `synthesize`)
```json
{
  "goal_archetype": "consultant_leadgen",
  "identity": { "origin_story": "...", "defining_experiences": [], "values": [], "credentials": [], "zone_of_genius": "...", "contrarian_pov": "..." },
  "audience": { "who": "...", "pains": [], "desires": [] },
  "platform_plan": { "primary_platform": "LinkedIn", "secondary_platforms": [], "rationale": "..." },
  "cadence": { "weekly_volume": "3 posts/week", "formats": [], "time_budget_hours": 3, "sustainability_note": "..." },
  "goals_kpis": { "primary_goal": "...", "kpis": [], "horizon": "..." },
  "boundaries": { "never_say": [], "no_go_topics": [] },

  "claimed_strengths": [], "self_weaknesses": [],
  "audience_gaps": [], "competitor_saturation": [], "constraints": []
}
```
The last five arrays are the SWOT raw inputs; `synthesize` triangulates `claimed_strengths` against `evidence_signals.topics` and writes the discovery layer + SWOT into `personal_brand_profile.json` (stage `discovery`).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad usage |
| 2 | `synthesize` missing/invalid `--in` |
| (throws) | discovery stage validation failed (fix the named field) |
