// schemas/engagement_log.js — the engagement artifact for one person.
//
// Engagement is Phase-3 step 2: the TWO-WAY half of a personal brand. Publishing starts
// conversations; engagement is how the person shows up IN them — replying to comments and
// DMs, responding to mentions, and proactively commenting on others' work. A brand is built
// as much in the replies as in the posts.
//
// The artifact has two parts:
//   - strategy  — the deterministic engagement posture derived from the constitution (a daily
//     time budget, who to focus on, the ratio of proactive-to-reactive, the tone to hold).
//   - interactions  — the actual conversations: each carries the inbound text (or proactive
//     target), and the RESPONSE drafted in the person's voice. A response ships in the person's
//     name exactly like a post, so every one must clear the Authenticity Guard — and pbOS never
//     fabricates the reply from a template (Constitution: never put words in their mouth).
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every interaction
// missing a required field and rejects an empty set.

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

const KINDS = ["comment", "dm", "mention", "proactive"];

export function normalizeStrategy(raw) {
  const r = raw || {};
  return {
    daily_minutes: pick(r, "daily_minutes", "minutes_per_day") ?? null,
    focus_audience: pick(r, "focus_audience", "who") ?? null,
    posture: pick(r, "posture", "tone") ?? null,
    proactive_ratio: pick(r, "proactive_ratio", "ratio") ?? null, // e.g. "2 proactive : 1 reactive"
    targets: asArray(pick(r, "targets", "engage_with")), // who/what to proactively engage
  };
}

export function normalizeInteraction(raw) {
  const r = raw || {};
  return {
    kind: pick(r, "kind", "type") ?? null, // comment | dm | mention | proactive
    platform: pick(r, "platform") ?? null,
    inbound_text: pick(r, "inbound_text", "inbound", "incoming", "target") ?? null, // their message OR the proactive target
    context: pick(r, "context", "note") ?? null,
    response: pick(r, "response", "reply", "body", "text") ?? null, // the in-voice reply
    status: pick(r, "status") ?? "drafted", // drafted | sent
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | engaged
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
    strategy: normalizeStrategy(r.strategy),
    interactions: asArray(pick(r, "interactions", "replies", "conversations")).map(normalizeInteraction),
  };
}

/**
 * FAIL-CLOSED validator. Engagement is not a human gate — the producing skill validates the
 * profile at stage "complete" (the approved voice) first. Here we assert a client slug, a
 * non-empty interaction set, and that every interaction names its kind + platform, what it
 * responds to (inbound_text), and carries a drafted RESPONSE (a logged interaction with no
 * reply is not engagement). An unknown kind fails closed.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["engagement_log is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.interactions.length) errors.push("interactions is empty — nothing engaged");

  c.interactions.forEach((it, i) => {
    const where = `interactions[${i}]${isNonEmptyString(it.platform) ? ` → ${it.platform}` : ""}`;
    if (!isNonEmptyString(it.kind)) errors.push(`${where}: kind is missing (${KINDS.join(" | ")})`);
    else if (!KINDS.includes(String(it.kind).toLowerCase())) errors.push(`${where}: kind "${it.kind}" is not one of: ${KINDS.join(", ")}`);
    if (!isNonEmptyString(it.platform)) errors.push(`${where}: platform is missing`);
    if (!isNonEmptyString(it.inbound_text)) errors.push(`${where}: inbound_text is missing (what is this a response to?)`);
    if (!isNonEmptyString(it.response)) errors.push(`${where}: response is missing (a logged interaction with no reply is not engagement)`);
  });

  return result(errors);
}
