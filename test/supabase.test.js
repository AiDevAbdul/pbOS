import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseConfigured, insert, upsert, select } from "../scripts/lib/supabase.js";

// pbOS Phase 1 runs fully offline: persistence is best-effort and must NO-OP when
// SUPABASE_URL/SERVICE_KEY are unset, never throwing or blocking a deliverable.

test("supabase NO-OPs when unconfigured", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  assert.equal(supabaseConfigured(), false);
  assert.deepEqual(await insert("people", [{ slug: "x" }]), { skipped: true, reason: "SUPABASE_URL/SUPABASE_SERVICE_KEY not set" });
  assert.deepEqual(await upsert("people", [{ slug: "x" }], "slug"), { skipped: true, reason: "SUPABASE_URL/SUPABASE_SERVICE_KEY not set" });
  assert.deepEqual(await select("people", { slug: "eq.x" }), { skipped: true, reason: "SUPABASE_URL/SUPABASE_SERVICE_KEY not set" });
});

test("insert/upsert NO-OP on empty arrays even if it were configured", async () => {
  assert.deepEqual(await insert("people", []), []);
  assert.deepEqual(await upsert("people", [], "slug"), []);
});
