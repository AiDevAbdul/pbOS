import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "e2e-test-persona";
const DIR = resolve(ROOT, "clients", SLUG);

function run(scriptRelPath, args = []) {
  return spawnSync("node", [resolve(ROOT, scriptRelPath), ...args], { encoding: "utf8", env: { ...process.env } });
}
function clean() { if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true }); }

before(clean);
after(clean);

test("e2e: enroll → interview → positioning(gate) → voice(gate) → constitution, gates load-bearing", () => {
  // 1. enroll
  let r = run("skills/enroll/enroll.js", ["E2E Persona", "--slug", SLUG]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "personal_brand_profile.json")));
  assert.ok(existsSync(resolve(DIR, "interview_answers.json")));

  // 2. drop a writing sample so evidence audit has something to corroborate against
  mkdirSync(resolve(DIR, "voice_samples"), { recursive: true });
  writeFileSync(resolve(DIR, "voice_samples", "sample.md"),
    "I love writing about systems. Writing every day made me sharper. Systems and writing are my edge.");

  // 3. audit evidence
  r = run("skills/coach-interview/coach-interview.js", ["audit-evidence", SLUG]);
  assert.equal(r.status, 0, r.stderr);

  // 4. synthesize the discovery layer (Claude would author this discovery.json)
  const discovery = {
    goal_archetype: "consultant_leadgen",
    identity: {
      zone_of_genius: "making complex systems simple",
      values: ["clarity", "candor"],
      credentials: ["10 years as a staff engineer"],
      origin_story: "Burned out building fragile systems, learned to make them calm.",
      contrarian_pov: "Most 'scale' advice makes systems more fragile, not less.",
    },
    audience: { who: "early-stage CTOs", pains: ["scaling chaos"], desires: ["calm systems"] },
    platform_plan: { primary_platform: "LinkedIn", secondary_platforms: ["X"], rationale: "B2B writer audience" },
    cadence: { weekly_volume: "3 posts/week", formats: ["text"], time_budget_hours: 3, sustainability_note: "batch on Sundays" },
    goals_kpis: { primary_goal: "inbound consulting leads", kpis: ["qualified DMs"], horizon: "6 months" },
    boundaries: { never_say: ["synergy"], no_go_topics: ["politics"] },
    claimed_strengths: ["clear technical writing", "public speaking"],
    self_weaknesses: ["inconsistent posting"],
    audience_gaps: ["no one explains this simply"],
    competitor_saturation: ["crowded devrel space"],
    constraints: ["limited time"],
  };
  const discPath = resolve(DIR, "discovery.json");
  writeFileSync(discPath, JSON.stringify(discovery));
  r = run("skills/coach-interview/coach-interview.js", ["synthesize", SLUG, "--in", discPath]);
  assert.equal(r.status, 0, r.stderr);
  // SWOT triangulation: writing corroborated → strength; public speaking → blind spot.
  const prof1 = JSON.parse(readFileSync(resolve(DIR, "personal_brand_profile.json"), "utf8"));
  assert.deepEqual(prof1.swot.strengths, ["clear technical writing"]);
  assert.ok(prof1.swot.weaknesses.some((w) => w.includes("public speaking")));

  // 5. positioning layer
  const positioning = {
    niche: "systems clarity for CTOs", audience: "early-stage CTOs",
    transformation: "from scaling chaos to calm systems",
    category_of_one: "an engineer who writes like a teacher",
    statement: "For early-stage CTOs drowning in scaling chaos, I turn complex systems into calm, teachable clarity — because I spent 10 years building them.",
  };
  const posPath = resolve(DIR, "positioning.json");
  writeFileSync(posPath, JSON.stringify(positioning));
  r = run("skills/positioning/positioning.js", [SLUG, "--in", posPath]);
  assert.equal(r.status, 0, r.stderr);

  // 6. GATE PROOF: /voice must REFUSE before positioning is approved.
  const voice = {
    tone: "direct, warm, teacherly", signatures: ["here's the thing"],
    lexicon_do: ["systems", "clarity"], lexicon_dont: ["synergy", "guru"],
    sentence_rhythm: "short opener, longer follow-up",
  };
  const voicePath = resolve(DIR, "voice.json");
  writeFileSync(voicePath, JSON.stringify(voice));
  r = run("skills/voice/voice.js", [SLUG, "--in", voicePath]);
  assert.notEqual(r.status, 0, "voice must fail-closed before positioning gate is stamped");
  assert.match(r.stderr, /positioning_approved_at|prior human gate/);

  // 7. approve positioning (human gate 1)
  r = run("skills/positioning/positioning.js", [SLUG, "--approve-positioning"]);
  assert.equal(r.status, 0, r.stderr);

  // 8. now /voice succeeds
  r = run("skills/voice/voice.js", [SLUG, "--in", voicePath]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "voice_profile.json")));

  // 9. GATE PROOF: /constitution must REFUSE before voice is approved.
  r = run("skills/constitution/constitution.js", [SLUG]);
  assert.notEqual(r.status, 0, "constitution must fail-closed before voice gate is stamped");
  assert.match(r.stderr, /voice_approved_at/);

  // 10. approve voice (human gate 2)
  r = run("skills/voice/voice.js", [SLUG, "--approve-voice"]);
  assert.equal(r.status, 0, r.stderr);

  // 11. constitution now assembles
  r = run("skills/constitution/constitution.js", [SLUG]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "CLAUDE.md")), "per-person CLAUDE.md generated");
  assert.ok(existsSync(resolve(DIR, "constitution.html")), "brand-of-one HTML generated");

  const finalProfile = JSON.parse(readFileSync(resolve(DIR, "personal_brand_profile.json"), "utf8"));
  assert.equal(finalProfile.status, "complete");
  assert.ok(finalProfile.positioning.positioning_approved_at, "positioning gate stamped");
  assert.ok(finalProfile.voice.voice_approved_at, "voice gate stamped");

  const claudeMd = readFileSync(resolve(DIR, "CLAUDE.md"), "utf8");
  assert.match(claudeMd, /Personal Brand Constitution/);
  assert.match(claudeMd, /systems clarity for CTOs/); // niche filled

  // 12. CONTENT ENGINE — pillars seeds derive deterministically from the constitution.
  r = run("skills/pillars/pillars.js", [SLUG, "--seeds"]);
  assert.equal(r.status, 0, r.stderr);
  const seeds = JSON.parse(r.stdout).seeds;
  assert.ok(seeds.length >= 3, "complete constitution should yield enough pillar seeds");
  assert.ok(seeds.every((s) => s.why_this_person), "every seed traces to the constitution");

  // 13. persist a valid 3-pillar set (consumer of the complete constitution).
  const pillarsDoc = {
    pillars: [
      { name: "Calm systems", thesis: "Scaling pain is org design, not tech debt.",
        why_this_person: "identity.zone_of_genius", serves: "early-stage CTOs",
        formats: ["text"], sample_angles: ["3 org smells that look like tech debt"], weight: 0.4 },
      { name: "The fragile-scale myth", thesis: "Most scale advice makes systems more fragile.",
        why_this_person: "identity.contrarian_pov", serves: "early-stage CTOs",
        formats: ["text"], sample_angles: ["why your on-call rotation is a hiring problem"], weight: 0.35 },
      { name: "Chaos to calm", thesis: "Walk CTOs from scaling chaos to calm systems.",
        why_this_person: "positioning.transformation", serves: "early-stage CTOs",
        formats: ["text"], sample_angles: ["the first system to fix when you hit 20 engineers"], weight: 0.25 },
    ],
    mix_rationale: "Anchor on zone-of-genius + transformation; contrarian for reach.",
  };
  const pillarsPath = resolve(DIR, "content_pillars.json");
  writeFileSync(pillarsPath, JSON.stringify(pillarsDoc));
  r = run("skills/pillars/pillars.js", [SLUG, "--in", pillarsPath]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "content_pillars.json")));
  const savedPillars = JSON.parse(readFileSync(resolve(DIR, "content_pillars.json"), "utf8"));
  assert.equal(savedPillars.pillars.length, 3);
  assert.equal(savedPillars.status, "drafted");
  assert.equal(savedPillars.generated_from, finalProfile.positioning.statement, "pillars trace to the positioning statement");

  // 14. GUARD PROOF — the authenticity moat blocks an off-brand pillar (banned word "synergy").
  const badPillars = JSON.parse(JSON.stringify(pillarsDoc));
  badPillars.pillars[0].sample_angles = ["how to drive synergy across teams"]; // "synergy" is in never_say
  const badPath = resolve(DIR, "bad_pillars.json");
  writeFileSync(badPath, JSON.stringify(badPillars));
  r = run("skills/pillars/pillars.js", [SLUG, "--in", badPath]);
  assert.equal(r.status, 4, "authenticity guard must block off-brand pillars");
  assert.match(r.stderr, /authenticity|synergy/i);

  // 15. CALENDAR — lay out a sustainable posting calendar across the pillars.
  // cadence.weekly_volume is "3 posts/week"; 4 weeks → 12 slots, capped to stated capacity.
  r = run("skills/calendar/calendar.js", [SLUG, "--weeks", "4", "--start", "2026-07-01"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "content_calendar.json")));
  const cal = JSON.parse(readFileSync(resolve(DIR, "content_calendar.json"), "utf8"));
  assert.equal(cal.posts_per_week, 3, "posts/week derived from cadence, not inflated");
  assert.equal(cal.slots.length, 12, "4 weeks × 3 posts/week");
  assert.ok(cal.slots.every((s) => s.date && s.pillar_id && s.platform && s.format && s.angle), "every slot fully specified");
  // All three pillars are represented (range, not one-note).
  assert.equal(new Set(cal.slots.map((s) => s.pillar_id)).size, 3);
  assert.equal(cal.slots[0].platform, "LinkedIn", "uses the constitution's primary platform");

  // 16. GATE PROOF — a fresh persona with NO complete constitution can't get a calendar.
  r = run("skills/calendar/calendar.js", ["nonexistent-persona"]);
  assert.equal(r.status, 3, "calendar must fail-closed without a complete constitution");

  // 17. WRITE — briefs come from the calendar slots and carry the voice contract.
  r = run("skills/write/write.js", [SLUG, "--brief", "--week", "1"]);
  assert.equal(r.status, 0, r.stderr);
  const briefOut = JSON.parse(r.stdout);
  assert.equal(briefOut.briefs.length, 3, "week 1 has 3 slots → 3 briefs");
  assert.ok(briefOut.briefs.every((b) => b.angle && b.voice && b.must_avoid.includes("synergy")),
    "every brief carries its angle, voice, and the banned-word list");

  // Draft posts in-voice from the briefs and persist them (the coach's job; the guard runs on save).
  const draftsDoc = {
    drafts: briefOut.briefs.map((b) => ({
      date: b.date, week: b.week, pillar_id: b.pillar_id, pillar_name: b.pillar_name,
      platform: b.platform, format: b.format, angle: b.angle,
      hook: `Here's the thing about ${b.pillar_name.toLowerCase()}.`,
      body: `A real post on the angle: ${b.angle}. Built on 10 years of building these systems.`,
      cta: "What's your take?",
    })),
  };
  const draftsPath = resolve(DIR, "content_drafts.json");
  writeFileSync(draftsPath, JSON.stringify(draftsDoc));
  r = run("skills/write/write.js", [SLUG, "--in", draftsPath]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "content_drafts.json")));
  const savedDrafts = JSON.parse(readFileSync(resolve(DIR, "content_drafts.json"), "utf8"));
  assert.equal(savedDrafts.status, "drafted");
  assert.equal(savedDrafts.drafts.length, 3);
  assert.equal(savedDrafts.generated_from, finalProfile.positioning.statement, "drafts trace to the positioning statement");
  assert.ok(savedDrafts.drafts.every((d) => d.hook && d.body), "every persisted draft is fully written");

  // 18. GUARD PROOF — the moat blocks a draft that fabricates an authority claim.
  const badDrafts = JSON.parse(JSON.stringify(draftsDoc));
  badDrafts.drafts[0].body = "As a board-certified, award-winning expert, here's my take."; // unsupported claims
  const badDraftsPath = resolve(DIR, "bad_drafts.json");
  writeFileSync(badDraftsPath, JSON.stringify(badDrafts));
  r = run("skills/write/write.js", [SLUG, "--in", badDraftsPath]);
  assert.equal(r.status, 4, "authenticity guard must block fabricated authority claims");
  assert.match(r.stderr, /authenticity|certified|award/i);

  // 19. REPURPOSE — atomize the drafts into channel-native derivatives for the secondary platform.
  // platform_plan.secondary_platforms is ["X"] → each source draft → an X thread.
  r = run("skills/repurpose/repurpose.js", [SLUG, "--plan"]);
  assert.equal(r.status, 0, r.stderr);
  const planOut = JSON.parse(r.stdout);
  assert.deepEqual(planOut.targets, [{ platform: "X", format: "thread" }], "X maps to a thread");
  assert.equal(planOut.plans.length, 3, "one plan per source draft");
  assert.ok(planOut.plans.every((p) => p.source_body && p.must_avoid.includes("synergy")),
    "every plan carries the source post and the banned-word list");

  // Re-cut each derivative in-voice from the plan and persist (the guard runs on save).
  const repurposeDoc = {
    derivatives: planOut.plans.map((p) => ({
      source_date: p.source_date, source_pillar_id: p.source_pillar_id, source_pillar_name: p.source_pillar_name,
      target_platform: p.targets[0].platform, target_format: p.targets[0].format,
      hook: `A thread on ${p.source_pillar_name.toLowerCase()} 🧵`,
      body: `1/ ${p.source_hook}\n2/ The systems take, re-cut for the thread.`,
      cta: "Which have you hit?",
    })),
  };
  const repurposePath = resolve(DIR, "content_repurposes.json");
  writeFileSync(repurposePath, JSON.stringify(repurposeDoc));
  r = run("skills/repurpose/repurpose.js", [SLUG, "--in", repurposePath]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(resolve(DIR, "content_repurposes.json")));
  const savedRep = JSON.parse(readFileSync(resolve(DIR, "content_repurposes.json"), "utf8"));
  assert.equal(savedRep.status, "repurposed");
  assert.equal(savedRep.derivatives.length, 3);
  assert.ok(savedRep.derivatives.every((d) => d.target_platform === "X" && d.target_format === "thread"));
  assert.equal(savedRep.generated_from, finalProfile.positioning.statement, "derivatives trace to the positioning statement");

  // 20. GUARD PROOF — the moat blocks a derivative that reintroduces a banned word.
  const badRep = JSON.parse(JSON.stringify(repurposeDoc));
  badRep.derivatives[0].body = "1/ Let's drive synergy across your teams."; // "synergy" is in never_say
  const badRepPath = resolve(DIR, "bad_repurposes.json");
  writeFileSync(badRepPath, JSON.stringify(badRep));
  r = run("skills/repurpose/repurpose.js", [SLUG, "--in", badRepPath]);
  assert.equal(r.status, 4, "authenticity guard must block a re-cut that reintroduces banned language");
  assert.match(r.stderr, /authenticity|synergy/i);

  // 21. GATE PROOF — a fresh persona with NO complete constitution can't repurpose.
  r = run("skills/repurpose/repurpose.js", ["nonexistent-persona"]);
  assert.equal(r.status, 1, "no mode flag → usage error");
  r = run("skills/repurpose/repurpose.js", ["nonexistent-persona", "--plan"]);
  assert.equal(r.status, 3, "repurpose must fail-closed without a complete constitution");
});
