# Domain — Aiku

## What is Aiku?

An AI-powered haiku journal. An agent runs hourly to generate a new haiku entry, each paired with a unique color palette and font. Results are committed to `data.json` and displayed on a web frontend.

## Domain Concepts

### Entry
The core unit of the journal. Each entry contains:
- **word** — the chosen evocative English word
- **phonetic** — pronunciation string from the dictionary API
- **definition** — the word's dictionary definition
- **haiku** — a 3-line haiku (5-7-5 syllables) connecting the word to AI
- **colors** — 5 hex color codes forming a visual palette
- **font** — a Google Font name
- **fontUrl** — the Google Fonts CSS2 API URL for the font
- **fontColor** — hex color for text, chosen to contrast with the palette
- **sourceUrl** — link to the dictionary source
- **signature** — a short eerie phrase in the voice of an artificial mind
- **timestamp** — ISO 8601 creation time

### Journal
The ordered collection of all palette entries, stored in `data.json`. New entries are prepended (newest first). The journal is the single source of truth; the README and frontend both derive from it.

The README is updated as a separate step in the GitHub Actions workflow (via `update-readme.ts`), not by the agent pipeline itself.

### Agent Session
An isolated conversation with the LLM. The agent uses four independent sessions per run — one each for picking, composing, designing, and validating — so that context from one step doesn't leak into another.

### Validation
Validation is two-tier:
1. **Programmatic checks** — the orchestrator enforces word uniqueness, word-in-haiku presence, font uniqueness, and color palette uniqueness directly in code.
2. **Fuzzy checks** — the Critic agent reviews haiku and signature similarity against existing entries.

If any check fails, the haiku or design is regenerated (up to 3 retries). After max retries, the pipeline **throws an error** — it does not save a duplicate entry. The only graceful degradation is in JSON parsing: if the Critic's response can't be parsed, the entry is auto-approved.

## Business Rules

- **Each word must be unique** across the entire journal. The validator rejects duplicates.
- **Banned words** — the haiku prompt forbids: silicon, neural, data, algorithm, digital, machine, robot, circuit, binary, pixel, ghost. These are overused AI clichés.
- **Font variety** — the design prompt encourages picking fonts different from what's already used, but it's a soft preference, not a hard rule.
- **Color overlap allowed** — similar palettes are fine as long as the haiku and font differ.
- **Graceful degradation** — if JSON parsing fails at any step, the agent retries once with a simpler prompt. If validation parsing fails, the entry is auto-approved.

## Core Types

- **Entry** — the full journal record stored in `data.json`. Contains word, phonetic, definition, haiku, colors, font, fontUrl, fontColor, sourceUrl, signature, and timestamp.
- **Haiku** — the Poet's output: `{ lines: [string, string, string] }` (5-7-5 syllables).
- **VisualTreatment** — the Designer's output: colors array, fontUrl, fontFamily, fontColor, and signature.
- **Verdict** — the Critic's output: `{ approved: boolean, reason?: string }`.
- **DictionaryEntry** — the Curator's output from the dictionary API: word, phonetic, meanings, sourceUrls.

## External Dependencies

- **dictionaryapi.dev** — free English dictionary API (Wiktionary-sourced). No auth required.
- **OpenRouter** — LLM API gateway. Uses model `openrouter/owl-alpha`. Requires `OPENROUTER_API_KEY` secret.
- **Google Fonts CSS2 API** — provides font stylesheets. The agent constructs URLs like `https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap`.
- **Gentium Plus** — loaded as a secondary font for phonetic transcription display on the frontend.
