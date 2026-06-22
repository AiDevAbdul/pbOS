#!/usr/bin/env node
/**
 * /coach-interview companion — the deterministic spine of the Coach Interview.
 *
 * The conversation itself is run by Claude (the coach), one question at a time. This
 * CLI persists answers so the interview can resume, detects the goal archetype to
 * branch the questioning, audits existing content for evidence, and synthesizes the
 * discovery layer (identity + audience + plan + a triangulated SWOT) into the profile.
 *
 * Usage:
 *   node coach-interview.js next <slug>                         # print the next question (JSON)
 *   node coach-interview.js record <slug> --layer L --id ID --q "..." --a "..."
 *   node coach-interview.js detect <slug>                       # detect + persist goal archetype
 *   node coach-interview.js audit-evidence <slug>               # scan voice_samples/ → evidence_signals
 *   node coach-interview.js synthesize <slug> --in discovery.json   # write discovery stage (+ SWOT)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { loadProfile, saveProfile, readClientJson, writeClientJson, clientDir } from "../../scripts/lib/profile.js";
import { interviewAnswers } from "../../schemas/index.js";
import { detectArchetype, nextQuestion, synthesizeSwot } from "../../scripts/lib/interview.js";
import { analyzeSamples, readSamplesDir } from "../../scripts/lib/voice.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function loadAnswers(slug) {
  return interviewAnswers.normalize(readClientJson(slug, "interview_answers.json") || { slug });
}
function saveAnswers(slug, a) {
  return writeClientJson(slug, "interview_answers.json", interviewAnswers.normalize(a));
}

function cmdNext(slug) {
  const a = loadAnswers(slug);
  const q = nextQuestion(a.goal_archetype, a.answers);
  console.log(JSON.stringify(q ? { slug, ...q } : { slug, done: true, note: "all layers covered — run detect (if needed) then synthesize" }, null, 2));
}

function cmdRecord(slug, args) {
  const a = loadAnswers(slug);
  a.answers.push({
    layer: argVal(args, "--layer"),
    question_id: argVal(args, "--id"),
    question: argVal(args, "--q"),
    answer: argVal(args, "--a"),
  });
  const path = saveAnswers(slug, a);
  console.log(JSON.stringify({ slug, recorded: a.answers.length, answers_file: path }, null, 2));
}

function cmdDetect(slug) {
  const a = loadAnswers(slug);
  const text = a.answers.filter((x) => x.layer === "context_intent").map((x) => x.answer).join(" ");
  const det = detectArchetype(text);
  a.goal_archetype = det.archetype;
  a.archetype_confidence = det.confidence;
  saveAnswers(slug, a);
  // mirror to profile (lenient — no stage validation here)
  if (det.archetype) saveProfile(slug, { goal_archetype: det.archetype });
  console.log(JSON.stringify({
    slug, ...det,
    note: det.archetype
      ? "Confirm this archetype aloud with the person before branching — detection is a starting point, not a verdict."
      : "No clear archetype from layer-1 answers yet — ask the context/intent questions first.",
  }, null, 2));
}

function cmdAuditEvidence(slug) {
  const dir = resolve(clientDir(slug), "voice_samples");
  const samples = readSamplesDir(dir);
  const metrics = analyzeSamples(samples);
  // Topics that corroborate self-report = signature n-grams + frequent lexicon.
  const topics = [...metrics.top_ngrams, ...metrics.top_lexicon];
  const a = loadAnswers(slug);
  a.evidence_signals = {
    sample_count: metrics.sample_count,
    topics,
    note: metrics.sample_count
      ? "Derived from existing content; used to corroborate/refute self-reported strengths."
      : "No samples found in voice_samples/ — SWOT will rest on self-report alone (flag lower confidence).",
  };
  saveAnswers(slug, a);
  console.log(JSON.stringify({ slug, sample_count: metrics.sample_count, topics }, null, 2));
}

function cmdSynthesize(slug, args) {
  const inPath = argVal(args, "--in");
  if (!inPath || !existsSync(inPath)) { console.error(`[coach-interview] synthesize needs --in <discovery.json>`); process.exit(2); }
  const discovery = JSON.parse(readFileSync(resolve(inPath), "utf8"));
  const a = loadAnswers(slug);

  // SWOT is synthesized deterministically: claimed strengths are triangulated against
  // evidence topics; unverified claims fall to weaknesses (blind spots).
  const swot = synthesizeSwot({
    claimed_strengths: discovery.claimed_strengths || [],
    evidence_topics: a.evidence_signals?.topics || [],
    self_weaknesses: discovery.self_weaknesses || [],
    audience_gaps: discovery.audience_gaps || [],
    competitor_saturation: discovery.competitor_saturation || [],
    constraints: discovery.constraints || [],
  });

  const patch = {
    goal_archetype: discovery.goal_archetype || a.goal_archetype || loadProfile(slug).goal_archetype,
    status: "discovered",
    identity: discovery.identity || {},
    audience: discovery.audience || {},
    platform_plan: discovery.platform_plan || {},
    cadence: discovery.cadence || {},
    goals_kpis: discovery.goals_kpis || {},
    boundaries: discovery.boundaries || {},
    swot,
  };

  const saved = saveProfile(slug, patch, { stage: "discovery" });
  console.log(JSON.stringify({
    skill: "coach-interview",
    slug,
    goal_archetype: saved.goal_archetype,
    swot,
    next: "run /positioning {slug} — synthesize positioning, then the human approves it (the first gate).",
  }, null, 2));
}

function main() {
  const [cmd, slug, ...rest] = process.argv.slice(2);
  if (!cmd || !slug) {
    console.error("Usage: node coach-interview.js <next|record|detect|audit-evidence|synthesize> <slug> [...]");
    process.exit(1);
  }
  switch (cmd) {
    case "next": return cmdNext(slug);
    case "record": return cmdRecord(slug, rest);
    case "detect": return cmdDetect(slug);
    case "audit-evidence": return cmdAuditEvidence(slug);
    case "synthesize": return cmdSynthesize(slug, rest);
    default: console.error(`Unknown command: ${cmd}`); process.exit(1);
  }
}

main();
