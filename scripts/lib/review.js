// scripts/lib/review.js — the brand-health review engine (Phase-3 step 4, the capstone).
//
// /review reads EVERYTHING the pipeline produced and reports on the brand's health the
// organic-first way. The spine is pure and deterministic so the same artifacts always yield
// the same report (and it's testable):
//   - pillarCoverage()  → actual calendar slot distribution vs each pillar's target weight.
//   - computeHealth()   → PURE. Take the loaded artifacts and emit { metrics, findings, score }.
//     Each finding carries a severity (ok | watch | risk), an observation, a recommendation,
//     and the skill it ROUTES BACK to. The score is a deterministic roll-up.
//   - reviewFor()  → fail-closed load (profile must be "complete"); every other artifact is
//     OPTIONAL — its absence becomes a finding, never a crash.
//   - saveReview / reviewToMarkdown  → persist clients/<slug>/brand_health_review.json + render
//     the shareable report.
//
// Review NEVER edits identity. It cannot touch positioning or voice (the two human gates) — it
// observes and recommends, and the human acts through the owning skill. The gates stay load-
// bearing even here. (No Authenticity Guard call: review authors no content that ships in the
// person's name — it is internal analysis.)

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { brandHealthReview, contentPillars, contentCalendar, contentDraft, contentRepurpose, engagementLog, authorityLedger, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";
import { loadPillars } from "./pillars.js";
import { loadCalendar, parseWeeklyVolume } from "./calendar.js";
import { loadDrafts } from "./write.js";
import { loadRepurposes } from "./repurpose.js";
import { loadEngagement } from "./engage.js";
import { loadAuthority } from "./authority.js";
import { summarizeSignals } from "./authority.js";

const REVIEW_FILE = "brand_health_review.json";

export function reviewPath(slug) {
  return clientFile(slug, REVIEW_FILE);
}

/** Severity → points docked from a perfect 100. Deterministic. */
const PENALTY = { risk: 20, watch: 8, ok: 0 };

/**
 * Actual share of calendar slots per pillar vs each pillar's target weight. Pure. Returns
 * [{ pillar_id, name, target, actual, drift }] and the max absolute drift.
 */
export function pillarCoverage(pillars, calendar) {
  const ps = Array.isArray(pillars?.pillars) ? pillars.pillars : [];
  const slots = Array.isArray(calendar?.slots) ? calendar.slots : [];
  const totalWeight = ps.reduce((a, p) => a + (Number(p.weight) > 0 ? Number(p.weight) : 1), 0) || 1;
  const counts = {};
  for (const s of slots) counts[s.pillar_id] = (counts[s.pillar_id] || 0) + 1;
  const n = slots.length || 1;
  let maxDrift = 0;
  const rows = ps.map((p) => {
    const target = (Number(p.weight) > 0 ? Number(p.weight) : 1) / totalWeight;
    const actual = (counts[p.id] || 0) / n;
    const drift = Math.abs(actual - target);
    if (drift > maxDrift) maxDrift = drift;
    return { pillar_id: p.id, name: p.name, target: round(target), actual: round(actual), drift: round(drift) };
  });
  return { rows, maxDrift: round(maxDrift) };
}

function round(x) { return Math.round(x * 100) / 100; }

/**
 * Compute the brand-health report from the loaded artifacts. PURE: same inputs → same output.
 * `present` flags which optional artifacts actually exist + validate. Returns { metrics,
 * findings, score }.
 */
export function computeHealth({ profile, pillars, calendar, drafts, repurposes, engagement, authority, present = {} }) {
  const p = personalBrandProfile.normalize(profile || {});
  const findings = [];
  const add = (area, severity, observation, recommendation, route_to) =>
    findings.push({ area, severity, observation, recommendation, route_to });

  const slotCount = present.calendar ? (calendar.slots?.length || 0) : 0;
  const draftCount = present.drafts ? (drafts.drafts?.length || 0) : 0;
  const derivativeCount = present.repurposes ? (repurposes.derivatives?.length || 0) : 0;
  const queueCount = 0; // distribution presence is reported separately below
  const interactionCount = present.engagement ? (engagement.interactions?.length || 0) : 0;
  const signalSummary = present.authority ? summarizeSignals(authority.signals) : { total: 0, by_type: {} };
  const secondaryCount = (p.platform_plan.secondary_platforms || []).length;

  // 1. Pillars exist?
  if (!present.pillars || !(pillars.pillars?.length)) {
    add("pillars", "risk", "No content pillars defined — the content engine has no spine.", "Synthesize 3–5 pillars.", "/pillars");
  } else {
    add("pillars", "ok", `${pillars.pillars.length} content pillars defined.`, "Keep posts traceable to a pillar.", "/pillars");
  }

  // 2. Pillar coverage vs weights (only meaningful when both pillars + calendar exist).
  let coverage = { rows: [], maxDrift: 0 };
  if (present.pillars && present.calendar && pillars.pillars?.length && slotCount) {
    coverage = pillarCoverage(pillars, calendar);
    if (coverage.maxDrift > 0.2) {
      add("pillar_coverage", "watch", `Calendar is off its pillar mix (max drift ${Math.round(coverage.maxDrift * 100)}%).`, "Rebalance slots toward the stated pillar weights.", "/calendar");
    } else {
      add("pillar_coverage", "ok", `Calendar tracks the pillar mix (max drift ${Math.round(coverage.maxDrift * 100)}%).`, "No action.", "/calendar");
    }
  }

  // 3. Cadence fit — calendar posts/week vs stated capacity.
  const statedPerWeek = parseWeeklyVolume(p.cadence.weekly_volume);
  if (present.calendar && statedPerWeek > 0) {
    const calPerWeek = calendar.posts_per_week || 0;
    if (calPerWeek > statedPerWeek) {
      add("cadence_fit", "risk", `Calendar runs ${calPerWeek}/week over a stated capacity of ${statedPerWeek}/week — burnout risk.`, "Cut cadence back to the stated capacity.", "/calendar");
    } else {
      add("cadence_fit", "ok", `Cadence (${calPerWeek}/week) is within the stated capacity (${statedPerWeek}/week).`, "Sustainable.", "/calendar");
    }
  }

  // 4. Production progress — drafts vs scheduled slots.
  if (present.calendar && slotCount) {
    if (draftCount === 0) {
      add("production", "risk", `${slotCount} slots scheduled but nothing drafted.`, "Draft the slots in-voice.", "/write");
    } else if (draftCount < slotCount) {
      add("production", "watch", `${draftCount} of ${slotCount} slots drafted.`, "Draft the remaining slots.", "/write");
    } else {
      add("production", "ok", `All ${slotCount} scheduled slots drafted.`, "Keep the calendar ahead of the writing.", "/write");
    }
  } else if (!present.calendar) {
    add("production", "watch", "No calendar — posting is unscheduled.", "Lay out a sustainable calendar.", "/calendar");
  }

  // 5. Repurposing — leaving reach on the table?
  if (secondaryCount > 0) {
    if (derivativeCount === 0 && draftCount > 0) {
      add("repurposing", "watch", `${secondaryCount} secondary platform(s) but nothing repurposed — reach left on the table.`, "Atomize drafts into channel-native derivatives.", "/repurpose");
    } else if (derivativeCount > 0) {
      add("repurposing", "ok", `${derivativeCount} derivative(s) across secondary platforms.`, "Keep repurposing the strongest posts.", "/repurpose");
    }
  }

  // 6. Distribution — is the queue built?
  if (present.distribution) {
    add("distribution", "ok", "A publish queue is built.", "Publish on schedule and mark items done.", "/distribute");
  } else if (draftCount > 0) {
    add("distribution", "watch", "Content is authored but no publish queue is built.", "Assemble the publish queue.", "/distribute");
  }

  // 7. Engagement — is the brand two-way?
  if (interactionCount > 0) {
    add("engagement", "ok", `${interactionCount} engagement(s) logged.`, "Keep showing up in the conversations.", "/engage");
  } else {
    add("engagement", "watch", "No engagement logged — the brand is one-way (broadcast only).", "Work the conversations the posts start.", "/engage");
  }

  // 8. Authority — the organic-first scoreboard.
  if (signalSummary.total > 0) {
    add("authority", "ok", `${signalSummary.total} authority signal(s) recorded.`, "Keep pursuing the identified targets.", "/authority");
  } else {
    add("authority", "watch", "No authority signals recorded yet.", "Track earned signals and pursue targets.", "/authority");
  }

  const metrics = {
    pillars: present.pillars ? (pillars.pillars?.length || 0) : 0,
    calendar_slots: slotCount,
    posts_per_week: present.calendar ? (calendar.posts_per_week || 0) : 0,
    stated_per_week: statedPerWeek,
    drafts: draftCount,
    derivatives: derivativeCount,
    secondary_platforms: secondaryCount,
    distribution_built: !!present.distribution,
    interactions: interactionCount,
    authority_signals: signalSummary.total,
    authority_by_type: signalSummary.by_type,
    pillar_max_drift: coverage.maxDrift,
  };

  // Deterministic score: 100 minus the per-finding penalty, floored at 0.
  const score = Math.max(0, Math.min(100, 100 - findings.reduce((a, f) => a + (PENALTY[f.severity] ?? 0), 0)));

  return { metrics, findings, score };
}

/** Does an artifact exist + validate? Used to set the `present` flags. */
function validates(doc, schema) {
  return !!doc && schema.validate(doc).ok;
}

/**
 * Fail-closed review. The profile must validate at stage "complete" (both human gates) — you
 * cannot review a brand that isn't built. Every OTHER artifact is OPTIONAL: its absence becomes
 * a finding, never a crash. Returns the computed report plus the loaded artifacts.
 */
export function reviewFor(slug) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`a brand-health review requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const pillars = loadPillars(slug);
  const calendar = loadCalendar(slug);
  const drafts = loadDrafts(slug);
  const repurposes = loadRepurposes(slug);
  const engagement = loadEngagement(slug);
  const authority = loadAuthority(slug);

  const present = {
    pillars: validates(pillars, contentPillars),
    calendar: validates(calendar, contentCalendar),
    drafts: validates(drafts, contentDraft),
    repurposes: validates(repurposes, contentRepurpose),
    engagement: validates(engagement, engagementLog),
    authority: validates(authority, authorityLedger),
    distribution: existsSync(clientFile(slug, "distribution_queue.json")),
  };

  const { metrics, findings, score } = computeHealth({ profile, pillars, calendar, drafts, repurposes, engagement, authority, present });
  return { profile, metrics, findings, score, present };
}

/** Validate + persist brand_health_review.json. Pass generatedAt (YYYY-MM-DD) in (no Date here). */
export function saveReview(slug, { metrics, findings, score, generatedAt }) {
  const doc = brandHealthReview.normalize({
    client_slug: slug,
    status: "reviewed",
    generated_at: generatedAt ?? null,
    score, metrics, findings,
  });

  const v = brandHealthReview.validate(doc);
  if (!v.ok) {
    const err = new Error(`brand_health_review failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(reviewPath(slug), JSON.stringify(doc, null, 2));
  return doc;
}

/** Render the review as a shareable Markdown report. */
export function reviewToMarkdown(doc, profile = {}) {
  const name = profile.name || doc.client_slug;
  const m = doc.metrics || {};
  const lines = [];
  lines.push(`# Brand-health review — ${name}`);
  lines.push("");
  lines.push(`**Health score: ${doc.score}/100**`);
  lines.push("");
  lines.push("Organic-first review. pbOS observes and recommends — it never edits positioning or voice (the human gates). Act on each recommendation through the skill it routes to.");
  lines.push("");
  lines.push("## Scoreboard");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Content pillars | ${m.pillars ?? 0} |`);
  lines.push(`| Calendar slots | ${m.calendar_slots ?? 0} |`);
  lines.push(`| Cadence | ${m.posts_per_week ?? 0}/week (capacity ${m.stated_per_week ?? 0}/week) |`);
  lines.push(`| Drafts written | ${m.drafts ?? 0} |`);
  lines.push(`| Derivatives | ${m.derivatives ?? 0} |`);
  lines.push(`| Publish queue built | ${m.distribution_built ? "yes" : "no"} |`);
  lines.push(`| Engagements logged | ${m.interactions ?? 0} |`);
  lines.push(`| Authority signals | ${m.authority_signals ?? 0} |`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  lines.push("| Area | Severity | Observation | Recommendation | Owner |");
  lines.push("|------|----------|-------------|----------------|-------|");
  for (const f of doc.findings) {
    const sev = f.severity === "risk" ? "🔴 risk" : f.severity === "watch" ? "🟡 watch" : "🟢 ok";
    lines.push(`| ${f.area} | ${sev} | ${f.observation} | ${f.recommendation || "—"} | ${f.route_to || "—"} |`);
  }
  lines.push("");
  return lines.join("\n");
}
