---
name: engage
description: Use this skill to run the two-way half of a person's brand — showing up in the conversations their posts start. Phase-3 step 2 (typically via `/engage {slug}`). It derives a sustainable engagement posture from the constitution (daily time budget, who to focus on, the proactive-to-reactive ratio, the tone), briefs each incoming comment/DM/mention (or proactive target) with the inbound text and the voice contract, the coach drafts every reply in-voice from the brief, and every response is run through the Authenticity Guard before it persists. It never fabricates a reply from a template — putting words in someone's mouth is the one thing pbOS forbids most plainly.
---

# /engage — Engagement (Phase 3 · step 2)

A brand is built as much in the replies as in the posts. Publishing starts conversations; `/engage` is how the person shows up *in* them — answering comments and DMs, responding to mentions, and proactively commenting on others' work — without ever sounding like an autoresponder or saying something they wouldn't.

## What This Skill Does

- Derive a sustainable **engagement strategy** from the constitution: a daily time budget (a slice of `cadence.time_budget_hours`, so engagement never causes burnout), who to focus on (`positioning.audience`), a proactive-to-reactive ratio, and the tone to hold (`voice.tone`).
- **Brief** each inbound item (a comment, DM, mention, or proactive target): the inbound text + the voice contract (tone, signatures, lexicon_do, rhythm) + the `must_avoid` + `no_go_topics` the guard enforces.
- The coach **drafts each reply in-voice** from the brief — never from a template.
- Persist `engagement_log.json` fail-closed: profile must be `complete`, the set must pass the schema, and **every response must clear the Authenticity Guard** before it is saved.

## What This Skill Does NOT Do

- **Auto-reply or fabricate a reply from a template.** A reply ships in the person's name; the Constitution forbids putting words in their mouth. The brief scaffolds; the human/coach replies; the guard enforces.
- Send anything to a platform — pbOS is organic-first and the human owns the act of replying.
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/engage.js` (`engagementStrategy`, `buildReplyBrief`, `briefsFor`, `saveEngagement`), `schemas/engagement_log.js`, `scripts/lib/guards.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) |
| **Inbound** | a JSON file of incoming comments/DMs/mentions (or proactive targets) the person wants to respond to |
| **References** | The engagement posture + reply standards in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution).
2. For reply briefs: the inbound items (`--inbound items.json`).

**Optional (sensible defaults):**
3. `--limit N` (brief only the first N inbound items this pass).

## Workflow

1. Load the constitution. If it isn't `complete`, halt → run the foundation phase.
2. Print the strategy (`node engage.js {slug} --strategy`) and agree the daily posture WITH the person.
3. Brief the inbound items (`node engage.js {slug} --brief --inbound items.json`).
4. **Draft each reply in the person's voice** from its brief — answer the actual message, honor the signatures and rhythm, stay inside `must_avoid` and `no_go_topics`, claim nothing not in `identity.credentials` / `identity.defining_experiences`.
5. Persist (`node engage.js {slug} --in engagement_log.json`). The guard runs automatically; if it blocks, fix the offending reply — never bypass.

## Input / Output Specification

**Inputs:** the complete constitution; an inbound items file (for `--brief`).
**CLI:** `{slug} [--strategy | --brief --inbound items.json | --in engagement_log.json] [--limit N]`.
**Outputs:** `clients/{slug}/engagement_log.json` (`status: engaged`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Who they engage, the messages, the replies, the time budget | Sustainable daily budget, proactive-first posture, brief-then-reply (never template), the authenticity guard on every response |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution (approved voice) first.
- [ ] Keep the daily budget sustainable (derived from the stated time budget).
- [ ] Reply in-voice to the actual inbound message — never blank-page, never template.
- [ ] Every response clears the Authenticity Guard before it persists.

### Must Avoid
- Autoresponder-sounding replies, or replies that ignore what the person actually said.
- Fabricating credentials/stories/expertise; using banned language or no-go topics.

### Output Checklist
- [ ] `engagement_log.json` validates (`schemas/engagement_log.js`).
- [ ] Every interaction names its kind + platform, what it responds to, and a drafted reply.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Reply blocked by authenticity guard | Fix the reply; never bypass (exit 4) |
| Set fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/engage.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/engagement_log.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Engagement posture, reply method, the guard |
| `references/io-contract.md` | `engagement_log.json` schema, CLI flags + exit codes |
