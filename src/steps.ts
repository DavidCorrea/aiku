import { type Agent } from "./agents.js";
import { type Entry } from "./store.js";
import * as prompts from "./prompts.js";

// ── Helpers ──

export async function collectAgentText(agent: Agent, promptText: string): Promise<string> {
  await agent.session.prompt(promptText);
  const messages = agent.session.state.messages;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== "assistant") {
    throw new Error(`[${agent.name}] No assistant response found`);
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
  phonetics?: { text?: string }[];
  meanings: DictionaryMeaning[];
  sourceUrls: string[];
}

async function fetchWord(word: string): Promise<DictionaryEntry> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`Dictionary API error: ${res.status}`);
  const data = await res.json();
  const entry = data[0] as DictionaryEntry;
  if (!entry.phonetic && entry.phonetics?.length) {
    const withText = entry.phonetics.find((p: { text?: string }) => p.text);
    if (withText) entry.phonetic = withText.text;
  }
  return entry;
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

// ── Step 1: Curator picks a word ──

export async function pickWord(agent: Agent, usedWords: string[]): Promise<string> {
  const output = await collectAgentText(agent, prompts.pickWordPrompt(usedWords));
  const word = output.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!word) throw new Error(`[${agent.name}] Did not return a valid word. Output: "${output}"`);
  return word;
}

// ── Step 2: Curator fetches dictionary entry (with retry) ──

export async function fetchDefinition(agent: Agent, chosenWord: string, usedWords: string[] = []): Promise<DictionaryEntry> {
  let entry: DictionaryEntry | null = null;
  let wordToTry = chosenWord;
  let attempts = 0;
  const failedWords: string[] = [];

  while (!entry && attempts < 3) {
    try {
      entry = await fetchWord(wordToTry);
      if (!entry.phonetic) {
        console.log(`    Dictionary: "${wordToTry}" has no phonetic, trying fallback...`);
        failedWords.push(wordToTry);
        const fallback = await collectAgentText(agent, prompts.fallbackWordPrompt(wordToTry, usedWords, failedWords));
        wordToTry = fallback.trim().toLowerCase().replace(/[^a-z]/g, "");
        if (!wordToTry) throw new Error(`[${agent.name}] Could not provide a fallback word.`);
        entry = null;
        attempts++;
        continue;
      }
    } catch {
      failedWords.push(wordToTry);
      attempts++;
      console.log(`    Dictionary: "${wordToTry}" not found, trying fallback...`);
      const fallback = await collectAgentText(agent, prompts.fallbackWordPrompt(wordToTry, usedWords, failedWords));
      wordToTry = fallback.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (!wordToTry) throw new Error(`[${agent.name}] Could not provide a fallback word.`);
    }
  }

  if (!entry) throw new Error(`[${agent.name}] Failed to find a valid dictionary word after 3 attempts. Tried: ${[...new Set([chosenWord, ...failedWords])].join(", ")}`);
  if (wordToTry !== chosenWord) {
    console.log(`    Dictionary: using "${wordToTry}" instead of "${chosenWord}"`);
  }
  return entry;
}

// ── Step 3: Poet generates haiku ──

interface HaikuResult {
  haiku: string[];
}

export async function generateHaiku(agent: Agent, word: string, definition: string, partOfSpeech: string): Promise<HaikuResult> {
  const output = await collectAgentText(agent, prompts.haikuPrompt(word, definition, partOfSpeech));
  return parseHaiku(output, word, agent);
}

export async function regenerateHaiku(agent: Agent, word: string): Promise<HaikuResult> {
  try {
    const output = await collectAgentText(agent, prompts.haikuRegeneratePrompt(word));
    return parseHaiku(output, word, agent);
  } catch {
    const output = await collectAgentText(agent, prompts.haikuSimplePrompt(word));
    return parseHaiku(output, word, agent);
  }
}

async function parseHaiku(output: string, word: string, agent: Agent): Promise<HaikuResult> {
  try {
    const json = extractJSON(output) as HaikuResult;
    if (!json.haiku || json.haiku.length !== 3) throw new Error("Invalid haiku structure");
    return json;
  } catch (err) {
    console.log(`    [${agent.name}] JSON parse failed, retrying... (${err instanceof Error ? err.message : String(err)})`);
    const retryOutput = await collectAgentText(agent, prompts.haikuRetryPrompt(word));
    return extractJSON(retryOutput) as HaikuResult;
  }
}

// ── Step 4: Designer generates design ──

interface DesignResult {
  colors: string[];
  fontUrl: string;
  fontFamily: string;
  fontColor: string;
  signature: string;
}

export async function generateDesign(
  agent: Agent,
  haikuText: string,
  usedFonts: string[],
  usedPalettes: string[][],
): Promise<DesignResult> {
  const output = await collectAgentText(agent, prompts.designPrompt(haikuText, usedFonts, usedPalettes));
  return parseDesign(output, agent, haikuText, usedFonts, usedPalettes);
}

export async function regenerateDesign(
  agent: Agent,
  haikuText: string,
): Promise<DesignResult> {
  try {
    const output = await collectAgentText(agent, prompts.designRegeneratePrompt(haikuText));
    return extractDesign(output);
  } catch {
    const output = await collectAgentText(agent, prompts.designSimplePrompt(haikuText));
    return extractDesign(output);
  }
}

function extractDesign(output: string): DesignResult {
  const json = extractJSON(output) as DesignResult;
  if (!json.colors || !json.fontUrl || !json.fontFamily || !json.fontColor || !json.signature) {
    throw new Error("Invalid design structure");
  }
  return { ...json, fontFamily: json.fontFamily.replace(/'/g, "") };
}

async function parseDesign(
  output: string,
  agent: Agent,
  haikuText: string,
  usedFonts: string[],
  usedPalettes: string[][],
): Promise<DesignResult> {
  try {
    return extractDesign(output);
  } catch (err) {
    console.log(`    [${agent.name}] JSON parse failed, retrying... (${err instanceof Error ? err.message : String(err)})`);
    const retryOutput = await collectAgentText(agent, prompts.designRetryPrompt());
    return extractDesign(retryOutput);
  }
}

// ── Critic validates ──

export async function validateCandidate(
  candidate: Entry,
  existingEntries: Entry[],
  agent: Agent,
): Promise<{ approved: boolean; reason?: string }> {
  if (existingEntries.length === 0) return { approved: true };

  const existingSummary = existingEntries.map(e => ({
    word: e.word,
    haiku: e.haiku,
    font: e.font,
    colors: e.colors,
    signature: e.signature,
  }));

  const output = await collectAgentText(agent, prompts.validatePrompt(candidate, existingSummary));

  try {
    const result = extractJSON(output) as { approved: boolean; reason?: string };
    return result;
  } catch {
    return { approved: true };
  }
}
