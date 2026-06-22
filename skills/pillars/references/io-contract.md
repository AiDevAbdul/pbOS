# /pillars — I/O contract

## CLI
```
node skills/pillars/pillars.js <slug> --seeds                  # print deterministic seeds from the constitution
node skills/pillars/pillars.js <slug> --in <content_pillars.json>   # validate + authenticity-guard + persist
```

## `content_pillars.json`
```json
{
  "pillars": [
    {
      "name": "Calm systems",
      "thesis": "Most scaling pain is an org-design problem, not a tech problem.",
      "why_this_person": "identity.zone_of_genius — 10 years building eng orgs",
      "serves": "early-stage CTOs drowning in scaling chaos",
      "formats": ["long-form LinkedIn", "newsletter"],
      "sample_angles": [
        "The 3 org smells that look like tech debt",
        "Why your on-call rotation is really a hiring problem"
      ],
      "weight": 0.35
    }
  ],
  "mix_rationale": "Anchor on the zone-of-genius and transformation pillars; contrarian pillar for reach."
}
```
- 3–5 pillars required (stage validator).
- Each pillar requires `name`, `thesis`, `why_this_person`, and ≥1 `sample_angles`.
- `id` is derived deterministically from `name` if omitted; `goal_archetype` and
  `generated_from` (the positioning statement) are filled from the profile if omitted.

## Effect
- `--seeds` prints deterministic candidate seeds (no write).
- `--in` normalizes, validates, runs every pillar through the Authenticity Guard, and
  writes `clients/{slug}/content_pillars.json` with `status: drafted`.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | neither `--seeds` nor `--in` given |
| 2 | `--in` file not found |
| 3 | constitution not `complete` (both human gates required) — run the foundation phase |
| 4 | a pillar was blocked by the authenticity guard |
| 5 | `content_pillars.json` failed schema validation (e.g. not 3–5 pillars) |
