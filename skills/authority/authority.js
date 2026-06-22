#!/usr/bin/env node
/**
 * /authority companion — track earned authority signals + plan the ones to pursue.
 *
 * Phase-3 step 3. Authority signals ARE pbOS's organic-first KPIs (Constitution principle 6):
 * talks, features, podcasts, mentions, awards, collaborations, inbound. Two modes:
 *   --plan  → print authority TARGETS (outlet category + pitch angle) derived from the
 *             constitution, each grounded_in a real identity fact. The coach refines these
 *             with the person and adds specific outlets.
 *   --in    → validate + guard + persist the ledger (authority_ledger.json): earned signals
 *             (the record) + chosen targets (the plan).
 *
 * Persistence is fail-closed: profile must be "complete", the ledger must validate, and every
 * pitch angle + signal title clears the Authenticity Guard — a pitch ships in the person's name,
 * and pbOS never fabricates a credential to make it land.
 *
 * Authority is NOT a human gate.
 *
 * Usage:
 *   node authority.js <slug> --plan
 *   node authority.js <slug> --in authority_ledger.json
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { targetsFor, saveAuthority, authorityPath, summarizeSignals } from "../../scripts/lib/authority.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node authority.js <slug> [--plan | --in authority_ledger.json]"); process.exit(1); }

  if (rest.includes("--plan")) {
    try {
      const { targets } = targetsFor(slug);
      console.log(JSON.stringify({
        skill: "authority", slug, mode: "plan", target_count: targets.length, targets,
        note: "Refine these WITH the person, add specific outlets, then persist with --in. Every pitch is grounded_in a real credential — keep it that way.",
      }, null, 2));
      return;
    } catch (e) { routeError(e); }
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[authority] pass --plan or --in authority_ledger.json"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[authority] input not found: ${inPath}`); process.exit(2); }
  const ledgerDoc = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  try {
    const saved = saveAuthority(slug, ledgerDoc);
    console.log(JSON.stringify({
      skill: "authority", slug, status: saved.status,
      signals: summarizeSignals(saved.signals),
      target_count: saved.targets.length,
      targets: saved.targets.map((t) => ({ kind: t.kind, outlet: t.outlet_category, status: t.status })),
      path: authorityPath(slug),
      next: "/review reads this ledger to score authority over time — the organic-first scoreboard.",
    }, null, 2));
  } catch (e) { routeError(e); }
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[authority] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.blocked) { // GuardError from the authenticity moat
    console.error(`[authority] BLOCKED by authenticity guard — ${e.message}`);
    process.exit(4);
  }
  if (e.code === "SCHEMA") { console.error(`[authority] ${e.message}`); process.exit(5); }
  throw e;
}

main();
