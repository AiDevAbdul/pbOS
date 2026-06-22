import { test } from "node:test";
import assert from "node:assert/strict";
import { personalBrandProfile as pbp } from "../schemas/index.js";

// The load-bearing fail-closed gates: /voice can't run before positioning approved;
// /constitution requires BOTH. Gates are ISO timestamps only an explicit human flag sets.

test("voice stage BLOCKED until positioning gate stamped", () => {
  const base = {
    client_slug: "jane", goal_archetype: "consultant_leadgen",
    voice: { tone: "direct", signatures: ["look"] },
  };
  const blocked = pbp.validate(base, { stage: "voice" });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.errors.some((e) => e.includes("positioning_approved_at") && e.includes("prior human gate")));

  const stamped = pbp.validate(
    { ...base, positioning: { positioning_approved_at: "2026-06-22T00:00:00Z" } },
    { stage: "voice" }
  );
  assert.equal(stamped.ok, true);
});

test("complete (constitution) stage requires BOTH gates", () => {
  const full = {
    client_slug: "jane", goal_archetype: "consultant_leadgen",
    identity: { zone_of_genius: "z", values: ["v"] },
    swot: { strengths: ["s"], weaknesses: ["w"], opportunities: ["o"], threats: ["t"] },
    positioning: { niche: "n", audience: "a", transformation: "t", statement: "s" },
    voice: { tone: "direct", signatures: ["look"] },
    platform_plan: { primary_platform: "LinkedIn" },
    cadence: { weekly_volume: "3 posts" },
    goals_kpis: { primary_goal: "inbound leads" },
  };
  // No gates → blocked, naming both.
  const noGates = pbp.validate(full, { stage: "complete" });
  assert.equal(noGates.ok, false);
  assert.ok(noGates.errors.some((e) => e.includes("positioning_approved_at")));
  assert.ok(noGates.errors.some((e) => e.includes("voice_approved_at")));

  // Only positioning → still blocked on voice gate.
  const oneGate = pbp.validate(
    { ...full, positioning: { ...full.positioning, positioning_approved_at: "2026-06-22T00:00:00Z" } },
    { stage: "complete" }
  );
  assert.equal(oneGate.ok, false);
  assert.ok(oneGate.errors.some((e) => e.includes("voice_approved_at")));

  // Both gates → passes.
  const both = pbp.validate({
    ...full,
    positioning: { ...full.positioning, positioning_approved_at: "2026-06-22T00:00:00Z" },
    voice: { ...full.voice, voice_approved_at: "2026-06-22T01:00:00Z" },
  }, { stage: "complete" });
  assert.equal(both.ok, true);
});
