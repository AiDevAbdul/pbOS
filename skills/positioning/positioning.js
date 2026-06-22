#!/usr/bin/env node
/**
 * /positioning companion — persists the positioning layer and stamps GATE 1.
 *
 * Claude synthesizes positioning FROM the discovery layer (never blank-page), writes
 * positioning.json, and presents the positioning statement to the person. The human
 * alone approves — only then does --approve-positioning stamp the gate that unblocks
 * /voice. The AI never self-clears it. (Mirrors smOS brand-strategy.js.)
 *
 * Usage:
 *   node positioning.js <slug> --in positioning.json     # merge + validate the positioning layer
 *   node positioning.js <slug> --approve-positioning     # stamp GATE 1 (human only)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { loadProfile, saveProfile, stampGate } from "../../scripts/lib/profile.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node positioning.js <slug> [--in positioning.json | --approve-positioning]"); process.exit(1); }

  if (rest.includes("--approve-positioning")) {
    const p = loadProfile(slug);
    if (!p.positioning?.statement || !p.positioning.statement.trim()) {
      console.error("[positioning] refuse to approve: positioning.statement is empty. Run --in positioning.json first.");
      process.exit(3);
    }
    const saved = stampGate(slug, "positioning");
    console.log(JSON.stringify({
      skill: "positioning", slug, gate: "positioning_approved_at",
      approved_at: saved.positioning.positioning_approved_at, status: saved.status,
      next: "run /voice {slug} — capture the person's voice, then the human approves it (the second gate).",
    }, null, 2));
    return;
  }

  const inPath = argVal(rest, "--in");
  if (!inPath) { console.error("[positioning] pass --in positioning.json or --approve-positioning"); process.exit(1); }
  if (!existsSync(inPath)) { console.error(`[positioning] input not found: ${inPath}`); process.exit(2); }
  const positioning = JSON.parse(readFileSync(resolve(inPath), "utf8"));

  const saved = saveProfile(slug, { positioning, status: "positioning_drafted" }, { stage: "positioning" });
  console.log(JSON.stringify({
    skill: "positioning", slug, statement: saved.positioning.statement,
    note: "Present this positioning statement to the person. Do NOT proceed to /voice until they explicitly approve, then run --approve-positioning.",
  }, null, 2));
}

main();
