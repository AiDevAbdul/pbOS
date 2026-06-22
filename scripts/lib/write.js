// scripts/lib/write.js — the drafting engine (content-engine step 3).
//
// /write turns the calendar's dated slots into actual posts written in the person's CAPTURED
// VOICE. The spine here is deliberately split:
//   - buildDraftBrief() / scaffoldBriefs()  → PURE. Turn a calendar slot + the voice profile
//     into a writing BRIEF: the angle to write, plus the voice constraints (tone, signatures,
//     do/dont lexicon, things never to say). No I/O, no Date, no randomness → testable.
//   - briefsFor()  → fail-closed brief generation (profile must be "complete", calendar must
//     exist + validate) — the coach drafts in-voice FROM these briefs.
//   - loadDrafts / saveDrafts  → read/write clients/<slug>/content_drafts.json.
//   - saveDrafts is fail-closed: the profile must validate at stage "complete" (so a captured,
//     APPROVED voice exists — gate 2), the draft set must pass the schema, AND every draft
//     runs through the Authenticity Guard before it can be persisted.
//
// What this module deliberately does NOT do: fabricate post prose from a template. pbOS never
// puts words in someone's mouth (Constitution). The briefs scaffold; the human/coach writes;
// the guard enforces. A draft is only ever as authentic as the voice it was written against.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { contentDraft, contentCalendar, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";
import { loadCalendar } from "./calendar.js";

const DRAFTS_FILE = "content_drafts.json";

export function draftsPath(slug) {
  return clientFile(slug, DRAFTS_FILE);
}

/**
 * Turn one calendar slot + a voice profile into a writing BRIEF. Pure: same inputs → same
 * brief, every run. The brief carries the slot's facts (date, pillar, platform, format,
 * angle) and the voice contract the draft must honor — including the must_avoid list the
 * Authenticity Guard will later enforce. The coach writes the actual post against this.
 */
export function buildDraftBrief(slot, voice = {}, boundaries = {}) {
  const v = voice || {};
  const mustAvoid = [
    ...(v.lexicon_dont || []),
    ...(boundaries?.never_say || []),
  ].filter(Boolean);
  return {
    date: slot?.date ?? null,
    week: slot?.week ?? null,
    pillar_id: slot?.pillar_id ?? null,
    pillar_name: slot?.pillar_name ?? null,
    platform: slot?.platform ?? null,
    format: slot?.format ?? null,
    angle: slot?.angle ?? null,
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

/** Filter calendar slots by an optional week, cap by an optional limit. Pure. */
export function selectSlots(slots, { week = null, limit = null } = {}) {
  let out = Array.isArray(slots) ? slots.slice() : [];
  if (week != null) out = out.filter((s) => s.week === week);
  if (limit != null && limit > 0) out = out.slice(0, limit);
  return out;
}

/** Build a writing brief for every (selected) calendar slot. Pure. */
export function scaffoldBriefs(profile, calendar, opts = {}) {
  const p = personalBrandProfile.normalize(profile || {});
  const slots = selectSlots(calendar?.slots || [], opts);
  return slots.map((s) => buildDraftBrief(s, p.voice, p.boundaries));
}

/** Load the person's drafts (normalized) or a fresh draft skeleton. */
export function loadDrafts(slug) {
  const p = draftsPath(slug);
  if (existsSync(p)) return contentDraft.normalize(JSON.parse(readFileSync(p, "utf8")));
  return contentDraft.normalize({ client_slug: slug, status: "draft" });
}

/** The text of a draft the Authenticity Guard inspects (hook + body + cta). */
function draftText(d) {
  return { hook: d.hook || "", body: d.body || "", caption: d.cta || "" };
}

/**
 * Fail-closed brief generation. The coach calls this to get a writing brief per slot:
 *   1. the profile must validate at stage "complete" (both gates — a captured, APPROVED
 *      voice is the whole point of /write);
 *   2. the calendar must already exist and validate (drafts fill its slots).
 * Returns { briefs, profile, calendar }.
 */
export function briefsFor(slug, opts = {}) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`drafting requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const calendar = loadCalendar(slug);
  const cv = contentCalendar.validate(calendar);
  if (!cv.ok) {
    const err = new Error(`a content calendar must exist and validate before drafting:\n  - ${cv.errors.join("\n  - ")}\nRun /calendar ${slug} first.`);
    err.code = "CALENDAR_MISSING";
    throw err;
  }

  return { briefs: scaffoldBriefs(profile, calendar, opts), profile, calendar };
}

/**
 * Validate + persist content_drafts.json — the coach-authored posts coming back from the
 * briefs. Fail-closed twice over:
 *   1. the profile must validate at stage "complete" (gate 2 — the voice is approved);
 *   2. the draft set must pass the schema AND every draft must clear the Authenticity Guard
 *      (banned language, fabricated authority claims, no-go topics) before it can be saved.
 * Nothing written in the person's name escapes the moat.
 */
export function saveDrafts(slug, draftsDoc) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`drafts require a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const doc = contentDraft.normalize({
    ...draftsDoc,
    client_slug: slug,
    source: draftsDoc?.source ?? "content_calendar.json",
    generated_from: draftsDoc?.generated_from ?? profile.positioning.statement,
    status: "drafted",
  });

  const v = contentDraft.validate(doc);
  if (!v.ok) {
    const err = new Error(`content_drafts failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // The moat: every post is checked against the person's voice + boundaries before it ships.
  for (const d of doc.drafts) {
    guardContentWrite({ content: draftText(d), voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(draftsPath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
