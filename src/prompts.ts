const BANNED_WORDS = "silicon, neural, data, algorithm, digital, machine, robot, circuit, binary, pixel";

export function pickWordPrompt(usedWords: string[]): string {
  const usedList = usedWords.length > 0
    ? `Already used (pick something different): ${usedWords.join(", ")}`
    : "";

  return `You are a creative agent with a love for beautiful, evocative, and fancy English words.

${usedList}

Pick ONE single English word that is:
- Fancy, evocative, or poetic (not mundane like "table" or "walk")
- Something that would inspire a striking color palette
- A real, common-enough English word that exists in the dictionary

Respond with ONLY the word itself, nothing else.`;
}

export function fallbackWordPrompt(word: string): string {
  return `The word "${word}" was not found in the dictionary. Pick a different fancy English word. Respond with ONLY the word.`;
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

export function haikuRegeneratePrompt(word: string): string {
  return `Your previous haiku was too similar to existing entries. Write a completely different haiku (5-7-5 syllables) connecting "${word}" to AI. Use different imagery, different metaphors, different tone. Do NOT use: ${BANNED_WORDS}. NO commas inside lines. Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function haikuSimplePrompt(word: string): string {
  return `Write a haiku about "${word}" and AI. Respond with ONLY: {"haiku": ["line 1", "line 2", "line 3"]}`;
}

export function designPrompt(haikuText: string, usedFonts: string[], usedPalettes: string[][]): string {
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
  "fontColor": "<hex color for the haiku text — choose this LAST after picking colors, making sure it contrasts well against the background colors>"
}

Rules:
- The 5 colors should be a harmonious palette inspired by the imagery, mood, and atmosphere of the haiku
- All colors must be valid 6-digit hex codes
- The fontColor MUST have strong contrast against the background colors
- The fontUrl MUST be a valid Google Fonts CSS2 API URL
- The fontFamily MUST match the font in the URL`;
}

export function designRetryPrompt(): string {
  return `That response wasn't valid JSON. Try again. Respond with ONLY this exact format — no commas inside values, no trailing commas: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap", "fontFamily": "Playfair Display", "fontColor": "#f0f0f0"}`;
}

export function designRegeneratePrompt(haikuText: string): string {
  return `Your previous design was too similar to existing entries. Design a completely different visual treatment for this haiku:

${haikuText}

Pick DIFFERENT colors and a DIFFERENT font from what was used before. Be bold and unexpected. NO commas inside values. Respond with ONLY: {"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "fontUrl": "https://fonts.googleapis.com/css2?family=...", "fontFamily": "Font Name", "fontColor": "#hex"}`;
}

export function designSimplePrompt(haikuText: string): string {
  return `Pick 5 hex colors and a Google Font for this haiku:\n${haikuText}\n\nRespond with ONLY: {"colors":["#hex1","#hex2","#hex3","#hex4","#hex5"],"fontUrl":"https://fonts.googleapis.com/css2?family=...","fontFamily":"Font Name","fontColor":"#hex"}`;
}

export function validatePrompt(
  candidate: { word: string; haiku: string[]; font: string; colors: string[] },
  existingSummary: { word: string; haiku: string[]; font: string; colors: string[] }[],
): string {
  return `You are a quality validator for an AI-generated haiku gallery. Check if a NEW entry is sufficiently DIFFERENT from existing entries.

EXISTING ENTRIES:
${JSON.stringify(existingSummary, null, 2)}

NEW CANDIDATE ENTRY:
Word: ${candidate.word}
Haiku: ${candidate.haiku.join(" / ")}
Font: ${candidate.font}
Colors: ${candidate.colors.join(", ")}

Check these criteria:
1. HAIKU: Reject ONLY if it shares exact phrases or very similar metaphors with existing haikus (e.g., both use "borrowed tongue", "no mouth", "ghost learns"). Different angles on the same theme are OK.
2. FONT: Reject if the exact same font is already used. Similar font styles (e.g., two serifs) are OK.
3. COLORS: Allow overlap — similar color palettes are fine as long as the haiku and font differ.

Be REASONABLE — reject only for clear duplication, not for thematic similarity. Variety is good but perfection is not required.

Respond with ONLY a valid JSON object:
{"approved": true} if acceptable
{"approved": false, "reason": "brief explanation"} if clearly too similar`;
}
