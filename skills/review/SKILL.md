---
name: review
description: Use this skill to run a brand-health review — the capstone that reads everything the pipeline produced (constitution, pillars, calendar, drafts, repurposes, engagement, authority) and reports on the brand's health the organic-first way. Phase-3 step 4 (typically via `/review {slug}`). It computes deterministic metrics, surfaces findings each with a severity and a recommendation that routes back to the skill that owns the fix, rolls up a single 0–100 health score, and ships an HTML/PDF report. It never edits identity — positioning and voice are the human gates; review observes and recommends only.
---

# /review — Brand-health review (Phase 3 · step 4, the capstone)

The loop closes here. `/review` stands back and looks at the whole brand: is the calendar tracking the pillar mix, is the cadence sustainable, is content actually getting written and distributed, is the brand two-way, is authority compounding? It reports the organic-first way — reach, resonance, production, engagement, authority — never ad metrics, and routes every fix back to the skill that owns it.

## What This Skill Does

- Read **everything**: the complete constitution + `content_pillars.json` + `content_calendar.json` + `content_drafts.json` + `content_repurposes.json` + `engagement_log.json` + `authority_ledger.json` + the distribution queue. Each is optional — its absence becomes a finding, not a crash.
- Compute **deterministic metrics**: pillar coverage vs weights, cadence fit vs stated capacity, production progress, repurposing reach, distribution status, engagement presence, authority signals.
- Surface **findings**, each with a severity (`ok` / `watch` / `risk`), an observation, a recommendation, and the **owning skill** to route the fix to.
- Roll up a single **0–100 health score** (deterministic: 100 minus per-finding penalties).
- Persist `brand_health_review.json` and (optionally) ship a Markdown + HTML/PDF report.

## What This Skill Does NOT Do

- **Edit identity.** It cannot change positioning or voice — those are the two human gates. Review observes and recommends; the human acts through the owning skill (`/calendar`, `/write`, `/repurpose`, `/distribute`, `/engage`, `/authority`).
- Author content that ships in the person's name (so it runs no Authenticity Guard — it is internal analysis).
- Introduce a human gate.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/review.js` (`computeHealth`, `pillarCoverage`, `reviewFor`, `saveReview`, `reviewToMarkdown`), `schemas/brand_health_review.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) + whatever downstream artifacts exist |
| **References** | The metric definitions + scoring in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution).

**Optional (sensible defaults):**
2. `--report` (also write the shareable Markdown + HTML/PDF report).

## Workflow

1. Load the constitution. If it isn't `complete`, halt → run the foundation phase.
2. Run the review (`node review.js {slug} [--report]`). Every downstream artifact is read if present; gaps become findings.
3. Walk the findings WITH the person, then act on each through the skill it routes to — never work around a gate.

## Input / Output Specification

**Inputs:** the complete constitution; any downstream artifacts that exist.
**CLI:** `{slug} [--report]`.
**Outputs:** `clients/{slug}/brand_health_review.json` (`status: reviewed`); optional `brand_health_review.md`/`.html`/`.pdf`.

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Which artifacts exist, the metric values, the findings | The metric definitions, deterministic scoring, route-to-owning-skill, never-edit-identity |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution first.
- [ ] Treat every downstream artifact as optional — absence is a finding, not an error.
- [ ] Route every recommendation to the skill that owns the fix.
- [ ] Keep metrics organic-first (reach, production, engagement, authority — never CPA/ROAS).

### Must Avoid
- Editing positioning or voice (the human gates) — recommend, never act.
- Inventing metrics the artifacts don't support.

### Output Checklist
- [ ] `brand_health_review.json` validates (`schemas/brand_health_review.js`).
- [ ] Every finding names its area, a valid severity, and an observation.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Review fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/review.js`, every content-engine + Phase-3 loader, `scripts/lib/md_to_html.js`, `schemas/brand_health_review.js`.
- **External APIs:** none. Local file persistence + best-effort PDF only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Metric definitions, severity + scoring, routing |
| `references/io-contract.md` | `brand_health_review.json` schema, CLI flags + exit codes |
