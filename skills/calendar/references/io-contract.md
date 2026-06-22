# /calendar — I/O contract

## CLI
```
node skills/calendar/calendar.js <slug>                          # 4 weeks starting today
node skills/calendar/calendar.js <slug> --weeks 8 --start 2026-07-01
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--weeks N` | 4 | horizon length in weeks (positive integer) |
| `--start YYYY-MM-DD` | today | first week's start date |

## Inputs (read, not authored)
- `clients/{slug}/personal_brand_profile.json` — must validate at stage `complete`. Uses
  `cadence.weekly_volume`, `cadence.formats`, `cadence.sustainability_note`,
  `platform_plan.primary_platform`.
- `clients/{slug}/content_pillars.json` — must validate (3–5 pillars with weights + angles).

## Output — `content_calendar.json`
```json
{
  "client_slug": "jane",
  "status": "planned",
  "start_date": "2026-07-01",
  "horizon_weeks": 4,
  "posts_per_week": 3,
  "primary_platform": "LinkedIn",
  "slots": [
    {
      "date": "2026-07-01", "week": 1,
      "pillar_id": "CALM_SYSTEMS", "pillar_name": "Calm systems",
      "platform": "LinkedIn", "format": "text",
      "angle": "3 org smells that look like tech debt",
      "status": "planned"
    }
  ],
  "cadence_note": "batch on Sundays"
}
```
- `slots.length == horizon_weeks × posts_per_week`.
- `posts_per_week` is parsed from `cadence.weekly_volume` and never exceeds it.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad/missing args (`--weeks`, `--start`) |
| 3 | constitution not `complete`, or pillars missing/invalid (run the prior phase) |
| 4 | a scheduled angle was blocked by the authenticity guard |
| 5 | `cadence.weekly_volume` has no usable number, or the calendar failed schema validation |
