# Repurposing — domain standards

## What a derivative is

A derivative is one source post, re-cut for a different channel. It traces back to its source
draft (date, pillar) and carries the re-cut post for a specific **target platform** in that
platform's **native format** — a hook, a body, an optional CTA. Like an original post, it
contains words that will be published in the person's name, so it must clear the Authenticity
Guard before it is ever saved.

## Repurpose ≠ cross-post

Pasting the same text everywhere is not repurposing — it reads as lazy on every platform that
isn't the one it was written for. A real repurpose re-cuts the idea into the form the
destination rewards. The engine maps each platform to its native format (the coach can
override per cut):

| Platform | Native format |
|----------|---------------|
| LinkedIn | post |
| X / Twitter | thread |
| Threads / Facebook | post |
| Instagram | carousel |
| YouTube | video script |
| TikTok / Reels | short video script |
| Newsletter / Substack | email |
| Medium / blog | article |

Anything off this list falls back to the person's natural format (`cadence.formats[0]`). The
**source post stays on the primary platform**; derivatives are cut for the **secondary
platforms** (`platform_plan.secondary_platforms`). No secondary platform → nothing to
repurpose into, and the skill halts rather than inventing channels.

## Plan, then re-cut — never template

As with `/write`, pbOS does not deterministically generate the re-cut prose. The engine:

1. **Plans the channels** (`repurposeTargets` + `planRepurpose`) — pure and deterministic. Per
   source draft it names the targets to cut for and the voice contract: tone, signatures,
   `lexicon_do`, rhythm, the `must_avoid` list (`lexicon_dont` + `never_say`), and `no_go_topics`.
2. **The coach re-cuts in-voice** from the plan — adapting structure to the channel (a thread
   breaks the post into beats; an email opens with a subject-line hook; a video script is spoken)
   while keeping the person's voice and the source's point intact.
3. **The guard enforces** on save — banned language, fabricated authority claims, no-go topics.

## Each derivative carries

| Field | Meaning |
|-------|---------|
| `source_date` | the source draft's date (provenance) |
| `source_pillar_id` / `source_pillar_name` | the pillar the source belongs to |
| `target_platform` | the channel this cut is for |
| `target_format` | the channel-native format |
| `hook` | the re-cut opener (required) |
| `body` | the re-cut post (required) |
| `cta` | optional call to action |
| `status` | `repurposed` → `scheduled` → `published` |

## The authenticity guard

`saveRepurposes()` runs every derivative (hook + body + CTA) through `guardContentWrite()`.
Re-cutting can quietly reintroduce a banned word or an unsupported flex that the original draft
avoided, so each cut is re-checked fail-closed. Never bypass a block — fix the derivative so it
is genuinely on-voice and true, then re-save.

## Good vs. bad

**Good:** a LinkedIn post becomes an X thread that breaks the argument into punchy beats, plus a
newsletter email that opens with a subject-line hook — both unmistakably in the person's voice,
both making the source's point, neither claiming anything the constitution doesn't record.

**Bad:** the same paragraph pasted to every platform; a thread that fabricates a credential the
source post didn't; a derivative with a hook but no body shipped downstream as if it were finished.
