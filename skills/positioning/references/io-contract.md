# /positioning — I/O contract

## CLI
```
node skills/positioning/positioning.js <slug> --in <positioning.json>   # merge + validate (stage: positioning)
node skills/positioning/positioning.js <slug> --approve-positioning      # stamp GATE 1 (human only)
```

## `positioning.json`
```json
{
  "niche": "systems clarity for CTOs",
  "audience": "early-stage CTOs",
  "transformation": "from scaling chaos to calm systems",
  "category_of_one": "an engineer who writes like a teacher",
  "statement": "For early-stage CTOs ... because I spent 10 years building them."
}
```
All four of `niche`, `audience`, `transformation`, `statement` are required by the stage validator.

## Effect
- `--in` merges into `personal_brand_profile.json` → `positioning` layer (`status: positioning_drafted`).
- `--approve-positioning` stamps `positioning.positioning_approved_at` (ISO) and sets `status: positioning_approved`. This gate unblocks `/voice`.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | neither `--in` nor `--approve-positioning` given |
| 2 | `--in` file not found |
| 3 | `--approve-positioning` with empty `statement` (refuses) |
