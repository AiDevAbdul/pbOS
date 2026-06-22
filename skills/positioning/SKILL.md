---
name: positioning
description: Use this skill to synthesize a person's positioning from their discovery layer — niche, audience, transformation, category-of-one, and a positioning statement — and to stamp the human-owned positioning gate that unblocks voice work. This skill should be used after `/coach-interview` (typically via `/positioning {slug}`). It never blank-page generates and never self-approves: the AI drafts, the human alone approves via `--approve-positioning`.
---

# /positioning — Positioning (Foundation · step 3 of 5 · GATE 1)

Turn discovery into a sharp, defensible position. The AI drafts FROM the discovery layer; the human owns the call. Positioning is the first load-bearing gate — voice work is blocked until it's approved.

## What This Skill Does

- Synthesize `niche`, `audience`, `transformation`, `category_of_one`, and a `statement` from the discovery layer (identity, SWOT, audience).
- Persist the positioning layer (merge, never clobber) at stage `positioning`.
- Present the statement to the person and, **only on explicit human approval**, stamp `positioning_approved_at` via `--approve-positioning`.

## What This Skill Does NOT Do

- Run discovery — owned by `/coach-interview`.
- Capture voice — owned by `/voice` (which this gate unblocks).
- Auto-approve positioning — the human alone clears the gate.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/profile.js` (`saveProfile`, `stampGate`), `schemas/personal_brand_profile.js` (positioning shape + stage validator) |
| **Profile** | `clients/{slug}/personal_brand_profile.json` discovery layer (required) |
| **References** | The positioning formula in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a completed discovery layer).

> Positioning approval is a **human gate, not a clarifying question.** Present the finished statement and wait for an explicit yes before `--approve-positioning`.

## Workflow

1. Load the discovery layer. If absent, halt: run `/coach-interview {slug}` first.
2. Draft positioning using the formula in `references/domain-standards.md` (statement is an internal anchor, not a slogan).
3. Write `positioning.json`; persist with `--in positioning.json`.
4. Present the statement prominently. Do NOT proceed to `/voice` until the human approves.
5. On explicit approval only, run `--approve-positioning`.

## Input / Output Specification

**Inputs:** discovery layer; an authored `positioning.json`.
**CLI:** `{slug} --in positioning.json` (merge) · `{slug} --approve-positioning` (stamp GATE 1).
**Outputs:** `personal_brand_profile.json` positioning layer; `positioning_approved_at` once stamped (`status: positioning_approved`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Niche, audience, transformation, statement | The positioning formula, required fields, human-only gate |

## Domain Standards

### Must Follow
- [ ] Base positioning on the discovery layer; never blank-page.
- [ ] All of `niche`, `audience`, `transformation`, `statement` present (stage validator).
- [ ] Obtain explicit human approval before `--approve-positioning`.

### Must Avoid
- Stamping the gate without confirmation.
- Treating the statement as a public slogan.

### Output Checklist
- [ ] `positioning.json` validates at stage `positioning`.
- [ ] After approval, `status == positioning_approved`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Missing discovery layer | Halt: run `/coach-interview {slug}` |
| `--approve-positioning` with empty statement | Exit 3 — write positioning first |
| Asked to approve without human sign-off | Refuse — human-only gate |

## Dependencies & Security

- **Reuses:** `scripts/lib/profile.js`, `schemas/personal_brand_profile.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Positioning formula, category-of-one method, good/bad examples |
| `references/io-contract.md` | `positioning.json` schema, CLI exit codes |
