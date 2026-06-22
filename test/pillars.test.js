import { test } from "node:test";
import assert from "node:assert/strict";
import { contentPillars as cp } from "../schemas/index.js";
import { suggestPillarSeeds } from "../scripts/lib/pillars.js";

// Content pillars: the first content-engine artifact. 3–5 themes, each traceable to the
// constitution. The schema is fail-closed; seeds are deterministic.

const PILLAR = (over = {}) => ({
  name: "Calm systems", thesis: "Org design, not tech debt.",
  why_this_person: "identity.zone_of_genius", sample_angles: ["a smell that looks like tech debt"],
  ...over,
});

test("content_pillars: 3–5 pillars pass, each with name/thesis/why/angle", () => {
  const doc = { client_slug: "jane", pillars: [PILLAR(), PILLAR({ name: "Contrarian" }), PILLAR({ name: "Transformation" })] };
  const v = cp.validate(doc);
  assert.equal(v.ok, true, v.errors.join("; "));
});

test("content_pillars: fewer than 3 fails closed", () => {
  const v = cp.validate({ client_slug: "jane", pillars: [PILLAR(), PILLAR({ name: "Two" })] });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("at least 3")));
});

test("content_pillars: more than 5 fails closed", () => {
  const pillars = Array.from({ length: 6 }, (_, i) => PILLAR({ name: `P${i}` }));
  const v = cp.validate({ client_slug: "jane", pillars });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("more than 5")));
});

test("content_pillars: a pillar with no trace is rejected (no blank-page themes)", () => {
  const pillars = [PILLAR(), PILLAR({ name: "Two" }), PILLAR({ name: "Three", why_this_person: null })];
  const v = cp.validate({ client_slug: "jane", pillars });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("why_this_person")));
});

test("content_pillars: a pillar with no sample angle is rejected", () => {
  const pillars = [PILLAR(), PILLAR({ name: "Two" }), PILLAR({ name: "Three", sample_angles: [] })];
  const v = cp.validate({ client_slug: "jane", pillars });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("sample_angles")));
});

test("content_pillars: duplicate derived ids are caught", () => {
  // Two pillars with the same name → same derived id.
  const pillars = [PILLAR(), PILLAR(), PILLAR({ name: "Three" })];
  const v = cp.validate({ client_slug: "jane", pillars });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("duplicate pillar id")));
});

test("normalizePillar derives a stable id from the name", () => {
  assert.equal(cp.normalizePillar({ name: "Calm Systems" }).id, "CALM_SYSTEMS");
  assert.equal(cp.normalizePillar({ name: "Calm Systems" }).id, cp.normalizePillar({ name: "Calm Systems" }).id);
});

test("suggestPillarSeeds is deterministic and traces every seed to the constitution", () => {
  const profile = {
    client_slug: "jane", goal_archetype: "consultant_leadgen",
    identity: { zone_of_genius: "scaling eng orgs", contrarian_pov: "hiring is an org problem", values: ["clarity"],
      defining_experiences: ["built 3 eng orgs"] },
    positioning: { audience: "early-stage CTOs", transformation: "from chaos to calm" },
    audience: { pains: ["on-call burnout", "scaling chaos"] },
    swot: { opportunities: ["no one teaches org design to CTOs"] },
  };
  const a = suggestPillarSeeds(profile);
  const b = suggestPillarSeeds(profile);
  assert.deepEqual(a, b, "seeds must be deterministic");
  assert.ok(a.length >= 3, "rich constitution should yield enough seeds for a 3–5 set");
  assert.ok(a.every((s) => s.why_this_person && s.thesis), "every seed traces and has a thesis");
});

test("suggestPillarSeeds handles an empty profile without throwing", () => {
  assert.deepEqual(suggestPillarSeeds({}), []);
});
