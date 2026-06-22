/**
 * pbOS guardrails — single source of truth for the AUTHENTICITY moat.
 *
 * A personal brand's integrity is its only real asset. The authenticity guard is
 * the personal-brand equivalent of smOS's brand-compliance guard: it refuses to let
 * the OS publish anything that (1) uses language the person has banned, (2) fabricates
 * credentials/stories/expertise they don't have, or (3) puts words in their mouth they
 * would never say. Every check is a pure function returning { ok, reason }; the
 * chokepoint guardContentWrite() composes them and throws a GuardError (fail-closed).
 *
 * Phase 1 ships and unit-tests this guard AHEAD of the content skills that will call
 * it — the same "build the safety rail before the road" pattern smOS used. Detection
 * is deterministic (whole-word regex + fact-trace), never a vibe check — guards must
 * never guess.
 */

export class GuardError extends Error {
  constructor(reason, ruleName) {
    super(reason);
    this.name = "GuardError";
    this.guard = ruleName || "guard";
    this.blocked = true;
  }
}

const PASS = { ok: true };
function fail(reason) { return { ok: false, reason }; }

// Authority-claim patterns. A claim that matches must TRACE to a recorded credential
// or defining experience, or it's treated as fabrication. Conservative on purpose —
// only unambiguous authority assertions, so ordinary copy isn't false-flagged.
const CLAIM_PATTERNS = [
  /\b(ph\.?d|mba|m\.?d|jd|certified|licensed|accredited|board[- ]certified)\b/gi,
  /\b(award[- ]winning|best[- ]?selling|world[- ]renowned|internationally recognized|#1|number one)\b/gi,
  /\b(\d+)\+?\s+years?\b/gi, // tenure claims, e.g. "10 years", "20+ years"
];

const TEXT_KEYS = /^(text|primary_text|message|body|headline|title|caption|hook|description)$/i;

/** Gather all text fields from a content object (or pass a raw string). */
function gatherText(content, acc = []) {
  if (content == null) return acc.join(" ");
  if (typeof content === "string") { acc.push(content); return acc.join(" "); }
  if (typeof content !== "object") return acc.join(" ");
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === "string" && TEXT_KEYS.test(k)) acc.push(v);
    else if (v && typeof v === "object") gatherText(v, acc);
  }
  return acc.join(" ");
}

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Resolve the effective avoid-list: banned voice words + things the person won't say. */
function collectAvoid(voice, profile) {
  const out = new Set();
  for (const w of voice?.lexicon_dont || []) if (w) out.add(String(w).toLowerCase());
  for (const w of profile?.voice?.lexicon_dont || []) if (w) out.add(String(w).toLowerCase());
  for (const w of profile?.boundaries?.never_say || []) if (w) out.add(String(w).toLowerCase());
  return [...out];
}

/** The recorded facts a claim is allowed to lean on (credentials + defining experiences). */
function credentialText(profile) {
  const parts = [
    ...(profile?.identity?.credentials || []),
    ...(profile?.identity?.defining_experiences || []),
  ];
  return parts.filter(Boolean).join(" \n ").toLowerCase();
}

/**
 * The authenticity check. Pass the content to publish plus the person's voice
 * profile and/or personal_brand_profile. Three deterministic, fail-closed dimensions.
 */
export function checkAuthenticity({ content, voice = null, profile = null } = {}) {
  const text = gatherText(content);
  if (!text.trim()) return PASS;
  const lower = text.toLowerCase();
  const violations = [];

  // 1. Off-voice / banned language (whole-word, no substring false positives).
  const avoid = collectAvoid(voice, profile);
  const avoidHits = avoid.filter((w) => new RegExp(`\\b${escapeRegex(w)}\\b`, "i").test(text));
  if (avoidHits.length) violations.push(`off-voice / banned language: ${avoidHits.join(", ")}`);

  // 2. Fabricated credentials / expertise — every authority claim must trace to a fact.
  const creds = credentialText(profile);
  const unsupported = [];
  for (const re of CLAIM_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const claim = m[0].toLowerCase();
      if (!creds.includes(claim)) unsupported.push(m[0]);
    }
  }
  if (unsupported.length) {
    violations.push(`unsubstantiated authority claim(s) not traceable to recorded credentials: ${[...new Set(unsupported)].join(", ")}`);
  }

  // 3. No-go topics (putting words in their mouth on things they won't touch).
  const noGo = (profile?.boundaries?.no_go_topics || []).map((t) => String(t).toLowerCase()).filter(Boolean);
  const topicHits = noGo.filter((t) => lower.includes(t));
  if (topicHits.length) violations.push(`no-go topic(s): ${topicHits.join(", ")}`);

  if (violations.length) return fail(`authenticity BLOCKED: ${violations.join("; ")}`);
  return PASS;
}

/**
 * The single chokepoint. Future content skills (write/repurpose/publish) call this
 * before emitting anything in the person's name; it throws GuardError on the first
 * block so off-brand or fabricated content never ships.
 */
export function guardContentWrite({ content, voice, profile } = {}) {
  const r = checkAuthenticity({ content, voice, profile });
  if (!r.ok) throw new GuardError(r.reason, "authenticity");
}
