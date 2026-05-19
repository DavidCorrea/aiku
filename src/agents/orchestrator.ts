import { Store, type Entry } from "../store.js";
import type { AikuAgents, DictionaryEntry } from "./index.js";
import { createAgents } from "./index.js";
import {
  isWordUnique,
  isWordInHaiku,
  isFontUnique,
  isColorPaletteDuplicate,
} from "./validators.js";

const MAX_RETRIES = 3;

function step(num: number, label: string) {
  console.log(`[STEP ${num}] ${label}`);
}

function ok(detail: string) {
  console.log(`  ✓ ${detail}`);
}

function fail(detail: string, attempt?: number, max?: number) {
  const retry = attempt !== undefined && max !== undefined ? ` (${attempt}/${max})` : "";
  console.log(`  ✗ ${detail}${retry}`);
}

function retry() {
  console.log(`  ↻ Regenerating...`);
}

function toEntry(
  dictEntry: DictionaryEntry,
  firstMeaning: { definitions: { definition: string }[] },
  haikuLines: string[],
  design: { colors: string[]; fontFamily: string; fontUrl: string; fontColor: string; signature: string },
): Entry {
  return {
    timestamp: new Date().toISOString(),
    word: dictEntry.word,
    phonetic: dictEntry.phonetic || "",
    definition: firstMeaning.definitions[0].definition,
    sourceUrl: dictEntry.sourceUrls[0],
    haiku: haikuLines,
    colors: design.colors,
    font: design.fontFamily,
    fontUrl: design.fontUrl,
    fontColor: design.fontColor,
    signature: design.signature,
  };
}

export class OrchestratorAgent {
  readonly name = "Orchestrator";
  readonly purpose = "Coordinates the Curator, Poet, Designer, and Critic to produce a haiku entry";

  private readonly agents: AikuAgents;
  private readonly store: Store;

  constructor(agents: AikuAgents, store: Store) {
    this.agents = agents;
    this.store = store;
  }

  async run(): Promise<Entry> {
    const journal = this.store.read();

    step(1, "Picking word");
    const usedWords = journal.entries.map(e => e.word.toLowerCase());
    let chosenWord = await this.agents.curator.pickWord({ avoid: usedWords });
    ok(`Word: "${chosenWord}"`);

    let retries = 0;
    while (!isWordUnique(chosenWord, journal.entries)) {
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`Failed to pick unique word after ${MAX_RETRIES} retries. Last: "${chosenWord}"`);
      }
      fail(`Word "${chosenWord}" already exists.`, retries, MAX_RETRIES);
      chosenWord = await this.agents.curator.pickWord({ avoid: usedWords });
      ok(`Word: "${chosenWord}"`);
    }

    step(2, "Fetching definition");
    const definition = await this.agents.curator.define(chosenWord);
    ok(`${definition.phonetic || "no phonetic"} — ${definition.meanings[0].definitions[0].definition}`);

    step(3, "Composing haiku");
    let haiku = await this.agents.poet.compose({
      word: definition.word,
      meaning: definition.meanings[0].definitions[0].definition,
      partOfSpeech: definition.meanings[0].partOfSpeech,
    });
    ok(haiku.lines.join(" / "));

    retries = 0;
    while (true) {
      if (!isWordInHaiku(definition.word, haiku.lines)) {
        retries++;
        if (retries > MAX_RETRIES) {
          throw new Error(`Haiku failed programmatic check after ${MAX_RETRIES} retries: word "${definition.word}" not in haiku.`);
        }
        fail(`Word "${definition.word}" not found in haiku.`, retries, MAX_RETRIES);
        retry();
        haiku = await this.agents.poet.revise({
          word: definition.word,
          previous: haiku,
          feedback: `The word "${definition.word}" must appear in the haiku.`,
        });
        ok(haiku.lines.join(" / "));
        continue;
      }

      const haikuVerdict = await this.agents.critic.reviewHaiku(
        { word: definition.word, haiku: haiku.lines, signature: "" },
        journal.entries,
      );
      if (haikuVerdict.approved) break;

      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`Haiku rejected by critic after ${MAX_RETRIES} retries: ${haikuVerdict.reason}`);
      }
      fail(`Critic: ${haikuVerdict.reason}`, retries, MAX_RETRIES);
      retry();
      haiku = await this.agents.poet.revise({
        word: definition.word,
        previous: haiku,
        feedback: haikuVerdict.reason ?? "Too similar to existing entries.",
      });
      ok(haiku.lines.join(" / "));
    }

    step(4, "Designing visual treatment");
    const usedFonts = [...new Set(journal.entries.map(e => e.font))];
    const usedPalettes = journal.entries.map(e => e.colors);
    const haikuText = haiku.lines.join("\n");
    let design = await this.agents.designer.createVisualTreatment({
      haiku: haikuText,
      usedFonts,
      usedPalettes,
    });
    ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);

    retries = 0;
    while (true) {
      if (!isFontUnique(design.fontFamily, journal.entries)) {
        retries++;
        if (retries > MAX_RETRIES) {
          throw new Error(`Design failed programmatic check after ${MAX_RETRIES} retries: font "${design.fontFamily}" already used.`);
        }
        fail(`Font "${design.fontFamily}" already used.`, retries, MAX_RETRIES);
        retry();
        design = await this.agents.designer.redesign({
          haiku: haikuText,
          feedback: `Font "${design.fontFamily}" is already used. Pick a different one.`,
        });
        ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
        continue;
      }

      if (isColorPaletteDuplicate(design.colors, journal.entries)) {
        retries++;
        if (retries > MAX_RETRIES) {
          throw new Error(`Design failed programmatic check after ${MAX_RETRIES} retries: color palette already used.`);
        }
        fail(`Color palette already used.`, retries, MAX_RETRIES);
        retry();
        design = await this.agents.designer.redesign({
          haiku: haikuText,
          feedback: "This color palette is identical to an existing entry. Pick different colors.",
        });
        ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
        continue;
      }

      const entryVerdict = await this.agents.critic.reviewEntry(
        {
          word: definition.word,
          haiku: haiku.lines,
          font: design.fontFamily,
          colors: design.colors,
          signature: design.signature,
        },
        journal.entries,
      );
      if (entryVerdict.approved) break;

      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`Design rejected by critic after ${MAX_RETRIES} retries: ${entryVerdict.reason}`);
      }
      fail(`Critic: ${entryVerdict.reason}`, retries, MAX_RETRIES);
      retry();
      design = await this.agents.designer.redesign({
        haiku: haikuText,
        feedback: entryVerdict.reason ?? "Too similar to existing entries.",
      });
      ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
    }

    step(5, "Saving entry");
    const entry = toEntry(definition, definition.meanings[0], haiku.lines, design);
    const totalEntries = this.store.addEntry(entry).entries.length;
    ok(`"${definition.word}" saved (${totalEntries} entries total)`);

    return entry;
  }
}

export async function runAgent(): Promise<Entry> {
  const agents = await createAgents();
  const store = new Store("data.json");
  const orchestrator = new OrchestratorAgent(agents, store);
  return orchestrator.run();
}
