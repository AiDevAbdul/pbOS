# Drafting — domain standards

## What a draft is

A draft is one finished post, written for a specific calendar slot, in the person's voice.
It carries its slot provenance (date, pillar, platform, format, angle) and the post itself —
a **hook**, a **body**, and an optional **CTA**. It is the first artifact in the pipeline
that contains words that will be published *in the person's name*, so it is the first that
must clear the Authenticity Guard before it is ever saved.

## Brief, then write — never template

pbOS does not deterministically generate post prose. A templated post is the fastest way to
sound like generic AI, and auto-writing in someone's name violates the core rule: **never put
words in their mouth** (Constitution). So the engine splits the work:

1. **The spine produces a brief** (`buildDraftBrief`) — pure and deterministic. Per slot it
   names the angle to write and the voice contract: tone, signature phrases, `lexicon_do`,
   sentence rhythm, the `must_avoid` list (`lexicon_dont` + `never_say`), and `no_go_topics`.
2. **The coach drafts in-voice** from the brief — honoring the signatures and rhythm, leaning
   on real proof, staying inside the boundaries.
3. **The guard enforces** on save — banned language, fabricated authority claims, no-go topics.

## Voice fidelity is the bar

The post must sound like the person reading the brief, not like the model. Concretely:

- Use the person's **signature phrases** and **sentence rhythm** (`voice.sentence_rhythm`).
- Prefer the **`lexicon_do`** words; never use a **`lexicon_dont`** / `never_say` word.
- Make **no authority claim** (degree, certification, accolade, tenure) that doesn't trace to
  a recorded `identity.credentials` / `identity.defining_experiences` entry — the guard will
  block fabrications, but the writer shouldn't reach for them in the first place.
- Stay on the slot's **pillar thesis and angle**. The calendar already balanced the mix; a
  draft that wanders off-pillar quietly breaks that balance.

## Each draft carries

| Field | Meaning |
|-------|---------|
| `date` | the calendar slot's publish date (the draft's anchor) |
| `pillar_id` / `pillar_name` | which pillar this post belongs to |
| `platform` / `format` | from the slot — write for the platform and format |
| `angle` | the slot's starting angle (provenance) |
| `hook` | the scroll-stopping opener (required) |
| `body` | the post itself (required) |
| `cta` | optional call to action |
| `hashtags` | optional tags |
| `status` | `drafted` → `scheduled` → `published` |

## The authenticity guard

`saveDrafts()` runs every draft (hook + body + CTA) through `guardContentWrite()`. This is the
moat doing its actual job: a post that uses banned language, fabricates a credential, or
crosses a no-go topic is refused fail-closed and never written to disk. Never bypass a block —
fix the draft so it is genuinely on-voice and true, then re-save.

## Good vs. bad

**Good:** a post that opens with the person's real signature phrasing, makes its point on the
slot's pillar angle, uses only claims the constitution records, and reads like *them*.

**Bad:** templated prose that ignores the voice; a fabricated "award-winning, 20 years"
flex with no recorded backing; a banned word slipped into the hook; a draft with a hook but
no body handed downstream as if it were finished.
