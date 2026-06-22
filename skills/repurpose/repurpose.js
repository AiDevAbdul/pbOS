#!/usr/bin/env node
/**
 * /repurpose companion — atomizes drafted posts into channel-native derivatives.
 *
 * Content-engine step 4, after /write. Two modes:
 *   --plan  → print a repurposing PLAN per source draft (the source post + the target channels
 *             + the voice constraints). The coach re-cuts each derivative in-voice FROM these.
 *   --in    → validate + guard + persist the coach-authored derivatives (content_repurposes.json).
 *
 * As in /write, pbOS never fabricates the re-cut prose from a template — a derivative ships in
 * the person's name. The spine plans the channels; the human/coach re-cuts; the Authenticity
 * Guard enforces. Persistence is fail-closed: profile must be "complete" (approved voice), the
 * drafts must exist, there must be a target channel, the set must validate, and every
 * derivative must clear the guard.
 *
 * Repurposes are NOT a human gate. They are a deliverable the distribution skills read.
 *
 * Usage:
 *   node repurpose.js <slug> --plan [--limit N]            # plans for the coach to re-cut from
 *   node repurpose.js <slug> --in content_repurposes.json  # validate + guard + persist
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { plansFor, saveRepurposes, repurposePath } from "../../scripts/lib/repurpose.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function intFlag(args, flag) { const v = argVal(args, flag); return v != null ? parseInt(v, 10) : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node repurpose.js <slug> [--plan | --in content_repurposes.json] [--limit N]"); process.exit(1); }

  const limit = intFlag(rest, "--limit");

  if (rest.includes("--plan")) {
    try {
      const { plans, targets } = plansFor(slug, { limit });
      console.log(JSON.stringify({
        skill: "repurpose", slug, mode: "plan",
        targets, source_count: plans.length, plans,
        note: "Re-cut each source post for every target channel in-voice (honor must_avoid + no_go_topics), then persist with --in. The guard runs on save.",
      }, null, 2));
      return;
    } catch (e) {
      routeError(e);
    }
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[repurpose] pass --plan or --in content_repurposes.json"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[repurpose] input not found: ${inPath}`); process.exit(2); }
  const repurposeDoc = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  try {
    const saved = saveRepurposes(slug, repurposeDoc);
    console.log(JSON.stringify({
      skill: "repurpose", slug, status: saved.status,
      count: saved.derivatives.length,
      derivatives: saved.derivatives.map((d) => ({ source: d.source_date, target: `${d.target_platform}/${d.target_format}`, hook: d.hook })),
      path: repurposePath(slug),
      next: "the content engine is complete — distribution/engagement/authority phases come next.",
    }, null, 2));
  } catch (e) {
    routeError(e);
  }
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[repurpose] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.code === "DRAFTS_MISSING" || e.code === "NO_TARGETS") { console.error(`[repurpose] BLOCKED — ${e.message}`); process.exit(3); }
  if (e.blocked) { // GuardError from the authenticity moat
    console.error(`[repurpose] BLOCKED by authenticity guard — ${e.message}`);
    process.exit(4);
  }
  if (e.code === "SCHEMA") { console.error(`[repurpose] ${e.message}`); process.exit(5); }
  throw e;
}

main();
