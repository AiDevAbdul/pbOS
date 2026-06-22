import { test } from "node:test";
import assert from "node:assert/strict";
import { contentDraft as cd } from "../schemas/index.js";
import { buildDraftBrief, selectSlots, scaffoldBriefs } from "../scripts/lib/write.js";

// Drafting: a pure brief-builder over calendar slots + voice, fail-closed persistence elsewhere.

const SLOT = {
  date: "2026-07-01", week: 1, pillar_id: "A", pillar_name: "Calm systems",
  platform: "LinkedIn", format: "text", angle: "3 org smells that look like tech debt",
};
const VOICE = {
  tone: "direct, warm", signatures: ["here's the thing"],
  lexicon_do: ["systems"], lexicon_dont: ["synergy"], sentence_rhythm: "short then long",
};
const BOUNDARIES = { never_say: ["guru"], no_go_topics: ["politics"] };

test("buildDraftBrief carries the slot facts and the voice contract, deterministically", () => {
  const a = buildDraftBrief(SLOT, VOICE, BOUNDARIES);
  const b = buildDraftBrief(SLOT, VOICE, BOUNDARIES);
  assert.deepEqual(a, b, "same inputs → same brief");
  assert.equal(a.date, "2026-07-01");
  assert.equal(a.pillar_id, "A");
  assert.equal(a.angle, SLOT.angle);
  assert.equal(a.voice.tone, "direct, warm");
  assert.deepEqual(a.voice.signatures, ["here's the thing"]);
});

test("buildDraftBrief merges lexicon_dont + never_say into must_avoid", () => {
  const brief = buildDraftBrief(SLOT, VOICE, BOUNDARIES);
  assert.deepEqual(brief.must_avoid, ["synergy", "guru"]);
  assert.deepEqual(brief.no_go_topics, ["politics"]);
});

test("buildDraftBrief tolerates a bare slot / missing voice (no throw)", () => {
  const brief = buildDraftBrief({ date: "2026-07-01", pillar_id: "A" });
  assert.equal(brief.angle, null);
  assert.deepEqual(brief.must_avoid, []);
  assert.deepEqual(brief.voice.signatures, []);
});

test("selectSlots filters by week and caps by limit", () => {
  const slots = [
    { week: 1, date: "a" }, { week: 1, date: "b" }, { week: 2, date: "c" },
  ];
  assert.equal(selectSlots(slots).length, 3);
  assert.equal(selectSlots(slots, { week: 1 }).length, 2);
  assert.equal(selectSlots(slots, { limit: 2 }).length, 2);
  assert.deepEqual(selectSlots(slots, { week: 1, limit: 1 }), [{ week: 1, date: "a" }]);
});

test("scaffoldBriefs builds one brief per selected slot", () => {
  const profile = { voice: VOICE, boundaries: BOUNDARIES };
  const calendar = { slots: [SLOT, { ...SLOT, week: 2, date: "2026-07-08" }] };
  const briefs = scaffoldBriefs(profile, calendar, { week: 1 });
  assert.equal(briefs.length, 1);
  assert.equal(briefs[0].date, "2026-07-01");
});

test("content_draft schema fails closed on empty set and half-written drafts", () => {
  assert.equal(cd.validate({ client_slug: "j", drafts: [] }).ok, false);
  const noBody = cd.validate({
    client_slug: "j",
    drafts: [{ date: "2026-07-01", pillar_id: "A", platform: "X", format: "text", hook: "hi" }],
  });
  assert.equal(noBody.ok, false);
  assert.ok(noBody.errors.some((e) => e.includes("body")));
  const noDate = cd.validate({
    client_slug: "j",
    drafts: [{ pillar_id: "A", platform: "X", format: "text", hook: "hi", body: "there" }],
  });
  assert.equal(noDate.ok, false);
  assert.ok(noDate.errors.some((e) => e.includes("date")));
});

test("content_draft schema passes a well-formed draft set", () => {
  const v = cd.validate({
    client_slug: "jane", status: "drafted",
    drafts: [{
      date: "2026-07-01", week: 1, pillar_id: "A", pillar_name: "Calm systems",
      platform: "LinkedIn", format: "text", angle: "x",
      hook: "Here's the thing.", body: "A real post in voice.", cta: "Your take?",
    }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
