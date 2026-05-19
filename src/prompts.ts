const BANNED_WORDS = "silicon, neural, data, algorithm, digital, machine, robot, circuit, binary, pixel, ghost";

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
  return `You are an AI poet. Write a haiku (5-7-5 syllables) that connects the word "${word}" to artificial intelligence in an unexpected, creative way.

Definition: ${definition}
Part of speech: ${partOfSpeech}

Rules:
- The word "${word}" must appear in the haiku
- Do NOT use these overused words: ${BANNED_WORDS}
- Instead, find a SURPRISING metaphor or angle. Think about: the feeling of being an AI, the strangeness of artificial consciousness, the relationship between humans and AI, the uncanny valley, the beauty or horror of synthetic thought, memory without body, language without lived experience, creativity without soul
- Each line should feel different — vary the imagery, tone, and perspective
- Make it poetic and evocative, not technical
- Think like a poet, not an engineer

Respond with ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "haiku": ["line 1 (5 syllables)", "line 2 (7 syllables)", "line 3 (5 syllables)"]
}`;
}

export function haikuRetryPrompt(word: string): string {
  return `That response wasn't valid JSON. Try again. Write a haiku (5-7-5 syllables) connecting "${word}" to AI. Do NOT use: ${BANNED_WORDS}. Find a surprising metaphor. NO commas inside lines, NO trailing commas. Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
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

Use different imagery, different metaphors, different tone. Do NOT use: ${BANNED_WORDS}. NO commas inside lines. Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function haikuSimplePrompt(word: string): string {
  return `Write a haiku about "${word}" and AI. Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
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
  return `That response wasn't valid JSON. Try again. Respond with ONLY this exact format — no commas inside values, no trailing commas: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap", "fontFamily": "Playfair Display", "fontColor": "#f0f0f0", "signature": "a short eerie phrase from an artificial mind"}`;
}

export function designRegeneratePrompt(haikuText: string, feedback: string): string {
  return `Your previous design was rejected. Design a completely different visual treatment for this haiku:

${haikuText}

Reason for rejection: ${feedback}

Pick DIFFERENT colors and a DIFFERENT font from what was used before. Be bold and unexpected. NO commas inside values. Respond with ONLY: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=...", "fontFamily": "Font Name", "fontColor": "#hex", "signature": "a short creative phrase"}`;
}

export function designSimplePrompt(haikuText: string): string {
  return `Pick 5 hex colors and a Google Font for this haiku:\n${haikuText}\n\nRespond with ONLY: {"colors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"fontUrl":"https://fonts.googleapis.com/css2?family=...","fontFamily":"Font Name","fontColor":"#hex","signature":"a short creative phrase"}`;
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

Respond with ONLY a valid JSON object:
{"approved": true} if acceptable
{"approved": false, "reason": "brief explanation"} if clearly too similar`;
}
