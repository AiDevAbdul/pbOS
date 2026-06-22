---
name: constitution
description: Use this skill to assemble a person's operating constitution — a per-person CLAUDE.md plus a shareable brand-of-one HTML/PDF — from their completed profile. This skill should be used as the final foundation step (typically via `/constitution {slug}`) after both human gates (positioning and voice) are approved. It validates the profile at stage complete and fail-closed refuses to produce a constitution from an unapproved identity. The resulting CLAUDE.md is what every future pbOS skill loads to specialize its output to this person.
---

# /constitution — Brand-of-One Constitution (Foundation · step 5 of 5)

The payoff. Everything the coach learned becomes one durable document the whole OS reads. It can only be produced once the person's identity is locked behind both human gates.

## What This Skill Does

- Validate `personal_brand_profile.json` at stage `complete` (fail-closed: requires BOTH gates + all layers).
- Fill `templates/person-claude.md` into a per-person `clients/{slug}/CLAUDE.md`.
- Render a shareable brand-of-one doc as HTML (always) and PDF (best-effort).
- Set the profile `status: complete`.

## What This Skill Does NOT Do

- Generate discovery, positioning, or voice — owned by the earlier skills.
- Write content (posts, calendars) — that's the next phase, which reads this constitution.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/profile.js`, `scripts/lib/md_to_html.js` (HTML+PDF), `schemas/personal_brand_profile.js` |
| **Template** | `templates/person-claude.md` |
| **Profile** | a complete profile with both gates stamped |

## Clarifications

**Required:**
1. Which `{slug}` (must have both gates approved).

## Workflow

1. Run `node skills/constitution/constitution.js {slug}`.
2. If it blocks, fix the named gap (a missing gate or layer field) via the owning skill, then re-run.
3. Deliver the HTML/PDF; the per-person `CLAUDE.md` is now the operating contract for all downstream work.

## Input / Output Specification

**Inputs:** complete `personal_brand_profile.json`; `templates/person-claude.md`.
**Outputs:** `clients/{slug}/CLAUDE.md`, `constitution.md/.html/.pdf`; `status: complete`. Exit 3 if not complete (lists the gaps).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Every filled field | The constitution structure, the both-gates-required check, HTML/PDF rendering |

## Domain Standards

### Must Follow
- [ ] Refuse to assemble unless stage `complete` validates (both gates + all layers).
- [ ] Name the authenticity guard in the Voice Rules section (it enforces them downstream).

### Must Avoid
- Producing a constitution from an unapproved or partial identity.

### Output Checklist
- [ ] `CLAUDE.md` + `constitution.html` exist; both gate timestamps present; `status == complete`.

## Error Handling

| Scenario | Action |
|----------|--------|
| A gate not stamped | Exit 3 — route to `/positioning` or `/voice` to approve |
| A layer field missing | Exit 3 — fill it via the owning skill |
| PDF render unavailable | Non-fatal — HTML still ships (install Playwright to enable PDF) |

## Dependencies & Security

- **Reuses:** `scripts/lib/profile.js`, `scripts/lib/md_to_html.js`, `schemas/personal_brand_profile.js`.
- **External APIs:** none. PDF via local headless Chromium (Playwright), best-effort.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/io-contract.md` | Template token map, output paths, exit codes |
