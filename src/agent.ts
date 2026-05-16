import { Store, type Entry } from "./store.js";
import {
  pickWord,
  fetchDefinition,
  generateHaiku,
  regenerateHaiku,
  generateDesign,
  regenerateDesign,
  validateCandidate,
} from "./steps.js";
import { createAgents } from "./agents.js";

const MAX_VALIDATION_RETRIES = 3;

function toEntry(
  dictEntry: { word: string; phonetic?: string; sourceUrls: string[] },
  meaning: { definitions: { definition: string }[] },
  haiku: string[],
  design: { colors: string[]; fontFamily: string; fontUrl: string; fontColor: string; signature: string },
): Entry {
  return {
    timestamp: new Date().toISOString(),
    word: dictEntry.word,
    phonetic: dictEntry.phonetic || "",
    definition: meaning.definitions[0].definition,
    sourceUrl: dictEntry.sourceUrls[0],
    haiku,
    colors: design.colors,
    font: design.fontFamily,
    fontUrl: design.fontUrl,
    fontColor: design.fontColor,
    signature: design.signature,
  };
}

export async function runAgent(): Promise<Entry> {
  const store = new Store("data.json");
  const journal = store.read();
  const agents = await createAgents();

  // Step 1: Curator picks a word
  const chosenWord = await pickWord(agents.curator, journal.entries.map(e => e.word));

  // Step 2: Curator fetches the dictionary definition
  const dictEntry = await fetchDefinition(agents.curator, chosenWord);
  const meaning = dictEntry.meanings[0];

  // Step 3: Poet composes a haiku
  let haikuResult = await generateHaiku(
    agents.poet,
    dictEntry.word,
    meaning.definitions[0].definition,
    meaning.partOfSpeech,
  );
  console.log(`  haiku: ${haikuResult.haiku[0]} / ${haikuResult.haiku[1]} / ${haikuResult.haiku[2]}`);

  // Step 4: Designer creates the visual treatment
  const usedFonts = [...new Set(journal.entries.map(e => e.font))];
  const usedPalettes = journal.entries.map(e => e.colors);
  const haikuText = haikuResult.haiku.join("\n");
  let design = await generateDesign(agents.designer, haikuText, usedFonts, usedPalettes);

  let candidate = toEntry(dictEntry, meaning, haikuResult.haiku, design);

  // Step 5: Critic validates and retry if needed
  let retryCount = 0;
  let approved = false;

  while (!approved && retryCount < MAX_VALIDATION_RETRIES) {
    const result = await validateCandidate(candidate, journal.entries, agents.critic);
    approved = result.approved;

    if (!approved) {
      retryCount++;
      console.log(`  ${agents.critic.name} rejected (attempt ${retryCount}/${MAX_VALIDATION_RETRIES}), regenerating...`);

      haikuResult = await regenerateHaiku(agents.poet, dictEntry.word);
      design = await regenerateDesign(agents.designer, haikuResult.haiku.join("\n"));
      candidate = toEntry(dictEntry, meaning, haikuResult.haiku, design);
    }
  }

  if (!approved) {
    console.log(`  ⚠ ${agents.critic.name} still rejected after ${MAX_VALIDATION_RETRIES} retries, saving anyway`);
  } else {
    console.log(`  ✓ ${agents.critic.name} approved`);
  }

  store.addEntry(candidate);
  console.log(`✓ New entry: "${dictEntry.word}" — ${candidate.colors.length} colors, font: ${candidate.font}`);

  return candidate;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
