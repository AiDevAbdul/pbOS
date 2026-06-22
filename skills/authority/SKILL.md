---
name: authority
description: Use this skill to track the authority signals a person has earned (talks, features, podcasts, mentions, awards, collaborations, inbound) and plan the ones to pursue — pbOS's organic-first KPIs made concrete. Phase-3 step 3 (typically via `/authority {slug}`). It derives authority targets from the constitution — each an outlet category plus a pitch angle grounded in a real recorded credential — the coach refines them with the person, and every pitch angle and signal title is run through the Authenticity Guard before it persists. It never fabricates a credential to make a pitch land.
---

# /authority — Authority signals (Phase 3 · step 3)

A personal brand compounds into reputation. `/authority` is where pbOS tracks that compounding the organic-first way (Constitution principle 6 — measure reach, resonance, inbound, and **authority signals**, never ad CPA/ROAS). It keeps two records: what the person has **earned** and what they should **pursue**.

## What This Skill Does

- Maintain an **authority ledger** with two halves:
  - **signals** — authority already earned: each a real event (type, title, outlet, date, optional url/note). Facts; never invented.
  - **targets** — authority to pursue: an outlet **category** + a **pitch angle**, each `grounded_in` a real recorded credential or defining experience.
- **Derive target seeds** from the constitution (`--plan`): a podcast anchored on the zone of genius, a feature on the contrarian POV, a talk on the transformation, a collaboration on real proof — each pitch grounded so it can never claim authority the person doesn't have.
- Persist `authority_ledger.json` fail-closed: profile must be `complete`, the ledger must pass the schema, and **every pitch angle + signal title must clear the Authenticity Guard** before it is saved.

## What This Skill Does NOT Do

- **Fabricate a credential to make a pitch land.** A pitch ships in the person's name; the guard's fabrication dimension is the point. Every target is `grounded_in` a recorded fact.
- Send outreach — pbOS is organic-first; the person owns the act of pitching.
- Invent specific outlet names — targets are outlet *categories*; the coach adds real outlets WITH the person.
- Introduce a human gate — positioning and voice are the only two.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | `scripts/lib/authority.js` (`authorityTargets`, `summarizeSignals`, `targetsFor`, `saveAuthority`), `schemas/authority_ledger.js`, `scripts/lib/guards.js` |
| **Profile** | `clients/{slug}/personal_brand_profile.json` (stage `complete`) |
| **References** | The signal taxonomy + grounding rule in `references/domain-standards.md` |

## Clarifications

**Required:**
1. Which `{slug}` (must have a `complete` constitution).
2. For the ledger: the earned signals and/or the targets to pursue.

## Workflow

1. Load the constitution. If it isn't `complete`, halt → run the foundation phase.
2. Get the target seeds (`node authority.js {slug} --plan`).
3. **Refine the targets WITH the person** — add specific outlets, keep each pitch `grounded_in` a real credential — and record any authority signals they've already earned.
4. Persist (`node authority.js {slug} --in authority_ledger.json`). The guard runs automatically; if it blocks a pitch for an unsubstantiated claim, fix the angle or record the missing credential — never bypass.

## Input / Output Specification

**Inputs:** the complete constitution.
**CLI:** `{slug} [--plan | --in authority_ledger.json]`.
**Outputs:** `clients/{slug}/authority_ledger.json` (`status: tracked`).

## Variability Analysis

| What VARIES (per person) | What's CONSTANT (encoded) |
|--------------------------|---------------------------|
| The signals earned, the outlets, the pitch angles | Signal taxonomy, every pitch grounded in a recorded fact, outlet categories (not invented names), the authenticity guard on every pitch + signal |

## Domain Standards

### Must Follow
- [ ] Require a `complete` constitution first.
- [ ] Record earned signals as facts (type + title at minimum).
- [ ] Ground every target's pitch angle in a recorded credential / defining experience.
- [ ] Every pitch angle + signal title clears the Authenticity Guard before it persists.

### Must Avoid
- Fabricating or inflating credentials to make a pitch stronger.
- Inventing specific outlet names the person hasn't chosen.

### Output Checklist
- [ ] `authority_ledger.json` validates (`schemas/authority_ledger.js`).
- [ ] Every target carries `outlet_category`, `pitch_angle`, and `grounded_in`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Constitution not `complete` | Halt: run the foundation phase (exit 3) |
| Pitch/signal blocked by authenticity guard | Fix the angle or record the credential; never bypass (exit 4) |
| Ledger fails schema | Exit 5 — name the missing field and fix it |

## Dependencies & Security

- **Reuses:** `scripts/lib/authority.js`, `scripts/lib/guards.js`, `scripts/lib/profile.js`, `schemas/authority_ledger.js`.
- **External APIs:** none. Local file persistence only.
- **Secrets:** none.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/domain-standards.md` | Signal taxonomy, grounding rule, the guard |
| `references/io-contract.md` | `authority_ledger.json` schema, CLI flags + exit codes |
