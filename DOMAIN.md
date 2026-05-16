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

### Agent Session
An isolated conversation with the LLM. The agent uses four independent sessions per run — one each for picking, composing, designing, and validating — so that context from one step doesn't leak into another.

### Validation
A separate agent checks each candidate against existing entries for duplication. If rejected, the haiku and design are regenerated (up to 3 retries). After max retries, the entry is saved anyway to avoid blocking the pipeline.

## Business Rules

- **Each word must be unique** across the entire journal. The validator rejects duplicates.
- **Banned words** — the haiku prompt forbids: silicon, neural, data, algorithm, digital, machine, robot, circuit, binary, pixel, ghost. These are overused AI clichés.
- **Font variety** — the design prompt encourages picking fonts different from what's already used, but it's a soft preference, not a hard rule.
- **Color overlap allowed** — similar palettes are fine as long as the haiku and font differ.
- **Graceful degradation** — if JSON parsing fails at any step, the agent retries once with a simpler prompt. If validation parsing fails, the entry is auto-approved.

## External Dependencies

- **dictionaryapi.dev** — free English dictionary API (Wiktionary-sourced). No auth required.
- **OpenRouter** — LLM API gateway. Uses model `openrouter/owl-alpha`. Requires `OPENROUTER_API_KEY` secret.
- **Google Fonts CSS2 API** — provides font stylesheets. The agent constructs URLs like `https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap`.
