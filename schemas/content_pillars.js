// schemas/content_pillars.js — the content pillars artifact for one person.
//
// Content pillars are the 3–5 recurring themes a person publishes around. They are the
// FIRST output of the content engine and the bridge from the constitution to everything
// downstream (calendar → write → repurpose): a calendar slots posts into pillars, and a
// writer drafts within a pillar's thesis. So pillars are a CONSUMER of the constitution —
// produced only after BOTH human gates are cleared and the profile is "complete".
//
// Every pillar must TRACE to the constitution (why_this_person) — pbOS never blank-pages
// a theme. A brand built on themes the person has no claim to is the fastest way to sound
// like generic AI; traceability is the pillar-level echo of the discovery-first principle.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — enforces 3–5
// pillars and names every pillar missing a required field.

import { pick, asArray, isNonEmptyString, isFiniteNumber, slugId, result } from "./_shared.js";

export const MIN_PILLARS = 3;
export const MAX_PILLARS = 5;

export function normalizePillar(raw) {
  const r = raw || {};
  const name = pick(r, "name", "title", "theme") ?? null;
  return {
    // Stable, deterministic id derived from the name (no randomness) so the same
    // pillar keeps its id across re-runs and downstream artifacts can reference it.
    id: pick(r, "id") ?? (isNonEmptyString(name) ? slugId(name) : null),
    name,
    thesis: pick(r, "thesis", "angle", "point_of_view", "pov") ?? null,
    // The traceability contract: which constitution fact earns this pillar.
    why_this_person: pick(r, "why_this_person", "rationale", "trace", "why") ?? null,
    // The audience pain/desire this pillar serves.
    serves: pick(r, "serves", "audience_value", "for") ?? null,
    formats: asArray(pick(r, "formats", "format")),
    sample_angles: asArray(pick(r, "sample_angles", "sample_topics", "examples", "angles")),
    // Share of the content mix (0–1 or a percentage). Optional; advisory weighting.
    weight: pick(r, "weight", "mix", "share") ?? null,
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    // draft | drafted (pillars are NOT a human gate — positioning + voice are the only two)
    status: pick(r, "status") ?? "draft",
    goal_archetype: pick(r, "goal_archetype", "archetype") ?? null,
    pillars: asArray(pick(r, "pillars", "themes")).map(normalizePillar),
    mix_rationale: pick(r, "mix_rationale", "rationale") ?? null,
    // The positioning statement these pillars were synthesized from (provenance).
    generated_from: pick(r, "generated_from", "source_statement") ?? null,
  };
}

/**
 * FAIL-CLOSED validator. Content pillars are not a human gate, so there is no
 * gate assertion here — but the producing skill validates the profile at stage
 * "complete" first, so pillars can only exist atop an approved constitution.
 *
 * Enforces: a client slug, 3–5 pillars (the sustainable, focused range), and that
 * every pillar carries a name, a thesis, a traceable why_this_person, and at least
 * one sample angle. A pillar with no trace is a blind spot, not a pillar.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["content_pillars is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");

  const n = c.pillars.length;
  if (n < MIN_PILLARS) errors.push(`only ${n} pillar(s) — need at least ${MIN_PILLARS} (focused but not thin)`);
  if (n > MAX_PILLARS) errors.push(`${n} pillars — more than ${MAX_PILLARS} dilutes focus and burns capacity`);

  const ids = new Set();
  c.pillars.forEach((p, i) => {
    const where = `pillars[${i}]${isNonEmptyString(p.name) ? ` "${p.name}"` : ""}`;
    if (!isNonEmptyString(p.name)) errors.push(`${where}: name is missing`);
    if (!isNonEmptyString(p.thesis)) errors.push(`${where}: thesis is missing`);
    if (!isNonEmptyString(p.why_this_person))
      errors.push(`${where}: why_this_person is missing (every pillar must trace to the constitution — no blank-page themes)`);
    if (!p.sample_angles.length) errors.push(`${where}: sample_angles is empty (give the writer at least one concrete starting angle)`);
    if (p.weight !== null && !(isFiniteNumber(p.weight) || isNonEmptyString(p.weight)))
      errors.push(`${where}: weight must be a number/percentage when set`);
    if (isNonEmptyString(p.id)) {
      if (ids.has(p.id)) errors.push(`${where}: duplicate pillar id "${p.id}"`);
      ids.add(p.id);
    }
  });

  return result(errors);
}
