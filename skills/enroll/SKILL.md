---
name: enroll
description: Use this skill to bring a new person into pbOS — derive a slug, scaffold their isolated workspace, create a draft personal_brand_profile, a blank interview record, and a voice_samples drop-folder. This skill should be used when someone new is starting the personal-branding process (typically via `/enroll "<Full Name>"`), BEFORE any discovery, positioning, or voice work. It is the front door; it sets no gates and makes no identity decisions.
---

# /enroll — Enroll a Person (Foundation · step 1 of 5)

The front door of pbOS. Creates the per-person workspace under `clients/<slug>/` so the Coach Interview has somewhere to write. No discovery, no gates — just scaffolding.

## What This Skill Does

- Derive a stable `slug` from the person's name (or an explicit `--slug`).
- Scaffold `clients/<slug>/` with a draft `personal_brand_profile.json` (`status: draft`).
- Create a blank `interview_answers.json` ready for `/coach-interview`.
- Create a `voice_samples/` folder for the person to drop existing writing into (used later for evidence triangulation + voice capture).
- Mirror a minimal row to Supabase, best-effort (NO-OP offline).

## What This Skill Does NOT Do

- Run the discovery interview — owned by `/coach-interview`.
- Write positioning or voice, or stamp any gate — owned by `/positioning` and `/voice`.
- Assemble the constitution — owned by `/constitution`.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/profile.js` (`saveProfile`, `writeClientJson`, `clientDir`), `schemas/interview_answers.js` |
| **Conversation** | The person's full name; an explicit slug only if they want one |

## Clarifications

**Required:**
1. The person's name (to derive the slug).

**Optional:**
2. A preferred slug, if the derived one isn't ideal.

## Workflow

1. Confirm the name. Run `node skills/enroll/enroll.js "<Full Name>" [--slug <slug>]`.
2. Tell the person to drop 2–3 samples of their existing writing into `clients/<slug>/voice_samples/` (optional but strongly recommended — it makes the SWOT and voice capture far more accurate).
3. Route to `/coach-interview {slug}`.

## Input / Output Specification

**Inputs:** name (positional), optional `--slug`.
**Outputs:** `clients/<slug>/personal_brand_profile.json` (draft), `interview_answers.json` (blank), `voice_samples/` (dir). Exit `2` if already enrolled.

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Name, slug | Workspace layout, draft skeleton, offline-safe persistence |

## Domain Standards

### Must Follow
- [ ] Never overwrite an existing enrolled person (exit 2).
- [ ] Slug is lowercase, hyphenated, derived deterministically.

### Must Avoid
- Collecting deep discovery data here — that's the interview's job.

### Output Checklist
- [ ] `clients/<slug>/` exists with the three artifacts.

## Error Handling

| Scenario | Action |
|----------|--------|
| Already enrolled | Exit 2 — don't clobber an in-flight profile |
| No name given | Exit 1 with usage |

## Dependencies & Security

- **Reuses:** `scripts/lib/profile.js`, `scripts/lib/supabase.js`, `schemas/index.js`.
- **External APIs:** none (Supabase optional, best-effort).
- **Secrets:** none required — Phase 1 is fully offline.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/io-contract.md` | Exact CLI surface, exit codes, file shapes |
