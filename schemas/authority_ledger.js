// schemas/authority_ledger.js — the authority artifact for one person.
//
// Authority is Phase-3 step 3, and it serves the OS's organic-first KPI philosophy directly
// (Constitution principle 6: measure reach, resonance, inbound, and AUTHORITY SIGNALS — not
// ad CPA/ROAS). A personal brand compounds into reputation: talks given, features earned,
// podcasts guested, mentions, awards, collaborations, inbound opportunities. The ledger has
// two halves:
//   - signals  — authority the person has ALREADY earned (the record). Each is a real event
//     with a type, a title, an outlet, a date. These are facts; they are never invented.
//   - targets  — authority to PURSUE: an outlet category + a pitch angle, each grounded_in a
//     real recorded credential or experience. A pitch ships in the person's name, so the angle
//     and any signal title must clear the Authenticity Guard — pbOS never fabricates a credential
//     to make a pitch land.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every malformed
// signal/target and requires that the ledger record SOMETHING (a signal or a target).

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

const SIGNAL_TYPES = ["talk", "feature", "podcast", "mention", "award", "collab", "inbound", "publication"];

export function normalizeSignal(raw) {
  const r = raw || {};
  return {
    type: pick(r, "type", "kind") ?? null, // talk | feature | podcast | mention | award | collab | inbound | publication
    title: pick(r, "title", "name", "headline") ?? null,
    outlet: pick(r, "outlet", "venue", "publication", "where") ?? null,
    date: pick(r, "date", "when") ?? null,
    url: pick(r, "url", "link") ?? null,
    note: pick(r, "note", "impact", "description") ?? null,
  };
}

export function normalizeTarget(raw) {
  const r = raw || {};
  return {
    kind: pick(r, "kind", "type") ?? null, // the kind of authority opportunity (talk | podcast | feature | ...)
    outlet_category: pick(r, "outlet_category", "outlet", "category") ?? null, // a CATEGORY, not a fabricated specific name
    pitch_angle: pick(r, "pitch_angle", "angle", "pitch") ?? null,
    grounded_in: pick(r, "grounded_in", "proof", "credential") ?? null, // the real fact the pitch leans on
    status: pick(r, "status") ?? "identified", // identified | pursuing | won | passed
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | tracked
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
    signals: asArray(pick(r, "signals", "earned", "record")).map(normalizeSignal),
    targets: asArray(pick(r, "targets", "opportunities", "pursue")).map(normalizeTarget),
  };
}

/**
 * FAIL-CLOSED validator. Authority is not a human gate — the producing skill validates the
 * profile at stage "complete" first. A ledger must record SOMETHING (a signal or a target),
 * every recorded signal must name its type + title, and every target must name its outlet
 * category, a pitch angle, and the real fact it is grounded_in (so a pitch can never claim
 * authority the person hasn't recorded). Unknown signal types fail closed.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["authority_ledger is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.signals.length && !c.targets.length) errors.push("ledger is empty — record at least one earned signal or one target to pursue");

  c.signals.forEach((s, i) => {
    const where = `signals[${i}]`;
    if (!isNonEmptyString(s.type)) errors.push(`${where}: type is missing (${SIGNAL_TYPES.join(" | ")})`);
    else if (!SIGNAL_TYPES.includes(String(s.type).toLowerCase())) errors.push(`${where}: type "${s.type}" is not one of: ${SIGNAL_TYPES.join(", ")}`);
    if (!isNonEmptyString(s.title)) errors.push(`${where}: title is missing (what was the talk/feature/etc?)`);
  });

  c.targets.forEach((t, i) => {
    const where = `targets[${i}]`;
    if (!isNonEmptyString(t.outlet_category)) errors.push(`${where}: outlet_category is missing`);
    if (!isNonEmptyString(t.pitch_angle)) errors.push(`${where}: pitch_angle is missing`);
    if (!isNonEmptyString(t.grounded_in)) errors.push(`${where}: grounded_in is missing (a pitch must lean on a recorded credential/experience, never a fabricated one)`);
  });

  return result(errors);
}

export { SIGNAL_TYPES };
