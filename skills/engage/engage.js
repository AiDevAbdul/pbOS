#!/usr/bin/env node
/**
 * /engage companion — the two-way half of a personal brand.
 *
 * Phase-3 step 2. Three modes:
 *   --strategy                  → print the engagement posture derived from the constitution
 *                                 (daily budget, who to focus on, proactive ratio, tone).
 *   --brief --inbound items.json → print a reply BRIEF per inbound item (the inbound text +
 *                                 the voice contract). The coach drafts each reply in-voice FROM these.
 *   --in engagement_log.json    → validate + guard + persist the strategy + coach-authored replies.
 *
 * As in /write, pbOS never fabricates the reply from a template — putting words in someone's
 * mouth is the one thing the Constitution forbids most plainly. The spine plans; the human/coach
 * replies; the Authenticity Guard enforces. Persistence is fail-closed: profile must be
 * "complete" (approved voice), the set must validate, and every response must clear the guard.
 *
 * Engagement is NOT a human gate.
 *
 * Usage:
 *   node engage.js <slug> --strategy
 *   node engage.js <slug> --brief --inbound items.json [--limit N]
 *   node engage.js <slug> --in engagement_log.json
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { strategyFor, briefsFor, saveEngagement, engagePath } from "../../scripts/lib/engage.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function intFlag(args, flag) { const v = argVal(args, flag); return v != null ? parseInt(v, 10) : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node engage.js <slug> [--strategy | --brief --inbound items.json | --in engagement_log.json] [--limit N]"); process.exit(1); }

  const limit = intFlag(rest, "--limit");

  if (rest.includes("--strategy")) {
    try {
      const { strategy } = strategyFor(slug);
      console.log(JSON.stringify({
        skill: "engage", slug, mode: "strategy", strategy,
        note: "Hold this posture daily. Engagement compounds: a brand grows in the replies as much as the posts.",
      }, null, 2));
      return;
    } catch (e) { routeError(e); }
  }

  if (rest.includes("--brief")) {
    const inPath = argVal(rest, "--inbound");
    if (!inPath) { console.error("[engage] --brief needs --inbound items.json (the comments/DMs/mentions to reply to)"); process.exit(1); }
    if (!existsSync(inPath)) { console.error(`[engage] inbound file not found: ${inPath}`); process.exit(2); }
    const inbound = JSON.parse(readFileSync(resolve(inPath), "utf8"));
    try {
      const { briefs } = briefsFor(slug, inbound, { limit });
      console.log(JSON.stringify({
        skill: "engage", slug, mode: "brief", count: briefs.length, briefs,
        note: "Draft each reply in-voice from its brief (honor must_avoid + no_go_topics), then persist with --in. The guard runs on save.",
      }, null, 2));
      return;
    } catch (e) { routeError(e); }
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[engage] pass --strategy, --brief --inbound items.json, or --in engagement_log.json"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[engage] input not found: ${inPath}`); process.exit(2); }
  const engageDoc = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  try {
    const saved = saveEngagement(slug, engageDoc);
    console.log(JSON.stringify({
      skill: "engage", slug, status: saved.status,
      count: saved.interactions.length,
      interactions: saved.interactions.map((it) => ({ kind: it.kind, platform: it.platform, inbound: it.inbound_text, response: it.response })),
      path: engagePath(slug),
      next: "/authority turns the relationships engagement builds into authority signals; /review measures the loop.",
    }, null, 2));
  } catch (e) { routeError(e); }
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[engage] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.blocked) { // GuardError from the authenticity moat
    console.error(`[engage] BLOCKED by authenticity guard — ${e.message}`);
    process.exit(4);
  }
  if (e.code === "SCHEMA") { console.error(`[engage] ${e.message}`); process.exit(5); }
  throw e;
}

main();
