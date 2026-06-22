#!/usr/bin/env node
/**
 * /calendar companion — generates and persists a sustainable posting calendar.
 *
 * Content-engine step 2. Reads the COMPLETE constitution (cadence + platform plan) and the
 * content pillars, then lays out dated posting slots over a horizon — distributing slots
 * across pillars by their mix weight and capping posts-per-week to the person's STATED
 * capacity (sustainability, principle 5). Fail-closed: profile must be "complete", pillars
 * must exist, the calendar must validate, and every angle must clear the Authenticity Guard.
 *
 * The calendar is NOT a human gate. It's a deliverable the /write skill will read.
 *
 * Usage:
 *   node calendar.js <slug>                          # 4 weeks from today
 *   node calendar.js <slug> --weeks 8 --start 2026-07-01
 */

import { loadEnv } from "../../scripts/lib/load-env.js";
import { generateCalendar, calendarPath } from "../../scripts/lib/calendar.js";

loadEnv();

function argVal(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) { console.error("Usage: node calendar.js <slug> [--weeks N] [--start YYYY-MM-DD]"); process.exit(1); }

  const weeksRaw = argVal(rest, "--weeks");
  const weeks = weeksRaw ? parseInt(weeksRaw, 10) : 4;
  if (!Number.isFinite(weeks) || weeks <= 0) { console.error("[calendar] --weeks must be a positive integer"); process.exit(1); }

  const startDate = argVal(rest, "--start") || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { console.error("[calendar] --start must be YYYY-MM-DD"); process.exit(1); }

  try {
    const cal = generateCalendar(slug, { weeks, startDate });
    // Per-pillar slot counts, for an at-a-glance mix sanity check.
    const mix = {};
    for (const s of cal.slots) mix[s.pillar_name] = (mix[s.pillar_name] || 0) + 1;
    console.log(JSON.stringify({
      skill: "calendar", slug, status: cal.status,
      start_date: cal.start_date, horizon_weeks: cal.horizon_weeks,
      posts_per_week: cal.posts_per_week, total_slots: cal.slots.length,
      mix,
      path: calendarPath(slug),
      next: "run /write {slug} — draft posts into these slots, authenticity-guarded (next content step).",
    }, null, 2));
  } catch (e) {
    if (e.code === "PROFILE_INCOMPLETE") {
      console.error(`[calendar] BLOCKED — ${e.message}\nFix via /positioning and /voice (the gates), then /constitution.`);
      process.exit(3);
    }
    if (e.code === "PILLARS_MISSING") { console.error(`[calendar] BLOCKED — ${e.message}`); process.exit(3); }
    if (e.code === "CADENCE") { console.error(`[calendar] ${e.message}`); process.exit(5); }
    if (e.blocked) { console.error(`[calendar] BLOCKED by authenticity guard — ${e.message}`); process.exit(4); }
    if (e.code === "SCHEMA") { console.error(`[calendar] ${e.message}`); process.exit(5); }
    throw e;
  }
}

main();
