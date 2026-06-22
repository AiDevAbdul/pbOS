// scripts/lib/distribute.js — the distribution engine (Phase-3 step 1).
//
// /distribute is the bridge from "content authored" to "content out the door". Unlike /write
// and /repurpose it does NOT author anything — the posts already exist and were already run
// through the Authenticity Guard. Distribution ASSEMBLES them: it merges the primary-platform
// drafts (content_drafts.json) and the secondary-platform derivatives (content_repurposes.json)
// into ONE ordered, dated publish queue. Deterministic, like the calendar:
//   - queueItemsFromDrafts() / queueItemsFromDerivatives() / buildQueue()  → PURE. Map authored
//     content to dated queue items and order them. No I/O / Date / randomness → testable.
//   - queueFor()  → fail-closed assembly (profile "complete", drafts must exist + validate).
//   - loadQueue / saveQueue  → read/write clients/<slug>/distribution_queue.json.
//   - saveQueue is fail-closed: profile must validate at stage "complete", the queue must pass
//     the schema, AND every item is re-run through the Authenticity Guard (defense in depth —
//     the content was guarded when authored, but the queue is what actually ships).
//
// pbOS is organic-first and the human owns their reputation: distribution produces a publish-
// READY package, it never auto-posts to an external platform API. A derivative for a secondary
// platform is scheduled to land AFTER its source post (a configurable offset) so the original
// leads and the re-cut follows — never the same idea in two places on the same day.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { distributionQueue, contentDraft, contentRepurpose, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";
import { loadDrafts } from "./write.js";
import { loadRepurposes } from "./repurpose.js";
import { addDays } from "./calendar.js";

const QUEUE_FILE = "distribution_queue.json";

export function queuePath(slug) {
  return clientFile(slug, QUEUE_FILE);
}

/** Turn the authored drafts into queue items — each publishes on its own slot date. Pure. */
export function queueItemsFromDrafts(drafts) {
  const arr = Array.isArray(drafts?.drafts) ? drafts.drafts : [];
  return arr.map((d) => ({
    source_kind: "draft",
    source_date: d.date ?? null,
    pillar_id: d.pillar_id ?? null,
    pillar_name: d.pillar_name ?? null,
    platform: d.platform ?? null,
    format: d.format ?? null,
    scheduled_at: d.date ?? null,
    hook: d.hook ?? null,
    body: d.body ?? null,
    cta: d.cta ?? null,
    status: "queued",
  }));
}

/**
 * Turn the repurposed derivatives into queue items. A derivative lands `offsetDays` AFTER its
 * source post so the original leads on the primary platform and the re-cut follows on the
 * secondary one. Pure: same inputs (+offset) → same items.
 */
export function queueItemsFromDerivatives(repurposes, offsetDays = 1) {
  const arr = Array.isArray(repurposes?.derivatives) ? repurposes.derivatives : [];
  return arr.map((d) => ({
    source_kind: "derivative",
    source_date: d.source_date ?? null,
    pillar_id: d.source_pillar_id ?? null,
    pillar_name: d.source_pillar_name ?? null,
    platform: d.target_platform ?? null,
    format: d.target_format ?? null,
    scheduled_at: isNonEmptyString(d.source_date) ? addDays(d.source_date, offsetDays) : null,
    hook: d.hook ?? null,
    body: d.body ?? null,
    cta: d.cta ?? null,
    status: "queued",
  }));
}

/** Stable ordering: by publish date, then primary content before its derivatives, then platform. */
function compareItems(a, b) {
  const da = a.scheduled_at || "", db = b.scheduled_at || "";
  if (da !== db) return da < db ? -1 : 1;
  if (a.source_kind !== b.source_kind) return a.source_kind === "draft" ? -1 : 1; // draft leads
  return String(a.platform || "").localeCompare(String(b.platform || ""));
}

/**
 * Merge drafts + derivatives into one ordered publish queue. Pure: pass the offset in.
 * opts = { offsetDays }
 */
export function buildQueue(drafts, repurposes, { offsetDays = 1 } = {}) {
  const items = [
    ...queueItemsFromDrafts(drafts),
    ...queueItemsFromDerivatives(repurposes, offsetDays),
  ];
  return items.sort(compareItems);
}

/** Load the person's queue (normalized) or a fresh draft skeleton. */
export function loadQueue(slug) {
  const p = queuePath(slug);
  if (existsSync(p)) return distributionQueue.normalize(JSON.parse(readFileSync(p, "utf8")));
  return distributionQueue.normalize({ client_slug: slug, status: "draft" });
}

/** The text of a queue item the Authenticity Guard inspects (hook + body + cta). */
function itemText(it) {
  return { hook: it.hook || "", body: it.body || "", caption: it.cta || "" };
}

/**
 * Fail-closed queue assembly + persistence. Distribution is not a human gate — but it ships
 * the person's words, so it's guarded like every other content step:
 *   1. the profile must validate at stage "complete" (both human gates — the approved voice);
 *   2. the drafts must already exist and validate (you distribute finished posts);
 *   3. the assembled queue must pass the schema AND every item must clear the Authenticity
 *      Guard before it can be saved.
 * Repurposed derivatives are folded in when present (they're optional — not everyone repurposes).
 * Returns the persisted, normalized queue doc.
 */
export function generateQueue(slug, { offsetDays = 1 } = {}) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`distribution requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const drafts = loadDrafts(slug);
  const dv = contentDraft.validate(drafts);
  if (!dv.ok) {
    const err = new Error(`drafted posts must exist and validate before distribution:\n  - ${dv.errors.join("\n  - ")}\nRun /write ${slug} first.`);
    err.code = "DRAFTS_MISSING";
    throw err;
  }

  // Derivatives are optional — only fold them in if a valid set exists.
  const repurposes = loadRepurposes(slug);
  const rv = contentRepurpose.validate(repurposes);
  const usableRepurposes = rv.ok ? repurposes : { derivatives: [] };

  const items = buildQueue(drafts, usableRepurposes, { offsetDays });
  const startDate = items.length ? items[0].scheduled_at : null;

  const doc = distributionQueue.normalize({
    client_slug: slug,
    status: "queued",
    source: "content_drafts.json + content_repurposes.json",
    generated_from: profile.positioning.statement,
    start_date: startDate,
    items,
  });

  const v = distributionQueue.validate(doc);
  if (!v.ok) {
    const err = new Error(`distribution_queue failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // The moat: every queued item is re-checked against the voice + boundaries before it ships.
  for (const it of doc.items) {
    guardContentWrite({ content: itemText(it), voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(queuePath(slug), JSON.stringify(doc, null, 2));
  return doc;
}

/** Render the queue as a human-publishable Markdown checklist (the publish-ready package). */
export function queueToMarkdown(doc, profile = {}) {
  const lines = [];
  const name = profile.name || doc.client_slug;
  lines.push(`# Publish queue — ${name}`);
  lines.push("");
  lines.push(`Organic-first distribution plan. pbOS never auto-posts — publish each item from here, then mark it done.`);
  lines.push("");
  lines.push(`- **Items:** ${doc.items.length}`);
  if (doc.start_date) lines.push(`- **Starts:** ${doc.start_date}`);
  lines.push("");

  // Group by publish date for a clean day-by-day checklist.
  const byDate = new Map();
  for (const it of doc.items) {
    const k = it.scheduled_at || "unscheduled";
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(it);
  }
  for (const date of [...byDate.keys()].sort()) {
    lines.push(`## ${date}`);
    lines.push("");
    for (const it of byDate.get(date)) {
      const tag = it.source_kind === "derivative" ? "↳ repurpose" : "original";
      lines.push(`### ${it.platform} · ${it.format} — _${tag}_ (${it.pillar_name || it.pillar_id || "—"})`);
      lines.push("");
      lines.push(`**Hook:** ${it.hook || ""}`);
      lines.push("");
      lines.push(it.body || "");
      if (it.cta) { lines.push(""); lines.push(`**CTA:** ${it.cta}`); }
      lines.push("");
    }
  }
  return lines.join("\n");
}
