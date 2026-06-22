import { test } from "node:test";
import assert from "node:assert/strict";
import { distributionQueue as dq } from "../schemas/index.js";
import { queueItemsFromDrafts, queueItemsFromDerivatives, buildQueue } from "../scripts/lib/distribute.js";

// Distribution: a pure assembler over already-authored drafts + derivatives. Fail-closed
// persistence (profile + guard) is exercised end-to-end in e2e.test.js.

const DRAFTS = {
  drafts: [
    { date: "2026-07-03", pillar_id: "B", pillar_name: "Myth", platform: "LinkedIn", format: "text", hook: "h2", body: "b2", cta: "c2" },
    { date: "2026-07-01", pillar_id: "A", pillar_name: "Calm", platform: "LinkedIn", format: "text", hook: "h1", body: "b1", cta: "c1" },
  ],
};
const REPURPOSES = {
  derivatives: [
    { source_date: "2026-07-01", source_pillar_id: "A", source_pillar_name: "Calm", target_platform: "X", target_format: "thread", hook: "t1", body: "tb1" },
  ],
};

test("queueItemsFromDrafts schedules each draft on its own date", () => {
  const items = queueItemsFromDrafts(DRAFTS);
  assert.equal(items.length, 2);
  assert.ok(items.every((it) => it.source_kind === "draft" && it.scheduled_at === it.source_date));
  assert.equal(items[0].platform, "LinkedIn");
});

test("queueItemsFromDerivatives schedules each derivative AFTER its source (offset)", () => {
  const a = queueItemsFromDerivatives(REPURPOSES, 1);
  assert.equal(a[0].source_kind, "derivative");
  assert.equal(a[0].source_date, "2026-07-01");
  assert.equal(a[0].scheduled_at, "2026-07-02", "+1 day by default");
  assert.equal(queueItemsFromDerivatives(REPURPOSES, 3)[0].scheduled_at, "2026-07-04", "offset respected");
});

test("buildQueue merges + orders by date, original before derivative, deterministically", () => {
  const q1 = buildQueue(DRAFTS, REPURPOSES, { offsetDays: 1 });
  const q2 = buildQueue(DRAFTS, REPURPOSES, { offsetDays: 1 });
  assert.deepEqual(q1, q2, "same inputs → same queue");
  assert.equal(q1.length, 3);
  assert.deepEqual(q1.map((it) => it.scheduled_at), ["2026-07-01", "2026-07-02", "2026-07-03"]);
  // The 07-01 draft leads; its derivative lands 07-02 (after); the 07-03 draft last.
  assert.equal(q1[0].source_kind, "draft");
  assert.equal(q1[1].source_kind, "derivative");
});

test("buildQueue works with no derivatives (repurposing is optional)", () => {
  const q = buildQueue(DRAFTS, { derivatives: [] });
  assert.equal(q.length, 2);
  assert.ok(q.every((it) => it.source_kind === "draft"));
});

test("distribution_queue schema fails closed on empty queue and half-formed items", () => {
  assert.equal(dq.validate({ client_slug: "j", items: [] }).ok, false);
  const noWhen = dq.validate({
    client_slug: "j",
    items: [{ source_kind: "draft", source_date: "2026-07-01", platform: "X", format: "thread", hook: "h", body: "b" }],
  });
  assert.equal(noWhen.ok, false);
  assert.ok(noWhen.errors.some((e) => e.includes("scheduled_at")));
});

test("distribution_queue schema passes a well-formed queue", () => {
  const v = dq.validate({
    client_slug: "jane", status: "queued",
    items: [{ source_kind: "draft", source_date: "2026-07-01", platform: "LinkedIn", format: "text", scheduled_at: "2026-07-01", hook: "h", body: "b" }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
