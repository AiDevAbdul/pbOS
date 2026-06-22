// schemas/brand_health_review.js — the brand-health review artifact for one person.
//
// Review is Phase-3 step 4 and the capstone of the whole OS: it reads EVERYTHING the pipeline
// has produced (the constitution + pillars + calendar + drafts + repurposes + engagement +
// authority) and reports on the brand's health the organic-first way. It computes deterministic
// metrics, surfaces findings (each with a severity and a recommendation that ROUTES BACK to the
// skill that owns the fix), and rolls up a single health score.
//
// Crucially, review NEVER edits the identity: it cannot change positioning or voice (the two
// human gates). It observes and recommends; the human acts through the owning skill. This keeps
// the gates load-bearing even at the recalibration stage.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — requires metrics, a
// non-empty findings list, and a score, and names every malformed finding.

import { pick, asArray, isNonEmptyString, isFiniteNumber, result } from "./_shared.js";

const SEVERITIES = ["ok", "watch", "risk"];

export function normalizeFinding(raw) {
  const r = raw || {};
  return {
    area: pick(r, "area", "dimension") ?? null, // e.g. pillar_coverage, cadence_fit, distribution, engagement, authority
    severity: pick(r, "severity", "level") ?? null, // ok | watch | risk
    observation: pick(r, "observation", "finding", "what") ?? null,
    recommendation: pick(r, "recommendation", "action", "fix") ?? null,
    route_to: pick(r, "route_to", "skill", "owner") ?? null, // the skill that owns the fix
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | reviewed
    generated_at: pick(r, "generated_at", "date") ?? null,
    score: pick(r, "score", "health_score") ?? null, // 0–100
    metrics: pick(r, "metrics", "stats") ?? {},
    findings: asArray(pick(r, "findings", "issues")).map(normalizeFinding),
  };
}

/**
 * FAIL-CLOSED validator. Review is not a human gate — the producing skill validates the profile
 * at stage "complete" first. Here we assert a client slug, a metrics object, a numeric score in
 * range, a non-empty findings list, and that every finding names its area, a valid severity, and
 * an observation (a finding with no observation is noise). Recommendations route to an owning
 * skill; review itself never edits identity.
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["brand_health_review is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!c.metrics || typeof c.metrics !== "object" || Array.isArray(c.metrics)) errors.push("metrics is missing or not an object");
  if (!(isFiniteNumber(c.score) && c.score >= 0 && c.score <= 100)) errors.push("score must be a number in 0..100");
  if (!c.findings.length) errors.push("findings is empty — a review must report at least one observation");

  c.findings.forEach((f, i) => {
    const where = `findings[${i}]${isNonEmptyString(f.area) ? ` → ${f.area}` : ""}`;
    if (!isNonEmptyString(f.area)) errors.push(`${where}: area is missing`);
    if (!isNonEmptyString(f.severity)) errors.push(`${where}: severity is missing (${SEVERITIES.join(" | ")})`);
    else if (!SEVERITIES.includes(String(f.severity).toLowerCase())) errors.push(`${where}: severity "${f.severity}" is not one of: ${SEVERITIES.join(", ")}`);
    if (!isNonEmptyString(f.observation)) errors.push(`${where}: observation is missing`);
  });

  return result(errors);
}

export { SEVERITIES };
