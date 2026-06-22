// schemas/distribution_queue.js — the publish queue artifact for one person.
//
// Distribution is Phase-3 step 1: it ASSEMBLES everything the content engine already
// authored (the primary-platform drafts from /write + the secondary-platform derivatives
// from /repurpose) into ONE ordered, dated queue the person can actually publish from.
// Each item names where it goes (platform + format), when (scheduled_at), the post itself
// (hook + body + cta), and where it came from (source_kind + source_date + pillar) so a
// queued item can never drift from the content it was built out of.
//
// pbOS is organic-first and the human owns their reputation, so the queue is a publish-READY
// package — pbOS never auto-posts to an external API. The queue is what the person (or a
// future integration) publishes from, and what /review reads to measure production progress.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every item
// missing a required field and rejects an empty queue.

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

export function normalizeItem(raw) {
  const r = raw || {};
  return {
    // Provenance: which authored artifact this queue entry came from.
    source_kind: pick(r, "source_kind", "kind") ?? null, // draft | derivative
    source_date: pick(r, "source_date", "date") ?? null,
    pillar_id: pick(r, "pillar_id", "pillar") ?? null,
    pillar_name: pick(r, "pillar_name") ?? null,
    // Where + when it publishes.
    platform: pick(r, "platform") ?? null,
    format: pick(r, "format") ?? null,
    scheduled_at: pick(r, "scheduled_at", "when", "publish_at") ?? null, // YYYY-MM-DD
    // The post itself (already authored + guarded upstream; re-guarded on save).
    hook: pick(r, "hook", "opener", "headline") ?? null,
    body: pick(r, "body", "text", "post", "content") ?? null,
    cta: pick(r, "cta", "call_to_action") ?? null,
    status: pick(r, "status") ?? "queued", // queued | scheduled | published
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | queued
    // Provenance of the whole queue.
    source: pick(r, "source", "from") ?? null,
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
    start_date: pick(r, "start_date", "starts") ?? null,
    items: asArray(pick(r, "items", "queue", "posts")).map(normalizeItem),
  };
}

/**
 * FAIL-CLOSED validator. The queue isn't a human gate — the producing skill validates the
 * profile at stage "complete" (the approved voice) and requires the drafts to exist first.
 * Here we assert a client slug, a non-empty queue, and that every item carries where it goes
 * (platform, format), when (scheduled_at), what (hook + body), and its source provenance —
 * so a half-formed entry can't slip toward publishing.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["distribution_queue is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.items.length) errors.push("items is empty — nothing queued to publish");

  c.items.forEach((it, i) => {
    const where = `items[${i}]${isNonEmptyString(it.platform) ? ` → ${it.platform}` : ""}`;
    if (!isNonEmptyString(it.source_kind)) errors.push(`${where}: source_kind is missing (draft | derivative)`);
    if (!isNonEmptyString(it.source_date)) errors.push(`${where}: source_date is missing (a queued item must trace to authored content)`);
    if (!isNonEmptyString(it.platform)) errors.push(`${where}: platform is missing`);
    if (!isNonEmptyString(it.format)) errors.push(`${where}: format is missing`);
    if (!isNonEmptyString(it.scheduled_at)) errors.push(`${where}: scheduled_at is missing (when does it publish?)`);
    if (!isNonEmptyString(it.hook)) errors.push(`${where}: hook is missing`);
    if (!isNonEmptyString(it.body)) errors.push(`${where}: body is missing (a queue item with no post is not publishable)`);
  });

  return result(errors);
}
