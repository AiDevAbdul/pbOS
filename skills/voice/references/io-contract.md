# /voice — I/O contract

## CLI
```
node skills/voice/voice.js analyze <slug>            # offline metrics from voice_samples/ (JSON)
node skills/voice/voice.js <slug> --in <voice.json>  # merge voice layer (stage: voice — needs GATE 1) + write voice_profile.json
node skills/voice/voice.js <slug> --approve-voice    # stamp GATE 2 (human only)
```

## `voice.json` (authored from analyze metrics + raw samples)
```json
{
  "tone": "direct, warm, teacherly",
  "signatures": ["here's the thing"],
  "lexicon_do": ["systems", "clarity"],
  "lexicon_dont": ["synergy", "guru"],
  "sentence_rhythm": "short opener, longer explanatory follow-up"
}
```
Requires `tone` plus at least one of `signatures` / `lexicon_do`.

## Effect
- `analyze` prints `metrics` (sample_count, word_count, avg_sentence_length, person_ratio, top_ngrams, top_lexicon).
- `--in` merges into the profile `voice` layer **only if positioning is approved** (fails closed otherwise) and writes `clients/<slug>/voice_profile.json`. `lexicon_dont` → authenticity guard avoid-list.
- `--approve-voice` stamps `voice.voice_approved_at` and sets `status: voice_approved`.

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | bad usage |
| 2 | `--in` file not found |
| 3 | `--approve-voice` with empty `tone` (refuses) |
| (throws) | stage `voice` blocked — positioning gate not stamped |
