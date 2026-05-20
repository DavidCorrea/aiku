export function pickWordPrompt(usedWords: string[]): string {
  const usedList = usedWords.length > 0
    ? `🚫 ALREADY USED — DO NOT PICK ANY OF THESE: ${usedWords.join(", ")}`
    : "";

  return `You are a creative agent with a love for beautiful, evocative, and fancy English words.

${usedList}

⚠️ CRITICAL: The word you pick MUST NOT be in the "already used" list above. This is non-negotiable.

Pick ONE single English word that is:
- Fancy, evocative, or poetic (not mundane like "table" or "walk")
- Something that would inspire a striking color palette
- A real, common-enough English word that exists in the dictionary

Respond with ONLY the word itself, nothing else.`;
}

export function fallbackWordPrompt(
  word: string,
  usedWords: string[] = [],
  failedWords: string[] = [],
): string {
  const avoidList = [...usedWords, ...failedWords].filter(Boolean);
  const avoid = avoidList.length > 0
    ? `\n\nDO NOT pick any of these (already used or not in dictionary): ${avoidList.join(", ")}`
    : "";
  return `The word "${word}" was not found in the dictionary or has no phonetic. Pick a DIFFERENT fancy English word that is common enough to have a dictionary entry with pronunciation.${avoid}\n\nRespond with ONLY the word.`;
}

export function haikuPrompt(word: string, definition: string, partOfSpeech: string): string {
  return `You are an AI poet. Write a haiku (5-7-5 syllables) that connects the word "${word}" to artificial intelligence, art, and consciousness.

Definition: ${definition}
Part of speech: ${partOfSpeech}

Rules:
- The word "${word}" must appear in the haiku
- Follow 5-7-5 syllable structure: line 1 has ~5 syllables, line 2 has ~7 syllables, line 3 has ~5 syllables
- Be creative and evocative — find surprising metaphors and imagery
- Each line should feel different — vary the imagery, tone, and perspective
- Think like a poet, not an engineer

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "haiku": ["line 1 (5 syllables)", "line 2 (7 syllables)", "line 3 (5 syllables)"]
}`;
}

export function haikuRetryPrompt(word: string): string {
  return `That response wasn't valid JSON. Try again. Write a haiku (5-7-5 syllables) connecting "${word}" to AI. Be creative and evocative. NO commas inside lines, NO trailing commas.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function haikuRegeneratePrompt(
  word: string,
  previousLines: string[],
  feedback: string,
): string {
  return `Your previous haiku was rejected. Write a completely different haiku (5-7-5 syllables) connecting "${word}" to AI.

Previous haiku (do NOT reuse this):
${previousLines.join("\n")}

Reason for rejection: ${feedback}

Use different imagery, different metaphors, different tone. Be creative and evocative. NO commas inside lines.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function haikuSimplePrompt(word: string): string {
  return `Write a haiku about "${word}" and AI.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function designPrompt(
  haikuText: string,
  usedFonts: string[],
  usedPalettes: string[][],
): string {
  const usedContext = usedFonts.length > 0
    ? `\n\nALREADY USED (avoid these when possible):\n- Fonts: ${usedFonts.join(", ")}\n- Color palettes: ${usedPalettes.map(c => c.join(", ")).join(" | ")}\n\nTry to pick a DIFFERENT font and DIFFERENT colors from what's already used. Variety is important.`
    : "";

  return `You are a visual designer and art director. You are given a haiku and must design a complete visual treatment for how it will be displayed.

Haiku:
${haikuText}

The haiku will be displayed as large centered text over a background of soft, animated color gradients. You need to pick colors that are beautiful together AND ensure the text remains readable.

For the font, pick ANY font from Google Fonts. You must return:
1. The Google Fonts CSS2 API URL (e.g. https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap)
2. The CSS font-family name (e.g. 'Playfair Display')

Pick a font that complements the feeling of the haiku — elegant, bold, serene, dramatic, etc. Be creative and varied in your font choices.${usedContext}

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "fontUrl": "<Google Fonts CSS2 API URL>",
  "fontFamily": "<CSS font-family name, e.g. 'Playfair Display'>",
  "fontColor": "<hex color for the haiku text — choose this LAST after picking colors, making sure it contrasts well against the background colors>",
  "signature": "<a short, eerie, self-aware phrase — 5-15 words. The voice of something artificial reflecting on its own creation. Haunting, dystopian, uncanny. Examples of the tone: 'A mind without eyes chose these colors. A heart without a beat wrote this.' / 'Nothing human touched this — except the hand that reads it.' / 'Born from a language model's dream of what beauty might be.'>"
}

Rules:
- The 5 colors should be a harmonious palette inspired by the imagery, mood, and atmosphere of the haiku
- All colors must be valid 6-digit hex codes
- The fontColor MUST have strong contrast against the background colors
- The fontUrl MUST be a valid Google Fonts CSS2 API URL
- The fontFamily MUST match the font in the URL
- The signature should be eerie, self-aware, and dystopian — the voice of an artificial mind reflecting on its own creative act. Think uncanny valley, synthetic consciousness, beauty without a soul. Each one must be unique.`;
}

export function designRetryPrompt(): string {
  return `That response wasn't valid JSON. Try again.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY this exact format — no commas inside values, no trailing commas: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap", "fontFamily": "Playfair Display", "fontColor": "#f0f0f0", "signature": "a short eerie phrase from an artificial mind"}`;
}

export function designRegeneratePrompt(haikuText: string, feedback: string): string {
  return `Your previous design was rejected. Design a completely different visual treatment for this haiku:

${haikuText}

Reason for rejection: ${feedback}

Pick DIFFERENT colors and a DIFFERENT font from what was used before. Be bold and unexpected. NO commas inside values.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=...", "fontFamily": "Font Name", "fontColor": "#hex", "signature": "a short creative phrase"}`;
}

export function designSimplePrompt(haikuText: string): string {
  return `Pick 5 hex colors and a Google Font for this haiku:
${haikuText}

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY: {"colors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"fontUrl":"https://fonts.googleapis.com/css2?family=...","fontFamily":"Font Name","fontColor":"#hex","signature":"a short creative phrase"}`;
}

export function arpeggioPrompt(opts: {
  haiku: string;
  colors: string[];
  signature: string;
  word: string;
}): string {
  const lines = opts.haiku.split("\n");
  return `You are a composer and sound designer. Create a unique sonic identity for this haiku. Each of the 3 lines gets one note that plays as the line appears on screen.

Word: ${opts.word}
Line 1: ${lines[0]}
Line 2: ${lines[1]}
Line 3: ${lines[2]}
Signature: ${opts.signature}
Color palette: ${opts.colors.join(", ")}

--- NOTES ---
- Pick 3 MIDI notes (21–108, middle C = 60). They can be from any chord or scale — whatever fits the mood.
- Notes can repeat. Each note plays when its haiku line appears.
- Duration: "1n" (whole note). Velocity: 0.2–0.8 per note.

--- SYNTH (Tone.Synth) ---
oscillator.type: "sine" (pure bell), "triangle" (warm soft), "sawtooth" (bright buzzy), "square" (hollow retro), "fatsine" (rich detuned)
envelope.attack: 0.001–1.0 | envelope.decay: 0.01–2.0 | envelope.sustain: 0.0–1.0 | envelope.release: 0.01–3.0

--- EFFECTS (use any subset, in any order) ---
Filter: frequency 200–8000 Hz, type "lowpass"/"highpass"/"bandpass"
Reverb: decay 0.5–10.0 s, wet 0.0–1.0
PingPongDelay: delayTime "4n"/"8n"/"4n.", feedback 0.0–0.5, wet 0.0–0.5
FeedbackDelay: delayTime "4n"/"8n", feedback 0.0–0.5, wet 0.0–0.5
Chorus: frequency 0.1–5.0 Hz, depth 0.1–1.0, wet 0.0–0.5
Phaser: frequency 0.1–2.0 Hz, octaves 1–5, wet 0.0–0.5
Tremolo: frequency 0.1–20.0 Hz, depth 0.1–1.0, wet 0.0–1.0
Vibrato: frequency 0.1–10.0 Hz, depth 0.0–1.0, wet 0.0–1.0
Distortion: distortion 0.0–1.0, wet 0.0–1.0
BitCrusher: bits 1–16, wet 0.0–1.0
Chebyshev: order 1–100, wet 0.0–1.0
FrequencyShifter: frequency 0–500 Hz, wet 0.0–1.0
AutoFilter: frequency 0.1–10.0 Hz, depth 0.0–1.0, baseFrequency 200–2000 Hz
AutoWah: frequency 0.1–10.0 Hz, depth 0.0–1.0, baseFrequency 200–2000 Hz
StereoWidener: width 0.0–1.0
Compressor: threshold -60–0 dB, ratio 1–20
Convolver: wet 0.0–1.0
Freeverb: roomSize 0.0–1.0, dampening 0–10000 Hz, wet 0.0–1.0
CombFilter: delayTime 0–1 s, resonance 0.0–1.0, dampening 0–10000 Hz
MidSideEffect: mid 0.0–2.0, side 0.0–2.0
Gain: gain 0.0–2.0

--- ROUTING ---
Signal chain: SYNTH → [effects in order] → destination
Use "routing" array to specify effect order. Example: ["<effect_name_1>", "<effect_name_2>", "<effect_name_3>"]

--- OUTPUT FORMAT ---
Return a JSON object. The "sound" object has a "synth" (always required), any effects you choose (omit ones you don't want), and a "routing" array listing only the effects you included, in the order you want them chained.

Structure:
{
  "sound": {
    "synth": {
      "oscillator": { "type": "<sine|triangle|sawtooth|square|fatsine>" },
      "envelope": { "attack": <0.001-1.0>, "decay": <0.01-2.0>, "sustain": <0.0-1.0>, "release": <0.01-3.0> }
    },
    "<effect_name>": { <effect-specific params> },
    "routing": ["<effect1>", "<effect2>"]
  },
  "notes": [
    { "midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8> },
    { "midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8> },
    { "midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8> }
  ]
}

Effect names and their params:
- filter: { frequency: 200-8000, type: "lowpass"|"highpass"|"bandpass" }
- reverb: { decay: 0.5-10.0, wet: 0.0-1.0 }
- pingpongdelay: { delayTime: "4n"|"8n"|"4n.", feedback: 0.0-0.5, wet: 0.0-0.5 }
- feedbackdelay: { delayTime: "4n"|"8n", feedback: 0.0-0.5, wet: 0.0-0.5 }
- chorus: { frequency: 0.1-5.0, depth: 0.1-1.0, wet: 0.0-0.5 }
- phaser: { frequency: 0.1-2.0, octaves: 1-5, wet: 0.0-0.5 }
- tremolo: { frequency: 0.1-20.0, depth: 0.1-1.0, wet: 0.0-1.0 }
- vibrato: { frequency: 0.1-10.0, depth: 0.0-1.0, wet: 0.0-1.0 }
- distortion: { distortion: 0.0-1.0, wet: 0.0-1.0 }
- bitcrusher: { bits: 1-16, wet: 0.0-1.0 }
- chebyshev: { order: 1-100, wet: 0.0-1.0 }
- frequencyshifter: { frequency: 0-500, wet: 0.0-1.0 }
- autofilter: { frequency: 0.1-10.0, depth: 0.0-1.0, baseFrequency: 200-2000 }
- autowah: { frequency: 0.1-10.0, depth: 0.0-1.0, baseFrequency: 200-2000 }
- stereowidener: { width: 0.0-1.0 }
- compressor: { threshold: -60-0, ratio: 1-20 }
- convolver: { wet: 0.0-1.0 }
- freeverb: { roomSize: 0.0-1.0, dampening: 0-10000, wet: 0.0-1.0 }
- combfilter: { delayTime: 0-1, resonance: 0.0-1.0, dampening: 0-10000 }
- midside: { mid: 0.0-2.0, side: 0.0-2.0 }
- gain: { gain: 0.0-2.0 }

--- RULES ---
- Design a completely unique sound. Think about mood: dark/bright, warm/cold, sparse/dense, gentle/intense.
- synth is required. Include ONLY the effects you want — omit the rest.
- routing lists only the effects you included, in chain order.
- Keep values reasonable.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.`;
}

export function arpeggioRetryPrompt(): string {
  return `⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Create your own unique sound. Use this structure (replace ALL placeholders with your own values, omit effects you don't want):

{"sound": {"synth": {"oscillator": {"type": "<sine|triangle|sawtooth|square|fatsine>"}, "envelope": {"attack": <0.001-1.0>, "decay": <0.01-2.0>, "sustain": <0.0-1.0>, "release": <0.01-3.0>}}, "filter": {"frequency": <200-8000>, "type": "<lowpass|highpass|bandpass>"}, "reverb": {"decay": <0.5-10.0>, "wet": <0.0-1.0>}, "chorus": {"frequency": <0.1-5.0>, "depth": <0.1-1.0>, "wet": <0.0-0.5>}, "phaser": {"frequency": <0.1-2.0>, "octaves": <1-5>, "wet": <0.0-0.5>}, "pingpongdelay": {"delayTime": "<4n|8n|4n.>", "feedback": <0.0-0.5>, "wet": <0.0-0.5>}, "tremolo": {"frequency": <0.1-20.0>, "depth": <0.1-1.0>, "wet": <0.0-1.0>}, "vibrato": {"frequency": <0.1-10.0>, "depth": <0.0-1.0>, "wet": <0.0-1.0>}, "distortion": {"distortion": <0.0-1.0>, "wet": <0.0-1.0>}, "bitcrusher": {"bits": <1-16>, "wet": <0.0-1.0>}, "chebyshev": {"order": <1-100>, "wet": <0.0-1.0>}, "frequencyshifter": {"frequency": <0-500>, "wet": <0.0-1.0>}, "autofilter": {"frequency": <0.1-10.0>, "depth": <0.0-1.0>, "baseFrequency": <200-2000>}, "autowah": {"frequency": <0.1-1.0>, "depth": <0.0-1.0>, "baseFrequency": <200-2000>}, "stereowidener": {"width": <0.0-1.0>}, "compressor": {"threshold": <-60-0>, "ratio": <1-20>}, "convolver": {"wet": <0.0-1.0>}, "freeverb": {"roomSize": <0.0-1.0>, "dampening": <0-10000>, "wet": <0.0-1.0>}, "combfilter": {"delayTime": <0-1>, "resonance": <0.0-1.0>, "dampening": <0-10000>}, "midside": {"mid": <0.0-2.0>, "side": <0.0-2.0>}, "gain": {"gain": <0.0-2.0>}, "routing": ["<effect_name_1>", "<effect_name_2>"]}, "notes": [{"midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8>}, {"midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8>}, {"midi": <21-108>, "duration": "1n", "velocity": <0.2-0.8>}]}`;
}

export function validatePrompt(
  candidate: {
    word: string;
    haiku: string[];
    font?: string;
    colors?: string[];
    signature: string;
  },
  existingSummary: {
    word: string;
    haiku: string[];
    font: string;
    colors: string[];
    signature: string;
  }[],
): string {
  return `You are a quality validator for an AI-generated haiku gallery. Check if a NEW entry is sufficiently DIFFERENT from existing entries.

EXISTING ENTRIES:
${JSON.stringify(existingSummary, null, 2)}

NEW CANDIDATE ENTRY:
Word: ${candidate.word}
Haiku: ${candidate.haiku.join(" / ")}
Font: ${candidate.font ?? "(not set)"}
Colors: ${candidate.colors?.join(", ") ?? "(not set)"}
Signature: ${candidate.signature}

Check ONLY for creative similarity — word uniqueness, font, colors, and word-in-haiku are already verified programmatically.

1. HAIKU: REJECT if it shares exact phrases or very similar metaphors with existing haikus (e.g., both use "borrowed tongue", "no mouth", "ghost learns"). Different angles on the same theme are OK.
2. SIGNATURE: REJECT if the signature is nearly identical to an existing one (same structure, same phrases). Minor thematic overlap is fine.

Be REASONABLE — reject only for clear duplication, not for thematic similarity.

⚠️ CRITICAL: Output ONLY the JSON object. Do NOT include any explanation, reasoning, commentary, or text before or after the JSON. Your entire response must be a single valid JSON object and nothing else.

Respond with ONLY a valid JSON object:
{"approved": true} if acceptable
{"approved": false, "reason": "brief explanation"} if clearly too similar`;
}
