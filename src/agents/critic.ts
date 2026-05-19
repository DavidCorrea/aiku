import { BaseAgent } from "./base.js";
import { validatePrompt } from "../prompts.js";
import type { Entry } from "../store.js";

export interface Verdict {
  approved: boolean;
  reason?: string;
}

export class CriticAgent extends BaseAgent {
  readonly name = "Critic";
  readonly purpose = "Validates candidates against existing entries";

  async reviewHaiku(
    candidate: { word: string; haiku: string[]; signature: string },
    existing: Entry[],
  ): Promise<Verdict> {
    return this.review(
      { ...candidate, font: "", colors: [] },
      existing,
    );
  }

  async reviewEntry(
    candidate: { word: string; haiku: string[]; font: string; colors: string[]; signature: string },
    existing: Entry[],
  ): Promise<Verdict> {
    return this.review(candidate, existing);
  }

  private async review(
    candidate: {
      word: string;
      haiku: string[];
      font?: string;
      colors?: string[];
      signature: string;
    },
    existing: Entry[],
  ): Promise<Verdict> {
    if (existing.length === 0) return { approved: true };

    const existingSummary = existing.map(e => ({
      word: e.word,
      haiku: e.haiku,
      font: e.font,
      colors: e.colors,
      signature: e.signature,
    }));

    const output = await this.ask(validatePrompt(candidate, existingSummary));

    try {
      return this.extractJSON(output) as Verdict;
    } catch {
      return { approved: true };
    }
  }
}
