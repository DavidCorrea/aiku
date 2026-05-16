# Structure — Aiku

## Top-Level Layout

```
aiku/
├── data.json              # Journal archive (newest-first array of Entry)
├── index.html             # Frontend entry point (loads public/app.js)
├── package.json           # Node project config, scripts: dev, generate
├── tsconfig.json          # TypeScript config (ES2023, NodeNext modules)
├── README.md              # Project docs + latest haiku (auto-updated)
├── .github/
│   └── workflows/
│       └── haiku-creation.yml   # Hourly GitHub Actions pipeline
├── src/                   # Backend agent code (TypeScript)
│   ├── agent.ts           # Orchestrator — runs the 5-step pipeline
│   ├── index.ts           # CLI entry point (calls runAgent, logs JSON)
│   ├── model.ts           # LLM model config (OpenRouter/Owl Alpha)
│   ├── prompts.ts         # All LLM prompt templates
│   ├── steps.ts           # Individual pipeline step implementations
│   ├── store.ts           # File-backed journal storage (read/addEntry)
│   └── update-readme.ts   # Updates README.md with latest entry
└── public/                # Frontend (vanilla JS, no build step)
    ├── app.js             # Init: loads entries, binds keyboard/hash routing
    ├── state.js           # Global state: entries array, current index
    ├── render.js          # Renders current entry into #app
    ├── background.js      # Animated gradient background transitions
    ├── style.css          # All styles (no preprocessor)
    └── favicon.svg
```

## Backend Layer (`src/`)

### Orchestration
- **`agent.ts`** — the main pipeline. Creates 4 agent sessions, runs 5 steps, handles retry logic. Exports `runAgent()`.
- **`index.ts`** — thin CLI wrapper around `runAgent()`. Run via `npx tsx src/agent.ts` or `npm run generate`.

### Steps (`steps.ts`)
Each step is an async function that takes an `AgentSession` and returns structured data:
1. `pickWord(session, usedWords)` → `string`
2. `fetchDefinition(session, word)` → `DictionaryEntry`
3. `generateHaiku(session, word, definition, pos)` → `HaikuResult`
4. `regenerateHaiku(session, word)` → `HaikuResult` (used on retry)
5. `generateDesign(session, haikuText, usedFonts, usedPalettes)` → `DesignResult`
6. `regenerateDesign(session, haikuText)` → `DesignResult` (used on retry)
7. `validateCandidate(candidate, existing, session)` → `{ approved, reason }`

Internal helpers: `collectAgentText`, `extractJSON`, `extractDesign`, `parseHaiku`, `parseDesign`.

### Storage (`store.ts`)
- `Store` class wraps `data.json` with an in-memory cache.
- `read()` returns `StoreData` — `{ entries: Entry[] }` (with graceful fallback to `{ entries: [] }` on missing/invalid file).
- `addEntry(entry)` prepends and writes atomically.

### Model (`model.ts`)
- Exports `createModel()` returning a `Model<"openai-completions">` config for OpenRouter.
- Model ID: `openrouter/owl-alpha`.

### Prompts (`prompts.ts`)
- One exported function per prompt variant. All take relevant context and return a string.
- `BANNED_WORDS` is a comma-separated string interpolated into haiku prompts.

## Frontend (`public/`)

No framework or build step. ES modules loaded directly by the browser.

- **`state.js`** — holds `entries[]` and `currentIndex`. `loadEntries()` fetches `data.json`. `navigateTo()` updates index and URL hash.
- **`app.js`** — initializes: loads entries, binds keyboard (←→, Home/0) and hash routing, exposes `window.app.navigate`.
- **`render.js`** — reads current entry from state, builds full HTML for the page (top bar, haiku stage, bottom bar with swatches), injects font stylesheets, binds nav click handlers.
- **`background.js`** — manages animated gradient `div.bg-layer` elements. Cross-fades between old and new backgrounds on navigation.
- **`style.css`** — single file. Uses CSS custom properties sparingly. Responsive via `clamp()` and mobile-first `@media (min-width: 640px)`.

## Data Flow

```
GitHub Actions (hourly)
  → src/agent.ts (5-step pipeline)
  → data.json (Store.addEntry)
  → README.md (update-readme.ts)

Browser
  → data.json (fetch)
  → state.js (loadEntries)
  → render.js (build DOM)
  → background.js (animate gradient)
```

## Key Conventions

- **Newest-first ordering** — `data.json` entries are prepended, so `entries[0]` is always latest.
- **Session isolation** — each pipeline step uses a separate `AgentSession` to prevent context leakage.
- **Graceful JSON parsing** — `extractJSON()` tries raw parse, then regex extraction of the first `{...}` block. Used everywhere LLM output is parsed.
- **Font URL format** — Google Fonts CSS2 API: `https://fonts.googleapis.com/css2?family=<name>:wght@<weights>&display=swap`
