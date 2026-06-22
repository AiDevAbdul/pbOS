# Content Calendar — domain standards

## What the calendar is

The calendar turns the pillars from a *theme list* into a *dated plan*. It answers "what do
I post, on which platform, in what format, about what — and when?" for a horizon (default 4
weeks). Each slot is a concrete brief the `/write` skill can pick up without blank-paging.

## Sustainability is the rule, not a suggestion

Personal brands die from burnout, not bad strategy (Constitution, principle 5). So:

- **`posts_per_week` is derived from `cadence.weekly_volume`** — the number the person told
  us they can sustain — and is **never inflated past it**. A calendar that looks impressive
  but the person can't keep is worse than a modest one they actually run.
- Formats default to the person's natural ones (`cadence.formats`: writer / talker /
  on-camera). Don't schedule video for someone who writes.
- The `cadence.sustainability_note` (e.g. "batch on Sundays") rides along on the calendar.

## How slots are distributed

### Across pillars — weighted round-robin
Slots are assigned to pillars in proportion to each pillar's `weight`, using a **smooth
weighted round-robin**: a heavier pillar shows up more often, but the pillars stay
**interleaved** — you won't get three of the same pillar back-to-back. With no weights, the
distribution is even. The algorithm is deterministic (same inputs → same calendar).

### Across the week — even spacing
`posts_per_week` posts are spaced evenly across the 7 days (e.g. 3/week → roughly Mon / Wed
/ Sat). Consistency of cadence matters more than clustering.

### Angles — rotated from the pillar
Each slot's angle is pulled from its pillar's `sample_angles`, rotating through them so a
pillar that appears five times doesn't repeat the same angle. When a pillar runs out of
sample angles, it falls back to the pillar thesis (a cue for `/write` to generate a fresh
angle on-theme).

## Each slot carries

| Field | Meaning |
|-------|---------|
| `date` | YYYY-MM-DD publish date |
| `week` | 1-based week index |
| `pillar_id` / `pillar_name` | which pillar this post belongs to |
| `platform` | primary platform from the constitution |
| `format` | the pillar's format, else the person's default |
| `angle` | concrete starting angle for `/write` |
| `status` | `planned` → `drafted` → `scheduled` → `published` |

## The authenticity guard

`generateCalendar()` runs every scheduled angle through `guardContentWrite()` — defense in
depth. Angles originate from already-guarded pillars, but the calendar is itself a content
write, so it re-checks banned language, fabricated authority claims, and no-go topics. Never
bypass a block; fix the angle at its source in `/pillars`.

## Good vs. bad

**Good:** 3 posts/week for 4 weeks = 12 slots, mix ≈ 5 / 4 / 3 across three pillars by
weight, spaced Mon/Wed/Sat, each with a distinct angle, all on the person's primary platform
and natural format.

**Bad:** 7 posts/week when the person said they can do 3 (burnout); all 12 slots on the same
pillar (no range); video slots for a writer; empty angles handed to `/write`.
