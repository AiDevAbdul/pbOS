// scripts/lib/supabase.js — thin PostgREST writer for skill scripts.
//
// Access pattern: row reads/writes go through PostgREST at
// SUPABASE_URL/rest/v1/<table> with the SERVICE key (bypasses RLS).
//
// Every function is a NO-OP that returns { skipped:true } when env is unset, so
// scripts run fine locally/offline without Supabase — persistence is best-effort
// and never blocks the deliverable. (pbOS Phase 1 is fully offline.)

const URL = () => process.env.SUPABASE_URL;
const KEY = () => process.env.SUPABASE_SERVICE_KEY;

export function supabaseConfigured() {
  return !!(URL() && KEY());
}

function headers(extra = {}) {
  const key = KEY();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(method, path, { body, query, prefer } = {}) {
  if (!supabaseConfigured()) return { skipped: true, reason: "SUPABASE_URL/SUPABASE_SERVICE_KEY not set" };
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const res = await fetch(`${URL()}/rest/v1/${path}${qs}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

/** Insert one or many rows. Returns inserted rows (Prefer: return=representation). */
export async function insert(table, rows) {
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return [];
  return rest("POST", table, { body: arr, prefer: "return=representation" });
}

/** Upsert rows on a conflict target (comma-separated columns, must match a unique constraint). */
export async function upsert(table, rows, onConflict) {
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return [];
  return rest("POST", table, {
    body: arr,
    query: onConflict ? { on_conflict: onConflict } : undefined,
    prefer: "return=representation,resolution=merge-duplicates",
  });
}

/** Select rows with optional PostgREST filters, e.g. select("people", { slug: "eq.jane" }). */
export async function select(table, filters = {}, columns = "*") {
  return rest("GET", table, { query: { select: columns, ...filters } });
}
