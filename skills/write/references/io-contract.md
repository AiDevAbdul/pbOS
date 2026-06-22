# /write — I/O contract

## CLI
```
node skills/write/write.js <slug> --brief                    # writing briefs for every slot
node skills/write/write.js <slug> --brief --week 1 --limit 3 # briefs for week 1, first 3 slots
node skills/write/write.js <slug> --in content_drafts.json   # validate + guard + persist
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--brief` | — | print a writing brief per calendar slot (no write) |
| `--in PATH` | — | validate + guard + persist coach-authored drafts |
| `--week N` | all | restrict to that 1-based week (briefs mode) |
| `--limit N` | all | cap how many slots to brief this pass |

`--brief` and `--in` are the two modes; pass exactly one.

## Inputs (read, not authored by the spine)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` (both
  human gates; the **approved voice** is the point of /write). Uses `voice.*`, `boundaries.*`,
  `identity.credentials` / `identity.defining_experiences` (for the guard's claim-trace).
- `clients/{slug}/content_calendar.json` — must validate. Each slot becomes a brief.

## Brief (printed by `--brief`)
```json
{
  "date": "2026-07-01", "week": 1,
  "pillar_id": "CALM_SYSTEMS", "pillar_name": "Calm systems",
  "platform": "LinkedIn", "format": "text",
  "angle": "3 org smells that look like tech debt",
  "voice": { "tone": "direct, warm, teacherly", "signatures": ["here's the thing"],
             "lexicon_do": ["systems", "clarity"], "sentence_rhythm": "short opener, longer follow-up" },
  "must_avoid": ["synergy", "guru"],
  "no_go_topics": ["politics"]
}
```

## Output — `content_drafts.json` (written by `--in`)
```json
{
  "client_slug": "jane",
  "status": "drafted",
  "source": "content_calendar.json",
  "generated_from": "For early-stage CTOs ... calm, teachable clarity.",
  "drafts": [
    {
      "date": "2026-07-01", "week": 1,
      "pillar_id": "CALM_SYSTEMS", "pillar_name": "Calm systems",
      "platform": "LinkedIn", "format": "text",
      "angle": "3 org smells that look like tech debt",
      "hook": "Here's the thing about tech debt: half of it is org debt.",
      "body": "...the post, in the person's voice...",
      "cta": "What's the worst 'tech debt' you've found that was really an org problem?",
      "hashtags": [], "status": "drafted"
    }
  ]
}
```
- Each draft must map to a real calendar slot (`date` + `pillar_id`) and carry `hook` + `body`.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no mode given) |
| 2 | `--in` file not found |
| 3 | constitution not `complete`, or calendar missing/invalid (run the prior phase) |
| 4 | a draft was blocked by the authenticity guard |
| 5 | the draft set failed schema validation |
