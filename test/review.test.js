import { test } from "node:test";
import assert from "node:assert/strict";
import { brandHealthReview as bhr } from "../schemas/index.js";
import { computeHealth, pillarCoverage } from "../scripts/lib/review.js";

// Review: a pure analyst over the loaded artifacts. Fail-closed loading is exercised in e2e.

const PROFILE = {
  cadence: { weekly_volume: "3 posts/week" },
  platform_plan: { primary_platform: "LinkedIn", secondary_platforms: ["X"] },
};
const PILLARS = { pillars: [{ id: "A", name: "Calm", weight: 0.5 }, { id: "B", name: "Myth", weight: 0.5 }] };
const CALENDAR = {
  posts_per_week: 3,
  slots: [{ pillar_id: "A" }, { pillar_id: "A" }, { pillar_id: "B" }, { pillar_id: "B" }],
};

test("pillarCoverage compares actual slot share to target weights", () => {
  const c = pillarCoverage(PILLARS, CALENDAR);
  assert.equal(c.rows.length, 2);
  // 2/4 = 0.5 each, weights 0.5 each → zero drift.
  assert.equal(c.maxDrift, 0);
  const skewed = pillarCoverage(PILLARS, { slots: [{ pillar_id: "A" }, { pillar_id: "A" }, { pillar_id: "A" }, { pillar_id: "B" }] });
  assert.ok(skewed.maxDrift > 0.2, "75/25 vs 50/50 → real drift");
});

test("computeHealth scores a fully-built brand high and finds no risks", () => {
  const present = { pillars: true, calendar: true, drafts: true, repurposes: true, engagement: true, authority: true, distribution: true };
  const r = computeHealth({
    profile: PROFILE, pillars: PILLARS, calendar: CALENDAR,
    drafts: { drafts: [{}, {}, {}, {}] }, repurposes: { derivatives: [{}] },
    engagement: { interactions: [{}] }, authority: { signals: [{ type: "podcast" }] }, present,
  });
  assert.ok(r.score >= 90, `healthy brand scores high (got ${r.score})`);
  assert.ok(!r.findings.some((f) => f.severity === "risk"));
  assert.ok(r.findings.every((f) => f.area && f.severity && f.observation));
  assert.equal(r.metrics.drafts, 4);
});

test("computeHealth flags risks + watches for a bare brand and routes each fix", () => {
  const present = { pillars: false, calendar: false, drafts: false, repurposes: false, engagement: false, authority: false, distribution: false };
  const r = computeHealth({ profile: PROFILE, pillars: {}, calendar: {}, drafts: {}, repurposes: {}, engagement: {}, authority: {}, present });
  assert.ok(r.score < 90, "a bare brand scores lower");
  assert.ok(r.findings.some((f) => f.area === "pillars" && f.severity === "risk"));
  assert.ok(r.findings.some((f) => f.route_to === "/engage"));
  assert.ok(r.findings.some((f) => f.route_to === "/authority"));
});

test("computeHealth flags over-cadence as a burnout risk", () => {
  const present = { calendar: true, pillars: true, drafts: true };
  const r = computeHealth({
    profile: { cadence: { weekly_volume: "2 posts/week" }, platform_plan: { secondary_platforms: [] } },
    pillars: PILLARS, calendar: { posts_per_week: 5, slots: [{ pillar_id: "A" }] },
    drafts: { drafts: [{}] }, repurposes: {}, engagement: {}, authority: {}, present,
  });
  assert.ok(r.findings.some((f) => f.area === "cadence_fit" && f.severity === "risk"));
});

test("brand_health_review schema fails closed without metrics/score/findings", () => {
  assert.equal(bhr.validate({ client_slug: "j", metrics: {}, score: 80, findings: [] }).ok, false, "empty findings");
  assert.equal(bhr.validate({ client_slug: "j", metrics: {}, score: 150, findings: [{ area: "x", severity: "ok", observation: "o" }] }).ok, false, "out-of-range score");
  const badSev = bhr.validate({ client_slug: "j", metrics: {}, score: 80, findings: [{ area: "x", severity: "meh", observation: "o" }] });
  assert.equal(badSev.ok, false);
  assert.ok(badSev.errors.some((e) => e.includes("severity")));
});

test("brand_health_review schema passes a well-formed review", () => {
  const v = bhr.validate({
    client_slug: "jane", status: "reviewed", generated_at: "2026-06-22", score: 84, metrics: { drafts: 3 },
    findings: [{ area: "engagement", severity: "watch", observation: "one-way", recommendation: "engage", route_to: "/engage" }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
