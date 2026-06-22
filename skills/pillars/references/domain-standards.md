# Content Pillars — domain standards

## What a content pillar is

A pillar is a **recurring theme the person publishes around** — not a single topic and not
a campaign. Pillars give a personal brand coherence: the audience learns to expect a
point of view, the algorithm learns to categorize the account, and the person stops
blank-paging every post. Three to five pillars is the proven range.

## The 3–5 rule

- **Fewer than 3** → the brand reads as one-note; not enough range to stay interesting or
  to reach different slices of the audience.
- **More than 5** → focus dilutes and cadence becomes unsustainable. Personal brands die
  from burnout, not from too few themes (Constitution, principle 5).

The schema enforces 3–5 fail-closed.

## How to derive pillars (never blank-page)

Every pillar must trace to the constitution. Good sources, in priority order:

1. **Zone of genius** — the person's strongest, evidence-corroborated capability. The
   anchor "teach what you're best at" pillar.
2. **Contrarian POV** — the differentiated belief. This is the attention pillar; it earns
   reach because it isn't what everyone else says.
3. **Positioning transformation** — the promise the brand is built on, broken into the
   steps that get the audience there.
4. **Audience pains** — answer real, stated problems of the target audience. The
   inbound/credibility engine for `consultant_leadgen`.
5. **SWOT opportunities** — under-served whitespace competitors miss.
6. **Proof & story** — lived experience and real credentials used as proof, never a flex,
   and never fabricated (the guard enforces this).

`suggestPillarSeeds()` generates seeds from exactly these fields; refine them WITH the
person. Seeds are a starting point, not the answer.

## Each pillar carries

| Field | Why |
|-------|-----|
| `name` | Short, memorable theme label |
| `thesis` | The recurring point of view — what every post under this pillar argues |
| `why_this_person` | **Mandatory trace** to a constitution fact. No trace → it's a blind spot, not a pillar |
| `serves` | The audience pain/desire it addresses |
| `formats` | Natural formats for this person (writer/talker/on-camera — match cadence) |
| `sample_angles` | ≥1 concrete starting angle so the writer isn't blank-paging |
| `weight` | Optional share of the mix (advisory) |

## Mix weighting

Weights are advisory, not enforced. A common starting mix: anchor the zone-of-genius and
transformation pillars heaviest, give the contrarian pillar a meaningful but smaller share
(high-variance reach), and keep proof/story lighter so it reads as evidence, not bragging.

## Good vs. bad

**Good** (CTO coach, `consultant_leadgen`):
- *Calm systems* — "Most scaling pain is an org-design problem, not a tech problem." (trace: zone_of_genius)
- *The 10-year reversal* — "What I believed about hiring at 5 engineers that was wrong at 50." (trace: contrarian_pov)
- *From chaos to calm* — the transformation, step by step. (trace: positioning.transformation)

**Bad:**
- *Productivity hacks* — no trace; generic; could be anyone.
- *AI trends* — chasing a topic the person has no claim to (blank-page).
- Eight pillars covering everything — unsustainable, unfocused.

## The authenticity guard

`savePillars()` runs every pillar through `guardContentWrite()`. A pillar is BLOCKED if it
uses banned language (`voice.lexicon_dont` / `boundaries.never_say`), makes an authority
claim that doesn't trace to a recorded credential, or touches a `no_go_topic`. This is the
first content skill to enforce the moat the foundation phase built. Never soften or bypass
a block — fix the pillar.
