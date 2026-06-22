# pbOS — Personal Branding Operating System

A discovery-first OS for building a personal brand **around a human being**. An expert
coach interviews the person first; everything the OS produces afterward is specialized to
that individual. Sibling to smOS (the Meta-ads agency OS), built on the same proven chassis
(fail-closed schemas + human gates, an authenticity guard chokepoint, offline-safe
persistence, HTML/PDF rendering).

## Status — Phase 1 (Foundation + Coach Interview engine) ✅

This phase delivers the foundation and the discovery engine. Downstream content phases
(pillars, calendar, write, repurpose, engage, authority, review) are intentionally not
built yet — they will all read the constitution this phase produces.

## The pipeline

```
/enroll → /coach-interview → /positioning (gate) → /voice (gate) → /constitution
```

1. **/enroll** — scaffold the person's isolated workspace.
2. **/coach-interview** — 8-layer, archetype-adaptive discovery; triangulates self-report
   against the person's real content; synthesizes a SWOT + the discovery layer.
3. **/positioning** — synthesize positioning; **human approves** (GATE 1).
4. **/voice** — capture voice from samples; **human approves** (GATE 2; blocked until GATE 1).
5. **/constitution** — assemble the per-person `CLAUDE.md` + brand-of-one HTML/PDF
   (requires BOTH gates).

## Architecture

- **`schemas/`** — `personal_brand_profile` (the constitution + 2 gates), `interview_answers`,
  `voice_profile`. Each exports lenient `normalize()` + fail-closed `validate(obj,{stage})`.
- **`scripts/lib/`** — `profile.js` (load/merge/save/stampGate), `guards.js` (authenticity
  chokepoint), `interview.js` (archetype detect / branch / triangulate / synthesize),
  `voice.js` (offline voice heuristics), plus copied chassis (`supabase`, `load-env`,
  `md_to_html`).
- **`skills/`** — five lean `SKILL.md` contracts + companion `.js` + `references/`.
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
npm test               # 27 tests incl. an end-to-end gate proof
# (optional, for PDF) pip install playwright && python -m playwright install chromium

node skills/enroll/enroll.js "Jane Doe"
# then /coach-interview jane → /positioning jane → /voice jane → /constitution jane
```

## Roadmap (next phases)

- **Content engine** — pillars → calendar → write (authenticity-guarded) → repurpose.
- **Distribution** — multi-platform publish + engagement/relationship strategy.
- **Authority** — podcasts, collabs, PR, newsletter growth.
- **Review loop** — organic-first KPIs + quarterly re-interview (the coach persists).
