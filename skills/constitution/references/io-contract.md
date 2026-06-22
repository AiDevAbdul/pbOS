# /constitution — I/O contract

## CLI
```
node skills/constitution/constitution.js <slug>
```

## Behavior
- Validates `personal_brand_profile.json` at stage `complete` — requires BOTH gates (`positioning_approved_at`, `voice_approved_at`) and every layer field. Blocks (exit 3) listing each gap otherwise.
- Fills `templates/person-claude.md` → `clients/<slug>/CLAUDE.md`.
- Writes `clients/<slug>/constitution.md` and renders `constitution.html` (always) + `constitution.pdf` (best-effort via Playwright).
- Sets `status: complete`.

## Template tokens (filled by constitution.js → buildVars)
`CLIENT_NAME, CLIENT_SLUG, GENERATED_DATE, GOAL_ARCHETYPE, ORIGIN_STORY, VALUES, ZONE_OF_GENIUS, CONTRARIAN_POV, CREDENTIALS, POSITIONING_STATEMENT, NICHE, POS_AUDIENCE, TRANSFORMATION, CATEGORY_OF_ONE, AUD_WHO, AUD_PAINS, AUD_DESIRES, VOICE_TONE, VOICE_SIGNATURES, LEXICON_DO, LEXICON_DONT, SENTENCE_RHYTHM, PRIMARY_PLATFORM, SECONDARY_PLATFORMS, PLATFORM_RATIONALE, WEEKLY_VOLUME, FORMATS, TIME_BUDGET, CADENCE_NOTE, PRIMARY_GOAL, KPIS, HORIZON, SWOT_STRENGTHS, SWOT_WEAKNESSES, SWOT_OPPORTUNITIES, SWOT_THREATS, NEVER_SAY, NO_GO_TOPICS`

Unfilled tokens render as `_<token>_TBD_` (visible, never silent).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | constitution assembled |
| 1 | no slug |
| 3 | profile not complete (gates/layers missing — gaps listed on stderr) |
