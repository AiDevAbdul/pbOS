---
name: voice
description: Use this skill to capture a person's authentic voice — running offline heuristics over their existing writing (or an elicited transcript), authoring the qualitative voice fields (tone, signatures, do/don't lexicon, rhythm), and stamping the human-owned voice gate. This skill should be used after positioning is approved (typically via `/voice {slug}`). The voice's don't-lexicon becomes the authenticity guard's avoid-list; the gate is human-only via `--approve-voice`, and it is fail-closed blocked until positioning is approved.
---

# /voice — Voice Capture (Foundation · step 4 of 5 · GATE 2)

Voice is the crown jewel: the OS must sound like the PERSON, not like AI. Capture it from real samples, get the person's sign-off, and lock it — every future content write is bound by it.

## What This Skill Does

- Run offline heuristics over `voice_samples/` (or an elicited transcript): sentence rhythm, first/second/third-person balance, signature n-grams, frequent lexicon.
- Help author the qualitative voice fields (tone, signatures, lexicon_do/dont, sentence_rhythm) from those metrics + the raw samples.
- Persist the voice layer at stage `voice` (**fail-closed: blocked until positioning is approved**) and write the standalone `voice_profile.json`.
- Stamp `voice_approved_at` via `--approve-voice` after the person confirms it sounds like them.

## What This Skill Does NOT Do

- Run discovery or positioning — owned by `/coach-interview` and `/positioning`.
- Write content — that comes later; this skill defines the rules content must obey.
- Auto-approve voice — human-only gate.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/voice.js` (heuristics), `scripts/lib/profile.js`, `schemas/voice_profile.js` |
| **Samples** | `clients/{slug}/voice_samples/*` (or a live transcript) |
| **Profile** | positioning layer with `positioning_approved_at` (required — this gate is enforced) |

## Clarifications

**Required:**
1. Which `{slug}` (positioning must be approved).

**Optional:**
2. If no samples exist, elicit voice live (have them talk ~2 minutes; transcribe).

> Voice approval is a **human gate.** Present the captured voice and wait for explicit confirmation before `--approve-voice`.

## Workflow

1. Run `voice.js analyze {slug}` to get offline metrics from `voice_samples/`.
2. Author `voice.json` (tone, signatures, lexicon_do, lexicon_dont, sentence_rhythm) grounded in the metrics + raw samples — never invent a voice.
3. Persist with `{slug} --in voice.json` (fails closed if positioning isn't approved).
4. Confirm with the person it sounds like them. On explicit approval only, run `--approve-voice`.

## Input / Output Specification

**Inputs:** `voice_samples/*` or transcript; an authored `voice.json`.
**CLI:** `analyze {slug}` · `{slug} --in voice.json` (needs GATE 1) · `{slug} --approve-voice` (stamp GATE 2).
**Outputs:** `personal_brand_profile.json` voice layer; `voice_profile.json`; `voice_approved_at` once stamped (`status: voice_approved`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Tone, signatures, lexicon, rhythm, metrics | Offline-only analysis, required fields, GATE 1 prerequisite, human-only GATE 2 |

## Domain Standards

### Must Follow
- [ ] Ground the voice in real samples/metrics; never fabricate.
- [ ] `lexicon_dont` is the source of truth for the authenticity guard's avoid-list.
- [ ] Obtain explicit human approval before `--approve-voice`.

### Must Avoid
- Authoring voice before positioning is approved (it will fail closed).
- Treating analyzer output as the final voice — it informs, the human confirms.

### Output Checklist
- [ ] `voice.json` validates at stage `voice`; `voice_profile.json` written.
- [ ] After approval, `status == voice_approved`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Positioning not approved | Stage `voice` fails closed — run `/positioning --approve-positioning` first |
| No samples | Elicit live; flag lower confidence |
| `--approve-voice` with empty tone | Exit 3 — capture voice first |

## Dependencies & Security

- **Reuses:** `scripts/lib/voice.js`, `scripts/lib/profile.js`, `schemas/voice_profile.js`.
- **External APIs:** none — analysis is fully offline (no NLP service).
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | How to read the metrics, author each voice field, and feed the authenticity guard |
| `references/io-contract.md` | `voice.json` / `voice_profile.json` schemas, CLI exit codes |
