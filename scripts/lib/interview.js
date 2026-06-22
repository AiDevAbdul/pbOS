// scripts/lib/interview.js — the Coach Interview engine.
//
// The interview is the heart of pbOS: an expert coach listens FIRST, then the whole
// OS specializes to the person. This module is the deterministic spine the
// conversational /coach-interview skill leans on:
//   - detectArchetype()  → reads the layer-1 answers and routes the rest of the
//     interview to the right goal archetype (the four kinds of personal brand).
//   - questionsFor()     → the data-driven question bank: shared CORE questions +
//     per-archetype BRANCH questions, so each person is asked what matters to THEM.
//   - nextQuestion()     → enforces one-question-at-a-time and resume-after-interrupt.
//   - triangulate()      → cross-checks self-reported strengths against EVIDENCE
//     from their existing content (self-report alone is unreliable).
//   - synthesizeSwot()   → turns the layered answers + evidence into a 4-quadrant SWOT.
//
// Pure functions only — no I/O, no Date, no randomness — so it is fully testable and
// the same answers always synthesize the same SWOT.

import { GOAL_ARCHETYPES } from "../../schemas/personal_brand_profile.js";
import { LAYERS } from "../../schemas/interview_answers.js";

// ---- archetype detection ---------------------------------------------------

// Keyword rubric per archetype. Whole-word hits in the layer-1 (context/intent)
// answers score each archetype; the highest score wins. Confirmed aloud with the
// person before branching — detection is a starting point, not a verdict.
export const ARCHETYPE_KEYWORDS = {
  consultant_leadgen: [
    "clients", "leads", "consulting", "consultant", "coach", "coaching", "services",
    "book calls", "inbound", "agency", "freelance", "pipeline", "retainer", "discovery calls",
  ],
  founder_thought_leader: [
    "founder", "startup", "company", "fundraising", "investors", "raise", "hiring",
    "category", "vision", "distribution", "ceo", "build in public", "product",
  ],
  creator_monetization: [
    "audience", "followers", "creator", "monetize", "course", "courses", "sponsorships",
    "subscribers", "newsletter", "youtube", "community", "products", "digital products", "grow",
  ],
  career_capital: [
    "career", "job", "promotion", "reputation", "industry", "executive", "recruiters",
    "opportunities", "standing", "credibility", "network", "speaking", "board",
  ],
};

const FALLBACK_ORDER = GOAL_ARCHETYPES; // deterministic tie-break

export function detectArchetype(text) {
  const hay = String(text || "").toLowerCase();
  const scores = {};
  for (const a of GOAL_ARCHETYPES) {
    scores[a] = 0;
    for (const kw of ARCHETYPE_KEYWORDS[a]) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(hay)) scores[a] += 1;
    }
  }
  let best = null;
  let bestScore = -1;
  for (const a of FALLBACK_ORDER) {
    if (scores[a] > bestScore) { best = a; bestScore = scores[a]; }
  }
  // confidence: winning score relative to total signal (0 when no keywords hit).
  const total = Object.values(scores).reduce((s, n) => s + n, 0);
  const confidence = total > 0 ? Number((bestScore / total).toFixed(2)) : 0;
  return { archetype: bestScore > 0 ? best : null, confidence, scores };
}

// ---- the question bank (source of truth) -----------------------------------

// CORE questions every person answers, per layer. The /coach-interview SKILL.md and
// templates/interview-questions.md render these for the coach; this is the canonical
// machine-readable copy so routing + resume are testable.
export const CORE = {
  context_intent: [
    { id: "ci1", q: "In a sentence, who are you and what do you do?" },
    { id: "ci2", q: "Why build a personal brand now — and what would success look like 12 months from now?" },
  ],
  identity: [
    { id: "id1", q: "Tell me the origin story that explains how you got here." },
    { id: "id2", q: "What are 2–3 defining moments that shaped how you see your field?" },
    { id: "id3", q: "What do you believe about your field that most peers would disagree with?" },
    { id: "id4", q: "What's the thing you do almost effortlessly that others find genuinely hard?" },
    { id: "id5", q: "What 3–5 values are non-negotiable for you?" },
  ],
  strengths: [
    { id: "st1", q: "What are you already known for — and what's the EVIDENCE (a post, result, testimonial)?" },
    { id: "st2", q: "What proof do you have — credentials, results, named wins?" },
  ],
  weaknesses: [
    { id: "wk1", q: "What do you avoid doing, and what's the fear underneath it?" },
    { id: "wk2", q: "What's honestly held you back from being more visible?" },
    { id: "wk3", q: "Any reputational or employer constraints, or topics you simply won't touch?" },
  ],
  audience: [
    { id: "au1", q: "Who, specifically, do you most want to reach?" },
    { id: "au2", q: "What transformation do you help them achieve — from what, to what?" },
    { id: "au3", q: "What do they currently struggle with that no one is addressing well?" },
  ],
  competitive: [
    { id: "cp1", q: "Who else plays in this space, and whose work do you admire?" },
    { id: "cp2", q: "How are you genuinely different from them — your category-of-one?" },
  ],
  capacity: [
    { id: "cap1", q: "Realistically, how many hours per week can you sustain on this?" },
    { id: "cap2", q: "Are you most natural writing, talking (audio/podcast), or on camera?" },
  ],
  voice: [
    { id: "vo1", q: "Paste 2–3 things you've written that sound like you (or talk for 2 minutes and we'll transcribe)." },
    { id: "vo2", q: "Are there words or phrases you'd never use about yourself or your work?" },
  ],
};

// Per-archetype BRANCH questions, added to the core for the relevant layer.
export const BRANCHES = {
  consultant_leadgen: {
    context_intent: [{ id: "ci_lg", q: "What's your core offer, and what's a client worth to you?" }],
    audience: [{ id: "au_lg", q: "What's the trigger that makes an ideal client realize they need you?" }],
  },
  founder_thought_leader: {
    context_intent: [{ id: "ci_fl", q: "What's the company, and what does the brand need to unlock — funding, hiring, or distribution?" }],
    competitive: [{ id: "cp_fl", q: "What category are you trying to define or own?" }],
  },
  creator_monetization: {
    context_intent: [{ id: "ci_cm", q: "What's the audience-to-money path — courses, sponsorships, products, memberships?" }],
    capacity: [{ id: "cap_cm", q: "Which platform's format fits you best, and what's your realistic publishing volume?" }],
  },
  career_capital: {
    context_intent: [{ id: "ci_cc", q: "Whose attention matters most — recruiters, peers, leadership, a specific industry?" }],
    strengths: [{ id: "st_cc", q: "What roles or opportunities do you want this brand to attract?" }],
  },
};

/** Ordered question list for a layer = CORE + the archetype's branch (if any). */
export function questionsFor(archetype, layer) {
  const core = CORE[layer] || [];
  const branch = (archetype && BRANCHES[archetype]?.[layer]) || [];
  return [...core, ...branch];
}

/** The full ordered interview plan for an archetype, across all eight layers. */
export function interviewPlan(archetype) {
  return LAYERS.flatMap((layer) => questionsFor(archetype, layer).map((q) => ({ layer, ...q })));
}

/**
 * The next unanswered question given the answers recorded so far — enforces
 * one-question-at-a-time and lets an interrupted interview resume exactly.
 * Returns null when the plan is complete.
 */
export function nextQuestion(archetype, answers = []) {
  const asked = new Set(answers.map((a) => a.question_id).filter(Boolean));
  for (const item of interviewPlan(archetype)) {
    if (!asked.has(item.id)) return item;
  }
  return null;
}

// ---- evidence triangulation ------------------------------------------------

const STOP = new Set(["the", "and", "for", "with", "that", "this", "your", "you", "are", "was", "have", "from", "about", "into", "very", "much", "they"]);

function keywords(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

/**
 * Cross-check self-reported strengths against the topics surfaced from the person's
 * existing content. A strength is CORROBORATED if it shares a meaningful keyword with
 * the evidence; otherwise it is UNSUPPORTED (a claim, or a blind spot). This is the
 * triangulation that keeps the SWOT honest — self-report alone is unreliable.
 */
export function triangulate(claimedStrengths = [], evidenceTopics = []) {
  const evWords = new Set(evidenceTopics.flatMap(keywords));
  const corroborated = [];
  const unsupported = [];
  for (const claim of claimedStrengths) {
    const hit = keywords(claim).some((w) => evWords.has(w));
    (hit ? corroborated : unsupported).push(claim);
  }
  return { corroborated, unsupported };
}

/**
 * Synthesize the 4-quadrant SWOT deterministically from the layered discovery input.
 * SWOT is ONE lens here — the richer identity layers feed positioning separately.
 *
 * input = {
 *   claimed_strengths[], evidence_topics[],   // layers 3 + content audit
 *   self_weaknesses[],                        // layer 4
 *   audience_gaps[],                          // layer 5 → opportunities
 *   competitor_saturation[], constraints[],   // layer 6 + threats woven through 4/6
 * }
 */
export function synthesizeSwot(input = {}) {
  const {
    claimed_strengths = [],
    evidence_topics = [],
    self_weaknesses = [],
    audience_gaps = [],
    competitor_saturation = [],
    constraints = [],
  } = input;

  const { corroborated, unsupported } = triangulate(claimed_strengths, evidence_topics);

  return {
    // Only evidence-corroborated strengths are stated as strengths.
    strengths: corroborated.slice(),
    // Self-reported weaknesses PLUS claimed-but-unverified strengths (blind spots).
    weaknesses: [
      ...self_weaknesses,
      ...unsupported.map((s) => `Claimed but unverified by existing content: ${s}`),
    ],
    opportunities: audience_gaps.slice(),
    threats: [...competitor_saturation, ...constraints],
  };
}
