# Voice Capture — domain standards

## Why voice is the crown jewel
For a *person*, sounding authentically like them is the whole game — it's what separates a real personal brand from generic AI output. Capture it from evidence, never invent it.

## Reading the offline metrics (`voice.js analyze`)
- **avg_sentence_length** — short (≤12) reads punchy/direct; long (≥22) reads considered/academic. Match it.
- **person_ratio** — first-person-heavy = personal/story-driven; second-person-heavy = teaching/direct-address; third-person = analytical/reporting. Encode the dominant mode.
- **top_ngrams** — candidate **signature phrases**. Keep the ones that are genuinely theirs.
- **top_lexicon** — their natural vocabulary; seeds `lexicon_do`.

## Authoring the voice fields (ground every one in the samples)
- **tone** — 2–4 adjectives the samples actually support (e.g. "direct, warm, teacherly").
- **signatures** — recurring phrases that sound like them.
- **lexicon_do** — words/concepts they reach for.
- **lexicon_dont** — words they'd never use about themselves/their work. **This becomes the authenticity guard's avoid-list** — treat it as a hard contract, not a preference.
- **sentence_rhythm** — describe the cadence (e.g. "short opener, longer explanatory follow-up").

## Rules
- **Offline only.** No external NLP — analysis is deterministic and credential-free.
- **No samples? Elicit live.** Have them talk ~2 minutes, transcribe, then analyze. Flag lower confidence.
- **Blocked before positioning.** Voice can't be locked until positioning is approved (the schema enforces it).
- **Human confirms.** The analyzer informs; the person signs off; only then `--approve-voice`.
