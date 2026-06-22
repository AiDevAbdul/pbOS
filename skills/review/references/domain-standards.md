# Brand-health review — domain standards

## What the review is

The capstone of the OS. `/review` reads every artifact the pipeline produced and reports on the
brand's health — deterministically, the organic-first way. It is read-mostly: it computes
metrics and findings and writes one report. It changes nothing about the brand itself.

## Review never edits identity

The two human gates — positioning and voice — are load-bearing all the way to the end. Review
**cannot** change them. Every finding carries a `route_to`: the skill that owns the fix. The
human acts there. Review is the analyst, not the operator.

## The metrics (organic-first, deterministic)

| Metric | What it measures | Source |
|--------|------------------|--------|
| pillars | how many content pillars exist | `content_pillars.json` |
| pillar_coverage | calendar slot distribution vs each pillar's target weight (max drift) | pillars + calendar |
| cadence_fit | calendar posts/week vs the stated capacity | calendar + `cadence.weekly_volume` |
| production | drafts written vs slots scheduled | calendar + drafts |
| repurposing | derivatives produced vs secondary platforms available | repurposes + platform plan |
| distribution | is a publish queue built | `distribution_queue.json` |
| engagement | interactions logged (is the brand two-way) | `engagement_log.json` |
| authority | authority signals recorded, by type | `authority_ledger.json` |

No ad metrics (CPA/ROAS) — pbOS is not an ad engine (Constitution principle 6).

## Severity + scoring

Each finding is `ok`, `watch`, or `risk`:

- **risk** — a hole that breaks the engine (no pillars, slots with nothing drafted, cadence over
  stated capacity). Docks 20 points.
- **watch** — reach or health left on the table (no repurposing despite secondary platforms, a
  one-way brand, no authority signals yet, unbuilt queue). Docks 8 points.
- **ok** — healthy; no action. Docks nothing.

The health score is `100 − Σ penalties`, floored at 0. Deterministic: the same artifacts always
produce the same score. Pass the generation date IN (the engine uses no `Date`) so a review is
reproducible.

## Optional artifacts, never a crash

Only the complete constitution is required (you cannot review a brand that isn't built). Every
downstream artifact — pillars, calendar, drafts, repurposes, engagement, authority, distribution
— is optional. Its absence becomes a finding that routes to the skill that would produce it. A
brand-new persona reviews cleanly with a low score and a punch-list of next steps.

## No Authenticity Guard here

Review authors nothing that ships in the person's name — it produces internal analysis. So,
unlike every content step, it runs no guard. Its observations and recommendations are about the
brand, for the person and coach, not posts for an audience.
