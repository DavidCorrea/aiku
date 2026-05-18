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

const MAX_RETRIES = 3;

// ── Log helpers ──

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

function info(detail: string) {
  console.log(`  ${detail}`);
}

// ── Programmatic validation helpers ──

interface ProgrammaticCheckResult {
  pass: boolean;
  issue?: "word" | "haiku_word" | "font" | "colors";
  reason?: string;
}

function checkWordUnique(word: string, existingEntries: Entry[]): ProgrammaticCheckResult {
  const wordLower = word.toLowerCase();
  if (existingEntries.some(e => e.word.toLowerCase() === wordLower)) {
    return { pass: false, issue: "word", reason: `Word "${word}" already exists.` };
  }
  return { pass: true };
}

function checkWordInHaiku(word: string, haiku: string[]): ProgrammaticCheckResult {
  const wordLower = word.toLowerCase();
  const haikuText = haiku.join(" ").toLowerCase();
  if (!haikuText.includes(wordLower)) {
    return { pass: false, issue: "haiku_word", reason: `Word "${word}" does not appear in the haiku.` };
  }
  return { pass: true };
}

function checkFontUnique(font: string, existingEntries: Entry[]): ProgrammaticCheckResult {
  const fontLower = font.toLowerCase();
  if (existingEntries.some(e => e.font.toLowerCase() === fontLower)) {
    return { pass: false, issue: "font", reason: `Font "${font}" already used.` };
  }
  return { pass: true };
}

function checkColorsUnique(colors: string[], existingEntries: Entry[]): ProgrammaticCheckResult {
  const candidatePalette = [...colors].map(c => c.toLowerCase()).sort();
  for (const entry of existingEntries) {
    const existingPalette = [...entry.colors].map(c => c.toLowerCase()).sort();
    if (candidatePalette.length === existingPalette.length &&
        candidatePalette.every((c, i) => c === existingPalette[i])) {
      return { pass: false, issue: "colors", reason: `Color palette identical to entry "${entry.word}".` };
    }
  }
  return { pass: true };
}

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

  // ── Step 1: Curator picks a word ──
  step(1, "Picking word");
  const usedWords = journal.entries.map(e => e.word.toLowerCase());
  let chosenWord = await pickWord(agents.curator, usedWords);
  ok(`Word: "${chosenWord}"`);

  let retries = 0;
  while (true) {
    const check = checkWordUnique(chosenWord, journal.entries);
    if (check.pass) break;
    retries++;
    if (retries > MAX_RETRIES) throw new Error(`Failed to pick unique word after ${MAX_RETRIES} retries. Last: "${chosenWord}"`);
    fail(check.reason, retries, MAX_RETRIES);
    chosenWord = await pickWord(agents.curator, usedWords);
    ok(`Word: "${chosenWord}"`);
  }

  // ── Step 2: Curator fetches dictionary definition ──
  step(2, "Fetching definition");
  const dictEntry = await fetchDefinition(agents.curator, chosenWord, usedWords);
  ok(`${dictEntry.phonetic || "no phonetic"} — ${dictEntry.meanings[0].definitions[0].definition}`);

  // ── Step 3: Poet composes a haiku (validate immediately) ──
  step(3, "Composing haiku");
  let haikuResult = await generateHaiku(
    agents.poet,
    dictEntry.word,
    dictEntry.meanings[0].definitions[0].definition,
    dictEntry.meanings[0].partOfSpeech,
  );
  ok(haikuResult.haiku.join(" / "));

  retries = 0;
  while (true) {
    // Programmatic: word must appear in haiku
    const progCheck = checkWordInHaiku(dictEntry.word, haikuResult.haiku);
    if (!progCheck.pass) {
      retries++;
      if (retries > MAX_RETRIES) throw new Error(`Haiku failed programmatic check after ${MAX_RETRIES} retries: ${progCheck.reason}`);
      fail(progCheck.reason, retries, MAX_RETRIES);
      retry();
      haikuResult = await regenerateHaiku(agents.poet, dictEntry.word);
      ok(haikuResult.haiku.join(" / "));
      continue;
    }

    // Fuzzy: haiku similarity check via critic
    const candidate = toEntry(dictEntry, dictEntry.meanings[0], haikuResult.haiku, {
      colors: [], fontFamily: "", fontUrl: "", fontColor: "", signature: "",
    });
    const criticResult = await validateCandidate(candidate, journal.entries, agents.critic);
    if (criticResult.approved) break;

    retries++;
    if (retries > MAX_RETRIES) throw new Error(`Haiku rejected by critic after ${MAX_RETRIES} retries: ${criticResult.reason}`);
    fail(`Critic: ${criticResult.reason}`, retries, MAX_RETRIES);
    retry();
    haikuResult = await regenerateHaiku(agents.poet, dictEntry.word);
    ok(haikuResult.haiku.join(" / "));
  }

  // ── Step 4: Designer creates visual treatment (validate immediately) ──
  step(4, "Designing visual treatment");
  const usedFonts = [...new Set(journal.entries.map(e => e.font))];
  const usedPalettes = journal.entries.map(e => e.colors);
  const haikuText = haikuResult.haiku.join("\n");
  let design = await generateDesign(agents.designer, haikuText, usedFonts, usedPalettes);
  ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);

  retries = 0;
  while (true) {
    // Programmatic: font uniqueness
    let progCheck = checkFontUnique(design.fontFamily, journal.entries);
    if (!progCheck.pass) {
      retries++;
      if (retries > MAX_RETRIES) throw new Error(`Design failed programmatic check after ${MAX_RETRIES} retries: ${progCheck.reason}`);
      fail(progCheck.reason, retries, MAX_RETRIES);
      retry();
      design = await regenerateDesign(agents.designer, haikuText);
      ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
      continue;
    }

    // Programmatic: color palette uniqueness
    progCheck = checkColorsUnique(design.colors, journal.entries);
    if (!progCheck.pass) {
      retries++;
      if (retries > MAX_RETRIES) throw new Error(`Design failed programmatic check after ${MAX_RETRIES} retries: ${progCheck.reason}`);
      fail(progCheck.reason, retries, MAX_RETRIES);
      retry();
      design = await regenerateDesign(agents.designer, haikuText);
      ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
      continue;
    }

    // Fuzzy: signature similarity check via critic
    const candidate = toEntry(dictEntry, dictEntry.meanings[0], haikuResult.haiku, design);
    const criticResult = await validateCandidate(candidate, journal.entries, agents.critic);
    if (criticResult.approved) break;

    retries++;
    if (retries > MAX_RETRIES) throw new Error(`Design rejected by critic after ${MAX_RETRIES} retries: ${criticResult.reason}`);
    fail(`Critic: ${criticResult.reason}`, retries, MAX_RETRIES);
    retry();
    design = await regenerateDesign(agents.designer, haikuText);
    ok(`Font: ${design.fontFamily} | Colors: ${design.colors.join(", ")}`);
  }

  // ── All checks passed ──
  step(5, "Saving entry");
  const candidate = toEntry(dictEntry, dictEntry.meanings[0], haikuResult.haiku, design);
  const totalEntries = store.addEntry(candidate).entries.length;
  ok(`"${dictEntry.word}" saved (${totalEntries} entries total)`);

  return candidate;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
