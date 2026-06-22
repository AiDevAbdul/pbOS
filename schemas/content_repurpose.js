// schemas/content_repurpose.js — the repurposed-derivatives artifact for one person.
//
// Repurposing is content-engine step 4: take a post that was drafted for the primary platform
// (content_drafts.json) and ATOMIZE it into derivatives for the person's other platforms and
// natural formats — a LinkedIn post becomes an X thread, a newsletter blurb, a short-video
// script. One source, many channels: the same idea, re-cut for where it will land.
//
// Each derivative traces back to its source draft (date + pillar) so a derivative can never
// drift from the post it came from, and carries the re-cut post itself (hook + body). Like
// /write, repurposing writes words that ship in the person's name, so every derivative must
// clear the Authenticity Guard — and pbOS never deterministically fabricates the re-cut prose.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every derivative
// missing a required field and rejects an empty set.

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

export function normalizeDerivative(raw) {
  const r = raw || {};
  return {
    // Provenance: the source draft this was re-cut from.
    source_date: pick(r, "source_date", "date") ?? null,
    source_pillar_id: pick(r, "source_pillar_id", "pillar_id", "pillar") ?? null,
    source_pillar_name: pick(r, "source_pillar_name", "pillar_name") ?? null,
    // The target channel this derivative is cut for.
    target_platform: pick(r, "target_platform", "platform") ?? null,
    target_format: pick(r, "target_format", "format") ?? null,
    // The re-cut post itself.
    hook: pick(r, "hook", "opener", "headline") ?? null,
    body: pick(r, "body", "text", "post", "content") ?? null,
    cta: pick(r, "cta", "call_to_action") ?? null,
    status: pick(r, "status") ?? "repurposed", // repurposed | scheduled | published
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | repurposed
    // The drafts these derivatives were atomized from (provenance).
    source: pick(r, "source", "from") ?? null,
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
    derivatives: asArray(pick(r, "derivatives", "repurposes", "atoms")).map(normalizeDerivative),
  };
}

/**
 * FAIL-CLOSED validator. Repurposing is not a human gate — the producing skill validates the
 * profile at stage "complete" (the approved voice) and requires the drafts to exist first.
 * Here we assert a client slug, a non-empty derivative set, and that every derivative carries
 * its source provenance (date, pillar), its target channel (platform, format), and the re-cut
 * post essentials (hook + body) so a half-formed atom can't slip toward publishing.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["content_repurpose is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.derivatives.length) errors.push("derivatives is empty — nothing repurposed");

  c.derivatives.forEach((d, i) => {
    const where = `derivatives[${i}]${isNonEmptyString(d.target_platform) ? ` → ${d.target_platform}` : ""}`;
    if (!isNonEmptyString(d.source_date)) errors.push(`${where}: source_date is missing (a derivative must trace to a source draft)`);
    if (!isNonEmptyString(d.source_pillar_id)) errors.push(`${where}: source_pillar_id is missing (a derivative must trace to a pillar)`);
    if (!isNonEmptyString(d.target_platform)) errors.push(`${where}: target_platform is missing`);
    if (!isNonEmptyString(d.target_format)) errors.push(`${where}: target_format is missing`);
    if (!isNonEmptyString(d.hook)) errors.push(`${where}: hook is missing (give the re-cut an opener)`);
    if (!isNonEmptyString(d.body)) errors.push(`${where}: body is missing (a derivative with no post is not a derivative)`);
  });

  return result(errors);
}
