---
name: repurpose
description: Use this skill to atomize a person's drafted posts into channel-native derivatives for their other platforms and formats (e.g. a LinkedIn post → an X thread, a newsletter blurb, a short-video script). Content-engine step 4, after `/write` (typically via `/repurpose {slug}`). It plans the target channels deterministically, the coach re-cuts each derivative in-voice from the plan, and every derivative is validated and run through the Authenticity Guard before it is persisted. It never fabricates the re-cut prose from a template.
---

# /repurpose — Repurposing (Content engine · step 4)

Get more reach from each post without more original effort: re-cut every drafted post into the forms the person's *other* channels reward. `/repurpose` plans the target channels from the constitution, briefs each cut with the source post and the voice contract; the coach re-cuts in-voice; the Authenticity Guard checks every derivative before it can be saved.

## What This Skill Does

- Read the **complete** constitution (the captured, **approved** voice + `platform_plan.secondary_platforms` + `cadence.formats`) and the validated `content_drafts.json`.
- Decide the **target channels** — each secondary platform in its channel-native format (LinkedIn→post, X→thread, newsletter→email, YouTube→video script, …; falls back to the person's natural format).
- Emit a **repurposing plan** per source draft: the source post, the channels to cut for, the voice (tone, signatures, lexicon_do, rhythm), and the **must_avoid** + **no_go_topics**.
- Persist the coach-authored derivatives (`content_repurposes.json`) fail-closed: profile must be `complete`, drafts must exist, there must be a target channel, the set must pass the schema, and **every derivative must clear the Authenticity Guard**.

## What This Skill Does NOT Do

- **Fabricate the re-cut prose from a template.** A derivative still ships in the person's name (Constitution, principle 3). The spine plans; the human/coach re-cuts; the guard enforces.
- Write the original posts — owned by `/write` (halt and route if drafts are missing).
- Schedule or publish — that's the distribution phase.
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/repurpose.js` (`plansFor`, `saveRepurposes`, `repurposeTargets`), `schemas/content_repurpose.js`, `scripts/lib/guards.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) + `content_drafts.json` (must validate) |
| **References** | The channel-mapping + re-cut standards in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution, validated drafts, AND ≥1 secondary platform).

**Optional (sensible defaults):**
2. `--limit N` (repurpose only the first N source drafts this pass).

## Workflow

1. Load the constitution + drafts. If the constitution isn't `complete`, halt → run the foundation phase. If drafts are missing/invalid, halt → run `/write {slug}`. If there's no secondary platform, halt → add one to the constitution.
2. Get the plans (`node repurpose.js {slug} --plan [--limit N]`).
3. **Re-cut each derivative in the person's voice** for its target channel — adapt to the channel-native format, honor the signatures and rhythm, stay inside `must_avoid` and `no_go_topics`, claim nothing not in `identity.credentials` / `identity.defining_experiences`.
4. Persist (`node repurpose.js {slug} --in content_repurposes.json`). The guard runs automatically; if it blocks, fix the offending derivative — never bypass.
5. Review the derivatives WITH the person before anything is scheduled or published.

## Input / Output Specification

**Inputs:** the complete constitution (approved voice, secondary platforms); validated `content_drafts.json`.
**CLI:** `{slug} [--plan | --in content_repurposes.json] [--limit N]`.
**Outputs:** `clients/{slug}/content_repurposes.json` (`status: repurposed`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| The platforms, the formats, the voice, the re-cut prose | Channel-native formatting, plan-then-recut (never template prose), full-derivative requirement, the authenticity guard on every cut |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution (approved voice), validated drafts, and ≥1 secondary platform first.
- [ ] Re-cut for the channel-native format — not a copy-paste across platforms.
- [ ] Re-cut in the person's voice from the plan — never blank-page, never template.
- [ ] Every derivative fully formed (source provenance, target platform+format, hook, body).
- [ ] Every derivative clears the Authenticity Guard before it persists.

### Must Avoid
- Cross-posting identical text that ignores each channel's form.
- Fabricating credentials/stories/expertise; using banned language or no-go topics.

### Output Checklist
- [ ] `content_repurposes.json` validates (`schemas/content_repurpose.js`).
- [ ] Each derivative traces to a real source draft (date + pillar).

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Drafts missing/invalid | Halt: run `/write {slug}` (exit 3) |
| No secondary platform to repurpose into | Halt: add one to the constitution (exit 3) |
| Derivative blocked by authenticity guard | Fix the derivative; never bypass (exit 4) |
| Set fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/repurpose.js`, `scripts/lib/write.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/content_repurpose.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Channel mapping, re-cut method, the guard |
| `references/io-contract.md` | `content_repurposes.json` schema, CLI flags + exit codes |
