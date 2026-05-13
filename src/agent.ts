import { createAgentSession } from "@earendil-works/pi-coding-agent";
import { Store, PaletteEntry } from "./store.js";
import {
  pickWord,
  fetchDefinition,
  generateHaiku,
  regenerateHaiku,
  generateDesign,
  regenerateDesign,
  validateCandidate,
} from "./steps.js";

const MAX_VALIDATION_RETRIES = 3;

export async function runAgent(): Promise<PaletteEntry> {
  const store = new Store("data.json");
  const data = store.read();

  // Create sessions
  const pickSession = (await createAgentSession()).session;
  const haikuSession = (await createAgentSession()).session;
  const designSession = (await createAgentSession()).session;
  const validatorSession = (await createAgentSession()).session;

  // Step 1: Pick a word
  const chosenWord = await pickWord(pickSession, data.entries.map(e => e.word));

  // Step 2: Fetch dictionary definition
  const dictEntry = await fetchDefinition(pickSession, chosenWord);
  const meaning = dictEntry.meanings[0];

  // Step 3: Generate haiku
  let { haiku } = await generateHaiku(
    haikuSession,
    dictEntry.word,
    meaning.definitions[0].definition,
    meaning.partOfSpeech,
  );
  console.log(`  haiku: ${haiku[0]} / ${haiku[1]} / ${haiku[2]}`);

  // Step 4: Generate design
  const usedFonts = [...new Set(data.entries.map(e => e.font))];
  const usedPalettes = data.entries.map(e => e.colors);
  const haikuText = haiku.join("\n");

  let design = await generateDesign(designSession, haikuText, usedFonts, usedPalettes);

  // Build candidate
  const candidate: PaletteEntry = {
    timestamp: new Date().toISOString(),
    word: dictEntry.word,
    definition: meaning.definitions[0].definition,
    haiku,
    colors: design.colors,
    font: design.fontFamily,
    fontUrl: design.fontUrl,
    fontColor: design.fontColor,
    sourceUrl: dictEntry.sourceUrls[0],
  };

  // Step 5: Validate and retry if needed
  let retryCount = 0;
  let accepted = false;

  while (!accepted && retryCount < MAX_VALIDATION_RETRIES) {
    const result = await validateCandidate(candidate, data.entries, validatorSession);
    accepted = result.approved;

    if (!accepted) {
      retryCount++;
      console.log(`  validator rejected (attempt ${retryCount}/${MAX_VALIDATION_RETRIES}), regenerating...`);

      const newHaiku = await regenerateHaiku(haikuSession, dictEntry.word);
      candidate.haiku = newHaiku.haiku;

      const newDesign = await regenerateDesign(designSession, newHaiku.haiku.join("\n"));
      candidate.colors = newDesign.colors;
      candidate.font = newDesign.fontFamily;
      candidate.fontUrl = newDesign.fontUrl;
      candidate.fontColor = newDesign.fontColor;
    }
  }

  if (!accepted) {
    console.log(`  ⚠ Validator still rejected after ${MAX_VALIDATION_RETRIES} retries, saving anyway`);
  } else {
    console.log(`  ✓ Validator approved`);
  }

  store.addEntry(candidate);
  console.log(`✓ New entry: "${dictEntry.word}" — ${candidate.colors.length} colors, font: ${candidate.font}`);

  return candidate;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
