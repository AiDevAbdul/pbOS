# Authority — domain standards

## Authority signals are the organic-first KPIs

pbOS is not an ad engine (Constitution principle 6). It measures reach, resonance, inbound, and
**authority signals** — never CPA/ROAS. The authority ledger is where those signals are made
concrete and tracked over time. A growing brand shows up as a growing ledger: more talks, more
features, more inbound.

## The two halves of the ledger

### signals — what's been earned (the record)
Each signal is a real, dated event. They are **facts** and are never invented — a fabricated
signal is the worst possible breach of a real person's reputation.

| Type | What it is |
|------|------------|
| `talk` | a conference / meetup / webinar talk given |
| `feature` | a press feature, profile, or quote |
| `podcast` | a guest appearance |
| `mention` | a notable mention / citation by someone else |
| `award` | an award or recognition |
| `collab` | a collaboration with a peer or brand |
| `inbound` | an inbound opportunity (a request to speak, write, advise) |
| `publication` | something the person authored that was published elsewhere |

An unknown type fails the schema closed.

### targets — what to pursue (the plan)
Each target is an **outlet category** (never a fabricated specific outlet name) + a **pitch
angle** + the real fact it is `grounded_in`. The coach adds specific, real outlets WITH the
person — the seeds keep the pitch honest before that conversation.

## The grounding rule — every pitch leans on a recorded fact

`authorityTargets(profile)` derives target seeds from the constitution and grounds each one:

| Target kind | Anchored on |
|-------------|-------------|
| podcast | `identity.zone_of_genius` |
| feature | `identity.contrarian_pov` |
| talk | `positioning.transformation` |
| collab | `identity.credentials[0]` / `defining_experiences[0]` |

`grounded_in` is required on every target by the schema. This is the authority equivalent of the
fabrication guard: a pitch may only claim authority the person has actually recorded. If a pitch
needs a credential the person doesn't have, the answer is to earn (and record) it — not to claim it.

## The guard still runs

A pitch angle and a recorded signal title both make claims in the person's name, so
`saveAuthority` runs the Authenticity Guard on each (banned language, unsubstantiated authority
claims, no-go topics) before the ledger persists. A blocked pitch means the angle is fixed or the
missing credential is recorded first — never bypassed.
