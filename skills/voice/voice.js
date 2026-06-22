#!/usr/bin/env node
/**
 * /voice companion — captures the person's voice and stamps GATE 2.
 *
 * `analyze` runs offline heuristics over clients/<slug>/voice_samples/ (or an elicited
 * transcript) and prints metrics for Claude to author the qualitative voice fields.
 * `--in voice.json` merges the voice layer into the profile (stage "voice" — which
 * fail-closed REQUIRES positioning already approved) and writes voice_profile.json,
 * whose lexicon_dont becomes the authenticity guard's avoid-list. `--approve-voice`
 * stamps GATE 2 after the person confirms it sounds like them.
 *
 * Usage:
 *   node voice.js analyze <slug>                 # offline metrics from voice_samples/ (JSON)
 *   node voice.js <slug> --in voice.json         # merge voice layer (needs GATE 1) + write voice_profile.json
 *   node voice.js <slug> --approve-voice         # stamp GATE 2 (human only)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { loadProfile, saveProfile, stampGate, writeClientJson, clientDir } from "../../scripts/lib/profile.js";
import { voiceProfile } from "../../schemas/index.js";
import { analyzeSamples, readSamplesDir } from "../../scripts/lib/voice.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === "analyze") {
    const slug = argv[1];
    if (!slug) { console.error("Usage: node voice.js analyze <slug>"); process.exit(1); }
    const samples = readSamplesDir(resolve(clientDir(slug), "voice_samples"));
    const metrics = analyzeSamples(samples);
    console.log(JSON.stringify({
      skill: "voice", mode: "analyze", slug, metrics,
      note: samples.length
        ? "Author the qualitative voice fields (tone, signatures, lexicon_do/dont, sentence_rhythm) from these metrics + the raw samples, then run --in voice.json."
        : "No samples in voice_samples/. Elicit voice live (have them talk for 2 min, transcribe) before authoring the voice layer.",
    }, null, 2));
    return;
  }

  const [slug, ...rest] = argv;
  if (!slug) { console.error("Usage: node voice.js <slug> [--in voice.json | --approve-voice] | analyze <slug>"); process.exit(1); }

  if (rest.includes("--approve-voice")) {
    const p = loadProfile(slug);
    if (!p.voice?.tone || !p.voice.tone.trim()) {
      console.error("[voice] refuse to approve: voice.tone is empty. Run --in voice.json first.");
      process.exit(3);
    }
    const saved = stampGate(slug, "voice");
    console.log(JSON.stringify({
      skill: "voice", slug, gate: "voice_approved_at",
      approved_at: saved.voice.voice_approved_at, status: saved.status,
      next: "run /constitution {slug} — assemble the per-person CLAUDE.md + brand-of-one HTML/PDF (requires BOTH gates).",
    }, null, 2));
    return;
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[voice] pass --in voice.json or --approve-voice, or use: analyze <slug>"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[voice] input not found: ${inPath}`); process.exit(2); }
  const voice = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  // Merge into the profile's voice layer — stage "voice" fails closed if GATE 1 (positioning) isn't stamped.
  const saved = saveProfile(slug, { voice, status: "voice_drafted" }, { stage: "voice" });

  // Also persist the standalone voice_profile.json (the authenticity guard's source).
  const vp = voiceProfile.normalize({ slug, ...voice });
  writeClientJson(slug, "voice_profile.json", vp);

  console.log(JSON.stringify({
    skill: "voice", slug, tone: saved.voice.tone,
    lexicon_dont: saved.voice.lexicon_dont,
    note: "Confirm with the person that this sounds like them. Do NOT proceed until they approve, then run --approve-voice.",
  }, null, 2));
}

main();
