// schemas/interview_answers.js — the accumulating record of a Coach Interview.
//
// The interview is conversational (Claude runs it, one question at a time). Each
// answer is appended here so an interrupted interview can RESUME exactly where it
// left off. clients/<slug>/interview_answers.json is the running transcript +
// detected goal archetype + the evidence signals used to triangulate self-report.
//
// This is intentionally LENIENT — it is a scratchpad, not a deliverable. The
// synthesized output lands in personal_brand_profile.json (discovery stage).

import { pick, asArray, isNonEmptyString, result } from "./_shared.js";

// The eight discovery layers, in order. Threats/constraints are woven through
// layers 4 (weaknesses) and 6 (competitive) rather than asked as a block.
export const LAYERS = [
  "context_intent",   // 1. who/what/why-now/what-success-looks-like → archetype detection
  "identity",         // 2. origin story, defining moments, values, contrarian POV, zone of genius
  "strengths",        // 3. what they're known for + EVIDENCE for each claim
  "weaknesses",       // 4. avoidances, fears, skill gaps, what's held them back (+ threats)
  "audience",         // 5. who they reach + the transformation they offer
  "competitive",      // 6. peers/admired, how they differ, category-of-one (+ saturation threats)
  "capacity",         // 7. time/energy, format comfort (writer/talker/on-camera), sustainability
  "voice",            // 8. voice capture (samples ingested or elicited live)
];

export function normalizeAnswer(raw) {
  const r = raw || {};
  return {
    layer: pick(r, "layer") ?? null,
    question_id: pick(r, "question_id", "id") ?? null,
    question: pick(r, "question") ?? null,
    answer: pick(r, "answer", "response") ?? null,
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    slug: pick(r, "slug", "client_slug") ?? null,
    goal_archetype: pick(r, "goal_archetype", "archetype") ?? null,
    archetype_confidence: pick(r, "archetype_confidence") ?? null,
    answers: asArray(r.answers).map(normalizeAnswer),
    // Topics/keywords extracted from the person's existing content (voice_samples/),
    // used to corroborate or refute self-reported strengths.
    evidence_signals: {
      sample_count: r.evidence_signals?.sample_count ?? 0,
      topics: asArray(r.evidence_signals?.topics),
      note: r.evidence_signals?.note ?? null,
    },
    completed_layers: asArray(r.completed_layers),
  };
}

/** Which layers still have zero recorded answers — drives resume + "what's next". */
export function pendingLayers(obj) {
  const a = normalize(obj);
  const answered = new Set(a.answers.map((x) => x.layer).filter(Boolean));
  return LAYERS.filter((l) => !answered.has(l));
}

export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["interview_answers is not an object"]);
  const a = normalize(obj);
  if (!isNonEmptyString(a.slug)) errors.push("slug is missing");
  return result(errors);
}
