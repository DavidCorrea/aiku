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
│   ├── model.ts           # LLM model config (OpenRouter/Owl Alpha)
│   ├── prompts.ts         # All LLM prompt templates
│   ├── store.ts           # File-backed journal storage (read/addEntry)
│   ├── update-readme.ts   # Standalone CLI: updates README.md with latest entry
│   ├── validators.ts      # Programmatic validation helpers (uniqueness checks)
│   └── agents/            # Multi-agent pipeline
│       ├── index.ts       # Barrel exports + createAgents() factory
│       ├── base.ts        # BaseAgent abstract class (ask, extractJSON)
│       ├── orchestrator.ts# OrchestratorAgent + runAgent() convenience
│       ├── curator.ts     # CuratorAgent — picks words, fetches definitions
│       ├── poet.ts        # PoetAgent — composes/revises haikus
│       ├── designer.ts    # DesignerAgent — creates/redesigns visual treatments
│       ├── critic.ts      # CriticAgent — reviews haiku + entry for duplication
│       └── musician.ts    # MusicianAgent — generates chord tones + sound design
└── public/                # Frontend (vanilla JS, no build step)
    ├── app.js             # Init: loads entries, binds keyboard/hash routing
    ├── state.js           # Global state: entries array, current index
    ├── render.js          # Renders current entry into #app
    ├── background.js      # Animated gradient background transitions
    ├── audio.js           # Tone.js synth + effects chain
    ├── style.css          # All styles (no preprocessor)
    └── favicon.svg
```

## Backend Layer (`src/`)

### Entry Points
- **`agent.ts`** — thin wrapper: imports `runAgent` from `agents/orchestrator.ts`, runs it, logs the result as JSON. Run via `npx tsx src/agent.ts` or `npm run generate`.
- **`update-readme.ts`** — standalone CLI entry point. Reads latest entry from `data.json`, replaces content between `<!-- HAIKU-START -->` / `<!-- HAIKU-END -->` markers in `README.md`. Run via `npx tsx src/update-readme.ts`.

### Agent System (`agents/`)

The pipeline uses five specialist agents, each with its own isolated LLM session:

| Agent | File | Responsibility |
|-------|------|----------------|
| **Curator** | `curator.ts` | Picks evocative words, fetches dictionary definitions |
| **Poet** | `poet.ts` | Composes and revises 5-7-5 haikus |
| **Designer** | `designer.ts` | Creates visual treatments (colors, font, signature) |
| **Critic** | `critic.ts` | Reviews candidates against existing entries for duplication |
| **Musician** | `musician.ts` | Generates 3 chord tones + full sound design (synth, effects, routing) |

The Musician agent runs with `noTools: "all"` (no file system access) to ensure it returns JSON instead of writing files.

Plus:
- **`base.ts`** — `BaseAgent` abstract class. Provides `ask()` and `extractJSON()`.
- **`orchestrator.ts`** — `OrchestratorAgent` coordinates the five agents through the pipeline. Also exports `runAgent()` convenience function. Includes naive syllable counting for 5-7-5 validation.
- **`validators.ts`** — pure functions: `isWordUnique`, `isWordInHaiku`, `isFontUnique`, `isColorPaletteDuplicate`.
- **`index.ts`** — barrel exports for all agents, types, and `createAgents()` factory.

### Orchestration (`orchestrator.ts`)
The `OrchestratorAgent.run()` pipeline:
1. **Pick** — Curator picks a word (programmatic uniqueness check, retries)
2. **Define** — Curator fetches dictionary definition (with fallback word suggestions if not found)
3. **Compose** — Poet composes haiku → programmatic checks (word in haiku, 5-7-5 syllables) → Critic review for similarity/quality
4. **Design** — Designer creates visual treatment (programmatic: font + color palette uniqueness) → Critic reviews signature
5. **Compose arpeggio** — Musician generates 3 chord tones + sound design (synth, effects, routing)
6. **Save** — Entry prepended to `data.json`

Each agent gets its own `AgentSession` created via `createAgents()`, which creates all five sessions in parallel.

### Storage (`store.ts`)
- `Store` class wraps `data.json` with an in-memory cache.
- `read()` returns `StoreData` — `{ entries: Entry[] }` (distinguishes `ENOENT` from real errors).
- `addEntry(entry)` prepends and writes atomically.

### Model (`model.ts`)
- Exports `createModel()` returning a `Model<"openai-completions">` config for OpenRouter.
- Model ID: `openrouter/owl-alpha`.
- Context window: 1,048,756 tokens. Max output: 262,144 tokens.

### Prompts (`prompts.ts`)
- One exported function per prompt variant. All take relevant context and return a string.
- No banned words list — the model has creative freedom with the Critic as a soft quality gate.
- Prompt families: `pickWordPrompt` / `fallbackWordPrompt` (Curator), `haikuPrompt` / `haikuRetryPrompt` / `haikuRegeneratePrompt` / `haikuSimplePrompt` (Poet), `designPrompt` / `designRetryPrompt` / `designRegeneratePrompt` / `designSimplePrompt` (Designer), `arpeggioPrompt` / `arpeggioRetryPrompt` (Musician), `validatePrompt` (Critic).
- The Musician prompt documents all available Tone.js effects (20+) with their parameters and allows the agent to specify routing order.

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
  arpeggio: Arpeggio;
}

// Arpeggio — returned by MusicianAgent
interface Arpeggio {
  sound: SoundConfig;
  notes: NoteEvent[];
}

// SoundConfig — full synth + effects chain
interface SoundConfig {
  synth?: { oscillator?: { type?: string }; envelope?: { attack?: number; decay?: number; sustain?: number; release?: number } };
  filter?: { frequency?: number; type?: string };
  reverb?: { decay?: number; wet?: number };
  delay?: { delayTime?: string; feedback?: number; wet?: number };
  feedbackDelay?: { delayTime?: string; feedback?: number; wet?: number };
  chorus?: { frequency?: number; depth?: number; wet?: number };
  phaser?: { frequency?: number; octaves?: number; wet?: number };
  tremolo?: { frequency?: number; depth?: number; wet?: number };
  vibrato?: { frequency?: number; depth?: number; wet?: number };
  distortion?: { distortion?: number; wet?: number };
  bitCrusher?: { bits?: number; wet?: number };
  chebyshev?: { order?: number; wet?: number };
  frequencyShifter?: { frequency?: number; wet?: number };
  autoFilter?: { frequency?: number; depth?: number; baseFrequency?: number };
  autoWah?: { frequency?: number; depth?: number; baseFrequency?: number };
  stereoWidener?: { width?: number };
  compressor?: { threshold?: number; ratio?: number };
  convolver?: { wet?: number };
  freeverb?: { roomSize?: number; dampening?: number; wet?: number };
  combFilter?: { delayTime?: number; resonance?: number; dampening?: number };
  midSide?: { mid?: number; side?: number };
  gain?: { gain?: number };
  routing?: string[];
}

// NoteEvent — a single chord tone tied to a haiku line
interface NoteEvent {
  midi: number;
  duration: string;
  velocity: number;
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
- **`app.js`** — initializes: loads entries, binds keyboard (←→, Home/0) and hash routing, exposes `window.app.navigate`. Stops audio playback on navigation.
- **`render.js`** — reads current entry from state, builds full HTML for the page (top bar, haiku stage, bottom bar with swatches), injects font stylesheets, binds nav click handlers. Also injects `Gentium Plus` font for phonetic display. Uses `hexLuminance()` to determine dark/light text for secondary UI elements. Sound toggle button (`.nav-sound`) in top bar — off by default, no persistence.
- **`background.js`** — manages animated gradient `div.bg-layer` elements. Cross-fades between old and new backgrounds on navigation using opacity transitions. Five layered gradients animated with `@keyframes morph`.
- **`audio.js`** — Tone.js v15 wrapper (loaded from CDN as ESM). `playArpeggio(arpeggio)` dynamically builds the synth + effects chain from the agent's `SoundConfig`. Signal chain: synth → [effects in routing order] → destination. Each of the 3 notes fires via `setTimeout` synced to the CSS animation delays of the haiku lines (0.5s, 1.2s, 1.9s). `stopMelody()` clears timeouts and disposes all nodes. Includes compressor to prevent clipping.
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
      → MusicianAgent.composeArpeggio() → OpenRouter
    → Store.addEntry() → data.json
  → npx tsx src/update-readme.ts → README.md
  → git commit + push

Browser
  → data.json (fetch, cache-busted)
  → state.js (loadEntries)
  → render.js (build DOM)
  → background.js (animate gradient)
  → audio.js (dynamic synth + effects chain, auto-plays if sound enabled)
```

## Key Conventions

- **Newest-first ordering** — `data.json` entries are prepended, so `entries[0]` is always latest.
- **Session isolation** — each agent gets its own `AgentSession` to prevent context leakage.
- **Graceful JSON parsing** — `BaseAgent.extractJSON()` tries raw parse, then regex extraction of the first `{...}` block. Used everywhere LLM output is parsed.
- **Font URL format** — Google Fonts CSS2 API: `https://fonts.googleapis.com/css2?family=<name>:wght@<weights>&display=swap`
- **Validation** — programmatic checks (word uniqueness, word-in-haiku, 5-7-5 syllables, font/color uniqueness) run in the orchestrator; Critic provides soft quality gate for similarity.
- **Max 3 retries** per validation failure. After max retries, the pipeline throws (does not save).
- **Sound off by default** — user must explicitly enable sound via top bar toggle. No localStorage persistence.
- **Unique sound per entry** — the Musician agent designs a unique synth + effects chain for each entry, choosing oscillator, envelope, effects, and routing order.
