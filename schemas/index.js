// schemas/index.js — canonical artifact contracts for the pbOS discovery pipeline.
//
// Every producer and consumer of a handoff JSON imports the SAME module here, so a
// field rename can never silently break a chain. Each artifact module exports:
//   normalize(raw)  -> lenient: coerces drifted/aliased shapes to ONE canonical shape
//   validate(obj)   -> fail-closed: { ok, errors[] } naming every missing/bad field

export * as shared from "./_shared.js";
export { SchemaError, assertValid, slugId } from "./_shared.js";

export * as personalBrandProfile from "./personal_brand_profile.js";
export * as interviewAnswers from "./interview_answers.js";
export * as voiceProfile from "./voice_profile.js";
