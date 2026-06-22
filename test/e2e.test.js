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
});
