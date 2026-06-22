import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectArchetype, questionsFor, nextQuestion, interviewPlan, triangulate, synthesizeSwot,
} from "../scripts/lib/interview.js";

test("detectArchetype routes on layer-1 signal", () => {
  const r = detectArchetype("I want more consulting clients and inbound leads for my agency");
  assert.equal(r.archetype, "consultant_leadgen");
  assert.ok(r.confidence > 0);
});

test("detectArchetype returns null when there's no signal", () => {
  const r = detectArchetype("hello there");
  assert.equal(r.archetype, null);
  assert.equal(r.confidence, 0);
});

test("questionsFor adds the archetype branch to the core", () => {
  const core = questionsFor(null, "context_intent").length;
  const branched = questionsFor("creator_monetization", "context_intent").length;
  assert.equal(branched, core + 1);
  assert.ok(questionsFor("creator_monetization", "context_intent").some((q) => q.id === "ci_cm"));
});

test("nextQuestion enforces one-at-a-time and resumes", () => {
  const plan = interviewPlan("consultant_leadgen");
  const first = nextQuestion("consultant_leadgen", []);
  assert.equal(first.id, plan[0].id);
  // After answering the first, the second is served.
  const second = nextQuestion("consultant_leadgen", [{ question_id: plan[0].id }]);
  assert.equal(second.id, plan[1].id);
  // All answered → null.
  const done = nextQuestion("consultant_leadgen", plan.map((q) => ({ question_id: q.id })));
  assert.equal(done, null);
});

test("triangulate corroborates only evidence-backed strengths", () => {
  const { corroborated, unsupported } = triangulate(
    ["clear technical writing", "public speaking"],
    ["writing", "systems", "writing every day"]
  );
  assert.deepEqual(corroborated, ["clear technical writing"]);
  assert.deepEqual(unsupported, ["public speaking"]);
});

test("synthesizeSwot drops unverified claims to weaknesses (blind spots)", () => {
  const swot = synthesizeSwot({
    claimed_strengths: ["clear technical writing", "public speaking"],
    evidence_topics: ["writing", "systems"],
    self_weaknesses: ["inconsistent posting"],
    audience_gaps: ["no one explains this simply"],
    competitor_saturation: ["crowded space"],
    constraints: ["limited time"],
  });
  assert.deepEqual(swot.strengths, ["clear technical writing"]);
  assert.ok(swot.weaknesses.some((w) => w.includes("inconsistent posting")));
  assert.ok(swot.weaknesses.some((w) => w.includes("Claimed but unverified") && w.includes("public speaking")));
  assert.deepEqual(swot.opportunities, ["no one explains this simply"]);
  assert.deepEqual(swot.threats, ["crowded space", "limited time"]);
});
