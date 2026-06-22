import { test } from "node:test";
import assert from "node:assert/strict";
import { personalBrandProfile as pbp, interviewAnswers as ia, voiceProfile as vp } from "../schemas/index.js";

test("profile: normalize is lenient and coerces aliases", () => {
  const n = pbp.normalize({ slug: "jane", archetype: "creator_monetization", positioning: { positioning_statement: "x" } });
  assert.equal(n.client_slug, "jane");
  assert.equal(n.goal_archetype, "creator_monetization");
  assert.equal(n.positioning.statement, "x");
  assert.deepEqual(n.identity.values, []);
});

test("profile: discovery stage fails closed without swot + identity", () => {
  const v = pbp.validate({ client_slug: "jane", goal_archetype: "creator_monetization" }, { stage: "discovery" });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("zone_of_genius")));
  assert.ok(v.errors.some((e) => e.includes("swot.strengths")));
});

test("profile: invalid goal_archetype rejected", () => {
  const v = pbp.validate({ client_slug: "x", goal_archetype: "influencer" }, { stage: "discovery" });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("goal_archetype")));
});

test("profile: discovery passes with the required fields", () => {
  const v = pbp.validate({
    client_slug: "jane",
    goal_archetype: "creator_monetization",
    identity: { zone_of_genius: "explaining hard things simply", values: ["honesty"] },
    swot: { strengths: ["s"], weaknesses: ["w"], opportunities: ["o"], threats: ["t"] },
  }, { stage: "discovery" });
  assert.equal(v.ok, true);
});

test("interview_answers: pendingLayers reflects what's unanswered", () => {
  const pend = ia.pendingLayers({ slug: "jane", answers: [{ layer: "context_intent" }] });
  assert.ok(!pend.includes("context_intent"));
  assert.ok(pend.includes("identity"));
});

test("voice_profile: fails closed without tone or signature/lexicon", () => {
  assert.equal(vp.validate({ slug: "jane" }).ok, false);
  assert.equal(vp.validate({ slug: "jane", tone: "warm", signatures: ["here's the thing"] }).ok, true);
});
