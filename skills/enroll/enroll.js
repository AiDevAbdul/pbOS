#!/usr/bin/env node
/**
 * /enroll companion — scaffolds a new person into pbOS.
 *
 * Creates clients/<slug>/ with a draft personal_brand_profile.json, a blank
 * interview_answers.json (ready for /coach-interview), and a voice_samples/ folder
 * for the person to drop existing writing into. No gates, no discovery yet — this is
 * just the front door. Mirrors the row to Supabase best-effort (NO-OP offline).
 *
 * Usage:
 *   node skills/enroll/enroll.js "Jane Doe"            # slug derived from name
 *   node skills/enroll/enroll.js "Jane Doe" --slug jane
 */

import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "../../scripts/lib/load-env.js";
import { saveProfile, writeClientJson, clientDir } from "../../scripts/lib/profile.js";
import { interviewAnswers } from "../../schemas/index.js";
import { insert } from "../../scripts/lib/supabase.js";

loadEnv();

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--slug");
  if (!name) {
    console.error('Usage: node skills/enroll/enroll.js "<Full Name>" [--slug <slug>]');
    process.exit(1);
  }
  const slug = slugify(argVal(args, "--slug") || name);
  if (!slug) throw new Error("could not derive a slug — pass --slug explicitly");

  const dir = clientDir(slug);
  if (existsSync(resolve(dir, "personal_brand_profile.json"))) {
    console.error(`[enroll] ${slug} already enrolled at ${dir}`);
    process.exit(2);
  }

  // Draft profile (no stage validation — discovery fills it in).
  saveProfile(slug, { name, status: "draft" });

  // Blank interview scaffold + voice sample drop-folder.
  writeClientJson(slug, "interview_answers.json", interviewAnswers.normalize({ slug }));
  mkdirSync(resolve(dir, "voice_samples"), { recursive: true });

  // Best-effort persistence mirror.
  try { await insert("people", [{ slug, name, status: "draft" }]); } catch { /* offline / not configured */ }

  console.log(JSON.stringify({
    skill: "enroll",
    slug,
    name,
    client_dir: dir,
    next: "run /coach-interview {slug} — the expert coach interview (one question at a time). Drop existing writing into voice_samples/ for triangulation + voice capture.",
  }, null, 2));
}

main().catch((e) => { console.error("[enroll] FATAL:", e.message); process.exit(1); });
