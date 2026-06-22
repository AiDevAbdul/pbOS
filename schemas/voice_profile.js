// schemas/voice_profile.js — the captured voice of one person.
//
// Voice is the crown jewel of personal branding: sounding authentically like the
// PERSON is what separates a real brand from AI slop. /voice ingests existing
// writing/transcripts, runs offline heuristics (scripts/lib/voice.js), and Claude
// authors the qualitative fields. The result is mirrored into
// personal_brand_profile.voice and feeds the authenticity guard:
//   - lexicon_dont → the guard's AVOID list
//   - lexicon_do / signatures → ENFORCE hints
//
// This artifact also retains the raw metrics so the capture is auditable/repeatable.

import { pick, asArray, isNonEmptyString, isFiniteNumber, result } from "./_shared.js";

export function normalizeMetrics(raw) {
  const r = raw || {};
  return {
    sample_count: isFiniteNumber(r.sample_count) ? r.sample_count : 0,
    word_count: isFiniteNumber(r.word_count) ? r.word_count : 0,
    avg_sentence_length: isFiniteNumber(r.avg_sentence_length) ? r.avg_sentence_length : null,
    person_ratio: {
      first: r.person_ratio?.first ?? null,   // I / we
      second: r.person_ratio?.second ?? null, // you
      third: r.person_ratio?.third ?? null,   // they / it
    },
    top_ngrams: asArray(r.top_ngrams),         // signature 2–3 grams
    top_lexicon: asArray(r.top_lexicon),       // frequent content words
  };
}

export function normalize(raw) {
  const r = raw || {};
  return {
    ...r,
    slug: pick(r, "slug", "client_slug") ?? null,
    // Qualitative (Claude-authored from the metrics + samples)
    tone: pick(r, "tone") ?? null,
    signatures: asArray(pick(r, "signatures", "signature_phrases")),
    lexicon_do: asArray(pick(r, "lexicon_do", "do_words")),
    lexicon_dont: asArray(pick(r, "lexicon_dont", "dont_words", "avoid")),
    sentence_rhythm: pick(r, "sentence_rhythm", "rhythm") ?? null,
    // Quantitative (offline-derived, auditable)
    metrics: normalizeMetrics(r.metrics),
    source: pick(r, "source") ?? null, // "ingested" | "elicited"
  };
}

export function validate(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") return result(["voice_profile is not an object"]);
  const v = normalize(obj);
  if (!isNonEmptyString(v.slug)) errors.push("slug is missing");
  if (!isNonEmptyString(v.tone)) errors.push("tone is missing");
  if (!v.signatures.length && !v.lexicon_do.length)
    errors.push("voice_profile needs at least one signature phrase or lexicon_do entry");
  return result(errors);
}
