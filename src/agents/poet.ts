import { BaseAgent } from "./base.js";
import {
  haikuPrompt,
  haikuRetryPrompt,
  haikuRegeneratePrompt,
  haikuSimplePrompt,
} from "../prompts.js";

export interface Haiku {
  lines: [string, string, string];
}

export class PoetAgent extends BaseAgent {
  readonly name = "Poet";
  readonly purpose = "Composes 5-7-5 haikus connecting words to AI";

  async compose(opts: {
    word: string;
    meaning: string;
    partOfSpeech: string;
  }): Promise<Haiku> {
    const output = await this.ask(haikuPrompt(opts.word, opts.meaning, opts.partOfSpeech));
    return this.parseHaiku(output, opts.word);
  }

  async revise(opts: {
    word: string;
    previous: Haiku;
    feedback: string;
  }): Promise<Haiku> {
    try {
      const output = await this.ask(
        haikuRegeneratePrompt(opts.word, opts.previous.lines, opts.feedback),
      );
      return this.parseHaiku(output, opts.word);
    } catch (err) {
      console.log(
        `    [${this.name}] Regenerate failed, using simple prompt... (${err instanceof Error ? err.message : String(err)})`,
      );
      const output = await this.ask(haikuSimplePrompt(opts.word));
      return this.parseHaiku(output, opts.word);
    }
  }

  async composeSimple(opts: { word: string }): Promise<Haiku> {
    const output = await this.ask(haikuSimplePrompt(opts.word));
    return this.parseHaiku(output, opts.word);
  }

  private async parseHaiku(output: string, word: string): Promise<Haiku> {
    try {
      const json = this.extractJSON(output) as { haiku: string[] };
      if (!json.haiku || json.haiku.length !== 3) {
        throw new Error("Invalid haiku structure");
      }
      return { lines: json.haiku as [string, string, string] };
    } catch (err) {
      console.log(
        `    [${this.name}] JSON parse failed, retrying... (${err instanceof Error ? err.message : String(err)})`,
      );
      const retryOutput = await this.ask(haikuRetryPrompt(word));
      const json = this.extractJSON(retryOutput) as { haiku: string[] };
      return { lines: json.haiku as [string, string, string] };
    }
  }
}
