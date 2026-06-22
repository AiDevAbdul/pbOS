# The Coach Interview — question script

> The canonical, machine-readable question bank lives in `scripts/lib/interview.js`
> (`CORE` + `BRANCHES`). This file is the human-readable companion for the coach. The
> CLI (`coach-interview.js next <slug>`) always serves the next question from the bank,
> so the two never drift.

## How to run it (coach posture)

- **One question at a time.** Never batch — batching produces shallow answers. Record
  each answer with `coach-interview.js record` so the interview can resume if interrupted.
- **Listen, then probe.** When an answer is thin, ask one follow-up before moving on.
- **Detect the archetype early.** After the two context/intent questions, run
  `coach-interview.js detect <slug>` and **confirm the archetype aloud** before branching.
  Detection is a starting point, not a verdict.
- **Triangulate, don't take their word for it.** Self-report is unreliable. Have the
  person drop existing writing into `voice_samples/`, then run `audit-evidence`. A
  claimed strength only becomes a SWOT *strength* if the evidence corroborates it;
  otherwise it's logged as a blind spot.

## The eight layers (CORE questions)

1. **Context / intent** — who/what/why-now + what success looks like → archetype.
2. **Identity excavation** — origin story, defining moments, contrarian POV, zone of genius, values.
3. **Strengths + evidence** — what they're known for, with proof for each claim.
4. **Weaknesses / blind spots** — avoidances, fears, what's held them back, constraints (threats woven in).
5. **Audience + transformation** — who they reach, from-what-to-what.
6. **Competitive landscape** — peers/admired, category-of-one (saturation threats woven in).
7. **Capacity / format fit** — sustainable hours, writer vs talker vs on-camera.
8. **Voice capture** — samples (or live-elicited transcript) + banned words.

## Archetype branches (asked IN ADDITION to the core)

The interview adapts to the person's goal. Branch questions are added to the relevant
layer once the archetype is confirmed:

- **consultant_leadgen** — core offer & client value (intent); the trigger that makes an
  ideal client realize they need them (audience).
- **founder_thought_leader** — what the brand must unlock: funding/hiring/distribution
  (intent); the category they're trying to own (competitive).
- **creator_monetization** — the audience-to-money path (intent); platform format fit &
  realistic publishing volume (capacity).
- **career_capital** — whose attention matters most (intent); roles/opportunities the
  brand should attract (strengths).

## Output

When the layers are covered, Claude authors a `discovery.json` (identity, audience,
platform_plan, cadence, goals_kpis, boundaries, plus the SWOT raw inputs:
`claimed_strengths`, `self_weaknesses`, `audience_gaps`, `competitor_saturation`,
`constraints`) and runs `coach-interview.js synthesize <slug> --in discovery.json`. The
engine triangulates and writes the discovery layer (incl. a deterministic SWOT) into
`personal_brand_profile.json`. Next stop: `/positioning`.
