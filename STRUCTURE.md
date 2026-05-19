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
│   ├── agent.ts           # Thin CLI entry: calls runAgent(), logs JSON
│   ├── index.ts           # Re-exports runAgent() from agents/index.ts
│   ├── model.ts           # LLM model config (OpenRouter/Owl Alpha)
│   ├── prompts.ts         # All LLM prompt templates
│   ├── store.ts           # File-backed journal storage (read/addEntry)
│   ├── update-readme.ts   # Standalone CLI: updates README.md with latest entry
│   └── agents/            # Multi-agent pipeline
│       ├── index.ts       # Barrel exports + createAgents() factory
│       ├── base.ts        # BaseAgent abstract class (ask, extractJSON)
│       ├── orchestrator.ts# OrchestratorAgent + runAgent() convenience
│       ├── curator.ts     # CuratorAgent — picks words, fetches definitions
│       ├── poet.ts        # PoetAgent — composes/revises haikus
│       ├── designer.ts    # DesignerAgent — creates/redesigns visual treatments
│       ├── critic.ts      # CriticAgent — reviews haiku + entry for duplication
│       └── validators.ts  # Programmatic validation helpers (uniqueness checks)
└── public/                # Frontend (vanilla JS, no build step)
    ├── app.js             # Init: loads entries, binds keyboard/hash routing
    ├── state.js           # Global state: entries array, current index
    ├── render.js          # Renders current entry into #app
    ├── background.js      # Animated gradient background transitions
    ├── style.css          # All styles (no preprocessor)
    └── favicon.svg
```

## Backend Layer (`src/`)

### Entry Points
- **`agent.ts`** — thin wrapper: imports `runAgent` from `agents/orchestrator.ts`, runs it, logs the result as JSON. Run via `npx tsx src/agent.ts` or `npm run generate`.
- **`index.ts`** — re-exports `runAgent` from `agents/index.ts` (legacy compatibility).
- **`update-readme.ts`** — standalone CLI entry point. Reads latest entry from `data.json`, replaces content between `<!-- HAIKU-START -->` / `<!-- HAIKU-END -->` markers in `README.md`. Run via `npx tsx src/update-readme.ts`.

### Agent System (`agents/`)

The pipeline uses four specialist agents, each with its own isolated LLM session:

| Agent | File | Responsibility |
|-------|------|----------------|
| **Curator** | `curator.ts` | Picks evocative words, fetches dictionary definitions |
| **Poet** | `poet.ts` | Composes and revises 5-7-5 haikus |
| **Designer** | `designer.ts` | Creates visual treatments (colors, font, signature) |
| **Critic** | `critic.ts` | Reviews candidates against existing entries for duplication |

Plus:
- **`base.ts`** — `BaseAgent` abstract class. Provides `ask()` and `extractJSON()`.
- **`orchestrator.ts`** — `OrchestratorAgent` coordinates the four agents through the pipeline. Also exports `runAgent()` convenience function.
- **`validators.ts`** — pure functions for programmatic checks: `isWordUnique`, `isWordInHaiku`, `isFontUnique`, `isColorPaletteDuplicate`.
- **`index.ts`** — barrel exports for all agents, types, and `createAgents()` factory.

### Orchestration (`orchestrator.ts`)
The `OrchestratorAgent.run()` pipeline:
1. **Pick** — Curator picks a word (programmatic uniqueness check, retries)
2. **Define** — Curator fetches dictionary definition (with fallback word suggestions if not found)
3. **Compose** — Poet composes haiku (programmatic: word must appear in haiku; fuzzy: Critic reviews for similarity; retries on failure)
4. **Design** — Designer creates visual treatment (programmatic: font + color palette uniqueness; fuzzy: Critic reviews signature; retries on failure)
5. **Save** — Entry prepended to `data.json`

Each agent gets its own `AgentSession` created via `createAgents()`, which creates all four sessions in parallel.

### Storage (`store.ts`)
- `Store` class wraps `data.json` with an in-memory cache.
- `read()` returns `StoreData` — `{ entries: Entry[] }` (with graceful fallback to `{ entries: [] }` on missing/invalid file).
- `addEntry(entry)` prepends and writes atomically.

### Model (`model.ts`)
- Exports `createModel()` returning a `Model<"openai-completions">` config for OpenRouter.
- Model ID: `openrouter/owl-alpha`.
- Context window: 1,048,756 tokens. Max output: 262,144 tokens.

### Prompts (`prompts.ts`)
- One exported function per prompt variant. All take relevant context and return a string.
- `BANNED_WORDS` is a comma-separated string interpolated into haiku prompts.
- Prompt families: `pickWordPrompt` / `fallbackWordPrompt` (Curator), `haikuPrompt` / `haikuRetryPrompt` / `haikuRegeneratePrompt` / `haikuSimplePrompt` (Poet), `designPrompt` / `designRetryPrompt` / `designRegeneratePrompt` / `designSimplePrompt` (Designer), `validatePrompt` (Critic).

## Core Types

```typescript
// Entry — the core journal unit (also in store.ts)
interface Entry {
  timestamp: string;
  word: string;
  phonetic: string;
  definition: string;
  haiku: string[];
  colors: string[];
  font: string;
  fontUrl: string;
  fontColor: string;
  sourceUrl: string;
  signature: string;
}

// Haiku — returned by PoetAgent
interface Haiku {
  lines: [string, string, string];
}

// VisualTreatment — returned by DesignerAgent
interface VisualTreatment {
  colors: string[];
  fontUrl: string;
  fontFamily: string;
  fontColor: string;
  signature: string;
}

// Verdict — returned by CriticAgent
interface Verdict {
  approved: boolean;
  reason?: string;
}

// DictionaryEntry — returned by CuratorAgent / dictionary API
interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
  sourceUrls: string[];
}
```

## Frontend (`public/`)

No framework or build step. ES modules loaded directly by the browser.

- **`state.js`** — holds `entries[]` and `currentIndex`. `loadEntries()` fetches `data.json` (cache-busted with `?v=` timestamp). `navigateTo()` updates index and URL hash.
- **`app.js`** — initializes: loads entries, binds keyboard (←→, Home/0) and hash routing, exposes `window.app.navigate`.
- **`render.js`** — reads current entry from state, builds full HTML for the page (top bar, haiku stage, bottom bar with swatches), injects font stylesheets, binds nav click handlers. Also injects `Gentium Plus` font for phonetic display. Uses `hexLuminance()` to determine dark/light text for secondary UI elements.
- **`background.js`** — manages animated gradient `div.bg-layer` elements. Cross-fades between old and new backgrounds on navigation using opacity transitions. Five layered gradients animated with `@keyframes morph`.
- **`style.css`** — single file. Uses CSS custom properties sparingly. Responsive via `clamp()` and mobile-first `@media (min-width: 640px)`. Staggered `fadeUp` animations on entry elements.

## Data Flow

```
GitHub Actions (hourly)
  → npx tsx src/agent.ts
    → OrchestratorAgent.run()
      → CuratorAgent.pickWord() → dictionaryapi.dev
      → CuratorAgent.define()  → dictionaryapi.dev
      → PoetAgent.compose()    → OpenRouter
      → CriticAgent.reviewHaiku() → OpenRouter
      → DesignerAgent.createVisualTreatment() → OpenRouter
      → CriticAgent.reviewEntry() → OpenRouter
    → Store.addEntry() → data.json
  → npx tsx src/update-readme.ts → README.md
  → git commit + push

Browser
  → data.json (fetch, cache-busted)
  → state.js (loadEntries)
  → render.js (build DOM)
  → background.js (animate gradient)
```

## Key Conventions

- **Newest-first ordering** — `data.json` entries are prepended, so `entries[0]` is always latest.
- **Session isolation** — each agent gets its own `AgentSession` to prevent context leakage.
- **Graceful JSON parsing** — `BaseAgent.extractJSON()` tries raw parse, then regex extraction of the first `{...}` block. Used everywhere LLM output is parsed.
- **Font URL format** — Google Fonts CSS2 API: `https://fonts.googleapis.com/css2?family=<name>:wght@<weights>&display=swap`
- **Validation is two-tier** — programmatic checks (uniqueness, word-in-haiku) run in the orchestrator; fuzzy similarity checks run through the Critic agent.
- **Max 3 retries** per validation failure. After max retries, the pipeline throws (does not save).
