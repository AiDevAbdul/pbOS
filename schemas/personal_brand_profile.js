// schemas/personal_brand_profile.js — the canonical "constitution" artifact for one person.
//
// pbOS builds a brand AROUND A HUMAN, not a company. The discovery → positioning →
// voice → plan → constitution pipeline writes into clients/<slug>/personal_brand_profile.json.
// Every downstream skill reads this ONE file and specializes its output to this person.
//
// The pipeline is enforced by TWO load-bearing human gates — the checkpoints AI must
// never auto-clear (you cannot auto-generate someone's identity and run with it):
//   1. positioning_approved_at  — the person's positioning is locked before voice work
//   2. voice_approved_at        — the person's voice is locked before any content is written
//
// normalize(raw): LENIENT, never throws. validate(obj, {stage}): FAIL-CLOSED, names
// every missing field — and at a given stage, asserts the prior human gate is set.

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

// The four goal archetypes the discovery interview branches on. The interview detects
// intent early and routes follow-up questioning per archetype.
export const GOAL_ARCHETYPES = [
  "consultant_leadgen",      // brand → inbound clients (authority + trust + clear offer)
  "founder_thought_leader",  // brand → credibility, fundraising, hiring, distribution
  "creator_monetization",    // brand → audience growth → courses/sponsorships/products
  "career_capital",          // brand → reputation, opportunities, industry standing
];

// Pipeline stages, in dependency order. Each later stage requires the prior gate
// to be stamped — see validate(). "plan" has no gate of its own (deferred); the
// "constitution" (complete) stage requires BOTH human gates.
export const STAGES = ["discovery", "positioning", "voice", "plan", "constitution"];

export function normalizeIdentity(raw) {
  const r = raw || {};
  return {
    origin_story: pick(r, "origin_story", "story") ?? null,
    defining_experiences: asArray(pick(r, "defining_experiences", "defining_moments")),
    values: asArray(pick(r, "values")),
    credentials: asArray(pick(r, "credentials", "proof_points")),
    zone_of_genius: pick(r, "zone_of_genius", "superpower") ?? null,
    contrarian_pov: pick(r, "contrarian_pov", "contrarian_belief", "pov") ?? null,
  };
}

export function normalizePositioning(raw) {
  const r = raw || {};
  return {
    niche: pick(r, "niche") ?? null,
    audience: pick(r, "audience", "target_audience") ?? null,
    transformation: pick(r, "transformation", "promise") ?? null,
    category_of_one: pick(r, "category_of_one", "differentiation") ?? null,
    statement: pick(r, "statement", "positioning_statement") ?? null,
    positioning_approved_at: pick(r, "positioning_approved_at") ?? null, // GATE 1
  };
}

export function normalizeAudience(raw) {
  const r = raw || {};
  return {
    who: pick(r, "who", "description") ?? null,
    demographics: pick(r, "demographics") ?? null,
    psychographics: pick(r, "psychographics") ?? null,
    pains: asArray(pick(r, "pains", "pain_points")),
    desires: asArray(pick(r, "desires", "aspirations")),
  };
}

export function normalizeVoice(raw) {
  const r = raw || {};
  return {
    tone: pick(r, "tone") ?? null,
    signatures: asArray(pick(r, "signatures", "signature_phrases")),
    lexicon_do: asArray(pick(r, "lexicon_do", "do_words")),
    lexicon_dont: asArray(pick(r, "lexicon_dont", "dont_words", "avoid")),
    sentence_rhythm: pick(r, "sentence_rhythm", "rhythm") ?? null,
    voice_approved_at: pick(r, "voice_approved_at") ?? null, // GATE 2
  };
}

export function normalizePlatformPlan(raw) {
  const r = raw || {};
  return {
    primary_platform: pick(r, "primary_platform", "primary") ?? null,
    secondary_platforms: asArray(pick(r, "secondary_platforms", "secondary")),
    rationale: pick(r, "rationale") ?? null,
  };
}

export function normalizeCadence(raw) {
  const r = raw || {};
  return {
    weekly_volume: pick(r, "weekly_volume", "posts_per_week") ?? null,
    formats: asArray(pick(r, "formats")),
    time_budget_hours: pick(r, "time_budget_hours", "hours_per_week") ?? null,
    sustainability_note: pick(r, "sustainability_note") ?? null,
  };
}

export function normalizeGoals(raw) {
  const r = raw || {};
  return {
    primary_goal: pick(r, "primary_goal", "goal") ?? null,
    kpis: asArray(pick(r, "kpis", "metrics")),
    horizon: pick(r, "horizon", "timeframe") ?? null,
  };
}

export function normalizeSwot(raw) {
  const r = raw || {};
  return {
    strengths: asArray(pick(r, "strengths")),
    weaknesses: asArray(pick(r, "weaknesses")),
    opportunities: asArray(pick(r, "opportunities")),
    threats: asArray(pick(r, "threats")),
  };
}

export function normalizeBoundaries(raw) {
  const r = raw || {};
  return {
    // Things the person will never say / topics they won't touch. Fed to the
    // authenticity guard's avoid-list alongside voice.lexicon_dont.
    never_say: asArray(pick(r, "never_say")),
    no_go_topics: asArray(pick(r, "no_go_topics")),
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    // draft | discovered | positioning_approved | voice_approved | complete
    status: pick(r, "status") ?? "draft",
    goal_archetype: pick(r, "goal_archetype", "archetype") ?? null,
    identity: normalizeIdentity(r.identity),
    positioning: normalizePositioning(r.positioning),
    audience: normalizeAudience(r.audience),
    voice: normalizeVoice(r.voice),
    platform_plan: normalizePlatformPlan(r.platform_plan),
    cadence: normalizeCadence(r.cadence),
    goals_kpis: normalizeGoals(r.goals_kpis),
    swot: normalizeSwot(r.swot),
    boundaries: normalizeBoundaries(r.boundaries),
  };
}

/**
 * FAIL-CLOSED stage validator. validate(obj, {stage}) checks the fields a stage
 * must PRODUCE *and* asserts the prior human gate is stamped — so /voice cannot run
 * before positioning is approved, and /constitution requires BOTH gates. With no
 * stage it validates the whole artifact for completeness.
 */
export function validate(obj, { stage = "complete" } = {}) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["personal_brand_profile is not an object"]);
  const p = normalize(obj);

  const needGate = (path, value, who) => {
    if (!isNonEmptyString(value)) errors.push(`${who} requires ${path} to be set first (prior human gate not cleared)`);
  };

  // Goal archetype must be one of the four whenever it's set.
  if (p.goal_archetype && !GOAL_ARCHETYPES.includes(String(p.goal_archetype).toLowerCase())) {
    errors.push(`goal_archetype "${p.goal_archetype}" is not one of: ${GOAL_ARCHETYPES.join(", ")}`);
  }

  if (stage === "discovery" || stage === "complete") {
    if (!isNonEmptyString(p.goal_archetype)) errors.push("goal_archetype is missing (detect it in /coach-interview)");
    if (!isNonEmptyString(p.identity.zone_of_genius)) errors.push("identity.zone_of_genius is missing");
    if (!p.identity.values.length) errors.push("identity.values is empty");
    // SWOT is the synthesized output of discovery — all four quadrants must exist.
    for (const q of ["strengths", "weaknesses", "opportunities", "threats"]) {
      if (!p.swot[q].length) errors.push(`swot.${q} is empty (synthesize it in /coach-interview)`);
    }
  }

  if (stage === "positioning" || stage === "complete") {
    if (!isNonEmptyString(p.positioning.niche)) errors.push("positioning.niche is missing");
    if (!isNonEmptyString(p.positioning.audience)) errors.push("positioning.audience is missing");
    if (!isNonEmptyString(p.positioning.transformation)) errors.push("positioning.transformation is missing");
    if (!isNonEmptyString(p.positioning.statement)) errors.push("positioning.statement is missing");
  }

  if (stage === "voice") needGate("positioning.positioning_approved_at", p.positioning.positioning_approved_at, "/voice");
  if (stage === "voice" || stage === "complete") {
    if (!isNonEmptyString(p.voice.tone)) errors.push("voice.tone is missing");
    if (!p.voice.signatures.length && !p.voice.lexicon_do.length)
      errors.push("voice needs at least one signature phrase or lexicon_do entry");
  }

  if (stage === "plan") needGate("voice.voice_approved_at", p.voice.voice_approved_at, "/plan");
  if (stage === "plan" || stage === "complete") {
    if (!isNonEmptyString(p.platform_plan.primary_platform)) errors.push("platform_plan.primary_platform is missing");
    if (!isNonEmptyString(p.cadence.weekly_volume)) errors.push("cadence.weekly_volume is missing");
    if (!isNonEmptyString(p.goals_kpis.primary_goal)) errors.push("goals_kpis.primary_goal is missing");
  }

  // The complete (constitution) stage requires BOTH human gates be stamped.
  if (stage === "constitution" || stage === "complete") {
    needGate("positioning.positioning_approved_at", p.positioning.positioning_approved_at, "/constitution");
    needGate("voice.voice_approved_at", p.voice.voice_approved_at, "/constitution");
  }

  return result(errors);
}
