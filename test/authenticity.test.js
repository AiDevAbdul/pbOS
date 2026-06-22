import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAuthenticity, guardContentWrite, GuardError } from "../scripts/lib/guards.js";

test("authenticity: clean on-voice content passes", () => {
  const r = checkAuthenticity({
    content: { text: "Here's the thing about shipping fast: small bets compound." },
    voice: { lexicon_dont: ["guru", "hustle"] },
  });
  assert.equal(r.ok, true);
});

test("authenticity: banned word blocks (whole-word)", () => {
  const r = checkAuthenticity({
    content: { text: "Become a 10x growth guru overnight." },
    voice: { lexicon_dont: ["guru"] },
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /banned language/);
  assert.match(r.reason, /guru/);
});

test("authenticity: banned word not tripped by a substring (class vs classic)", () => {
  const r = checkAuthenticity({
    content: { text: "This is a classic approach to the problem." },
    voice: { lexicon_dont: ["class"] },
  });
  assert.equal(r.ok, true); // "classic" must not match the word "class"
});

test("authenticity: unsubstantiated credential claim blocks", () => {
  const r = checkAuthenticity({
    content: { text: "As a certified nutritionist, I recommend this." },
    profile: { identity: { credentials: ["self-taught home cook"] } },
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /unsubstantiated authority claim/);
  assert.match(r.reason, /certified/);
});

test("authenticity: credential claim PASSES when it traces to a recorded credential", () => {
  const r = checkAuthenticity({
    content: { text: "As a certified nutritionist, I recommend this." },
    profile: { identity: { credentials: ["Certified nutritionist (Precision Nutrition L1)"] } },
  });
  assert.equal(r.ok, true);
});

test("authenticity: no-go topic blocks", () => {
  const r = checkAuthenticity({
    content: { text: "My take on the election is..." },
    profile: { boundaries: { no_go_topics: ["election"] } },
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /no-go topic/);
});

test("authenticity: guardContentWrite throws GuardError on a block", () => {
  assert.throws(
    () => guardContentWrite({ content: "lose 30 lbs guaranteed", profile: { identity: { credentials: [] } }, voice: { lexicon_dont: ["guaranteed"] } }),
    GuardError
  );
});
