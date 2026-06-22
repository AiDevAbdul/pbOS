---
name: pillars
description: Use this skill to synthesize a person's content pillars — the 3–5 recurring themes they publish around — from their completed constitution. This is the first step of the content engine and the first CONSUMER of the finished `personal_brand_profile.json`. Use after `/constitution` (typically via `/pillars {slug}`). It never blank-pages a theme: every pillar must trace to a real fact about the person, and every pillar is run through the Authenticity Guard before it persists.
---

# /pillars — Content Pillars (Content engine · step 1)

Turn the constitution into the 3–5 themes the person will own. Pillars are the spine of everything downstream — the calendar slots posts into them, the writer drafts within them. The coach drafts FROM the constitution; the human confirms the set.

## What This Skill Does

- Read the **complete** constitution (`personal_brand_profile.json`) and propose deterministic pillar **seeds** from the zone of genius, contrarian POV, positioning transformation, audience pains, and SWOT opportunities.
- Refine seeds WITH the person into a focused set of **3–5 pillars**, each with a `name`, `thesis`, a traceable `why_this_person`, what it `serves`, `formats`, and ≥1 `sample_angles`.
- Persist `content_pillars.json` fail-closed: profile must be `complete` (both human gates), the set must pass the schema, and **every pillar must clear the Authenticity Guard**.

## What This Skill Does NOT Do

- Run discovery / positioning / voice — owned by the foundation phase. Halt and route if the constitution isn't complete.
- Introduce a new human gate — positioning and voice are the only two. Pillars are a deliverable, not a gate.
- Write posts or schedule them — owned by `/write` and `/calendar`.
- Invent themes the person has no claim to — `why_this_person` is mandatory.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/pillars.js` (`suggestPillarSeeds`, `savePillars`), `schemas/content_pillars.js` (shape + 3–5 validator), `scripts/lib/guards.js` (the moat this skill enforces) |
| **Profile** | `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete` |
| **References** | The pillar method + good/bad examples in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution — both gates stamped).

## Workflow

1. Load the constitution. If it doesn't validate at stage `complete`, halt: run `/positioning` → `/voice` → `/constitution` first.
2. Print seeds (`--seeds`) and present them. Refine WITH the person — keep, merge, cut, reword — to a focused 3–5.
3. Ensure each final pillar traces to the constitution (`why_this_person`) and carries at least one concrete `sample_angle`.
4. Write `content_pillars.json`; persist with `--in content_pillars.json`. The guard runs automatically; if it blocks, fix the offending pillar (banned language, untraceable claim, or no-go topic) — never bypass it.

## Input / Output Specification

**Inputs:** the complete constitution; an authored `content_pillars.json`.
**CLI:** `{slug} --seeds` (print seeds) · `{slug} --in content_pillars.json` (validate + guard + persist).
**Outputs:** `clients/{slug}/content_pillars.json` (`status: drafted`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| The themes, theses, angles, mix weights | 3–5 range, mandatory traceability, the authenticity guard, complete-constitution gate |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution before producing pillars.
- [ ] 3–5 pillars — focused but not thin (stage validator enforces it).
- [ ] Every pillar traces to a real constitution fact (`why_this_person`).
- [ ] Every pillar clears the Authenticity Guard before it persists.

### Must Avoid
- Blank-paging a theme the person has no evidence for.
- More than 5 pillars (dilutes focus, burns the person's capacity).
- Bypassing or "softening" a guard block.

### Output Checklist
- [ ] `content_pillars.json` validates (`schemas/content_pillars.js`).
- [ ] 3–5 pillars, each with name + thesis + why_this_person + ≥1 sample_angle.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run `/positioning` → `/voice` → `/constitution` (exit 3) |
| < 3 or > 5 pillars | Schema fails closed — adjust the set (exit 5) |
| Pillar blocked by authenticity guard | Fix the offending text; never bypass (exit 4) |

## Dependencies & Security

- **Reuses:** `scripts/lib/pillars.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/content_pillars.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Pillar method, the 3–5 rule, mix weighting, good/bad examples |
| `references/io-contract.md` | `content_pillars.json` schema, CLI exit codes |
