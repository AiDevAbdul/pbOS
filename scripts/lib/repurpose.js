// scripts/lib/repurpose.js — the repurposing engine (content-engine step 4).
//
// /repurpose atomizes a drafted post into derivatives for the person's OTHER platforms and
// natural formats. One source post → many channel-native cuts. The spine is split the same
// way /write splits drafting:
//   - repurposeTargets() / planRepurpose() / scaffoldRepurposePlans()  → PURE. Decide which
//     (platform, format) channels a post should be re-cut for, and hand the coach a plan per
//     source draft (the source post + the targets + the voice contract). No I/O / Date /
//     randomness → testable.
//   - plansFor()  → fail-closed plan generation (profile "complete", drafts must exist + validate,
//     at least one target channel must exist) — the coach adapts each cut in-voice FROM these.
//   - loadRepurposes / saveRepurposes  → read/write clients/<slug>/content_repurposes.json.
//   - saveRepurposes is fail-closed: profile must validate at stage "complete" (approved voice —
//     gate 2), the set must pass the schema, AND every derivative runs through the Authenticity
//     Guard before it persists.
//
// As in /write, pbOS does NOT fabricate the re-cut prose from a template — a derivative still
// ships in the person's name. The plan scaffolds the channels; the human/coach re-cuts in
// voice; the guard enforces.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { contentRepurpose, contentDraft, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";
import { loadDrafts } from "./write.js";

const REPURPOSE_FILE = "content_repurposes.json";

export function repurposePath(slug) {
  return clientFile(slug, REPURPOSE_FILE);
}

// The channel-native format each common platform wants. A repurpose isn't a copy-paste —
// it's a re-cut into the form the destination rewards. Falls back to the person's natural
// format for anything off this list.
const FORMAT_BY_PLATFORM = {
  linkedin: "post",
  x: "thread",
  twitter: "thread",
  threads: "post",
  instagram: "carousel",
  facebook: "post",
  youtube: "video script",
  tiktok: "short video script",
  reels: "short video script",
  newsletter: "email",
  substack: "email",
  medium: "article",
  blog: "article",
};

/** The channel-native format for a platform, falling back to the person's natural format. */
export function formatFor(platform, fallback) {
  return FORMAT_BY_PLATFORM[String(platform || "").toLowerCase()] || fallback || "post";
}

/**
 * The target channels a post should be repurposed INTO — the person's secondary platforms
 * (the primary already carries the source post), each in its channel-native format. Pure:
 * same profile → same targets. Empty when the constitution names no secondary platforms.
 */
export function repurposeTargets(profile) {
  const p = personalBrandProfile.normalize(profile || {});
  const fallback = p.cadence.formats[0] || "post";
  const seen = new Set();
  const targets = [];
  for (const plat of p.platform_plan.secondary_platforms) {
    if (!isNonEmptyString(plat)) continue;
    const key = String(plat).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ platform: plat, format: formatFor(plat, fallback) });
  }
  return targets;
}

/**
 * Turn one source draft + the target channels into a repurposing PLAN. Pure: same inputs →
 * same plan. The plan carries the source post (so the coach re-cuts from the real thing), the
 * channels to cut for, and the voice contract the derivatives must honor.
 */
export function planRepurpose(draft, targets, voice = {}, boundaries = {}) {
  const v = voice || {};
  const mustAvoid = [
    ...(v.lexicon_dont || []),
    ...(boundaries?.never_say || []),
  ].filter(Boolean);
  return {
    source_date: draft?.date ?? null,
    source_pillar_id: draft?.pillar_id ?? null,
    source_pillar_name: draft?.pillar_name ?? null,
    source_platform: draft?.platform ?? null,
    source_hook: draft?.hook ?? null,
    source_body: draft?.body ?? null,
    targets: Array.isArray(targets) ? targets : [],
    voice: {
      tone: v.tone ?? null,
      signatures: v.signatures || [],
      lexicon_do: v.lexicon_do || [],
      sentence_rhythm: v.sentence_rhythm ?? null,
    },
    must_avoid: mustAvoid,
    no_go_topics: boundaries?.no_go_topics || [],
  };
}

/** Build a repurposing plan for every (optionally capped) source draft. Pure. */
export function scaffoldRepurposePlans(profile, draftsDoc, { limit = null } = {}) {
  const p = personalBrandProfile.normalize(profile || {});
  const targets = repurposeTargets(p);
  let drafts = Array.isArray(draftsDoc?.drafts) ? draftsDoc.drafts.slice() : [];
  if (limit != null && limit > 0) drafts = drafts.slice(0, limit);
  return drafts.map((d) => planRepurpose(d, targets, p.voice, p.boundaries));
}

/** Load the person's repurposes (normalized) or a fresh draft skeleton. */
export function loadRepurposes(slug) {
  const p = repurposePath(slug);
  if (existsSync(p)) return contentRepurpose.normalize(JSON.parse(readFileSync(p, "utf8")));
  return contentRepurpose.normalize({ client_slug: slug, status: "draft" });
}

/** The text of a derivative the Authenticity Guard inspects (hook + body + cta). */
function derivativeText(d) {
  return { hook: d.hook || "", body: d.body || "", caption: d.cta || "" };
}

/**
 * Fail-closed plan generation. The coach calls this to get a repurposing plan per source draft:
 *   1. the profile must validate at stage "complete" (both gates — the approved voice);
 *   2. the drafts must already exist and validate (you repurpose finished posts);
 *   3. there must be at least one target channel (a secondary platform to cut for).
 * Returns { plans, targets, profile, drafts }.
 */
export function plansFor(slug, opts = {}) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`repurposing requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const drafts = loadDrafts(slug);
  const dv = contentDraft.validate(drafts);
  if (!dv.ok) {
    const err = new Error(`drafted posts must exist and validate before repurposing:\n  - ${dv.errors.join("\n  - ")}\nRun /write ${slug} first.`);
    err.code = "DRAFTS_MISSING";
    throw err;
  }

  const targets = repurposeTargets(profile);
  if (!targets.length) {
    const err = new Error(`no target channels to repurpose into — platform_plan.secondary_platforms is empty.\nAdd a secondary platform to the constitution to repurpose across channels.`);
    err.code = "NO_TARGETS";
    throw err;
  }

  return { plans: scaffoldRepurposePlans(profile, drafts, opts), targets, profile, drafts };
}

/**
 * Validate + persist content_repurposes.json — the coach-authored derivatives coming back
 * from the plans. Fail-closed twice over:
 *   1. the profile must validate at stage "complete" (gate 2 — the voice is approved);
 *   2. the set must pass the schema AND every derivative must clear the Authenticity Guard
 *      (banned language, fabricated authority claims, no-go topics) before it can be saved.
 */
export function saveRepurposes(slug, repurposeDoc) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`repurposes require a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const doc = contentRepurpose.normalize({
    ...repurposeDoc,
    client_slug: slug,
    source: repurposeDoc?.source ?? "content_drafts.json",
    generated_from: repurposeDoc?.generated_from ?? profile.positioning.statement,
    status: "repurposed",
  });

  const v = contentRepurpose.validate(doc);
  if (!v.ok) {
    const err = new Error(`content_repurposes failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // The moat: every re-cut is checked against the person's voice + boundaries before it ships.
  for (const d of doc.derivatives) {
    guardContentWrite({ content: derivativeText(d), voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(repurposePath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
