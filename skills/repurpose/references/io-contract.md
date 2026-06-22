# /repurpose — I/O contract

## CLI
```
node skills/repurpose/repurpose.js <slug> --plan                    # plans for every drafted post
node skills/repurpose/repurpose.js <slug> --plan --limit 3          # plans for the first 3 drafts
node skills/repurpose/repurpose.js <slug> --in content_repurposes.json   # validate + guard + persist
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--plan` | — | print a repurposing plan per source draft (no write) |
| `--in PATH` | — | validate + guard + persist coach-authored derivatives |
| `--limit N` | all | cap how many source drafts to plan/repurpose this pass |

`--plan` and `--in` are the two modes; pass exactly one.

## Inputs (read, not authored by the spine)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` (both
  human gates; the **approved voice**). Uses `voice.*`, `boundaries.*`,
  `platform_plan.secondary_platforms` (the target channels), `cadence.formats` (fallback
  format), and `identity.credentials` / `identity.defining_experiences` (the guard's claim-trace).
- `clients/{slug}/content_drafts.json` — must validate. Each draft is a source post to atomize.

## Plan (printed by `--plan`)
```json
{
  "targets": [{ "platform": "X", "format": "thread" }],
  "plans": [
    {
      "source_date": "2026-07-01", "source_pillar_id": "CALM_SYSTEMS",
      "source_pillar_name": "Calm systems", "source_platform": "LinkedIn",
      "source_hook": "Here's the thing about tech debt...",
      "source_body": "...the original post...",
      "targets": [{ "platform": "X", "format": "thread" }],
      "voice": { "tone": "direct, warm, teacherly", "signatures": ["here's the thing"],
                 "lexicon_do": ["systems", "clarity"], "sentence_rhythm": "short opener, longer follow-up" },
      "must_avoid": ["synergy", "guru"],
      "no_go_topics": ["politics"]
    }
  ]
}
```

## Output — `content_repurposes.json` (written by `--in`)
```json
{
  "client_slug": "jane",
  "status": "repurposed",
  "source": "content_drafts.json",
  "generated_from": "For early-stage CTOs ... calm, teachable clarity.",
  "derivatives": [
    {
      "source_date": "2026-07-01", "source_pillar_id": "CALM_SYSTEMS", "source_pillar_name": "Calm systems",
      "target_platform": "X", "target_format": "thread",
      "hook": "Most 'tech debt' is org debt. A thread 🧵",
      "body": "1/ ...the re-cut, beat by beat...",
      "cta": "Which of these have you hit?",
      "status": "repurposed"
    }
  ]
}
```
- Each derivative must trace to a real source draft (`source_date` + `source_pillar_id`) and carry `target_platform` + `target_format` + `hook` + `body`.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no mode given) |
| 2 | `--in` file not found |
| 3 | constitution not `complete`, drafts missing/invalid, or no secondary platform to repurpose into |
| 4 | a derivative was blocked by the authenticity guard |
| 5 | the derivative set failed schema validation |
