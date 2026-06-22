#!/usr/bin/env node
/**
 * /constitution companion — assembles the per-person operating constitution.
 *
 * This is the payoff of the whole pipeline: a per-person CLAUDE.md that every future
 * pbOS skill loads to specialize its output to THIS individual, plus a shareable
 * "brand-of-one" HTML/PDF. It validates the profile at stage "complete" — which
 * fail-closed requires BOTH human gates (positioning + voice) — so a constitution can
 * never be produced from an unapproved identity.
 *
 * Usage:
 *   node constitution.js <slug>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { loadProfile, saveProfile, clientDir, ROOT } from "../../scripts/lib/profile.js";
import { personalBrandProfile } from "../../schemas/index.js";
import { writeHtmlAndPdf } from "../../scripts/lib/md_to_html.js";

loadEnv();

const TODAY = () => new Date().toISOString().slice(0, 10);
const list = (arr) => (arr && arr.length ? arr.join(", ") : "");
const bullets = (arr) => (arr && arr.length ? arr.map((x) => `- ${x}`).join("\n") : "- _none recorded_");

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null || v === "") return `_${k.toLowerCase()}_TBD_`;
    if (Array.isArray(v)) return v.length ? v.join(", ") : `_${k.toLowerCase()}_TBD_`;
    return String(v);
  });
}

function buildVars(p) {
  return {
    CLIENT_NAME: p.name || p.client_slug,
    CLIENT_SLUG: p.client_slug,
    GENERATED_DATE: TODAY(),
    GOAL_ARCHETYPE: p.goal_archetype,
    ORIGIN_STORY: p.identity.origin_story,
    VALUES: list(p.identity.values),
    ZONE_OF_GENIUS: p.identity.zone_of_genius,
    CONTRARIAN_POV: p.identity.contrarian_pov,
    CREDENTIALS: list(p.identity.credentials),
    POSITIONING_STATEMENT: p.positioning.statement,
    NICHE: p.positioning.niche,
    POS_AUDIENCE: p.positioning.audience,
    TRANSFORMATION: p.positioning.transformation,
    CATEGORY_OF_ONE: p.positioning.category_of_one,
    AUD_WHO: p.audience.who,
    AUD_PAINS: bullets(p.audience.pains),
    AUD_DESIRES: bullets(p.audience.desires),
    VOICE_TONE: p.voice.tone,
    VOICE_SIGNATURES: list(p.voice.signatures),
    LEXICON_DO: list(p.voice.lexicon_do),
    LEXICON_DONT: list(p.voice.lexicon_dont),
    SENTENCE_RHYTHM: p.voice.sentence_rhythm,
    PRIMARY_PLATFORM: p.platform_plan.primary_platform,
    SECONDARY_PLATFORMS: list(p.platform_plan.secondary_platforms),
    PLATFORM_RATIONALE: p.platform_plan.rationale,
    WEEKLY_VOLUME: p.cadence.weekly_volume,
    FORMATS: list(p.cadence.formats),
    TIME_BUDGET: p.cadence.time_budget_hours,
    CADENCE_NOTE: p.cadence.sustainability_note,
    PRIMARY_GOAL: p.goals_kpis.primary_goal,
    KPIS: list(p.goals_kpis.kpis),
    HORIZON: p.goals_kpis.horizon,
    SWOT_STRENGTHS: bullets(p.swot.strengths),
    SWOT_WEAKNESSES: bullets(p.swot.weaknesses),
    SWOT_OPPORTUNITIES: bullets(p.swot.opportunities),
    SWOT_THREATS: bullets(p.swot.threats),
    NEVER_SAY: list(p.boundaries.never_say),
    NO_GO_TOPICS: list(p.boundaries.no_go_topics),
  };
}

function main() {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: node constitution.js <slug>"); process.exit(1); }

  const profile = loadProfile(slug);
  const v = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!v.ok) {
    console.error("[constitution] BLOCKED — profile is not complete (both gates + all layers required):");
    for (const e of v.errors) console.error(`  - ${e}`);
    process.exit(3);
  }

  const tplPath = resolve(ROOT, "templates", "person-claude.md");
  const md = fillTemplate(readFileSync(tplPath, "utf8"), buildVars(profile));

  const claudePath = resolve(clientDir(slug), "CLAUDE.md");
  writeFileSync(claudePath, md);

  // Shareable brand-of-one doc (HTML always; PDF best-effort).
  const constitutionMdPath = resolve(clientDir(slug), "constitution.md");
  writeFileSync(constitutionMdPath, md);
  const { htmlPath, pdfPath, pdfOk } = writeHtmlAndPdf(constitutionMdPath, md, {
    title: `${profile.name || slug} — Brand of One`,
    subtitle: `pbOS personal brand constitution · ${TODAY()}`,
  });

  saveProfile(slug, { status: "complete" }, { stage: "complete" });

  console.log(JSON.stringify({
    skill: "constitution", slug, status: "complete",
    claude_md_path: claudePath, html_path: htmlPath,
    pdf_path: pdfOk ? pdfPath : null, pdf_ok: pdfOk,
    note: "This CLAUDE.md is the per-person constitution every downstream pbOS skill will load. Foundation phase complete.",
  }, null, 2));
}

main();
