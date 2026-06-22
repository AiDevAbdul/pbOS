// scripts/lib/authority.js — the authority engine (Phase-3 step 3).
//
// Authority signals are pbOS's organic-first KPIs made concrete (Constitution principle 6):
// talks, features, podcasts, mentions, awards, collaborations, inbound. The ledger records
// what the person has EARNED and plans what to PURSUE. The spine is split the familiar way:
//   - authorityTargets()  → PURE. Derive a set of authority TARGETS (outlet category + pitch
//     angle) from the constitution — grounded_in real identity facts so a pitch never claims
//     authority the person doesn't have. No I/O / Date / randomness → testable.
//   - summarizeSignals()  → PURE. Count earned signals by type (the organic-first scoreboard).
//   - targetsFor()  → fail-closed target generation (profile must be "complete").
//   - loadAuthority / saveAuthority  → read/write clients/<slug>/authority_ledger.json.
//   - saveAuthority is fail-closed: profile must validate at stage "complete", the ledger must
//     pass the schema, AND every pitch angle + signal title runs through the Authenticity Guard
//     (a pitch ships in the person's name — pbOS never fabricates a credential to make it land).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { authorityLedger, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";

const AUTHORITY_FILE = "authority_ledger.json";

export function authorityPath(slug) {
  return clientFile(slug, AUTHORITY_FILE);
}

/**
 * Derive authority TARGETS from the constitution. Pure: same profile → same targets. Each
 * target is an outlet CATEGORY (never a fabricated specific outlet name) + a pitch angle built
 * from the person's positioning/contrarian view, grounded_in a real identity fact. The coach
 * refines these with the person and adds specific outlets; the seeds keep the pitch honest.
 */
export function authorityTargets(profile) {
  const p = personalBrandProfile.normalize(profile || {});
  const niche = p.positioning.niche || p.audience.who || "your field";
  const audience = p.positioning.audience || p.audience.who || "your audience";
  const ground = (label, fallback) => (isNonEmptyString(label) ? label : fallback);

  const seeds = [];
  // 1. Podcasts your audience already listens to — anchored on the zone of genius.
  seeds.push({
    kind: "podcast",
    outlet_category: `podcasts ${audience} listen to`,
    pitch_angle: p.identity.zone_of_genius
      ? `A guest spot on ${p.identity.zone_of_genius}`
      : `A guest spot on ${niche}`,
    grounded_in: ground(p.identity.zone_of_genius, p.positioning.statement),
    status: "identified",
  });
  // 2. A feature/article — anchored on the contrarian point of view (earns attention).
  if (isNonEmptyString(p.identity.contrarian_pov)) {
    seeds.push({
      kind: "feature",
      outlet_category: `industry publications covering ${niche}`,
      pitch_angle: `An op-ed on the contrarian take: ${p.identity.contrarian_pov}`,
      grounded_in: p.identity.contrarian_pov,
      status: "identified",
    });
  }
  // 3. A talk — anchored on the transformation the person delivers.
  seeds.push({
    kind: "talk",
    outlet_category: `conferences / meetups for ${audience}`,
    pitch_angle: p.positioning.transformation
      ? `A talk walking ${audience} ${p.positioning.transformation}`
      : `A talk for ${audience} on ${niche}`,
    grounded_in: ground(p.positioning.transformation, p.positioning.statement),
    status: "identified",
  });
  // 4. A collaboration — anchored on the credentials/defining experiences (real proof).
  const proof = p.identity.credentials[0] || p.identity.defining_experiences[0];
  if (isNonEmptyString(proof)) {
    seeds.push({
      kind: "collab",
      outlet_category: `peers and complementary voices in ${niche}`,
      pitch_angle: `A joint piece / session leaning on: ${proof}`,
      grounded_in: proof,
      status: "identified",
    });
  }
  return seeds;
}

/** Count earned signals by type — the organic-first authority scoreboard. Pure. */
export function summarizeSignals(signals) {
  const arr = Array.isArray(signals) ? signals : [];
  const by_type = {};
  for (const s of arr) {
    const t = isNonEmptyString(s?.type) ? String(s.type).toLowerCase() : "unknown";
    by_type[t] = (by_type[t] || 0) + 1;
  }
  return { total: arr.length, by_type };
}

/** Load the person's authority ledger (normalized) or a fresh draft skeleton. */
export function loadAuthority(slug) {
  const p = authorityPath(slug);
  if (existsSync(p)) return authorityLedger.normalize(JSON.parse(readFileSync(p, "utf8")));
  return authorityLedger.normalize({ client_slug: slug, status: "draft" });
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

/** Fail-closed target generation (profile must be "complete"). Returns { targets, profile }. */
export function targetsFor(slug) {
  const profile = requireComplete(slug, "an authority plan");
  return { targets: authorityTargets(profile), profile };
}

/**
 * Validate + persist authority_ledger.json — the earned signals + the targets to pursue. Fail-
 * closed: the profile must validate at stage "complete", the ledger must pass the schema, AND
 * every pitch angle + signal title clears the Authenticity Guard. A pitch ships in the person's
 * name; pbOS never fabricates a credential to make it land.
 */
export function saveAuthority(slug, ledgerDoc) {
  const profile = requireComplete(slug, "an authority ledger");

  const doc = authorityLedger.normalize({
    ...ledgerDoc,
    client_slug: slug,
    status: "tracked",
    generated_from: ledgerDoc?.generated_from ?? profile.positioning.statement,
  });

  const v = authorityLedger.validate(doc);
  if (!v.ok) {
    const err = new Error(`authority_ledger failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // The moat: a pitch angle and a recorded signal title both make claims in the person's name.
  for (const t of doc.targets) {
    guardContentWrite({ content: { headline: t.pitch_angle || "", body: t.outlet_category || "" }, voice: profile.voice, profile });
  }
  for (const s of doc.signals) {
    guardContentWrite({ content: { title: s.title || "", body: s.note || "" }, voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(authorityPath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
