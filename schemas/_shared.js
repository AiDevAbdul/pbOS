// schemas/_shared.js — shared primitives for every canonical artifact schema.
//
// Philosophy (mirrors the smOS chassis this OS is built on):
//   - normalize(raw): LENIENT. Accepts today's drifted field names (aliases) and
//     coerces to ONE canonical shape. Never throws. Producers call this before
//     writing; consumers call this after reading. Both then see identical keys.
//   - validate(obj): FAIL-CLOSED. Returns { ok, errors[] } listing every missing
//     or malformed REQUIRED field. Consumers halt on !ok rather than silently
//     reading null.
//
// The whole point: producer and consumer import the SAME module, so a rename can
// never silently break a handoff — the validator names the offending field.

export class SchemaError extends Error {
  constructor(artifact, errors) {
    super(`${artifact} failed schema validation:\n  - ${errors.join("\n  - ")}`);
    this.name = "SchemaError";
    this.artifact = artifact;
    this.errors = errors;
  }
}

/** First non-undefined/non-null value among the given keys on obj. */
export function pick(obj, ...keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Stable, deterministic id from a human label. Pure (no randomness, no
 * timestamps) so the same label always produces the same id on every run.
 *   "Lead Gen"   -> "LEAD_GEN"
 *   "Founder / TL" -> "FOUNDER_TL"
 */
export function slugId(name) {
  if (!isNonEmptyString(name)) return "";
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Build a { ok, errors } result; ok iff errors is empty. */
export function result(errors) {
  return { ok: errors.length === 0, errors };
}

/**
 * Assert a normalized object validates, or throw SchemaError. Producers use this
 * right before writeFileSync; consumers use it right after readFileSync+normalize.
 */
export function assertValid(artifact, obj, validateFn) {
  const r = validateFn(obj);
  if (!r.ok) throw new SchemaError(artifact, r.errors);
  return obj;
}
