# /review — I/O contract

## CLI
```
node skills/review/review.js <slug>             # compute + persist the review
node skills/review/review.js <slug> --report    # also write the shareable Markdown + HTML/PDF
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--report` | off | also write `brand_health_review.md` + `.html` + `.pdf` |

Review is deterministic — it computes and persists in one call.

## Inputs (all read, none authored)
- `clients/{slug}/personal_brand_profile.json` — **required**, must validate at stage `complete`.
- `content_pillars.json`, `content_calendar.json`, `content_drafts.json`, `content_repurposes.json`,
  `engagement_log.json`, `authority_ledger.json`, `distribution_queue.json` — **all optional**.
  Each is read if it exists + validates; absence becomes a finding.

## Output — `brand_health_review.json`
```json
{
  "client_slug": "jane",
  "status": "reviewed",
  "generated_at": "2026-06-22",
  "score": 84,
  "metrics": {
    "pillars": 3, "calendar_slots": 12, "posts_per_week": 3, "stated_per_week": 3,
    "drafts": 3, "derivatives": 3, "secondary_platforms": 1, "distribution_built": true,
    "interactions": 2, "authority_signals": 1, "authority_by_type": { "podcast": 1 },
    "pillar_max_drift": 0.08
  },
  "findings": [
    { "area": "cadence_fit", "severity": "ok",
      "observation": "Cadence (3/week) is within the stated capacity (3/week).",
      "recommendation": "Sustainable.", "route_to": "/calendar" },
    { "area": "engagement", "severity": "watch",
      "observation": "No engagement logged — the brand is one-way (broadcast only).",
      "recommendation": "Work the conversations the posts start.", "route_to": "/engage" }
  ]
}
```
- Requires a `metrics` object, a `score` in 0..100, and a non-empty `findings` list.
- Every finding needs `area`, `severity` (ok | watch | risk), and `observation`. `recommendation`
  + `route_to` point to the owning skill.

## Scoring
`score = 100 − Σ penalties`, floored at 0. `risk` = −20, `watch` = −8, `ok` = 0. Deterministic.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no slug) |
| 3 | constitution not `complete` |
| 5 | the review failed schema validation |
