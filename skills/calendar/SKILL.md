---
name: calendar
description: Use this skill to generate a sustainable posting calendar from a person's content pillars and their constitution's cadence + platform plan. Content-engine step 2, after `/pillars` (typically via `/calendar {slug}`). It distributes dated posting slots across pillars by their mix weight, caps posts-per-week to the person's STATED capacity (never inflates it), and runs every scheduled angle through the Authenticity Guard.
---

# /calendar — Content Calendar (Content engine · step 2)

Turn the pillars into a dated plan the person can actually sustain. The calendar slots posts across pillars by weight, spaces them across the week, and hands each slot a concrete angle so `/write` never faces a blank page.

## What This Skill Does

- Read the **complete** constitution (`cadence.weekly_volume`, `cadence.formats`, `platform_plan.primary_platform`) and the validated `content_pillars.json`.
- Lay out `horizon_weeks × posts_per_week` slots, each with a date, pillar, platform, format, and a concrete angle (rotated from the pillar's `sample_angles`).
- Distribute slots across pillars by their `weight` (smooth weighted round-robin — heavier pillars appear more often, but pillars stay interleaved).
- Persist `content_calendar.json` fail-closed: profile must be `complete`, pillars must exist + validate, the calendar must pass the schema, and **every angle must clear the Authenticity Guard**.

## What This Skill Does NOT Do

- Create pillars — owned by `/pillars` (halt and route if missing).
- Inflate cadence past the person's stated capacity — `posts_per_week` is derived from `cadence.weekly_volume`, never more (sustainability, principle 5).
- Write the actual posts — owned by `/write`.
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/calendar.js` (`generateCalendar`, `buildCalendar`), `schemas/content_calendar.js`, `scripts/lib/pillars.js` (pillar source) |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) + `content_pillars.json` (must validate) |
| **References** | The scheduling method + sustainability rule in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution AND validated pillars).

**Optional (sensible defaults):**
2. `--weeks N` horizon (default 4) · `--start YYYY-MM-DD` (default today).

## Workflow

1. Load the constitution + pillars. If the constitution isn't `complete`, halt → run the foundation phase. If pillars are missing/invalid, halt → run `/pillars {slug}`.
2. Derive `posts_per_week` from `cadence.weekly_volume`. Do not exceed it.
3. Generate the calendar (`node calendar.js {slug} [--weeks N] [--start ...]`). The guard runs automatically; if it blocks, fix the offending pillar angle in `/pillars` — never bypass.
4. Present the calendar (and the per-pillar mix) to the person; adjust horizon/start as needed.

## Input / Output Specification

**Inputs:** the complete constitution; validated `content_pillars.json`.
**CLI:** `{slug} [--weeks N] [--start YYYY-MM-DD]`.
**Outputs:** `clients/{slug}/content_calendar.json` (`status: planned`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Cadence, platform, pillar weights, horizon, the specific dated slots | Weighted round-robin distribution, capacity cap, full-slot requirement, the authenticity guard |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution and validated pillars first.
- [ ] Derive `posts_per_week` from cadence; never inflate it.
- [ ] Distribute slots across pillars by weight; keep them interleaved.
- [ ] Every slot fully specified (date, pillar, platform, format, angle).
- [ ] Every angle clears the Authenticity Guard.

### Must Avoid
- Scheduling beyond the person's stated capacity (burnout).
- Half-specified slots that hand `/write` an ambiguous brief.

### Output Checklist
- [ ] `content_calendar.json` validates (`schemas/content_calendar.js`).
- [ ] `slots.length == horizon_weeks × posts_per_week`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Pillars missing/invalid | Halt: run `/pillars {slug}` (exit 3) |
| `cadence.weekly_volume` has no number | Exit 5 — fix cadence in the constitution |
| Angle blocked by authenticity guard | Fix the pillar angle; never bypass (exit 4) |

## Dependencies & Security

- **Reuses:** `scripts/lib/calendar.js`, `scripts/lib/pillars.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/content_calendar.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Scheduling method, weighted mix, sustainability rule |
| `references/io-contract.md` | `content_calendar.json` schema, CLI flags + exit codes |
