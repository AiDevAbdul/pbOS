# /engage — I/O contract

## CLI
```
node skills/engage/engage.js <slug> --strategy                              # print the engagement posture
node skills/engage/engage.js <slug> --brief --inbound items.json            # reply brief per inbound item
node skills/engage/engage.js <slug> --brief --inbound items.json --limit 5  # first 5 only
node skills/engage/engage.js <slug> --in engagement_log.json                # validate + guard + persist
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--strategy` | — | print the engagement strategy derived from the constitution (no write) |
| `--brief` | — | print a reply brief per inbound item (needs `--inbound`) |
| `--inbound PATH` | — | the incoming comments/DMs/mentions/targets to reply to |
| `--in PATH` | — | validate + guard + persist the coach-authored engagement log |
| `--limit N` | all | cap how many inbound items to brief this pass |

Pass exactly one of `--strategy` / `--brief` / `--in`.

## Inputs (read, not authored by the spine)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` (both human
  gates; the **approved voice**). Uses `voice.*`, `boundaries.*`, `positioning.*`, `audience.*`,
  `cadence.time_budget_hours`, and `identity.credentials` / `identity.defining_experiences`.
- **Inbound file** (for `--brief`) — an array, or `{ "interactions": [...] }`, of items like:
  ```json
  [{ "kind": "comment", "platform": "LinkedIn", "inbound_text": "How do you start fixing on-call?", "context": "comment on the tech-debt post" }]
  ```

## Strategy (printed by `--strategy`)
```json
{
  "strategy": {
    "daily_minutes": "12 min/day",
    "focus_audience": "early-stage CTOs",
    "posture": "direct, warm, teacherly",
    "proactive_ratio": "2 proactive : 1 reactive",
    "targets": ["people active in systems clarity for CTOs", "early-stage CTOs asking about their pains", "voices your audience already follows (thoughtful replies, not pitches)"]
  }
}
```

## Output — `engagement_log.json` (written by `--in`)
```json
{
  "client_slug": "jane",
  "status": "engaged",
  "generated_from": "For early-stage CTOs ... calm, teachable clarity.",
  "strategy": { "daily_minutes": "12 min/day", "focus_audience": "early-stage CTOs", "posture": "direct, warm, teacherly", "proactive_ratio": "2 proactive : 1 reactive", "targets": ["..."] },
  "interactions": [
    {
      "kind": "comment", "platform": "LinkedIn",
      "inbound_text": "How do you start fixing on-call?",
      "context": "comment on the tech-debt post",
      "response": "Here's the thing — start with who owns the pager, not the runbook. ...",
      "status": "drafted"
    }
  ]
}
```
- Every interaction needs `kind` (comment | dm | mention | proactive), `platform`, `inbound_text`, and a drafted `response`. If `strategy` is omitted, it's filled deterministically from the constitution.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no mode, or `--brief` without `--inbound`) |
| 2 | `--inbound`/`--in` file not found |
| 3 | constitution not `complete` |
| 4 | a response was blocked by the authenticity guard |
| 5 | the engagement set failed schema validation |
