import { test } from "node:test";
import assert from "node:assert/strict";
import { contentRepurpose as cr } from "../schemas/index.js";
import { formatFor, repurposeTargets, planRepurpose, scaffoldRepurposePlans } from "../scripts/lib/repurpose.js";

// Repurposing: a pure channel-planner over drafts + voice, fail-closed persistence elsewhere.

const PROFILE = {
  platform_plan: { primary_platform: "LinkedIn", secondary_platforms: ["X", "Newsletter"] },
  cadence: { formats: ["text"] },
  voice: { tone: "direct", signatures: ["here's the thing"], lexicon_do: ["systems"], lexicon_dont: ["synergy"], sentence_rhythm: "short then long" },
  boundaries: { never_say: ["guru"], no_go_topics: ["politics"] },
};
const DRAFT = {
  date: "2026-07-01", pillar_id: "A", pillar_name: "Calm systems",
  platform: "LinkedIn", hook: "Here's the thing.", body: "The original post.",
};

test("formatFor maps platforms to channel-native formats, falls back otherwise", () => {
  assert.equal(formatFor("X"), "thread");
  assert.equal(formatFor("linkedin"), "post");
  assert.equal(formatFor("Newsletter"), "email");
  assert.equal(formatFor("MySpace", "text"), "text", "unknown platform → fallback");
  assert.equal(formatFor("", null), "post", "no platform/fallback → post");
});

test("repurposeTargets returns secondary platforms in native formats, deterministically", () => {
  const a = repurposeTargets(PROFILE);
  const b = repurposeTargets(PROFILE);
  assert.deepEqual(a, b, "same profile → same targets");
  assert.deepEqual(a, [{ platform: "X", format: "thread" }, { platform: "Newsletter", format: "email" }]);
});

test("repurposeTargets dedupes and is empty when there are no secondary platforms", () => {
  assert.deepEqual(repurposeTargets({ platform_plan: { secondary_platforms: [] } }), []);
  const dupes = repurposeTargets({ platform_plan: { secondary_platforms: ["X", "x", "X"] }, cadence: { formats: [] } });
  assert.equal(dupes.length, 1, "case-insensitive dedupe");
});

test("planRepurpose carries the source post, targets, and merged must_avoid", () => {
  const targets = repurposeTargets(PROFILE);
  const plan = planRepurpose(DRAFT, targets, PROFILE.voice, PROFILE.boundaries);
  assert.equal(plan.source_date, "2026-07-01");
  assert.equal(plan.source_body, "The original post.");
  assert.deepEqual(plan.targets, targets);
  assert.deepEqual(plan.must_avoid, ["synergy", "guru"]);
  assert.deepEqual(plan.no_go_topics, ["politics"]);
});

test("scaffoldRepurposePlans builds one plan per (capped) source draft", () => {
  const drafts = { drafts: [DRAFT, { ...DRAFT, date: "2026-07-03" }, { ...DRAFT, date: "2026-07-05" }] };
  assert.equal(scaffoldRepurposePlans(PROFILE, drafts).length, 3);
  assert.equal(scaffoldRepurposePlans(PROFILE, drafts, { limit: 2 }).length, 2);
});

test("content_repurpose schema fails closed on empty set and half-formed derivatives", () => {
  assert.equal(cr.validate({ client_slug: "j", derivatives: [] }).ok, false);
  const noBody = cr.validate({
    client_slug: "j",
    derivatives: [{ source_date: "2026-07-01", source_pillar_id: "A", target_platform: "X", target_format: "thread", hook: "hi" }],
  });
  assert.equal(noBody.ok, false);
  assert.ok(noBody.errors.some((e) => e.includes("body")));
  const noTarget = cr.validate({
    client_slug: "j",
    derivatives: [{ source_date: "2026-07-01", source_pillar_id: "A", hook: "hi", body: "there" }],
  });
  assert.equal(noTarget.ok, false);
  assert.ok(noTarget.errors.some((e) => e.includes("target_platform")));
});

test("content_repurpose schema passes a well-formed derivative set", () => {
  const v = cr.validate({
    client_slug: "jane", status: "repurposed",
    derivatives: [{
      source_date: "2026-07-01", source_pillar_id: "A", source_pillar_name: "Calm systems",
      target_platform: "X", target_format: "thread",
      hook: "Most tech debt is org debt. 🧵", body: "1/ The re-cut, beat by beat.", cta: "Which have you hit?",
    }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
