# /distribute — I/O contract

## CLI
```
node skills/distribute/distribute.js <slug>                     # build + persist the queue
node skills/distribute/distribute.js <slug> --offset 2          # derivatives land 2 days after source
node skills/distribute/distribute.js <slug> --report            # also write the publish-ready checklist
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--offset N` | 1 | days a derivative is scheduled after its source post |
| `--report` | off | also write `distribution_queue.md` + `.html` + `.pdf` (publish-ready checklist) |

Distribution is deterministic (it assembles already-authored content) — there is no
plan/author split. It builds and persists in one call.

## Inputs (read, not authored by the spine)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` (both human
  gates; the **approved voice**). Uses `voice.*`, `boundaries.*`, `positioning.statement`,
  and `identity.credentials` / `identity.defining_experiences` (the guard's claim-trace).
- `clients/{slug}/content_drafts.json` — must validate. Each draft → a primary-platform queue item.
- `clients/{slug}/content_repurposes.json` — optional. If it validates, each derivative → a
  secondary-platform queue item scheduled `--offset` days after its source.

## Output — `distribution_queue.json` (written every run)
```json
{
  "client_slug": "jane",
  "status": "queued",
  "source": "content_drafts.json + content_repurposes.json",
  "generated_from": "For early-stage CTOs ... calm, teachable clarity.",
  "start_date": "2026-07-01",
  "items": [
    {
      "source_kind": "draft", "source_date": "2026-07-01",
      "pillar_id": "CALM_SYSTEMS", "pillar_name": "Calm systems",
      "platform": "LinkedIn", "format": "text", "scheduled_at": "2026-07-01",
      "hook": "Here's the thing about tech debt...", "body": "...the post...",
      "cta": "What's your take?", "status": "queued"
    },
    {
      "source_kind": "derivative", "source_date": "2026-07-01",
      "pillar_id": "CALM_SYSTEMS", "pillar_name": "Calm systems",
      "platform": "X", "format": "thread", "scheduled_at": "2026-07-02",
      "hook": "Most 'tech debt' is org debt. 🧵", "body": "1/ ...", "status": "queued"
    }
  ]
}
```
- Every item carries `source_kind` + `source_date` (provenance), `platform` + `format` + `scheduled_at` (destination + timing), and `hook` + `body` (the post).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (no slug) |
| 3 | constitution not `complete`, or drafts missing/invalid |
| 4 | a queued item was blocked by the authenticity guard |
| 5 | the queue failed schema validation |
