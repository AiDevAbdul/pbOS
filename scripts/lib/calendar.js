// scripts/lib/calendar.js — the content calendar engine (content-engine step 2).
//
// Takes the 3–5 content pillars + the constitution's cadence/platform plan and lays out a
// dated posting calendar. The scheduling spine is pure (no I/O, no randomness; the start
// date is passed IN) so the same inputs always yield the same calendar and it is testable:
//   - parseWeeklyVolume()  → pulls the posts-per-week number out of "3 posts/week".
//   - weightedSequence()   → smooth weighted round-robin over pillars by their mix weight,
//     so a heavier pillar appears more often AND the pillars stay interleaved (never three
//     of the same in a row). Deterministic, ties broken by pillar order.
//   - spreadDays()         → spaces N posts evenly across the 7 days of a week.
//   - buildCalendar()      → assembles the slots, rotating each pillar's sample_angles so
//     the writer gets a concrete starting angle for every slot.
//
// Sustainability is load-bearing (Constitution, principle 5): posts-per-week comes from the
// person's STATED capacity and savePillars caps it there — the calendar never inflates the
// cadence past what the person said they can sustain.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { contentCalendar, contentPillars, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString, isFiniteNumber } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";
import { loadPillars } from "./pillars.js";

const CALENDAR_FILE = "content_calendar.json";

export function calendarPath(slug) {
  return clientFile(slug, CALENDAR_FILE);
}

/** Pull the posts-per-week integer out of a cadence string ("3 posts/week" → 3). */
export function parseWeeklyVolume(weekly) {
  if (isFiniteNumber(weekly)) return Math.max(0, Math.floor(weekly));
  const m = String(weekly ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/** Add `n` days to a YYYY-MM-DD date and return YYYY-MM-DD (UTC, pure given the input). */
export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Evenly space `count` posts across a 7-day week → sorted day offsets (0=start of week). */
export function spreadDays(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.min(6, Math.round((i * 7) / count)));
  // De-dup collisions (when count > 7) by nudging forward; keep within the week.
  const seen = new Set();
  return out.map((d) => { let x = d; while (seen.has(x) && x < 6) x++; seen.add(x); return x; });
}

/**
 * Smooth weighted round-robin. Returns `n` pillar ids distributed proportionally to each
 * pillar's weight while keeping them interleaved. Deterministic; equal weights when unset.
 */
export function weightedSequence(pillars, n) {
  if (!pillars.length || n <= 0) return [];
  const ws = pillars.map((p) => {
    const w = isFiniteNumber(p.weight) ? p.weight : parseFloat(p.weight);
    return isFiniteNumber(w) && w > 0 ? w : 1;
  });
  const total = ws.reduce((a, b) => a + b, 0);
  const credit = ws.map(() => 0);
  const seq = [];
  for (let k = 0; k < n; k++) {
    let best = 0;
    for (let i = 0; i < ws.length; i++) {
      credit[i] += ws[i];
      if (credit[i] > credit[best]) best = i; // first max wins → deterministic tie-break
    }
    credit[best] -= total;
    seq.push(best);
  }
  return seq;
}

/**
 * Build the calendar slots. Pure: pass startDate (YYYY-MM-DD) in.
 *   opts = { weeks, postsPerWeek, primaryPlatform, defaultFormats[], startDate }
 */
export function buildCalendar(pillars, opts = {}) {
  const { weeks = 4, postsPerWeek = 0, primaryPlatform = null, defaultFormats = [], startDate } = opts;
  if (!pillars.length || postsPerWeek <= 0 || weeks <= 0 || !isNonEmptyString(startDate)) return [];

  const total = weeks * postsPerWeek;
  const seq = weightedSequence(pillars, total);
  const dayOffsets = spreadDays(postsPerWeek);
  const angleCursor = pillars.map(() => 0); // rotate each pillar's sample_angles
  const slots = [];

  let k = 0;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < postsPerWeek; d++) {
      const pi = seq[k++];
      const pillar = pillars[pi];
      const angles = pillar.sample_angles || [];
      const angle = angles.length
        ? angles[angleCursor[pi]++ % angles.length]
        : (pillar.thesis || pillar.name);
      const format = (pillar.formats && pillar.formats[0]) || defaultFormats[0] || "post";
      slots.push({
        date: addDays(startDate, w * 7 + dayOffsets[d]),
        week: w + 1,
        pillar_id: pillar.id,
        pillar_name: pillar.name,
        platform: primaryPlatform,
        format,
        angle,
        status: "planned",
      });
    }
  }
  return slots;
}

/** Load the person's calendar (normalized) or a fresh draft skeleton. */
export function loadCalendar(slug) {
  const p = calendarPath(slug);
  if (existsSync(p)) return contentCalendar.normalize(JSON.parse(readFileSync(p, "utf8")));
  return contentCalendar.normalize({ client_slug: slug, status: "draft" });
}

/**
 * Generate + persist content_calendar.json. Fail-closed: the profile must validate at
 * stage "complete" (both human gates), the pillars must already exist and validate, the
 * resulting calendar must pass the schema, and every angle must clear the Authenticity
 * Guard. posts-per-week is taken from cadence.weekly_volume and is NOT inflated past it.
 */
export function generateCalendar(slug, { weeks = 4, startDate } = {}) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(`a content calendar requires a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`);
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const pillarsDoc = loadPillars(slug);
  const cpv = contentPillars.validate(pillarsDoc);
  if (!cpv.ok) {
    const err = new Error(`content pillars must exist and validate before a calendar:\n  - ${cpv.errors.join("\n  - ")}\nRun /pillars ${slug} first.`);
    err.code = "PILLARS_MISSING";
    throw err;
  }

  const postsPerWeek = parseWeeklyVolume(profile.cadence.weekly_volume);
  if (postsPerWeek <= 0) {
    const err = new Error(`cadence.weekly_volume ("${profile.cadence.weekly_volume}") has no usable posts-per-week number.`);
    err.code = "CADENCE";
    throw err;
  }

  const slots = buildCalendar(pillarsDoc.pillars, {
    weeks,
    postsPerWeek,
    primaryPlatform: profile.platform_plan.primary_platform,
    defaultFormats: profile.cadence.formats,
    startDate,
  });

  const doc = contentCalendar.normalize({
    client_slug: slug,
    status: "planned",
    start_date: startDate,
    horizon_weeks: weeks,
    posts_per_week: postsPerWeek,
    primary_platform: profile.platform_plan.primary_platform,
    slots,
    cadence_note: profile.cadence.sustainability_note,
  });

  const v = contentCalendar.validate(doc);
  if (!v.ok) {
    const err = new Error(`content_calendar failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // Enforce the authenticity moat on every scheduled angle (defense in depth — angles
  // originate from already-guarded pillars, but the calendar is a content write too).
  for (const s of doc.slots) {
    guardContentWrite({ content: { title: s.angle, body: s.pillar_name }, voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(calendarPath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
