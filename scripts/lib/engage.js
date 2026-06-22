// scripts/lib/engage.js — the engagement engine (Phase-3 step 2).
//
// /engage is the two-way half of a personal brand: showing up in the conversations the posts
// start. Like /write it is split into a PURE planning spine and a fail-closed, guarded persist:
//   - engagementStrategy()  → PURE. Derive the engagement posture from the constitution: a
//     daily time budget (from cadence.time_budget_hours), who to focus on (positioning), the
//     proactive-to-reactive ratio, the tone to hold (voice). No I/O / Date / randomness.
//   - buildReplyBrief() / scaffoldReplyBriefs()  → PURE. Turn an inbound item (a comment, DM,
//     mention, or proactive target) into a reply BRIEF: the inbound text + the voice contract +
//     the must_avoid list the guard will enforce. The coach drafts the reply FROM this.
//   - strategyFor() / briefsFor()  → fail-closed (profile must be "complete" — the approved voice).
//   - loadEngagement / saveEngagement  → read/write clients/<slug>/engagement_log.json.
//   - saveEngagement is fail-closed: profile must validate at stage "complete", the set must
//     pass the schema, AND every drafted RESPONSE runs through the Authenticity Guard before it
//     persists. A reply ships in the person's name exactly like a post.
//
// pbOS never fabricates the reply from a template — putting words in someone's mouth is the one
// thing the Constitution forbids most plainly. The brief scaffolds; the human/coach replies;
// the guard enforces.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { engagementLog, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString, isFiniteNumber } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";

const ENGAGE_FILE = "engagement_log.json";

export function engagePath(slug) {
  return clientFile(slug, ENGAGE_FILE);
}

/** Pull an hours number out of a time budget ("3 hours/week" → 3). */
function parseHours(v) {
  if (isFiniteNumber(v)) return v;
  const m = String(v ?? "").match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

/**
 * Derive the engagement posture from the constitution. Pure: same profile → same strategy.
 * The daily budget is a sustainable slice of the stated weekly time budget (Constitution
 * principle 5 — brands die from burnout). Proactive-heavy by default: a brand grows faster
 * by showing up on others' work than by only answering its own replies.
 */
export function engagementStrategy(profile) {
  const p = personalBrandProfile.normalize(profile || {});
  const weeklyHours = parseHours(p.cadence.time_budget_hours);
  // Reserve ~a third of the content time budget for engagement, spread over ~5 active days.
  const dailyMinutes = weeklyHours > 0 ? Math.max(10, Math.round((weeklyHours * 60 / 3) / 5)) : 15;
  return {
    daily_minutes: `${dailyMinutes} min/day`,
    focus_audience: p.positioning.audience || p.audience.who || null,
    posture: p.voice.tone || null,
    proactive_ratio: "2 proactive : 1 reactive",
    targets: [
      p.positioning.niche ? `people active in ${p.positioning.niche}` : null,
      p.audience.who ? `${p.audience.who} asking about their pains` : null,
      "voices your audience already follows (thoughtful replies, not pitches)",
    ].filter(Boolean),
  };
}

/**
 * Turn one inbound item into a reply BRIEF. Pure: same inputs → same brief. The brief carries
 * the inbound text (so the coach replies to the real thing), the voice contract, and the
 * must_avoid list the Authenticity Guard will later enforce.
 */
export function buildReplyBrief(item, voice = {}, boundaries = {}) {
  const v = voice || {};
  const it = item || {};
  const mustAvoid = [
    ...(v.lexicon_dont || []),
    ...(boundaries?.never_say || []),
  ].filter(Boolean);
  return {
    kind: it.kind ?? it.type ?? null,
    platform: it.platform ?? null,
    inbound_text: it.inbound_text ?? it.inbound ?? it.incoming ?? it.target ?? null,
    context: it.context ?? it.note ?? null,
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

/** Build a reply brief for every inbound item. Pure. */
export function scaffoldReplyBriefs(profile, inboundDoc, { limit = null } = {}) {
  const p = personalBrandProfile.normalize(profile || {});
  let items = asInbound(inboundDoc);
  if (limit != null && limit > 0) items = items.slice(0, limit);
  return items.map((it) => buildReplyBrief(it, p.voice, p.boundaries));
}

/** Coerce an inbound doc (array, or { interactions|inbound|items: [...] }) to an item array. */
function asInbound(doc) {
  if (Array.isArray(doc)) return doc;
  const arr = doc?.interactions ?? doc?.inbound ?? doc?.items ?? doc?.conversations;
  return Array.isArray(arr) ? arr : [];
}

/** Load the person's engagement log (normalized) or a fresh draft skeleton. */
export function loadEngagement(slug) {
  const p = engagePath(slug);
  if (existsSync(p)) return engagementLog.normalize(JSON.parse(readFileSync(p, "utf8")));
  return engagementLog.normalize({ client_slug: slug, status: "draft" });
}

/** The text of a response the Authenticity Guard inspects. */
function responseText(it) {
  return { body: it.response || "" };
}

function requireComplete(slug, verb) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`${verb} requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }
  return profile;
}

/** Fail-closed strategy generation (profile must be "complete"). Returns { strategy, profile }. */
export function strategyFor(slug) {
  const profile = requireComplete(slug, "an engagement strategy");
  return { strategy: engagementStrategy(profile), profile };
}

/**
 * Fail-closed reply-brief generation. The coach calls this to get a reply brief per inbound
 * item: the profile must validate at stage "complete" (the approved voice). The coach drafts
 * each reply in-voice FROM these. Returns { briefs, profile }.
 */
export function briefsFor(slug, inboundDoc, opts = {}) {
  const profile = requireComplete(slug, "drafting engagement replies");
  return { briefs: scaffoldReplyBriefs(profile, inboundDoc, opts), profile };
}

/**
 * Validate + persist engagement_log.json — the strategy + the coach-authored replies. Fail-
 * closed twice over:
 *   1. the profile must validate at stage "complete" (gate 2 — the voice is approved);
 *   2. the set must pass the schema AND every drafted RESPONSE must clear the Authenticity
 *      Guard (banned language, fabricated authority claims, no-go topics) before it can be saved.
 * The strategy, if absent, is filled deterministically from the constitution.
 */
export function saveEngagement(slug, engageDoc) {
  const profile = requireComplete(slug, "an engagement log");

  const incoming = engagementLog.normalize(engageDoc || {});
  const hasStrategy = incoming.strategy && (incoming.strategy.daily_minutes || incoming.strategy.posture || incoming.strategy.focus_audience);

  const doc = engagementLog.normalize({
    ...engageDoc,
    client_slug: slug,
    status: "engaged",
    generated_from: engageDoc?.generated_from ?? profile.positioning.statement,
    strategy: hasStrategy ? incoming.strategy : engagementStrategy(profile),
  });

  const v = engagementLog.validate(doc);
  if (!v.ok) {
    const err = new Error(`engagement_log failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // The moat: every reply is checked against the person's voice + boundaries before it ships.
  for (const it of doc.interactions) {
    guardContentWrite({ content: responseText(it), voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(engagePath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
