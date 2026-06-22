// schemas/content_calendar.js — the posting calendar artifact for one person.
//
// The calendar is content-engine step 2: it takes the 3–5 content pillars and the
// constitution's CADENCE + PLATFORM plan and lays out concrete, dated posting slots over
// a horizon. Each slot names a pillar, a platform, a format, and a concrete angle — so the
// downstream /write skill never faces a blank page or an unscheduled week.
//
// The load-bearing principle here is SUSTAINABILITY (Constitution, principle 5): brands
// die from burnout, not bad strategy. The calendar's posts-per-week is derived from the
// person's stated capacity (cadence.weekly_volume) and is never silently inflated past it.
//
// normalize(raw): LENIENT, never throws. validate(obj): FAIL-CLOSED — names every slot
// missing a required field and rejects a non-positive horizon or cadence.

import { pick, asArray, isNonEmptyString, isFiniteNumber, result } from "./_shared.js";

export function normalizeSlot(raw) {
  const r = raw || {};
  return {
    date: pick(r, "date", "publish_date", "when") ?? null, // YYYY-MM-DD
    week: pick(r, "week", "week_index") ?? null,            // 1-based week number
    pillar_id: pick(r, "pillar_id", "pillar") ?? null,
    pillar_name: pick(r, "pillar_name") ?? null,
    platform: pick(r, "platform") ?? null,
    format: pick(r, "format") ?? null,
    angle: pick(r, "angle", "topic", "hook") ?? null,
    status: pick(r, "status") ?? "planned",                 // planned | drafted | scheduled | published
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    client_slug: pick(r, "client_slug", "slug") ?? null,
    status: pick(r, "status") ?? "draft", // draft | planned
    start_date: pick(r, "start_date", "starts") ?? null,
    horizon_weeks: pick(r, "horizon_weeks", "weeks") ?? null,
    posts_per_week: pick(r, "posts_per_week", "weekly_volume") ?? null,
    primary_platform: pick(r, "primary_platform") ?? null,
    slots: asArray(pick(r, "slots", "posts")).map(normalizeSlot),
    cadence_note: pick(r, "cadence_note", "sustainability_note") ?? null,
  };
}

/**
 * FAIL-CLOSED validator. The calendar isn't a human gate — the producing skill validates
 * the profile at stage "complete" and requires the pillars to exist first. Here we assert
 * a sane horizon + cadence and that every slot is fully specified (a half-specified slot
 * would silently hand the writer an ambiguous brief).
 */
export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["content_calendar is not an object"]);
  const c = normalize(obj);

  if (!isNonEmptyString(c.client_slug)) errors.push("client_slug is missing");
  if (!(isFiniteNumber(c.horizon_weeks) && c.horizon_weeks > 0)) errors.push("horizon_weeks must be a positive number");
  if (!(isFiniteNumber(c.posts_per_week) && c.posts_per_week > 0)) errors.push("posts_per_week must be a positive number (derived from cadence.weekly_volume)");
  if (!c.slots.length) errors.push("slots is empty — nothing scheduled");

  c.slots.forEach((s, i) => {
    const where = `slots[${i}]`;
    if (!isNonEmptyString(s.date)) errors.push(`${where}: date is missing`);
    if (!isNonEmptyString(s.pillar_id)) errors.push(`${where}: pillar_id is missing (every slot must map to a pillar)`);
    if (!isNonEmptyString(s.format)) errors.push(`${where}: format is missing`);
    if (!isNonEmptyString(s.platform)) errors.push(`${where}: platform is missing`);
  });

  return result(errors);
}
