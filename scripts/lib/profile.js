// scripts/lib/profile.js — shared load/merge/save/gate helper for the discovery pipeline.
//
// The five skills each contribute layers to clients/<slug>/personal_brand_profile.json.
// They must MERGE (never clobber a prior layer) and validate their stage against the
// canonical schema, asserting the prior human gate is stamped. This centralizes that so
// /enroll, /coach-interview, /positioning, /voice, /constitution behave identically and
// a renamed field can't silently break the chain. (Mirrors smOS scripts/lib/brand.js.)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as profileSchema from "../../schemas/personal_brand_profile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

export function clientDir(slug) {
  return resolve(ROOT, "clients", slug);
}

export function profilePath(slug) {
  return resolve(clientDir(slug), "personal_brand_profile.json");
}

/** Absolute path to any per-person file (interview_answers.json, voice_profile.json, …). */
export function clientFile(slug, filename) {
  return resolve(clientDir(slug), filename);
}

/** Read a per-person JSON file, or null if absent/unparseable. */
export function readClientJson(slug, filename) {
  const p = clientFile(slug, filename);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

/** Write a per-person JSON file (creating the client dir if needed). */
export function writeClientJson(slug, filename, data) {
  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = clientFile(slug, filename);
  writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

/** Load the existing personal brand profile (normalized) or a fresh draft skeleton. */
export function loadProfile(slug) {
  const p = profilePath(slug);
  if (existsSync(p)) {
    return profileSchema.normalize(JSON.parse(readFileSync(p, "utf8")));
  }
  return profileSchema.normalize({ client_slug: slug, status: "draft" });
}

/** Deep-merge `patch` into the existing profile, normalize, validate the stage,
 *  then write. Throws (fail-closed) if the stage doesn't validate — including when
 *  the prior human gate is not yet stamped. */
export function saveProfile(slug, patch, { stage } = {}) {
  const current = loadProfile(slug);
  const merged = deepMerge(current, patch);
  merged.client_slug = slug;
  const normalized = profileSchema.normalize(merged);
  if (stage) {
    const v = profileSchema.validate(normalized, { stage });
    if (!v.ok) {
      throw new Error(`personal_brand_profile (${stage}) failed validation:\n  - ${v.errors.join("\n  - ")}`);
    }
  }
  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(profilePath(slug), JSON.stringify(normalized, null, 2));
  return normalized;
}

/** Stamp a human-approval gate (positioning / voice) with an ISO timestamp. These
 *  are the load-bearing checkpoints AI must never auto-clear — a skill only calls
 *  this on an explicit --approve flag passed by the human operator. */
export function stampGate(slug, gate) {
  const map = {
    positioning: ["positioning", "positioning_approved_at", "positioning_approved"],
    voice: ["voice", "voice_approved_at", "voice_approved"],
  };
  const spec = map[gate];
  if (!spec) throw new Error(`stampGate: unknown gate "${gate}" (use positioning|voice)`);
  const [layer, field, status] = spec;
  const current = loadProfile(slug);
  current[layer][field] = new Date().toISOString();
  current.status = status;
  current.client_slug = slug;
  writeFileSync(profilePath(slug), JSON.stringify(current, null, 2));
  return current;
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch;
  if (patch && typeof patch === "object" && base && typeof base === "object" && !Array.isArray(base)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(base[k] ?? {}, v) : v;
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

export { ROOT };
