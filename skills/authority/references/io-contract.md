# /authority — I/O contract

## CLI
```
node skills/authority/authority.js <slug> --plan                       # target seeds from the constitution
node skills/authority/authority.js <slug> --in authority_ledger.json   # validate + guard + persist
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--plan` | — | print authority target seeds derived from the constitution (no write) |
| `--in PATH` | — | validate + guard + persist the ledger (earned signals + targets) |

Pass exactly one of `--plan` / `--in`.

## Inputs (read, not authored by the spine)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` (both human
  gates). Uses `positioning.*`, `audience.*`, `identity.zone_of_genius`, `identity.contrarian_pov`,
  `identity.credentials`, `identity.defining_experiences`, `voice.*`, `boundaries.*`.

## Plan (printed by `--plan`)
```json
{
  "target_count": 4,
  "targets": [
    { "kind": "podcast", "outlet_category": "podcasts early-stage CTOs listen to",
      "pitch_angle": "A guest spot on making complex systems simple",
      "grounded_in": "making complex systems simple", "status": "identified" },
    { "kind": "feature", "outlet_category": "industry publications covering systems clarity for CTOs",
      "pitch_angle": "An op-ed on the contrarian take: Most 'scale' advice makes systems more fragile, not less.",
      "grounded_in": "Most 'scale' advice makes systems more fragile, not less.", "status": "identified" }
  ]
}
```

## Output — `authority_ledger.json` (written by `--in`)
```json
{
  "client_slug": "jane",
  "status": "tracked",
  "generated_from": "For early-stage CTOs ... calm, teachable clarity.",
  "signals": [
    { "type": "podcast", "title": "Guested on The Pragmatic Engineer", "outlet": "The Pragmatic Engineer",
      "date": "2026-06-01", "url": "https://...", "note": "Drove 40 inbound DMs" }
  ],
  "targets": [
    { "kind": "talk", "outlet_category": "conferences / meetups for early-stage CTOs",
      "pitch_angle": "A talk walking CTOs from scaling chaos to calm systems",
      "grounded_in": "from scaling chaos to calm systems", "status": "pursuing" }
  ]
}
```
- A ledger must record **something** (≥1 signal or ≥1 target).
- Every signal needs `type` (talk | feature | podcast | mention | award | collab | inbound | publication) + `title`.
- Every target needs `outlet_category` + `pitch_angle` + `grounded_in` (a recorded fact).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no mode given) |
| 2 | `--in` file not found |
| 3 | constitution not `complete` |
| 4 | a pitch angle or signal title was blocked by the authenticity guard |
| 5 | the ledger failed schema validation |
