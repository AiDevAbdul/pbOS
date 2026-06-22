---
name: distribute
description: Use this skill to assemble a person's authored content (the primary-platform drafts from `/write` and the secondary-platform derivatives from `/repurpose`) into one ordered, dated, publish-ready queue. Phase-3 step 1, the bridge from "content authored" to "content out the door" (typically via `/distribute {slug}`). It does NOT author anything — it merges and orders already-guarded posts deterministically, schedules each derivative to land after its source post, re-runs every item through the Authenticity Guard, and emits a human-publishable checklist. pbOS is organic-first and never auto-posts to an external platform.
---

# /distribute — Distribution (Phase 3 · step 1)

Get the content out the door. By the time you reach `/distribute`, the posts already exist and were already guarded — `/write` drafted them for the primary platform and `/repurpose` re-cut them for the secondary ones. Distribution does the one thing left: **assemble** them into a single ordered, dated queue the person can publish from, day by day. It authors nothing.

## What This Skill Does

- Read the **complete** constitution, the validated `content_drafts.json`, and (when present) the validated `content_repurposes.json`.
- **Merge** drafts (primary platform, on their slot date) and derivatives (secondary platforms) into one queue, scheduling each derivative to land `--offset` days **after** its source post so the original leads and the re-cut follows.
- **Order** the queue deterministically — by publish date, original before its derivatives, then platform.
- Persist `distribution_queue.json` fail-closed: profile must be `complete`, drafts must validate, the queue must pass the schema, and **every item must clear the Authenticity Guard** (defense in depth — the content was guarded when authored, but the queue is what actually ships).
- Optionally (`--report`) emit a publish-ready Markdown + HTML/PDF checklist grouped by date.

## What This Skill Does NOT Do

- **Auto-post to any external platform.** pbOS is organic-first and the human owns their reputation. The queue is a publish-READY package; the person (or a future integration) publishes from it.
- Author or edit posts — owned by `/write` and `/repurpose` (halt and route if drafts are missing).
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/distribute.js` (`buildQueue`, `generateQueue`, `queueToMarkdown`), `schemas/distribution_queue.js`, `scripts/lib/guards.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) + `content_drafts.json` (must validate); `content_repurposes.json` (folded in if valid) |
| **References** | The queue model + scheduling rule in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution AND validated drafts).

**Optional (sensible defaults):**
2. `--offset N` (days a derivative lands after its source post; default 1).
3. `--report` (also write the publish-ready checklist).

## Workflow

1. Load the constitution + drafts (+ repurposes if present). If the constitution isn't `complete`, halt → run the foundation phase. If drafts are missing/invalid, halt → run `/write {slug}`.
2. Build + persist the queue (`node distribute.js {slug} [--offset N] [--report]`). The guard runs automatically on save; if it blocks, fix the offending upstream content — never bypass.
3. Hand the person the checklist and walk the first few days WITH them before anything is published.

## Input / Output Specification

**Inputs:** the complete constitution; validated `content_drafts.json`; optional valid `content_repurposes.json`.
**CLI:** `{slug} [--offset N] [--report]`.
**Outputs:** `clients/{slug}/distribution_queue.json` (`status: queued`); optional `distribution_queue.md`/`.html`/`.pdf`.

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| The platforms, the posts, the dates, how much is repurposed | Original-leads-derivative-follows ordering, deterministic assembly, the re-guard on every item, organic-first (never auto-posts) |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution and validated drafts first.
- [ ] Schedule each derivative AFTER its source post (the original leads).
- [ ] Order deterministically (date → original-before-derivative → platform).
- [ ] Re-run every queued item through the Authenticity Guard before it persists.

### Must Avoid
- Auto-posting to any external platform (organic-first; the human owns the act of publishing).
- Publishing a derivative before or on the same day as its source post.
- Editing the post copy here — distribution assembles, it does not author.

### Output Checklist
- [ ] `distribution_queue.json` validates (`schemas/distribution_queue.js`).
- [ ] Every item carries source provenance, platform, format, `scheduled_at`, hook, body.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Drafts missing/invalid | Halt: run `/write {slug}` (exit 3) |
| An item blocked by the authenticity guard | Fix the upstream content; never bypass (exit 4) |
| Queue fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/distribute.js`, `scripts/lib/write.js`, `scripts/lib/repurpose.js`, `scripts/lib/calendar.js` (`addDays`), `scripts/lib/guards.js`, `scripts/lib/md_to_html.js`, `schemas/distribution_queue.js`.
- **External APIs:** none. Local file persistence + best-effort PDF only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Queue model, scheduling rule, the guard |
| `references/io-contract.md` | `distribution_queue.json` schema, CLI flags + exit codes |
