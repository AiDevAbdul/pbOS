#!/usr/bin/env node
/**
 * /pillars companion — synthesizes and persists a person's content pillars.
 *
 * This is the first step of the content engine and the first CONSUMER of the finished
 * constitution. The coach drafts 3–5 pillars FROM the constitution (never blank-page),
 * each tracing to a real fact about the person (why_this_person). Persistence is
 * fail-closed twice: the profile must be "complete" (both human gates), and every pillar
 * must clear the Authenticity Guard — making /pillars the first skill to enforce the moat.
 *
 * Pillars are NOT a human gate (positioning + voice are the only two). They are a
 * deliverable the calendar/write/repurpose skills will read.
 *
 * Usage:
 *   node pillars.js <slug> --seeds                 # print deterministic seeds from the constitution
 *   node pillars.js <slug> --in content_pillars.json   # validate + guard + persist
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { suggestPillarSeeds, savePillars, pillarsPath } from "../../scripts/lib/pillars.js";
import { loadProfile } from "../../scripts/lib/profile.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node pillars.js <slug> [--seeds | --in content_pillars.json]"); process.exit(1); }

  if (rest.includes("--seeds")) {
    const seeds = suggestPillarSeeds(loadProfile(slug));
    console.log(JSON.stringify({
      skill: "pillars", slug, seeds,
      note: "These are deterministic SEEDS from the constitution — refine them WITH the person to 3–5 final pillars, then persist with --in.",
    }, null, 2));
    return;
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[pillars] pass --seeds or --in content_pillars.json"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[pillars] input not found: ${inPath}`); process.exit(2); }
  const pillarsDoc = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  try {
    const saved = savePillars(slug, pillarsDoc);
    console.log(JSON.stringify({
      skill: "pillars", slug, status: saved.status,
      count: saved.pillars.length,
      pillars: saved.pillars.map((p) => ({ id: p.id, name: p.name })),
      path: pillarsPath(slug),
      next: "run /calendar {slug} — slot a sustainable posting calendar across these pillars (next content step).",
    }, null, 2));
  } catch (e) {
    if (e.code === "PROFILE_INCOMPLETE") {
      console.error(`[pillars] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
      process.exit(3);
    }
    if (e.blocked) { // GuardError from the authenticity moat
      console.error(`[pillars] BLOCKED by authenticity guard — ${e.message}`);
      process.exit(4);
    }
    if (e.code === "SCHEMA") { console.error(`[pillars] ${e.message}`); process.exit(5); }
    throw e;
  }
}

main();
