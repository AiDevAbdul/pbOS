# pbOS — Personal Branding Operating System

A discovery-first OS for building a personal brand **around a human being**. An expert
coach interviews the person first; everything the OS produces afterward is specialized to
that individual. Sibling to smOS (the Meta-ads agency OS), built on the same proven chassis
(fail-closed schemas + human gates, an authenticity guard chokepoint, offline-safe
persistence, HTML/PDF rendering).

## Status — Phase 1 (Foundation) ✅ · Phase 2 (Content engine) 🚧

Phase 1 delivers the foundation and discovery engine. Phase 2 is the content engine:
**`/pillars`** (the first CONSUMER of the constitution and the first skill to ENFORCE the
authenticity guard), **`/calendar`** (a sustainable posting plan across those pillars), then
**`/write`** (drafts the actual posts into the calendar slots, in the captured voice, every
draft guarded). The rest of the content engine (repurpose) and the distribution/authority/
review phases follow — all read the constitution Phase 1 produces.

## The pipeline

```
/enroll → /coach-interview → /positioning (gate) → /voice (gate) → /constitution → /pillars → /calendar → /write
```

1. **/enroll** — scaffold the person's isolated workspace.
2. **/coach-interview** — 8-layer, archetype-adaptive discovery; triangulates self-report
   against the person's real content; synthesizes a SWOT + the discovery layer.
3. **/positioning** — synthesize positioning; **human approves** (GATE 1).
4. **/voice** — capture voice from samples; **human approves** (GATE 2; blocked until GATE 1).
5. **/constitution** — assemble the per-person `CLAUDE.md` + brand-of-one HTML/PDF
   (requires BOTH gates).
6. **/pillars** — synthesize the 3–5 content pillars from the complete constitution; every
   pillar must trace to a real fact (`why_this_person`) and clear the authenticity guard.
7. **/calendar** — lay out a dated posting calendar across the pillars (weighted by mix),
   capped to the person's stated cadence so it stays sustainable; every angle is guarded.
8. **/write** — draft the actual posts into the calendar slots, in the captured voice.
   Brief-then-write (never templated prose — pbOS won't put words in their mouth); every
   draft clears the authenticity guard before it's saved.

## Architecture

- **`schemas/`** — `personal_brand_profile` (the constitution + 2 gates), `interview_answers`,
  `voice_profile`, `content_pillars` (3–5 themes, traceability-enforced), `content_calendar`
  (dated slots, fully-specified), `content_draft` (posts in-voice, hook+body required). Each
  exports lenient `normalize()` + fail-closed `validate(obj,{stage})`.
- **`scripts/lib/`** — `profile.js` (load/merge/save/stampGate), `guards.js` (authenticity
  chokepoint), `interview.js` (archetype detect / branch / triangulate / synthesize),
  `voice.js` (offline voice heuristics), plus copied chassis (`supabase`, `load-env`,
  `md_to_html`).
- **`skills/`** — seven lean `SKILL.md` contracts + companion `.js` + `references/`.
- **`templates/`** — `interview-questions.md` (the question bank companion), `person-claude.md`.
- **`clients/<slug>/`** — per-person workspace (git-ignored).

## The two ideas that make it work

1. **Triangulation.** Self-report is unreliable. A claimed strength only becomes a SWOT
   strength if the person's existing content corroborates it; otherwise it's a blind spot.
2. **Authenticity as a hard guard.** `scripts/lib/guards.js` blocks banned language,
   fabricated credentials, and no-go topics fail-closed — the personal-brand equivalent of
   a brand-compliance moat. Built now, enforced when content skills ship.

## Run it

```bash
npm install            # dotenv only; Phase 1 is otherwise offline
npm test               # 53 tests incl. an end-to-end gate proof through /write
# (optional, for PDF) pip install playwright && python -m playwright install chromium

node skills/enroll/enroll.js "Jane Doe"
# then /coach-interview jane → /positioning jane → /voice jane → /constitution jane → /pillars jane → /calendar jane → /write jane
```

## Roadmap (next phases)

- **Content engine** — ✅ pillars → ✅ calendar → ✅ write (authenticity-guarded) → repurpose.
- **Distribution** — multi-platform publish + engagement/relationship strategy.
- **Authority** — podcasts, collabs, PR, newsletter growth.
- **Review loop** — organic-first KPIs + quarterly re-interview (the coach persists).
