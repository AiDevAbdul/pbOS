# Engagement — domain standards

## Why engagement is half the brand

Posts are broadcast; engagement is relationship. The audience decides whether a person is worth
following as much from how they show up in replies, comments, and DMs as from what they post.
A brand that only broadcasts feels like a billboard. `/engage` is the two-way half: it makes
showing up in conversations a deliberate, sustainable, in-voice practice.

## The engagement strategy (derived, deterministic)

`engagementStrategy(profile)` reads the constitution and returns a posture:

- **daily_minutes** — a sustainable slice of `cadence.time_budget_hours` (roughly a third of the
  weekly content budget, spread over ~5 active days, floored at 10 min). Sustainability is
  load-bearing (Constitution principle 5) — engagement that causes burnout is worse than none.
- **focus_audience** — `positioning.audience` (or `audience.who`). Engage where the right people are.
- **posture** — `voice.tone`. The same voice as the posts, held in real time.
- **proactive_ratio** — `2 proactive : 1 reactive`. A brand grows faster by showing up
  thoughtfully on others' work than by only answering its own replies.
- **targets** — concrete places to proactively engage, built from the niche and audience pains.

## Reply, don't autorespond — and never template

As with `/write`, pbOS does not deterministically generate the reply. The engine **briefs**
each inbound item (`buildReplyBrief`) — the inbound text, the voice contract (tone, signatures,
`lexicon_do`, rhythm), the `must_avoid` list (`lexicon_dont` + `never_say`), and `no_go_topics`
— and the human/coach writes the actual reply against it. A reply must:

- answer the **actual message** (a reply that ignores what was said is worse than silence);
- sound like the **person** (honor the signatures and rhythm);
- stay inside the boundaries (`must_avoid`, `no_go_topics`);
- claim nothing not recorded in `identity.credentials` / `identity.defining_experiences`.

## Interaction kinds

| Kind | What it is |
|------|------------|
| `comment` | a reply to a comment on the person's own post |
| `dm` | a direct message reply |
| `mention` | a response to being mentioned/tagged elsewhere |
| `proactive` | a comment the person initiates on someone else's work (the `inbound_text` is the target post/context) |

An unknown kind fails the schema closed.

## The guard still runs

A reply is a content write — it ships in the person's name. `saveEngagement` runs the
Authenticity Guard on every drafted response (banned language, unsubstantiated authority claims,
no-go topics) before the log persists. A block means the reply is fixed, never bypassed.
