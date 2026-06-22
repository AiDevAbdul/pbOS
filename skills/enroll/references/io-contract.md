# /enroll — I/O contract

## CLI
```
node skills/enroll/enroll.js "<Full Name>" [--slug <slug>]
```

## Behavior
- Derives `slug` from the name (lowercase, hyphenated) unless `--slug` is given.
- Creates `clients/<slug>/`:
  - `personal_brand_profile.json` — `{ name, client_slug, status: "draft", ... }` (normalized skeleton)
  - `interview_answers.json` — `{ slug, answers: [], ... }`
  - `voice_samples/` — empty drop-folder for `.txt`/`.md` writing samples
- Best-effort `insert("people", [{slug,name,status}])` (NO-OP offline).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | enrolled; JSON status on stdout |
| 1 | no name provided (usage) |
| 2 | already enrolled (won't clobber) |

## stdout (success)
```json
{ "skill": "enroll", "slug": "...", "name": "...", "client_dir": "...", "next": "run /coach-interview ..." }
```
