// scripts/lib/voice.js — offline voice-capture heuristics.
//
// Voice is the crown jewel: the OS must sound like the PERSON. This module derives
// objective, repeatable signals from the person's existing writing (or an elicited
// transcript) WITHOUT any external NLP service — sentence rhythm, first/second/third
// person balance, signature n-grams, and a frequent-word lexicon. Claude reads these
// metrics + the raw samples and authors the qualitative voice fields; /voice then
// assembles the voice_profile. Keeping analysis offline means it's deterministic and
// runs with zero credentials.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, extname } from "node:path";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "your", "you", "are", "was", "have",
  "from", "about", "into", "very", "much", "they", "but", "not", "all", "can", "will",
  "what", "when", "how", "why", "who", "our", "out", "get", "got", "just", "like",
]);

const FIRST = new Set(["i", "me", "my", "mine", "we", "us", "our", "ours", "i'm", "i've", "i'll"]);
const SECOND = new Set(["you", "your", "yours", "you're", "you've", "you'll"]);
const THIRD = new Set(["he", "she", "they", "them", "him", "her", "his", "their", "theirs", "it", "its"]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text) {
  return String(text || "").split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}

function topN(counter, n) {
  return [...counter.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n)
    .map(([k]) => k);
}

/**
 * Analyze an array of writing samples into a deterministic metrics object that
 * matches schemas/voice_profile.js → metrics. Pure (no I/O).
 */
export function analyzeSamples(samples = []) {
  const texts = samples.map((s) => String(s || "")).filter((s) => s.trim());
  const joined = texts.join("\n\n");
  const words = tokenize(joined);
  const sents = texts.flatMap(sentences);

  let first = 0, second = 0, third = 0;
  for (const w of words) {
    if (FIRST.has(w)) first++;
    else if (SECOND.has(w)) second++;
    else if (THIRD.has(w)) third++;
  }
  const pronounTotal = first + second + third || 1;
  const ratio = (n) => Number((n / pronounTotal).toFixed(2));

  // Content-word lexicon.
  const lex = new Map();
  for (const w of words) {
    if (w.length >= 4 && !STOP.has(w)) lex.set(w, (lex.get(w) || 0) + 1);
  }

  // Signature 2- and 3-grams (skip grams that are entirely stopwords).
  const grams = new Map();
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const slice = words.slice(i, i + n);
      if (slice.every((w) => STOP.has(w))) continue;
      const g = slice.join(" ");
      grams.set(g, (grams.get(g) || 0) + 1);
    }
  }

  return {
    sample_count: texts.length,
    word_count: words.length,
    avg_sentence_length: sents.length ? Number((words.length / sents.length).toFixed(1)) : null,
    person_ratio: { first: ratio(first), second: ratio(second), third: ratio(third) },
    top_ngrams: topN(grams, 8),
    top_lexicon: topN(lex, 12),
  };
}

/** Read .txt / .md writing samples from clients/<slug>/voice_samples/. */
export function readSamplesDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (![".txt", ".md"].includes(extname(f).toLowerCase())) continue;
    try { out.push(readFileSync(resolve(dir, f), "utf8")); } catch { /* skip unreadable */ }
  }
  return out;
}
