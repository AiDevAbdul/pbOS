import { test } from "node:test";
import assert from "node:assert/strict";
import { contentCalendar as cc } from "../schemas/index.js";
import { parseWeeklyVolume, addDays, spreadDays, weightedSequence, buildCalendar } from "../scripts/lib/calendar.js";

// Content calendar: deterministic scheduling over the pillars, capped to stated cadence.

const PILLARS = [
  { id: "A", name: "A", weight: 0.5, formats: ["text"], sample_angles: ["a1", "a2"] },
  { id: "B", name: "B", weight: 0.3, formats: ["text"], sample_angles: ["b1"] },
  { id: "C", name: "C", weight: 0.2, formats: ["text"], sample_angles: ["c1"] },
];

test("parseWeeklyVolume pulls the number out of a cadence string", () => {
  assert.equal(parseWeeklyVolume("3 posts/week"), 3);
  assert.equal(parseWeeklyVolume(5), 5);
  assert.equal(parseWeeklyVolume("daily"), 0); // no number → 0 (skill fails closed on this)
});

test("addDays is pure UTC date math", () => {
  assert.equal(addDays("2026-07-01", 0), "2026-07-01");
  assert.equal(addDays("2026-07-01", 7), "2026-07-08");
  assert.equal(addDays("2026-07-31", 1), "2026-08-01"); // month rollover
});

test("spreadDays spaces posts across the week and stays in range", () => {
  assert.deepEqual(spreadDays(1), [0]);
  const three = spreadDays(3);
  assert.equal(three.length, 3);
  assert.ok(three.every((d) => d >= 0 && d <= 6));
  assert.deepEqual([...three].sort((a, b) => a - b), three, "offsets are ascending");
});

test("weightedSequence is deterministic and proportional to weight", () => {
  const a = weightedSequence(PILLARS, 10);
  const b = weightedSequence(PILLARS, 10);
  assert.deepEqual(a, b, "same inputs → same sequence");
  const counts = [0, 0, 0];
  a.forEach((i) => counts[i]++);
  // 0.5 / 0.3 / 0.2 over 10 → roughly 5 / 3 / 2; heaviest pillar wins the most slots.
  assert.equal(counts[0], 5);
  assert.ok(counts[0] > counts[1] && counts[1] >= counts[2]);
});

test("weightedSequence interleaves — no pillar three times in a row", () => {
  const seq = weightedSequence(PILLARS, 10);
  let run = 1, maxRun = 1;
  for (let i = 1; i < seq.length; i++) { run = seq[i] === seq[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
  assert.ok(maxRun < 3, `smooth distribution should avoid long runs (got ${maxRun})`);
});

test("buildCalendar produces weeks×postsPerWeek fully-specified slots, deterministically", () => {
  const opts = { weeks: 4, postsPerWeek: 3, primaryPlatform: "LinkedIn", defaultFormats: ["text"], startDate: "2026-07-01" };
  const slots = buildCalendar(PILLARS, opts);
  assert.equal(slots.length, 12);
  assert.deepEqual(buildCalendar(PILLARS, opts), slots, "deterministic");
  for (const s of slots) {
    assert.ok(s.date && s.pillar_id && s.platform && s.format && s.angle);
    assert.equal(s.status, "planned");
  }
  // First week's dates are within the first 7 days of the start date.
  const wk1 = slots.filter((s) => s.week === 1).map((s) => s.date);
  assert.ok(wk1.every((d) => d >= "2026-07-01" && d <= "2026-07-07"));
});

test("buildCalendar rotates a pillar's sample_angles instead of repeating one", () => {
  // Heavy single pillar with 2 angles, appearing multiple times → angles alternate.
  const solo = [{ id: "A", name: "A", weight: 1, formats: ["text"], sample_angles: ["a1", "a2"] }];
  const slots = buildCalendar(solo, { weeks: 2, postsPerWeek: 2, primaryPlatform: "X", defaultFormats: ["text"], startDate: "2026-07-01" });
  const angles = slots.map((s) => s.angle);
  assert.deepEqual(angles, ["a1", "a2", "a1", "a2"]);
});

test("buildCalendar returns empty on degenerate input (no throw)", () => {
  assert.deepEqual(buildCalendar([], { weeks: 4, postsPerWeek: 3, startDate: "2026-07-01" }), []);
  assert.deepEqual(buildCalendar(PILLARS, { weeks: 4, postsPerWeek: 0, startDate: "2026-07-01" }), []);
  assert.deepEqual(buildCalendar(PILLARS, { weeks: 4, postsPerWeek: 3, startDate: null }), []);
});

test("content_calendar schema fails closed on bad horizon, cadence, and half-specified slots", () => {
  assert.equal(cc.validate({ client_slug: "j", horizon_weeks: 0, posts_per_week: 3, slots: [{ date: "2026-07-01", pillar_id: "A", format: "text", platform: "X" }] }).ok, false);
  const halfSlot = cc.validate({ client_slug: "j", horizon_weeks: 1, posts_per_week: 1, slots: [{ date: "2026-07-01", format: "text", platform: "X" }] });
  assert.equal(halfSlot.ok, false);
  assert.ok(halfSlot.errors.some((e) => e.includes("pillar_id")));
  assert.equal(cc.validate({ client_slug: "j", horizon_weeks: 1, posts_per_week: 1, slots: [] }).ok, false);
});

test("content_calendar schema passes a well-formed calendar", () => {
  const v = cc.validate({
    client_slug: "jane", horizon_weeks: 1, posts_per_week: 1,
    slots: [{ date: "2026-07-01", week: 1, pillar_id: "A", pillar_name: "A", platform: "LinkedIn", format: "text", angle: "x" }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
