import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSamples } from "../scripts/lib/voice.js";

const SAMPLE = [
  "I love writing about systems. Writing every day made me sharper.",
  "Systems thinking and writing are my edge. I write to think.",
];

test("analyzeSamples is deterministic and surfaces signature topics", () => {
  const a = analyzeSamples(SAMPLE);
  const b = analyzeSamples(SAMPLE);
  assert.deepEqual(a, b); // pure
  assert.equal(a.sample_count, 2);
  assert.ok(a.word_count > 0);
  assert.ok(a.avg_sentence_length > 0);
  assert.ok(a.top_lexicon.includes("writing") || a.top_lexicon.includes("systems"));
});

test("analyzeSamples handles empty input without throwing", () => {
  const a = analyzeSamples([]);
  assert.equal(a.sample_count, 0);
  assert.equal(a.avg_sentence_length, null);
  assert.deepEqual(a.top_lexicon, []);
});

test("person_ratio favors first person for an I-heavy writer", () => {
  const a = analyzeSamples(SAMPLE);
  assert.ok(a.person_ratio.first >= a.person_ratio.second);
});
