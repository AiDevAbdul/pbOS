---
name: write
description: Use this skill to draft posts into a person's content calendar slots, written in their CAPTURED VOICE. Content-engine step 3, after `/calendar` (typically via `/write {slug}`). It produces a writing brief per slot (the angle + the voice constraints + the must-avoid list), the coach drafts each post in-voice from those, and every draft is validated and run through the Authenticity Guard before it is persisted. It never fabricates prose from a template.
---

# /write — Drafting (Content engine · step 3)

Turn the calendar's dated slots into actual posts that sound like the *person*, not generic AI. `/write` briefs each slot with its angle and the person's voice contract; the coach drafts in-voice; the Authenticity Guard checks every post before it can be saved.

## What This Skill Does

- Read the **complete** constitution (the captured, **approved** voice — gate 2) and the validated `content_calendar.json`.
- Emit a **writing brief** per slot: the angle to write, the voice (tone, signatures, lexicon_do, sentence_rhythm), and the **must_avoid** + **no_go_topics** the post may not cross.
- Persist the coach-authored drafts (`content_drafts.json`) fail-closed: profile must be `complete`, the draft set must pass the schema, and **every draft must clear the Authenticity Guard**.

## What This Skill Does NOT Do

- **Fabricate post prose from a template.** pbOS never puts words in the person's mouth (Constitution, principle 3). The spine briefs; the human/coach writes; the guard enforces.
- Create the calendar — owned by `/calendar` (halt and route if missing).
- Atomize a post into many formats — owned by `/repurpose`.
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/write.js` (`briefsFor`, `saveDrafts`, `buildDraftBrief`), `schemas/content_draft.js`, `scripts/lib/guards.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) + `content_calendar.json` (must validate) |
| **References** | The voice-fidelity + drafting standards in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution AND a validated calendar).

**Optional (sensible defaults):**
2. `--week N` (draft only that week's slots) · `--limit N` (cap how many to draft this pass).

## Workflow

1. Load the constitution + calendar. If the constitution isn't `complete`, halt → run the foundation phase. If the calendar is missing/invalid, halt → run `/calendar {slug}`.
2. Get the briefs (`node write.js {slug} --brief [--week N] [--limit N]`).
3. **Draft each post in the person's voice** from its brief — honor the signatures and rhythm, stay inside `must_avoid` and `no_go_topics`, and make no authority claim that isn't in `identity.credentials` / `identity.defining_experiences`.
4. Persist (`node write.js {slug} --in content_drafts.json`). The guard runs automatically; if it blocks, fix the offending draft — never bypass.
5. Review the drafts WITH the person before anything is scheduled or published.

## Input / Output Specification

**Inputs:** the complete constitution (approved voice); validated `content_calendar.json`.
**CLI:** `{slug} [--brief | --in content_drafts.json] [--week N] [--limit N]`.
**Outputs:** `clients/{slug}/content_drafts.json` (`status: drafted`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| The voice, the angles, the actual prose, which slots get drafted | Brief-then-write (never template prose), full-draft requirement, the authenticity guard on every post |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution (approved voice) and a validated calendar first.
- [ ] Draft in the person's voice from the brief — never blank-page, never template.
- [ ] Every draft fully formed (date, pillar, platform, format, hook, body).
- [ ] Every draft clears the Authenticity Guard before it persists.

### Must Avoid
- Fabricating credentials, stories, or expertise the person doesn't have.
- Using banned language (`voice.lexicon_dont` / `boundaries.never_say`) or no-go topics.
- Generic-AI prose that ignores the captured voice.

### Output Checklist
- [ ] `content_drafts.json` validates (`schemas/content_draft.js`).
- [ ] Each draft maps to a real calendar slot (date + pillar).

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Calendar missing/invalid | Halt: run `/calendar {slug}` (exit 3) |
| Draft blocked by authenticity guard | Fix the draft; never bypass (exit 4) |
| Draft set fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/write.js`, `scripts/lib/calendar.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/content_draft.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Voice fidelity, brief-then-write method, the guard |
| `references/io-contract.md` | `content_drafts.json` schema, CLI flags + exit codes |
