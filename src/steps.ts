import { createAgentSession, AgentSession } from "@earendil-works/pi-coding-agent";
import { PaletteEntry } from "./store.js";
import * as prompts from "./prompts.js";

// ── Helpers ──

export async function promptAndCollect(session: AgentSession, promptText: string): Promise<string> {
  await session.prompt(promptText);
  const messages = session.state.messages;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== "assistant") {
    throw new Error("No assistant response found");
  }
  return lastMessage.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map(c => c.text)
    .join("");
}

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
  sourceUrls: string[];
}

async function fetchWord(word: string): Promise<DictionaryEntry> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`Dictionary API error: ${res.status}`);
  const data = await res.json();
  return data[0] as DictionaryEntry;
}

function extractJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not extract JSON from: "${raw.slice(0, 200)}"`);
  }
}

function parseError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ── Step 1: Pick a word ──

export async function pickWord(session: AgentSession, usedWords: string[]): Promise<string> {
  const output = await promptAndCollect(session, prompts.pickWordPrompt(usedWords));
  const word = output.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!word) throw new Error(`Agent did not return a valid word. Output: "${output}"`);
  console.log(`  word: "${word}"`);
  return word;
}

// ── Step 2: Fetch dictionary entry (with retry) ──

export async function fetchDefinition(session: AgentSession, chosenWord: string): Promise<DictionaryEntry> {
  let entry: DictionaryEntry | null = null;
  let wordToTry = chosenWord;
  let attempts = 0;

  while (!entry && attempts < 3) {
    try {
      entry = await fetchWord(wordToTry);
    } catch {
      attempts++;
      const fallback = await promptAndCollect(session, prompts.fallbackWordPrompt(wordToTry));
      wordToTry = fallback.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (!wordToTry) throw new Error("Agent could not provide a fallback word.");
    }
  }

  if (!entry) throw new Error("Failed to find a valid dictionary word after 3 attempts.");
  return entry;
}

// ── Step 3: Generate haiku ──

interface HaikuResult {
  haiku: string[];
}

export async function generateHaiku(session: AgentSession, word: string, definition: string, partOfSpeech: string): Promise<HaikuResult> {
  const output = await promptAndCollect(session, prompts.haikuPrompt(word, definition, partOfSpeech));
  return parseHaiku(output, word, session);
}

export async function retryHaiku(session: AgentSession, word: string): Promise<HaikuResult> {
  const output = await promptAndCollect(session, prompts.haikuRetryPrompt(word));
  return parseHaiku(output, word, session);
}

export async function regenerateHaiku(session: AgentSession, word: string): Promise<HaikuResult> {
  try {
    const output = await promptAndCollect(session, prompts.haikuRegeneratePrompt(word));
    return parseHaiku(output, word, session);
  } catch {
    const output = await promptAndCollect(session, prompts.haikuSimplePrompt(word));
    return parseHaiku(output, word, session);
  }
}

async function parseHaiku(output: string, word: string, session: AgentSession): Promise<HaikuResult> {
  try {
    const json = extractJSON(output) as HaikuResult;
    if (!json.haiku || json.haiku.length !== 3) throw new Error("Invalid haiku structure");
    return json;
  } catch (err) {
    console.log(`  haiku parse failed, retrying... (${parseError(err)})`);
    const retryOutput = await promptAndCollect(session, prompts.haikuRetryPrompt(word));
    return extractJSON(retryOutput) as HaikuResult;
  }
}

// ── Step 4: Generate design ──

interface DesignResult {
  colors: string[];
  fontUrl: string;
  fontFamily: string;
  fontColor: string;
  signature: string;
}

export async function generateDesign(
  session: AgentSession,
  haikuText: string,
  usedFonts: string[],
  usedPalettes: string[][],
): Promise<DesignResult> {
  const output = await promptAndCollect(session, prompts.designPrompt(haikuText, usedFonts, usedPalettes));
  return parseDesign(output, session, haikuText, usedFonts, usedPalettes);
}

export async function regenerateDesign(
  session: AgentSession,
  haikuText: string,
): Promise<DesignResult> {
  try {
    const output = await promptAndCollect(session, prompts.designRegeneratePrompt(haikuText));
    return extractJSON(output) as DesignResult;
  } catch {
    const output = await promptAndCollect(session, prompts.designSimplePrompt(haikuText));
    return extractJSON(output) as DesignResult;
  }
}

async function parseDesign(
  output: string,
  session: AgentSession,
  haikuText: string,
  usedFonts: string[],
  usedPalettes: string[][],
): Promise<DesignResult> {
  try {
    const json = extractJSON(output) as DesignResult;
    if (!json.colors || !json.fontUrl || !json.fontFamily || !json.fontColor || !json.signature) {
      throw new Error("Invalid design structure");
    }
    return json;
  } catch (err) {
    console.log(`  design parse failed, retrying... (${parseError(err)})`);
    const retryOutput = await promptAndCollect(session, prompts.designRetryPrompt());
    return extractJSON(retryOutput) as DesignResult;
  }
}

// ── Step 5: Validate ──

export async function validateCandidate(
  candidate: PaletteEntry,
  existingEntries: PaletteEntry[],
  session: AgentSession,
): Promise<{ approved: boolean; reason?: string }> {
  if (existingEntries.length === 0) return { approved: true };

  const existingSummary = existingEntries.map(e => ({
    word: e.word,
    haiku: e.haiku,
    font: e.font,
    colors: e.colors,
    signature: e.signature,
  }));

  const output = await promptAndCollect(session, prompts.validatePrompt(candidate, existingSummary));

  try {
    const result = extractJSON(output) as { approved: boolean; reason?: string };
    if (!result.approved) console.log(`  validator reason: ${result.reason}`);
    return result;
  } catch {
    return { approved: true };
  }
}
