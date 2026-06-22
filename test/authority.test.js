import { test } from "node:test";
import assert from "node:assert/strict";
import { authorityLedger as al } from "../schemas/index.js";
import { authorityTargets, summarizeSignals } from "../scripts/lib/authority.js";

// Authority: a pure target-planner grounded in real identity facts + a signal scoreboard.
// Fail-closed, guarded persistence is exercised end-to-end in e2e.test.js.

const PROFILE = {
  positioning: { niche: "systems clarity for CTOs", audience: "early-stage CTOs", transformation: "from scaling chaos to calm systems", statement: "S" },
  audience: { who: "early-stage CTOs" },
  identity: {
    zone_of_genius: "making complex systems simple",
    contrarian_pov: "Most scale advice makes systems more fragile.",
    credentials: ["a decade building staff-level systems"],
    defining_experiences: ["led the platform rewrite at X"],
  },
};

test("authorityTargets derives grounded targets from the constitution, deterministically", () => {
  const a = authorityTargets(PROFILE);
  const b = authorityTargets(PROFILE);
  assert.deepEqual(a, b, "same profile → same targets");
  assert.ok(a.length >= 3);
  // Every target is grounded in a real recorded fact (never fabricated authority).
  assert.ok(a.every((t) => t.outlet_category && t.pitch_angle && t.grounded_in));
  assert.ok(a.some((t) => t.kind === "podcast" && t.grounded_in === "making complex systems simple"));
  assert.ok(a.some((t) => t.kind === "feature" && t.grounded_in === PROFILE.identity.contrarian_pov));
});

test("authorityTargets omits the feature/collab seeds when their grounding facts are absent", () => {
  const thin = authorityTargets({ positioning: { niche: "n", audience: "a" }, identity: {} });
  assert.ok(!thin.some((t) => t.kind === "feature"), "no contrarian_pov → no feature seed");
  assert.ok(!thin.some((t) => t.kind === "collab"), "no credentials/experiences → no collab seed");
});

test("summarizeSignals counts earned signals by type", () => {
  const s = summarizeSignals([{ type: "podcast" }, { type: "Podcast" }, { type: "talk" }]);
  assert.equal(s.total, 3);
  assert.deepEqual(s.by_type, { podcast: 2, talk: 1 });
  assert.deepEqual(summarizeSignals([]).by_type, {});
});

test("authority_ledger schema requires content and well-formed signals/targets", () => {
  assert.equal(al.validate({ client_slug: "j", signals: [], targets: [] }).ok, false);
  const badType = al.validate({ client_slug: "j", signals: [{ type: "vibe", title: "t" }] });
  assert.equal(badType.ok, false);
  assert.ok(badType.errors.some((e) => e.includes("type")));
  const ungrounded = al.validate({ client_slug: "j", targets: [{ outlet_category: "podcasts", pitch_angle: "a guest spot" }] });
  assert.equal(ungrounded.ok, false);
  assert.ok(ungrounded.errors.some((e) => e.includes("grounded_in")));
});

test("authority_ledger schema passes a well-formed ledger", () => {
  const v = al.validate({
    client_slug: "jane", status: "tracked",
    signals: [{ type: "podcast", title: "Guested on The Pragmatic Engineer", outlet: "TPE", date: "2026-06-01" }],
    targets: [{ kind: "talk", outlet_category: "conferences for CTOs", pitch_angle: "calm systems", grounded_in: "led a rewrite" }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
