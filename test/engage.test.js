import { test } from "node:test";
import assert from "node:assert/strict";
import { engagementLog as el } from "../schemas/index.js";
import { engagementStrategy, buildReplyBrief, scaffoldReplyBriefs } from "../scripts/lib/engage.js";

// Engagement: a pure strategy + reply-brief planner. Fail-closed, guarded persistence is
// exercised end-to-end in e2e.test.js.

const PROFILE = {
  positioning: { audience: "early-stage CTOs", niche: "systems clarity for CTOs" },
  audience: { who: "early-stage CTOs" },
  voice: { tone: "direct, warm", signatures: ["here's the thing"], lexicon_do: ["systems"], lexicon_dont: ["synergy"], sentence_rhythm: "short then long" },
  cadence: { time_budget_hours: 3 },
  boundaries: { never_say: ["guru"], no_go_topics: ["politics"] },
};
const INBOUND = { interactions: [
  { kind: "comment", platform: "LinkedIn", inbound_text: "How do you start on on-call?", context: "on the tech-debt post" },
  { kind: "dm", platform: "LinkedIn", inbound_text: "Can you advise my team?" },
] };

test("engagementStrategy derives a sustainable posture from the constitution, deterministically", () => {
  const a = engagementStrategy(PROFILE);
  const b = engagementStrategy(PROFILE);
  assert.deepEqual(a, b, "same profile → same strategy");
  assert.match(a.daily_minutes, /min\/day/);
  assert.equal(a.focus_audience, "early-stage CTOs");
  assert.equal(a.posture, "direct, warm");
  assert.equal(a.proactive_ratio, "2 proactive : 1 reactive");
  assert.ok(a.targets.length >= 1);
});

test("engagementStrategy floors the daily budget when no time budget is set", () => {
  const s = engagementStrategy({ cadence: {} });
  assert.equal(s.daily_minutes, "15 min/day");
});

test("buildReplyBrief carries the inbound text, voice contract, and merged must_avoid", () => {
  const brief = buildReplyBrief(INBOUND.interactions[0], PROFILE.voice, PROFILE.boundaries);
  assert.equal(brief.kind, "comment");
  assert.equal(brief.inbound_text, "How do you start on on-call?");
  assert.deepEqual(brief.must_avoid, ["synergy", "guru"]);
  assert.deepEqual(brief.no_go_topics, ["politics"]);
  assert.equal(brief.voice.tone, "direct, warm");
});

test("scaffoldReplyBriefs builds one brief per inbound item (capped), accepts array or wrapped", () => {
  assert.equal(scaffoldReplyBriefs(PROFILE, INBOUND).length, 2);
  assert.equal(scaffoldReplyBriefs(PROFILE, INBOUND.interactions).length, 2, "bare array accepted");
  assert.equal(scaffoldReplyBriefs(PROFILE, INBOUND, { limit: 1 }).length, 1);
});

test("engagement_log schema fails closed on empty set, missing response, bad kind", () => {
  assert.equal(el.validate({ client_slug: "j", interactions: [] }).ok, false);
  const noReply = el.validate({ client_slug: "j", interactions: [{ kind: "comment", platform: "X", inbound_text: "hi" }] });
  assert.equal(noReply.ok, false);
  assert.ok(noReply.errors.some((e) => e.includes("response")));
  const badKind = el.validate({ client_slug: "j", interactions: [{ kind: "shout", platform: "X", inbound_text: "hi", response: "yo" }] });
  assert.equal(badKind.ok, false);
  assert.ok(badKind.errors.some((e) => e.includes("kind")));
});

test("engagement_log schema passes a well-formed interaction set", () => {
  const v = el.validate({
    client_slug: "jane", status: "engaged",
    interactions: [{ kind: "comment", platform: "LinkedIn", inbound_text: "How do you start?", response: "Here's the thing — start with who owns the pager." }],
  });
  assert.equal(v.ok, true, v.errors.join("; "));
});
