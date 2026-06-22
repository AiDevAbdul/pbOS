// scripts/lib/pillars.js — the Content Pillars engine (first step of the content phase).
//
// Pillars are where the constitution stops being a document and starts producing. This
// module is the deterministic spine the conversational /pillars skill leans on:
//   - suggestPillarSeeds()  → turns constitution fields (zone of genius, contrarian POV,
//     positioning, audience pains, SWOT opportunities) into candidate pillar SEEDS so the
//     coach never blank-pages a theme. Pure (no I/O, no Date, no randomness) → testable.
//   - loadPillars / savePillars → read/write clients/<slug>/content_pillars.json.
//   - savePillars is fail-closed twice over: it refuses unless the profile validates at
//     stage "complete" (BOTH human gates), and it runs every pillar through the
//     Authenticity Guard — making /pillars the FIRST skill to actually ENFORCE the moat
//     that Phase 1 built ahead of the content phase.
//
// Seeds are suggestions, not pillars: the coach edits them WITH the person and the human
// confirms the final set. The schema's traceability contract (why_this_person) keeps every
// shipped pillar tied to a real fact about this individual.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { contentPillars, personalBrandProfile } from "../../schemas/index.js";
import { isNonEmptyString } from "../../schemas/_shared.js";
import { guardContentWrite } from "./guards.js";
import { loadProfile, clientDir, clientFile } from "./profile.js";

const PILLARS_FILE = "content_pillars.json";

export function pillarsPath(slug) {
  return clientFile(slug, PILLARS_FILE);
}

/** Load the person's content pillars (normalized) or a fresh draft skeleton. */
export function loadPillars(slug) {
  const p = pillarsPath(slug);
  if (existsSync(p)) return contentPillars.normalize(JSON.parse(readFileSync(p, "utf8")));
  return contentPillars.normalize({ client_slug: slug, status: "draft" });
}

/**
 * Deterministic candidate pillar seeds from the constitution. Each seed names the
 * source field in `why_this_person` so the traceability contract is satisfied by
 * construction. The coach refines these WITH the person — they are a starting point,
 * never the final set. Pure: same profile → same seeds, every run.
 */
export function suggestPillarSeeds(profile) {
  const p = personalBrandProfile.normalize(profile || {});
  const seeds = [];
  const add = (name, thesis, why, serves) => {
    if (isNonEmptyString(name) && isNonEmptyString(thesis)) seeds.push({ name, thesis, why_this_person: why, serves });
  };

  if (isNonEmptyString(p.identity.zone_of_genius))
    add(p.identity.zone_of_genius, `Teach the craft of ${p.identity.zone_of_genius}.`,
      `identity.zone_of_genius — the person's strongest, evidenced capability`, p.positioning.audience);

  if (isNonEmptyString(p.identity.contrarian_pov))
    add("Contrarian take", p.identity.contrarian_pov,
      `identity.contrarian_pov — the differentiated belief that earns attention`, p.positioning.audience);

  if (isNonEmptyString(p.positioning.transformation))
    add("The transformation", `Walk the audience through: ${p.positioning.transformation}.`,
      `positioning.transformation — the promise the brand is built on`, p.positioning.audience);

  // Audience pains → "answer the pain" pillars (the inbound/credibility engine).
  for (const pain of p.audience.pains.slice(0, 2))
    add(`Solving: ${pain}`, `Address the audience pain "${pain}" head-on with practical guidance.`,
      `audience.pains — a real, stated problem of the target audience`, pain);

  // SWOT opportunities → whitespace pillars (under-served angles competitors miss).
  for (const opp of p.swot.opportunities.slice(0, 2))
    add(opp, `Own the under-served angle: ${opp}.`,
      `swot.opportunities — market whitespace surfaced in discovery`, p.positioning.audience);

  // Stories/credentials → proof-and-story pillar (authority without fabrication).
  if (p.identity.defining_experiences.length || p.identity.credentials.length)
    add("Proof & story", `Use lived experience and real credentials as proof — never as a flex.`,
      `identity.defining_experiences / credentials — earned, recorded authority`, p.positioning.audience);

  return seeds;
}

/** Assemble the guardable text of a pillar set (names, theses, sample angles). */
function pillarText(pillars) {
  return (pillars || []).map((p) => ({
    title: p.name || "",
    description: p.thesis || "",
    body: (p.sample_angles || []).join(" \n "),
  }));
}

/**
 * Validate + persist content_pillars.json. Fail-closed twice:
 *   1. the profile must validate at stage "complete" (both human gates) — pillars are a
 *      consumer of the constitution and cannot precede it;
 *   2. the pillar set must pass the schema AND the Authenticity Guard (banned language,
 *      fabricated authority claims, no-go topics) — so an off-brand theme can't take root.
 */
export function savePillars(slug, pillarsDoc) {
  const profile = loadProfile(slug);
  const pv = personalBrandProfile.validate(profile, { stage: "complete" });
  if (!pv.ok) {
    const err = new Error(
      `content pillars require a COMPLETE constitution (both human gates) first:\n  - ${pv.errors.join("\n  - ")}`
    );
    err.code = "PROFILE_INCOMPLETE";
    throw err;
  }

  const doc = contentPillars.normalize({
    ...pillarsDoc,
    client_slug: slug,
    goal_archetype: pillarsDoc?.goal_archetype ?? profile.goal_archetype,
    generated_from: pillarsDoc?.generated_from ?? profile.positioning.statement,
    status: "drafted",
  });

  const v = contentPillars.validate(doc);
  if (!v.ok) {
    const err = new Error(`content_pillars failed validation:\n  - ${v.errors.join("\n  - ")}`);
    err.code = "SCHEMA";
    throw err;
  }

  // Enforce the authenticity moat on every pillar — the first content skill to do so.
  // Throws GuardError (fail-closed) on banned language / fabricated claims / no-go topics.
  for (const block of pillarText(doc.pillars)) {
    guardContentWrite({ content: block, voice: profile.voice, profile });
  }

  const dir = clientDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(pillarsPath(slug), JSON.stringify(doc, null, 2));
  return doc;
}
