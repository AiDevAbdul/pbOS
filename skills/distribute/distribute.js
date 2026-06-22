#!/usr/bin/env node
/**
 * /distribute companion — assembles authored content into a dated, publish-ready queue.
 *
 * Phase-3 step 1, after /write + /repurpose. Distribution does NOT author anything — the
 * posts already exist and were already guarded. It MERGES the primary-platform drafts and the
 * secondary-platform derivatives into one ordered, dated publish queue (distribution_queue.json),
 * and emits a human-publishable Markdown/HTML/PDF checklist. pbOS is organic-first and the human
 * owns their reputation, so it never auto-posts to an external API.
 *
 * Assembly is fail-closed: the profile must validate at stage "complete" (the approved voice),
 * the drafts must exist + validate, the queue must pass the schema, and every item is re-run
 * through the Authenticity Guard before it persists. Derivatives are folded in when present.
 *
 * Usage:
 *   node distribute.js <slug> [--offset N] [--report]
 *     --offset N   days a derivative lands after its source post (default 1)
 *     --report     also write a publish-ready Markdown + HTML/PDF checklist
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { generateQueue, queuePath, queueToMarkdown } from "../../scripts/lib/distribute.js";
import { loadProfile, clientDir } from "../../scripts/lib/profile.js";
import { writeHtmlAndPdf } from "../../scripts/lib/md_to_html.js";

loadEnv();

const TODAY = () => new Date().toISOString().slice(0, 10);
function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function intFlag(args, flag) { const v = argVal(args, flag); return v != null ? parseInt(v, 10) : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node distribute.js <slug> [--offset N] [--report]"); process.exit(1); }

  const offsetDays = intFlag(rest, "--offset") ?? 1;

  let doc;
  try {
    doc = generateQueue(slug, { offsetDays });
  } catch (e) {
    routeError(e);
  }

  let reportPaths = null;
  if (rest.includes("--report")) {
    const profile = loadProfile(slug);
    const md = queueToMarkdown(doc, profile);
    const mdPath = resolve(clientDir(slug), "distribution_queue.md");
    writeFileSync(mdPath, md);
    const { htmlPath, pdfPath, pdfOk } = writeHtmlAndPdf(mdPath, md, {
      title: `${profile.name || slug} — Publish Queue`,
      subtitle: `pbOS distribution plan · ${TODAY()}`,
    });
    reportPaths = { md_path: mdPath, html_path: htmlPath, pdf_path: pdfOk ? pdfPath : null, pdf_ok: pdfOk };
  }

  console.log(JSON.stringify({
    skill: "distribute", slug, status: doc.status,
    count: doc.items.length,
    start_date: doc.start_date,
    items: doc.items.map((it) => ({ when: it.scheduled_at, platform: it.platform, format: it.format, kind: it.source_kind, hook: it.hook })),
    path: queuePath(slug),
    report: reportPaths,
    next: "Publish each item on its date and mark it published. /engage works the conversations the posts start; /review measures the loop.",
  }, null, 2));
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[distribute] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.code === "DRAFTS_MISSING") { console.error(`[distribute] BLOCKED — ${e.message}`); process.exit(3); }
  if (e.blocked) { // GuardError from the authenticity moat
    console.error(`[distribute] BLOCKED by authenticity guard — ${e.message}`);
    process.exit(4);
  }
  if (e.code === "SCHEMA") { console.error(`[distribute] ${e.message}`); process.exit(5); }
  throw e;
}

main();
