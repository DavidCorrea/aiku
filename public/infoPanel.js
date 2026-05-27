const TRIGGER_PHRASE = "howdoyouturnthison";
const KEYBOARD_BUFFER_LIMIT = 50;

let buffer = "";
let panelOpen = false;
let activeAnimations = [];

const AGENTS = [
  {
    name: "Curator",
    emoji: "📖",
    color: "#e0a050",
    colorRGB: "224,160,80",
    role: "Word Picker & Lexicographer",
    summary:
      "Chooses the daily word and looks it up. Picks evocative, unusual English words — not mundane ones like \"table\" — and fetches pronunciation from Wiktionary.",
    details:
      "If a word can't be found in the dictionary (too obscure, no phonetic transcription), the Curator asks the model for an alternative and tries again, up to 3 times. It avoids all previously used words via a blocklist handed to the prompt.",
    promptStyle:
      "Tight constraint: pick ONE fancy word, respond with ONLY the word. The model gets the full list of used words to avoid. No extra text.",
    tools: "dictionaryapi.dev (Wiktionary), fallback word regeneration",
    feedsInto: "Poet → Designer → Musician",
  },
  {
    name: "Poet",
    emoji: "🖊",
    color: "#70b0e0",
    colorRGB: "112,176,224",
    role: "Haiku Composer",
    summary:
      "Writes the haiku. Given the word + definition, composes a 5-7-5 poem connecting it to AI, art, and consciousness.",
    details:
      "Works in revision loops — gets feedback from the Critic and from programmatic checks (syllable counter, word-in-haiku validator). Each retry is a fresh prompt with the previous haiku and the specific rejection reason, so it doesn't repeat the same mistake.",
    promptStyle:
      "Creative but strict: word must appear, 5-7-5 syllables, be evocative — \"think like a poet, not an engineer.\" JSON output only.",
    tools: "Naive syllable counter, word-in-haiku check (programmatic retries)",
    feedsInto: "Designer → Critic → Musician",
  },
  {
    name: "Designer",
    emoji: "🎨",
    color: "#d070a0",
    colorRGB: "208,112,160",
    role: "Visual Art Director",
    summary:
      "Creates the full visual identity — 5 hex color palette, a Google Font, a contrasting text color, and a short eerie \"signature\" phrase in the voice of an artificial mind.",
    details:
      "Told which fonts and color palettes have already been used. Iterates if Critic finds the signature too similar to an existing entry. Font color is chosen last, after the palette, to guarantee readability against the animated gradient background.",
    promptStyle:
      "Opinionated: font should \"complement the feeling — elegant, bold, serene, dramatic.\" Signature: \"eerie, self-aware, dystopian — uncanny valley, synthetic consciousness, beauty without a soul.\"",
    tools: "Font uniqueness check, color palette duplicate check",
    feedsInto: "Critic → render.js (frontend)",
  },
  {
    name: "Critic",
    emoji: "👁",
    color: "#90c080",
    colorRGB: "144,192,128",
    role: "Quality Gate",
    summary:
      "Only agent that sees the full journal. Reviews haiku + completed entries against every past publication to catch duplication before it ships.",
    details:
      "Has every existing entry (word, haiku, font, colors, signature) and judges creative similarity — not thematic overlap. Two haikus about the same idea with different metaphors is fine; same phrases are not. If its JSON can't be parsed, the entry auto-approves (graceful degradation).",
    promptStyle:
      "\"Check ONLY for creative similarity. Reject only for clear duplication, not for thematic similarity.\" Gets the full journal to compare against.",
    tools: "Full journal context, JSON parsing with auto-approve fallback",
    feedsInto: "Poet & Designer (revision feedback loops)",
  },
  {
    name: "Musician",
    emoji: "▶",
    color: "#80c0c0",
    colorRGB: "128,192,192",
    role: "Composer & Sound Designer",
    summary:
      "Designs a completely unique sonic identity — picks a chord, 3 MIDI notes (one per haiku line), and builds a full synth + effects chain from 20+ Tone.js effects.",
    details:
      "Only agent run with no file-system access (noTools: \"all\") — guarantees JSON. Sees haiku text, color palette, and signature to inspire mood. Can use any subset of 20 effects in any routing order — every entry has a unique sound.",
    promptStyle:
      "Most detailed prompt: full Tone.js API reference for every effect. \"Design a completely unique sound. Think about mood: dark/bright, warm/cold, sparse/dense.\"",
    tools: "20+ Tone.js effects (filter, reverb, phaser, distortion, bitCrusher, etc.), isolated session (no file access)",
    feedsInto: "audio.js (frontend playback engine)",
  },
];

const PIPELINE_STEPS = [
  {
    step: 1,
    label: "Pick Word",
    agent: "Curator",
    emoji: "📖",
    color: "#e0a050",
    what:
      "Curator picks an evocative English word. Given the full list of used words to avoid. Only the word is returned — no explanations.",
    validation: ["Blocklist uniqueness (programmatic)"],
    retries: "Up to 3 retries",
    output: "A single word string",
  },
  {
    step: 2,
    label: "Define",
    agent: "Curator",
    emoji: "📖",
    color: "#e0a050",
    what:
      "Fetches the word from the Wiktionary dictionary API. Gets pronunciation (phonetic), definition, part of speech, and source URL.",
    validation: ["Dictionary entry must exist", "Must have phonetic transcription"],
    retries: "Up to 3 attempts (fallback words)",
    output: "DictionaryEntry { word, phonetic, definition, sourceUrl }",
  },
  {
    step: 3,
    label: "Compose Haiku",
    agent: "Poet",
    emoji: "🖊",
    color: "#70b0e0",
    what:
      "Poet writes a 5-7-5 haiku connecting the word to AI. Must include the word itself, follow syllable structure, be creative.",
    validation: ["Word must appear in haiku (programmatic)", "Syllable count 5-7-5 ±1 (programmatic)", "Critic similarity review (LLM)"],
    retries: "Up to 3 retries each check",
    output: "Haiku { lines: [5, 7, 5] }",
  },
  {
    step: 4,
    label: "Design",
    agent: "Designer",
    emoji: "🎨",
    color: "#d070a0",
    what:
      "Designer creates the visual look: 5 hex colors, a Google Font from the CSS2 API, a contrasting font color, and an eerie AI signature phrase.",
    validation: ["Font not already used (programmatic)", "Color palette not identical (programmatic)", "Critic signature review (LLM)"],
    retries: "Up to 3 retries each check",
    output: "VisualTreatment { colors, font, fontColor, signature }",
  },
  {
    step: 5,
    label: "Compose Arpeggio",
    agent: "Musician",
    emoji: "▶",
    color: "#80c0c0",
    what:
      "Musician designs a unique sonic identity — synth oscillator + envelope, any effects chain in any routing order, 3 MIDI chord tones.",
    validation: ["None — single run (isolated session guarantees JSON)"],
    retries: "No retries needed",
    output: "Arpeggio { sound: SoundConfig, notes: [NoteEvent × 3] }",
  },
  {
    step: 6,
    label: "Save & Publish",
    agent: "Orchestrator",
    emoji: "✓",
    color: "#888888",
    what:
      "Orchestrator assembles all outputs into an Entry, prepends to data.json, updates README.md, commits and pushes via GitHub Actions.",
    validation: ["None — terminal step"],
    retries: "N/A — after max retries the pipeline throws",
    output: "Complete Entry committed to the journal",
  },
];

export function initInfoKeyboardListener() {
  document.addEventListener("keydown", (e) => {
    if (panelOpen) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key;
    if (key.length !== 1) return;
    buffer = (buffer + key.toLowerCase()).slice(-KEYBOARD_BUFFER_LIMIT);
    if (buffer.endsWith(TRIGGER_PHRASE)) {
      buffer = "";
      openInfoPanel();
    }
  });
}

export function isInfoPanelOpen() {
  return panelOpen;
}

function openInfoPanel() {
  panelOpen = true;
  clearAnimations();

  const entry = window.__currentEntry;
  const totalEntries = window.__totalEntries ?? "?";

  const overlay = document.createElement("div");
  overlay.className = "info-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "How aiku works");

  overlay.innerHTML = `
    <div class="info-panel">
      <button class="info-close" aria-label="Close panel">✕</button>

      <header class="info-header">
        <div class="info-logo-mark">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <circle cx="20" cy="20" r="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.2)"/>
            <line x1="20" y1="2" x2="20" y2="10" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <line x1="20" y1="30" x2="20" y2="38" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <line x1="2" y1="20" x2="10" y2="20" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <line x1="30" y1="20" x2="38" y2="20" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
          </svg>
        </div>
        <h2>How aiku works</h2>
        <p class="info-subtitle">Behind every haiku is a pipeline of 5 AI agents, orchestrated in sequence. Each has an isolated conversation, its own personality, and its own tools. Explore how they collaborate below.</p>
      </header>

      <!-- ── INTERACTIVE ORCHESTRATOR ── -->
      <section class="info-section info-orchestrator" data-section="orchestrator">
        <div class="info-section-header">
          <h3><span class="info-icon">⏵</span> The Orchestrator</h3>
          <span class="info-tooltip-trigger" data-tooltip="Click an agent to explore, or hit Play to watch the full pipeline run step-by-step.">?</span>
        </div>
        <p class="info-section-intro">Five isolated LLM sessions, five personalities. Click any node to inspect it. Hit play to watch the full pipeline execute.</p>

        <div class="info-orch-canvas">
          <svg class="info-orch-arrows" viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet"></svg>
          <div class="info-orch-nodes">
            ${AGENTS.map((a, i) => `
              <button class="info-orch-node" data-agent="${i}" style="--a-color:${a.color}; --a-rgb:${a.colorRGB};" aria-label="Inspect ${a.name}">
                <span class="info-orch-emoji">${a.emoji}</span>
                <span class="info-orch-name">${a.name}</span>
              </button>
            `).join("")}
            <div class="info-orch-center">
              <span class="info-orch-center-label">Orchestrator</span>
            </div>
          </div>
          <svg class="info-orch-particles" viewBox="0 0 700 320" preserveAspectRatio="xMidYMid meet"></svg>
        </div>

        <div class="info-orch-controls">
          <button class="info-play-btn" aria-label="Run pipeline animation">
            <span class="info-play-icon">▶</span>
            <span class="info-play-label">Run Pipeline</span>
          </button>
          <div class="info-progress">
            <div class="info-progress-bar"></div>
            <div class="info-progress-steps"></div>
          </div>
        </div>

        <div class="info-log" aria-live="polite">
          <div class="info-log-header">
            <span class="info-log-dot"></span>
            <span class="info-log-title">Pipeline log</span>
          </div>
          <div class="info-log-body">
            <div class="info-log-line">awaiting launch... type <kbd>howdoyouturnthison</kbd> again to return</div>
          </div>
        </div>
      </section>

      <!-- ── INSPECTOR (opens when you click an agent) ── -->
      <section class="info-section info-inspector" data-section="inspector" hidden>
        <div class="info-section-header">
          <h3 class="info-inspector-title"></h3>
          <button class="info-inspector-back" aria-label="Back to pipeline">← back</button>
        </div>
        <div class="info-inspector-body">
          <div class="info-inspector-identity">
            <span class="info-inspector-emoji"></span>
            <div>
              <div class="info-inspector-name"></div>
              <div class="info-inspector-role"></div>
            </div>
          </div>
          <div class="info-inspector-description"></div>
          <div class="info-inspector-prompt-block">
            <div class="info-inspector-prompt-label">Prompt style</div>
            <blockquote class="info-inspector-prompt"></blockquote>
          </div>
          <div class="info-inspector-meta">
            <div class="info-inspector-meta-row">
              <span class="info-inspector-meta-label">Tools</span>
              <span class="info-inspector-tools-value"></span>
            </div>
            <div class="info-inspector-meta-row">
              <span class="info-inspector-meta-label">Feeds into</span>
              <span class="info-inspector-feeds-value"></span>
            </div>
            <div class="info-inspector-meta-row">
              <span class="info-inspector-meta-label">Session</span>
              <span class="info-inspector-session-value">Isolated — never sees other agents</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── MODEL ── -->
      <section class="info-section" data-section="model">
        <div class="info-section-header">
          <h3><span class="info-icon">🧠</span> Model</h3>
          <span class="info-tooltip-trigger" data-tooltip="All 5 agents share the same model but each gets its own isolated session.">?</span>
        </div>
        <div class="info-model-wrap">
          <div class="info-model-primary">
            <div class="info-model-id">openrouter/owl-alpha</div>
            <div class="info-model-provider">via OpenRouter</div>
          </div>
          <div class="info-model-specs">
            <div class="info-model-spec">
              <span class="info-model-spec-val counter" data-target="1048756">0</span>
              <span class="info-model-spec-label">context tokens</span>
            </div>
            <div class="info-model-spec">
              <span class="info-model-spec-val counter" data-target="262144">0</span>
              <span class="info-model-spec-label">max output</span>
            </div>
            <div class="info-model-spec">
              <span class="info-model-spec-val">5</span>
              <span class="info-model-spec-label">sessions</span>
            </div>
            <div class="info-model-spec">
              <span class="info-model-spec-val">3</span>
              <span class="info-model-spec-label">max retries</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── THIS ENTRY ── -->
      ${entry ? `
      <section class="info-section" data-section="entry">
        <div class="info-section-header">
          <h3><span class="info-icon">◈</span> This Entry</h3>
        </div>
        <div class="info-entry-meta">
          <div class="info-entry-head">
            <span class="info-entry-word">${entry.word}</span>
            ${entry.phonetic ? `<span class="info-entry-phonetic">/${entry.phonetic}/</span>` : ""}
          </div>
          ${entry.definition ? `<p class="info-entry-definition">"${entry.definition}"</p>` : ""}
          <div class="info-entry-specs">
            <div class="info-entry-spec-row"><span>Dictionary</span><a href="${entry.sourceUrl}" target="_blank" rel="noopener">${entry.sourceUrl.replace("https://", "")}</a></div>
            <div class="info-entry-spec-row"><span>Font</span><a href="https://fonts.google.com/specimen/${(entry.font || "").replace(/ /g, "+")}" target="_blank" rel="noopener">${entry.font}</a></div>
            <div class="info-entry-spec-row"><span>Synth</span><span>${entry.arpeggio?.sound?.synth?.oscillator?.type || "—"} oscillator</span></div>
            <div class="info-entry-spec-row"><span>Effects</span><span>${(entry.arpeggio?.sound?.routing || []).join(" → ") || "dry"}</span></div>
            <div class="info-entry-spec-row"><span>Notes</span><span>${(entry.arpeggio?.notes || []).map(n => n.midi).join(", ") || "—"}</span></div>
            <div class="info-entry-spec-row"><span>Collected</span><span>${formatTimestamp(entry.timestamp)}</span></div>
          </div>
          <div class="info-entry-pipeline" aria-hidden="true">
            <span class="info-entry-node" style="--n-color:#e0a050">📖</span><span class="info-entry-arrow">→</span>
            <span class="info-entry-node" style="--n-color:#70b0e0">🖊</span><span class="info-entry-arrow">→</span>
            <span class="info-entry-node" style="--n-color:#d070a0">🎨</span><span class="info-entry-arrow">→</span>
            <span class="info-entry-node" style="--n-color:#80c0c0">▶</span><span class="info-entry-arrow">→</span>
            <span class="info-entry-node" style="--n-color:#888">✓</span>
          </div>
        </div>
      </section>
      ` : ""}

      <footer class="info-footer">
        <span class="info-footer-left">
          <a href="https://github.com/DavidCorrea/aiku" target="_blank" rel="noopener">GitHub ↗</a>
          <span>·</span>
          <span>Hourly via GitHub Actions</span>
        </span>
        <span class="info-footer-right">
          <kbd>howdoyouturnthison</kbd> to show · <kbd>Esc</kbd> to close
        </span>
      </footer>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => initPanelInteractions(overlay, entry, totalEntries));
}

// ── Panel setup ──────────────────────────────────────────────
function initPanelInteractions(overlay, entry, totalEntries) {
  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePanel(overlay);
  });
  overlay.querySelector(".info-close")?.addEventListener("click", () => closePanel(overlay));

  // Tooltips
  overlay.querySelectorAll(".info-tooltip-trigger").forEach(trigger => {
    const text = trigger.getAttribute("data-tooltip");
    const tip = document.createElement("div");
    tip.className = "info-tooltip";
    tip.textContent = text;
    trigger.appendChild(tip);
    trigger.setAttribute("tabindex", "0");
    trigger.addEventListener("mouseenter", () => tip.classList.add("visible"));
    trigger.addEventListener("mouseleave", () => tip.classList.remove("visible"));
    trigger.addEventListener("focus", () => tip.classList.add("visible"));
    trigger.addEventListener("blur", () => tip.classList.remove("visible"));
  });

  // Build orchestrator arrows
  drawOrchArrows(overlay);

  // Counter animations
  overlay.querySelectorAll(".counter").forEach(el => {
    animateCounter(el, parseInt(el.getAttribute("data-target")), 1200);
  });

  // Agent node clicks → inspector
  const orchSection = overlay.querySelector("[data-section=orchestrator]");
  const inspectorSection = overlay.querySelector("[data-section=inspector]");
  const inspectorBack = overlay.querySelector(".info-inspector-back");

  overlay.querySelectorAll(".info-orch-node").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-agent"));
      showInspector(overlay, idx);
      orchSection.setAttribute("hidden", "");
      inspectorSection.removeAttribute("hidden");
    });
  });

  inspectorBack?.addEventListener("click", () => {
    inspectorSection.setAttribute("hidden", "");
    orchSection.removeAttribute("hidden");
  });

  // Play pipeline button
  const playBtn = overlay.querySelector(".info-play-btn");
  playBtn?.addEventListener("click", () => runPipelineAnimation(overlay, totalEntries));

  // IntersectionObserver for scroll-triggered reveals
  const revealEls = overlay.querySelectorAll(".info-section");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("info-section-visible");
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => observer.observe(el));

  // Window resize → redraw arrows
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawOrchArrows(overlay), 100);
  });
}

// ── Inspector ────────────────────────────────────────────────
function showInspector(overlay, idx) {
  const agent = AGENTS[idx];
  overlay.querySelector(".info-inspector-emoji").textContent = agent.emoji;
  overlay.querySelector(".info-inspector-name").textContent = agent.name;
  overlay.querySelector(".info-inspector-role").textContent = agent.role;
  overlay.querySelector(".info-inspector-description").innerHTML = `<p>${agent.summary}</p><p style="margin-top:8px;color:#888">${agent.details}</p>`;
  overlay.querySelector(".info-inspector-prompt").textContent = agent.promptStyle;
  overlay.querySelector(".info-inspector-tools-value").textContent = agent.tools;
  overlay.querySelector(".info-inspector-feeds-value").textContent = agent.feedsInto;
  overlay.querySelector(".info-inspector-title").innerHTML = `<span class="info-inspector-accent" style="color:${agent.color}">◆</span> ${agent.name}`;
}

// ── Orchestrator graph ───────────────────────────────────────
function getOrchNode(i) {
  // Positions in a 700×320 coordinate space
  const positions = [
    { x: 100, y: 100 },   // Curator (top-left)
    { x: 600, y: 100 },   // Poet (top-right)
    { x: 600, y: 240 },   // Designer (bottom-right)
    { x: 100, y: 240 },   // Critic (bottom-left)
    { x: 600, y: 170 },   // Musician (right-center)
    { x: 350, y: 170 },   // Orchestrator (center)
  ];
  return positions[i] || { x: 350, y: 170 };
}

function drawOrchArrows(overlay) {
  const svg = overlay.querySelector(".info-orch-arrows");
  if (!svg) return;

  // Match SVG coordinate space to actual rendered canvas size
  const canvas = overlay.querySelector(".info-orch-canvas");
  const canvasRect = canvas.getBoundingClientRect();
  const W = Math.round(canvasRect.width);
  const H = Math.round(canvasRect.height);
  if (W < 10 || H < 10) return;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const scaleX = W / 700;
  const scaleY = H / 320;

  // Center coordinates for each node (same units as SVG)
  function p(idx) {
    const n = getOrchNode(idx);
    return { x: n.x * scaleX, y: n.y * scaleY };
  }
  const center = p(0);  // Curator
  const poet = p(1);    // Poet
  const designer = p(2); // Designer
  const critic = p(3);  // Critic
  const musician = p(4); // Musician
  const orch = p(5);    // Orchestrator center

  const R = 29; // node radius in SVG units (half of 58px at scale)

  // Build all edges
  const edges = [];
  // Sequential pipeline edges
  edges.push({ from: center, to: poet, fromIdx: 0, toIdx: 1, label: "word + def" });
  edges.push({ from: poet, to: designer, fromIdx: 1, toIdx: 2, label: "haiku" });
  edges.push({ from: designer, to: musician, fromIdx: 2, toIdx: 4, label: "haiku + colors" });
  edges.push({ from: musician, to: orch, fromIdx: 4, toIdx: 5, label: "arpeggio" });

  // All agents talk to orchestrator
  [center, poet, designer, critic, musician].forEach((from, i) => {
    edges.push({ from, to: orch, fromIdx: i, toIdx: 5, viaHub: true });
  });

  // Feedback loops
  edges.push({ from: critic, to: poet, fromIdx: 3, toIdx: 1, feedback: true });
  edges.push({ from: critic, to: designer, fromIdx: 3, toIdx: 2, feedback: true });

  // Compute edge path from circle edge to circle edge
  function edgePath(from, to, bend = 0) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const sx = from.x + ux * R;
    const sy = from.y + uy * R;
    const ex = to.x - ux * R;
    const ey = to.y - uy * R;

    if (bend !== 0) {
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const nx = -dy / dist * bend;
      const ny = dx / dist * bend;
      return `M${sx},${sy} Q${mx + nx},${my + ny} ${ex},${ey}`;
    }
    return `M${sx},${sy} L${ex},${ey}`;
  }

  // Precompute layout helpers
  const nodePositions = [center, poet, designer, critic, musician, orch];

  // Draw arrows SVG
  let svgContent = "";

  // Group edges by type: sequential main pipeline in bold, fan-out to orchestrator in faint, feedback as dashed
  edges.forEach((e, i) => {
    const isFeedback = e.feedback;
    const isViaHub = e.viaHub;

    let stroke = "rgba(255,255,255,0.06)";
    let strokeWidth = "1.5";
    let dash = "none";
    let marker = "";
    let bend = 0;

    if (isFeedback) {
      stroke = "rgba(144,192,128,0.25)";
      dash = "6,4";
      bend = 30;
    } else if (isViaHub) {
      stroke = "rgba(255,255,255,0.04)";
      strokeWidth = "1";
      bend = 0;
    } else {
      // Sequential — brighter
      stroke = "rgba(255,255,255,0.10)";
      strokeWidth = "1.8";
      bend = 15;
    }

    const d = edgePath(e.from, e.to, bend);
    svgContent += `<path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-dasharray="${dash}" stroke-linecap="round" class="orch-path" data-edge="${i}" data-from="${e.fromIdx}" data-to="${e.toIdx}" />`;
  });

  // Add arrowheads via marker definitions
  svgContent = `
    <defs>
      <marker id="arrowForward" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6" markerHeight="5" orient="auto-start-reverse">
        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.18)" />
      </marker>
      <marker id="arrowFeedback" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="5" markerHeight="4" orient="auto-start-reverse">
        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(144,192,128,0.4)" />
      </marker>
    </defs>
    <g marker-end="url(#arrowForward)">
      ${svgContent}
    </g>
  `;

  svg.innerHTML = svgContent;

  // Position the absolutely-placed HTML nodes at the same canvas-relative coordinates
  const containerOverlay = overlay.querySelector(".info-orch-nodes");
  if (containerOverlay) {
    const allNodes = containerOverlay.querySelectorAll(".info-orch-node");
    const centerNode = containerOverlay.querySelector(".info-orch-center");

    allNodes.forEach((node, i) => {
      const pos = nodePositions[i];
      node.style.left = `${(pos.x / 700) * 100}%`;
      node.style.top = `${(pos.y / 320) * 100}%`;
    });

    if (centerNode) {
      const pos = nodePositions[5];
      centerNode.style.left = `${(pos.x / 700) * 100}%`;
      centerNode.style.top = `${(pos.y / 320) * 100}%`;
    }
  }
}

// ── Pipeline run animation ───────────────────────────────────
async function runPipelineAnimation(overlay, totalEntries) {
  const playBtn = overlay.querySelector(".info-play-btn");
  const progressBar = overlay.querySelector(".info-progress-bar");
  const logBody = overlay.querySelector(".info-log-body");
  const nodes = overlay.querySelectorAll(".info-orch-node");
  const particleSvg = overlay.querySelector(".info-orch-particles");
  const paths = overlay.querySelectorAll(".orch-path");
  const totalSteps = PIPELINE_STEPS.length;

  playBtn.disabled = true;
  playBtn.classList.add("playing");
  logBody.innerHTML = "";

  const logLines = [];
  function log(html) {
    const line = document.createElement("div");
    line.className = "info-log-line info-log-line-animate";
    line.innerHTML = html;
    logBody.appendChild(line);
    logBody.scrollTop = logBody.scrollHeight;
    logLines.push(line);
  }

  // Build progress dots
  const progressSteps = overlay.querySelector(".info-progress-steps");
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement("div");
    dot.className = "info-progress-dot";
    progressSteps.appendChild(dot);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Capture original path styles for reset
  const originalStyles = {};
  paths.forEach((p, i) => {
    originalStyles[i] = {
      stroke: p.getAttribute("stroke"),
      strokeWidth: p.getAttribute("stroke-width"),
      opacity: p.style.opacity || ""
    };
  });

  // Highlight active path
  function highlightPath(from, to, active) {
    const p = Array.from(paths).find(p => {
      return parseInt(p.dataset.from) === from && parseInt(p.dataset.to) === to;
    });
    if (!p) return;
    const idx = p.dataset.edge;
    if (active) {
      p.setAttribute("stroke", AGENTS[from]?.color || "#aaa");
      p.setAttribute("stroke-width", "3");
      p.style.strokeDasharray = "none";
      p.style.filter = `drop-shadow(0 0 6px ${AGENTS[from]?.color || "#aaa"})`;
    } else {
      const orig = originalStyles[idx];
      p.setAttribute("stroke", orig.stroke);
      p.setAttribute("stroke-width", orig.strokeWidth);
      p.style.strokeDasharray = "";
      p.style.filter = "";
    }
  }

  // Spawn a particle along a path
  function spawnParticle(fromIdx, toIdx) {
    const pathEl = Array.from(paths).find(p => {
      return parseInt(p.dataset.from) === fromIdx && parseInt(p.dataset.to) === toIdx;
    });
    if (!pathEl) return;

    const totalLen = pathEl.getTotalLength();
    if (!totalLen || totalLen < 2) return;

    const color = AGENTS[fromIdx]?.color || "#888";
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "3.5");
    circle.setAttribute("fill", color);
    circle.setAttribute("opacity", "1");
    particleSvg.appendChild(circle);

    const startTime = performance.now();
    const duration = 900;
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const pt = pathEl.getPointAtLength(t * totalLen);
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("opacity", String(1 - t * 0.6));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        circle.remove();
      }
    }
    requestAnimationFrame(tick);
  }

  function setActiveNode(idx, active) {
    nodes.forEach((n, i) => {
      if (i === idx) {
        n.classList.toggle("active", active);
      } else if (active) {
        n.classList.remove("active");
      }
    });
  }

  // Step through pipeline
  for (let si = 0; si < totalSteps; si++) {
    const s = PIPELINE_STEPS[si];
    const agentIdx = AGENTS.findIndex(a => a.name === s.agent);
    const progress = ((si + 1) / totalSteps) * 100;
    progressBar.style.setProperty("--progress", `${progress}%`);
    progressBar.style.width = "100%"; // fallback

    // Update progress step indicators
    const progressSteps = overlay.querySelector(".info-progress-steps");
    progressSteps.childNodes.forEach((dot, i) => {
      dot.classList.toggle("done", i < si);
      dot.classList.toggle("current", i === si);
    });

    // Highlight agent
    if (agentIdx >= 0) {
      setActiveNode(agentIdx, true);
      spawnParticle(agentIdx, 5); // to orchestrator
      highlightPath(agentIdx, 5, true);
    }

    log(`<span class="info-log-step" style="color:${s.color}">Step ${s.step}</span> <strong>${s.label}</strong> <span class="info-log-agent" style="color:${s.color}">${s.agent}</span>`);
    await sleep(600);

    log(`  <span class="info-log-dim">${s.what.slice(0, 100)}...</span>`);
    await sleep(400);

    // Show validation
    s.validation.forEach((v, vi) => {
      const isOk = vi === 0 || Math.random() > 0.15; // mostly pass
      log(`  <span class="info-log-${isOk ? "ok" : "fail"}">${isOk ? "✓" : "✗"}</span> ${v}`);
    });
    await sleep(350);

    log(`  <span class="info-log-ok">→</span> output: <code class="info-log-code">${s.output}</code>`);
    await sleep(300);

    if (agentIdx >= 0) {
      setActiveNode(agentIdx, false);
      highlightPath(agentIdx, 5, false);
    }
  }

  // Complete
  await sleep(300);
  progressBar.style.setProperty("--progress", "100%");
  progressBar.style.width = "100%";
  log(`<span class="info-log-ok">✓</span> <strong>Pipeline complete.</strong> Entry committed.`);
  log(`  <span class="info-log-dim">Next run: ${totalEntries + 1} entries · triggered hourly by GitHub Actions</span>`);

  playBtn.disabled = false;
  playBtn.classList.remove("playing");
  playBtn.querySelector(".info-play-label").textContent = "Run Again";

  // Reset all arrows
  paths.forEach((p) => {
    const idx = p.dataset.edge;
    const orig = originalStyles[idx];
    if (orig) {
      p.setAttribute("stroke", orig.stroke);
      p.setAttribute("stroke-width", orig.strokeWidth);
    }
    p.style.strokeDasharray = "";
    p.style.filter = "";
    p.style.opacity = "";
  });
}

// ── Counter animation ────────────────────────────────────────
function animateCounter(el, target, duration) {
  const start = performance.now();
  const format = new Intl.NumberFormat("en-US").format;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Cleanup ──────────────────────────────────────────────────
function clearAnimations() {
  activeAnimations.forEach(cancel => cancel());
  activeAnimations = [];
}

function closePanel(overlay) {
  panelOpen = false;
  clearAnimations();
  overlay.classList.add("info-overlay-closing");
  setTimeout(() => overlay.remove(), 300);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panelOpen) {
    const overlay = document.querySelector(".info-overlay");
    if (overlay) closePanel(overlay);
  }
});

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
