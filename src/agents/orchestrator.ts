import { Store, type Entry, type SoundConfig } from "../store.js";
import { updateReadme } from "../update-readme.js";
import type { AikuAgents, DictionaryEntry } from "./index.js";
import { createAgents } from "./index.js";
import {
  isWordUnique,
  isWordInHaiku,
  isFontUnique,
  isColorPaletteDuplicate,
} from "./validators.js";

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 2) return 1;
  const groups = word.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (word.endsWith("e") && !word.endsWith("le") && count > 1) count--;
  return Math.max(1, count);
}

function lineSyllables(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).reduce((s: number, w: string) => s + countSyllables(w), 0);
}

function isHaikuSyllableStructure(lines: string[], tolerance = 1): boolean {
  const counts = lines.map(lineSyllables);
  return (
    Math.abs(counts[0] - 5) <= tolerance &&
    Math.abs(counts[1] - 7) <= tolerance &&
    Math.abs(counts[2] - 5) <= tolerance
  );
}

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
  arpeggio: { sound: SoundConfig; notes: { midi: number; duration: string; velocity: number }[] },
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
    arpeggio,
  };
}

export class OrchestratorAgent {
  readonly name = "Orchestrator";
  readonly purpose = "Coordinates the Curator, Poet, Designer, Critic, and Musician to produce a haiku entry";

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

      if (!isHaikuSyllableStructure(haiku.lines)) {
        retries++;
        if (retries > MAX_RETRIES) {
          throw new Error(`Haiku failed syllable check after ${MAX_RETRIES} retries: ${haiku.lines.map(l => lineSyllables(l)).join("-")}`);
        }
        const counts = haiku.lines.map(l => lineSyllables(l)).join("-");
        fail(`Syllable count ${counts} (expected 5-7-5).`, retries, MAX_RETRIES);
        retry();
        haiku = await this.agents.poet.revise({
          word: definition.word,
          previous: haiku,
          feedback: `Syllable count is ${counts}, needs to be 5-7-5. Line 1: ~5 syllables, Line 2: ~7 syllables, Line 3: ~5 syllables.`,
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

    if (!isWordUnique(definition.word, journal.entries)) {
      throw new Error(`Word "${definition.word}" already exists in journal. This should not happen — the Critic should have caught it.`);
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

    step(5, "Composing arpeggio");
    const arpeggio = await this.agents.musician.composeArpeggio({
      haiku: haikuText,
      colors: design.colors,
      signature: design.signature,
      word: definition.word,
    });
    ok(`Notes: ${arpeggio.notes.map(n => n.midi).join(", ")} | Effects: ${arpeggio.sound.routing?.length ?? 0}`);

    step(6, "Saving entry");
    const entry = toEntry(definition, definition.meanings[0], haiku.lines, design, arpeggio);
    const totalEntries = this.store.addEntry(entry).entries.length;
    ok(`"${definition.word}" saved (${totalEntries} entries total)`);

    updateReadme();

    return entry;
  }
}

export async function runAgent(): Promise<Entry> {
  const agents = await createAgents();
  const store = new Store("data.json");
  const orchestrator = new OrchestratorAgent(agents, store);
  return orchestrator.run();
}
