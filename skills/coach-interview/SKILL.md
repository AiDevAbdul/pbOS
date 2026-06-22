---
name: coach-interview
description: Use this skill to run the expert Coach Interview — an archetype-adaptive, 8-layer discovery conversation that listens for a person's identity, strengths, weaknesses, opportunities, and threats, triangulates self-report against their real content, and synthesizes a discovery layer (identity, audience, plan, and a SWOT) into their profile. This skill should be used after `/enroll` (typically via `/coach-interview {slug}`) to deeply understand a person before any positioning or content work. It detects the goal archetype early and branches the questioning accordingly.
---

# /coach-interview — The Coach Interview (Foundation · step 2 of 5)

The heart of pbOS. You are an elite personal-branding coach: you LISTEN first, one question at a time, then specialize everything to this person. You detect what kind of brand they're building, branch the interview to it, and refuse to take self-report at face value — you triangulate it against the evidence of what they've actually published.

## What This Skill Does

- Run an 8-layer discovery interview **one question at a time** (context/intent → identity → strengths+evidence → weaknesses → audience → competitive → capacity → voice).
- **Detect the goal archetype** from the opening answers and **branch** follow-ups to it (consultant_leadgen / founder_thought_leader / creator_monetization / career_capital).
- **Triangulate** each claimed strength against topics surfaced from `voice_samples/`; corroborated → strength, unsupported → blind spot.
- Synthesize a deterministic 4-quadrant **SWOT** and write the **discovery layer** (identity, audience, platform_plan, cadence, goals_kpis, boundaries) into `personal_brand_profile.json`.
- Persist every answer so an interrupted interview resumes exactly.

## What This Skill Does NOT Do

- Write the positioning statement or stamp the positioning gate — owned by `/positioning`.
- Capture/approve voice — owned by `/voice`.
- Assemble the constitution — owned by `/constitution`.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/interview.js` (detect/branch/triangulate/synthesize), `scripts/lib/voice.js` (evidence audit), `scripts/lib/profile.js` |
| **Conversation** | The person's live answers — the primary input |
| **Skill References** | The question bank + coaching posture in `references/domain-standards.md` and `templates/interview-questions.md` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (draft, from `/enroll`) |

## Clarifications

**Required:**
1. Which `{slug}` (must be enrolled).

**Optional:**
2. Whether the person has existing content to triangulate against (point them to `voice_samples/`).

## Workflow

1. Ask the two **context/intent** questions. Run `coach-interview.js detect {slug}` and **confirm the detected archetype aloud** before branching.
2. Walk layers 2–8, **one question at a time** (`coach-interview.js next {slug}` serves the next; `record` saves each answer). Probe thin answers with one follow-up.
3. If samples exist, run `coach-interview.js audit-evidence {slug}` to extract evidence topics.
4. Author `discovery.json` (identity, audience, platform_plan, cadence, goals_kpis, boundaries + SWOT raw inputs: `claimed_strengths`, `self_weaknesses`, `audience_gaps`, `competitor_saturation`, `constraints`).
5. Run `coach-interview.js synthesize {slug} --in discovery.json`. Review the triangulated SWOT with the person, then route to `/positioning`.

## Input / Output Specification

**Inputs:** live answers; `clients/{slug}/voice_samples/*`; an authored `discovery.json`.
**CLI:** `next | record | detect | audit-evidence | synthesize` (see `references/io-contract.md`).
**Outputs:** `clients/{slug}/interview_answers.json` (transcript + archetype + evidence_signals); `personal_brand_profile.json` discovery layer (`status: discovered`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| Answers, archetype, branch questions, SWOT content | The 8 layers, the question bank, one-at-a-time rule, deterministic triangulation + SWOT synthesis |

## Domain Standards

### Must Follow
- [ ] One question at a time; never batch.
- [ ] Confirm the archetype with the person before branching.
- [ ] Triangulate strengths against evidence; never promote an unverified claim to a strength.
- [ ] Synthesize via the engine — never hand-write the SWOT.

### Must Avoid
- Taking self-report at face value when content evidence exists.
- Skipping layers because an answer "covered it" — each layer has a distinct job.

### Output Checklist
- [ ] All 8 layers have recorded answers (`interviewAnswers.pendingLayers` empty).
- [ ] `personal_brand_profile.json` validates at stage `discovery`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Not enrolled | Halt: run `/enroll` first |
| No samples | Proceed on self-report, but flag lower SWOT confidence |
| Discovery fails stage validation | Fix the named field (e.g. empty values / empty SWOT quadrant) and re-synthesize |

## Dependencies & Security

- **Reuses:** `scripts/lib/interview.js`, `scripts/lib/voice.js`, `scripts/lib/profile.js`, `schemas/index.js`.
- **External APIs:** none. Fully offline, deterministic engine.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | The 8 layers, archetype rubric, coaching posture, triangulation method |
| `references/io-contract.md` | Full CLI, `discovery.json` shape, `interview_answers.json` schema |
