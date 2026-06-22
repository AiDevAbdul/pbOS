#!/usr/bin/env node
/**
 * /review companion — the brand-health review (Phase-3 step 4, the capstone).
 *
 * Reads EVERYTHING the pipeline produced (constitution + pillars + calendar + drafts +
 * repurposes + engagement + authority) and reports on brand health the organic-first way:
 * deterministic metrics, findings with severities, and a single 0–100 score. Each finding
 * carries a recommendation that ROUTES BACK to the skill that owns the fix.
 *
 * Review never edits identity — it cannot touch positioning or voice (the two human gates). It
 * observes and recommends; the human acts through the owning skill. Fail-closed: the profile
 * must validate at stage "complete"; every other artifact is optional (its absence is a finding).
 *
 * Usage:
 *   node review.js <slug> [--report]
 *     --report   also write a shareable Markdown + HTML/PDF report
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { reviewFor, saveReview, reviewPath, reviewToMarkdown } from "../../scripts/lib/review.js";
import { clientDir } from "../../scripts/lib/profile.js";
import { writeHtmlAndPdf } from "../../scripts/lib/md_to_html.js";

loadEnv();

const TODAY = () => new Date().toISOString().slice(0, 10);

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node review.js <slug> [--report]"); process.exit(1); }

  let result, doc;
  try {
    result = reviewFor(slug);
    doc = saveReview(slug, { ...result, generatedAt: TODAY() });
  } catch (e) {
    routeError(e);
  }

  let reportPaths = null;
  if (rest.includes("--report")) {
    const md = reviewToMarkdown(doc, result.profile);
    const mdPath = resolve(clientDir(slug), "brand_health_review.md");
    writeFileSync(mdPath, md);
    const { htmlPath, pdfPath, pdfOk } = writeHtmlAndPdf(mdPath, md, {
      title: `${result.profile.name || slug} — Brand-Health Review`,
      subtitle: `pbOS review · ${TODAY()} · ${doc.score}/100`,
    });
    reportPaths = { md_path: mdPath, html_path: htmlPath, pdf_path: pdfOk ? pdfPath : null, pdf_ok: pdfOk };
  }

  console.log(JSON.stringify({
    skill: "review", slug, status: doc.status,
    score: doc.score,
    metrics: doc.metrics,
    findings: doc.findings.map((f) => ({ area: f.area, severity: f.severity, route_to: f.route_to, observation: f.observation })),
    path: reviewPath(slug),
    report: reportPaths,
    note: "Recommendations route to the owning skill. pbOS never edits positioning or voice — those are the human gates.",
  }, null, 2));
}

function routeError(e) {
  if (e.code === "PROFILE_INCOMPLETE") {
    console.error(`[review] BLOCKED — ${e.message}\nFix via /positioning and /voice (the human gates), then /constitution.`);
    process.exit(3);
  }
  if (e.code === "SCHEMA") { console.error(`[review] ${e.message}`); process.exit(5); }
  throw e;
}

main();
