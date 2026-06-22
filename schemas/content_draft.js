// schemas/content_draft.js — the drafted-posts artifact for one person.
//
// Drafts are content-engine step 3: the calendar's dated slots become actual posts, written
// in the person's CAPTURED VOICE. Each draft traces back to a calendar slot (date + pillar)
// so the plan and the prose never drift apart, and carries the post itself — a hook, a body,
// and an optional CTA — ready to clear the Authenticity Guard before it ships in someone's
// name.
//
// The load-bearing principle here is VOICE (Constitution, principle 3) and the never-put-
// words-in-their-mouth rule: pbOS does not deterministically fabricate post prose. The
// /write skill hands the coach a brief (slot + voice constraints) and the human-authored or
// coach-drafted prose comes back through here to be validated and guarded. A draft is only
// ever as authentic as the voice profile it was written against.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every draft
// missing a required field and rejects an empty draft set.

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

export function normalizeDraft(raw) {
  const r = raw || {};
  return {
    // Provenance: which calendar slot this post fills.
    date: pick(r, "date", "publish_date", "when") ?? null, // YYYY-MM-DD
    week: pick(r, "week", "week_index") ?? null,
    pillar_id: pick(r, "pillar_id", "pillar") ?? null,
    pillar_name: pick(r, "pillar_name") ?? null,
    platform: pick(r, "platform") ?? null,
    format: pick(r, "format") ?? null,
    angle: pick(r, "angle", "topic") ?? null,
    // The post itself.
    hook: pick(r, "hook", "opener", "headline") ?? null,
    body: pick(r, "body", "text", "post", "content") ?? null,
    cta: pick(r, "cta", "call_to_action") ?? null,
    hashtags: asArray(pick(r, "hashtags", "tags")),
    status: pick(r, "status") ?? "drafted", // drafted | scheduled | published
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | drafted
    // The calendar these drafts were written against (provenance).
    source: pick(r, "source", "from") ?? null,
    // The positioning statement the voice/brand was built on (provenance).
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
    drafts: asArray(pick(r, "drafts", "posts")).map(normalizeDraft),
  };
}

/**
 * FAIL-CLOSED validator. Drafts are not a human gate — the producing skill validates the
 * profile at stage "complete" (so a captured, approved VOICE exists) and requires the
 * calendar first. Here we assert a client slug, a non-empty draft set, and that every draft
 * carries its slot provenance (date, pillar) plus the post essentials (hook + body) so a
 * half-written post can't slip through to publishing.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["content_draft is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.drafts.length) errors.push("drafts is empty — nothing written");

  c.drafts.forEach((d, i) => {
    const where = `drafts[${i}]${isNonEmptyString(d.pillar_name) ? ` (${d.pillar_name})` : ""}`;
    if (!isNonEmptyString(d.date)) errors.push(`${where}: date is missing (a draft must map to a calendar slot)`);
    if (!isNonEmptyString(d.pillar_id)) errors.push(`${where}: pillar_id is missing (a draft must map to a pillar)`);
    if (!isNonEmptyString(d.platform)) errors.push(`${where}: platform is missing`);
    if (!isNonEmptyString(d.format)) errors.push(`${where}: format is missing`);
    if (!isNonEmptyString(d.hook)) errors.push(`${where}: hook is missing (give the post an opener)`);
    if (!isNonEmptyString(d.body)) errors.push(`${where}: body is missing (a draft with no post is not a draft)`);
  });

  return result(errors);
}
