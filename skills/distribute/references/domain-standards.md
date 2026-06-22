# Distribution — domain standards

## What the queue is

The distribution queue is the single, ordered, dated list the person actually publishes from.
It is **assembled**, not authored: every item already exists as a `/write` draft (primary
platform) or a `/repurpose` derivative (secondary platform), and was already run through the
Authenticity Guard when it was authored. Distribution's job is to merge those two streams into
one timeline and hand the person a checklist.

Each item carries:
- **provenance** — `source_kind` (`draft` | `derivative`), `source_date`, `pillar_id`/`pillar_name`;
- **destination** — `platform`, `format`;
- **timing** — `scheduled_at` (YYYY-MM-DD);
- **the post** — `hook`, `body`, optional `cta`;
- **status** — `queued` | `scheduled` | `published`.

## Organic-first — pbOS never auto-posts

The human owns their reputation (Constitution). pbOS does not hold platform credentials and
does not push to any external API. The queue is a publish-**ready** package — a checklist the
person (or, later, an explicitly-authorized integration) publishes from. This is deliberate:
the act of publishing in someone's name is theirs to take.

## The scheduling rule — original leads, derivative follows

A draft publishes on its calendar slot date. Its derivatives publish `offsetDays` **after**
that (default +1), on their own secondary platforms. The same idea never lands in two places
on the same day — the original gets to lead on the primary platform, and the re-cut follows
where the secondary audience will see it fresh. Ordering is deterministic:

1. by `scheduled_at` (earliest first),
2. original (`draft`) before its `derivative`s on the same day,
3. then by platform name.

Same drafts + same derivatives + same offset → byte-identical queue, every run.

## Assemble, don't author

Distribution writes no new prose. If a post needs changing, it's changed in `/write` or
`/repurpose` and re-distributed — never edited in the queue. This keeps the queue honest: what
ships is exactly what was authored and guarded.

## The guard still runs

Even though every item was guarded upstream, `generateQueue` re-runs the Authenticity Guard on
every item before the queue persists (defense in depth — the queue is what actually ships).
Banned language, unsubstantiated authority claims, and no-go topics all fail the queue closed.
A block means the upstream draft/derivative is fixed and re-distributed — never bypassed.

## Repurposes are optional

Not everyone repurposes. If `content_repurposes.json` is absent or doesn't validate, the queue
is built from the drafts alone. Drafts are required (there is nothing to distribute without
them); derivatives are folded in only when a valid set exists.
