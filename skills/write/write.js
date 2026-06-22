#!/usr/bin/env node
/**
 * /write companion — drafts posts into the calendar's slots, in the person's CAPTURED VOICE.
 *
 * Content-engine step 3, after /calendar. Two modes:
 *   --brief  → print a writing BRIEF per calendar slot (the angle + the voice constraints +
 *              the must-avoid list). The coach drafts the actual post in-voice FROM these.
 *   --in     → validate + guard + persist the coach-authored drafts (content_drafts.json).
 *
 * pbOS never fabricates post prose from a template — that would put words in the person's
 * mouth (Constitution). The spine briefs; the human/coach writes; the Authenticity Guard
 * enforces. Persistence is fail-closed: profile must be "complete" (both gates — an APPROVED
 * voice is the point), the draft set must validate, and every draft must clear the guard.
 *
 * Drafts are NOT a human gate. They are a deliverable the /repurpose + distribution skills read.
 *
 * Usage:
 *   node write.js <slug> --brief [--week N] [--limit N]   # briefs for the coach to draft from
 *   node write.js <slug> --in content_drafts.json         # validate + guard + persist
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { briefsFor, saveDrafts, draftsPath } from "../../scripts/lib/write.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function intFlag(args, flag) { const v = argVal(args, flag); return v != null ? parseInt(v, 10) : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node write.js <slug> [--brief | --in content_drafts.json] [--week N] [--limit N]"); process.exit(1); }

  const week = intFlag(rest, "--week");
  const limit = intFlag(rest, "--limit");

  if (rest.includes("--brief")) {
    try {
      const { briefs } = briefsFor(slug, { week, limit });
      console.log(JSON.stringify({
        skill: "write", slug, mode: "brief", count: briefs.length, briefs,
        note: "Draft each post in-voice FROM these briefs (honor must_avoid + no_go_topics), then persist with --in. The guard runs on save.",
      }, null, 2));
      return;
    } catch (e) {
      routeError(e);
    }
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[write] pass --brief or --in content_drafts.json"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[write] input not found: ${inPath}`); process.exit(2); }
  const draftsDoc = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  try {
    const saved = saveDrafts(slug, draftsDoc);
    console.log(JSON.stringify({
      skill: "write", slug, status: saved.status,
      count: saved.drafts.length,
      drafts: saved.drafts.map((d) => ({ date: d.date, pillar: d.pillar_name, hook: d.hook })),
      path: draftsPath(slug),
      next: "run /repurpose {slug} — atomize each post across formats/platforms (next content step).",
    }, null, 2));
  } catch (e) {
    routeError(e);
  }
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[write] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.code === "CALENDAR_MISSING") { console.error(`[write] BLOCKED — ${e.message}`); process.exit(3); }
  if (e.blocked) { // GuardError from the authenticity moat
    console.error(`[write] BLOCKED by authenticity guard — ${e.message}`);
    process.exit(4);
  }
  if (e.code === "SCHEMA") { console.error(`[write] ${e.message}`); process.exit(5); }
  throw e;
}

main();
