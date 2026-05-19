import { BaseAgent } from "./base.js";
import { pickWordPrompt, fallbackWordPrompt } from "../prompts.js";

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings: DictionaryMeaning[];
  sourceUrls: string[];
}

export class CuratorAgent extends BaseAgent {
  readonly name = "Curator";
  readonly purpose = "Picks evocative words and fetches their definitions";

  async pickWord(opts: { avoid: string[] }): Promise<string> {
    const output = await this.ask(pickWordPrompt(opts.avoid));
    const word = output.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!word) {
      throw new Error(`[Curator] Did not return a valid word. Output: "${output}"`);
    }
    return word;
  }

  async define(word: string): Promise<DictionaryEntry> {
    let wordToTry = word;
    let attempts = 0;
    const failedWords: string[] = [];

    while (attempts < 3) {
      const entry = await this.fetchSingleWord(wordToTry);
      if (entry) {
        if (wordToTry !== word) {
          console.log(`    Dictionary: using "${wordToTry}" instead of "${word}"`);
        }
        return entry;
      }

      failedWords.push(wordToTry);
      attempts++;
      if (attempts >= 3) break;

      console.log(`    Dictionary: "${wordToTry}" not usable, asking for fallback...`);
      const fallback = await this.ask(fallbackWordPrompt(wordToTry, [], failedWords));
      wordToTry = fallback.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (!wordToTry) throw new Error(`[Curator] Could not provide a fallback word.`);
    }

    throw new Error(
      `[Curator] Failed to find a valid dictionary word after 3 attempts. Tried: ${[...new Set([word, ...failedWords])].join(", ")}`,
    );
  }

  async suggestAlternative(opts: { failedWord: string; avoid: string[] }): Promise<string> {
    const output = await this.ask(fallbackWordPrompt(opts.failedWord, opts.avoid, []));
    const word = output.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!word) throw new Error(`[Curator] Could not suggest an alternative word.`);
    return word;
  }

  private async fetchSingleWord(word: string): Promise<DictionaryEntry | null> {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0] as DictionaryEntry;
    if (!entry.phonetic && entry.phonetics?.length) {
      const withText = entry.phonetics.find((p: { text?: string }) => p.text);
      if (withText) entry.phonetic = withText.text;
    }

    return entry.phonetic ? entry : null;
  }
}
