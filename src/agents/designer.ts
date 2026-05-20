import { BaseAgent } from "./base.js";
import {
  designPrompt,
  designRetryPrompt,
  designRegeneratePrompt,
  designSimplePrompt,
} from "../prompts.js";

export interface VisualTreatment {
  colors: string[];
  fontUrl: string;
  fontFamily: string;
  fontColor: string;
  signature: string;
}

export class DesignerAgent extends BaseAgent {
  readonly name = "Designer";
  readonly purpose = "Creates visual treatments for haiku entries";

  async createVisualTreatment(opts: {
    haiku: string;
    usedFonts: string[];
    usedPalettes: string[][];
  }): Promise<VisualTreatment> {
    const output = await this.ask(
      designPrompt(opts.haiku, opts.usedFonts, opts.usedPalettes),
    );
    return this.parseDesignOutput(output);
  }

  async redesign(opts: { haiku: string; feedback: string }): Promise<VisualTreatment> {
    try {
      const output = await this.ask(designRegeneratePrompt(opts.haiku, opts.feedback));
      return parseDesign(output);
    } catch (err) {
      console.log(
        `    [${this.name}] Regenerate failed, using simple prompt... (${err instanceof Error ? err.message : String(err)})`,
      );
      const output = await this.ask(designSimplePrompt(opts.haiku));
      return parseDesign(output);
    }
  }

  private async parseDesignOutput(output: string): Promise<VisualTreatment> {
    try {
      return parseDesign(output);
    } catch (err) {
      console.log(
        `    [${this.name}] JSON parse failed, retrying... (${err instanceof Error ? err.message : String(err)})`,
      );
      const retryOutput = await this.ask(designRetryPrompt());
      return parseDesign(retryOutput);
    }
  }
}

function parseDesign(output: string): VisualTreatment {
  const cleaned = output.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  const json = JSON.parse(cleaned) as VisualTreatment;
  if (!json.colors || !json.fontUrl || !json.fontFamily || !json.fontColor || !json.signature) {
    throw new Error("Invalid design structure");
  }
  return { ...json, fontFamily: json.fontFamily.replace(/'/g, "") };
}
