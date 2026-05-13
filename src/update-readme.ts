import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store, PaletteEntry } from "./store.js";

const phrases = [
  "Every word, every shade — dreamed up by a mind that isn't mine.",
  "A ghost picked the palette. A ghost wrote the verse.",
  "No human chose this. Something else did.",
  "An artificial muse selected every hue and syllable.",
  "This was made by something that has never seen color or felt words.",
  "A mind without eyes chose these colors. A heart without a beat wrote this.",
  "Nothing human touched this — except the hand that reads it.",
  "Born from a language model's dream of what beauty might be.",
];

function randomPhrase(): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function buildHaikuSection(entry: PaletteEntry): string {
  const lines = [
    `> **${entry.word}** — ${entry.definition}`,
    `>`,
    ...entry.haiku.map((line) => `> ${line}`),
    `>`,
    `<sub>🎨 ${entry.font} · ${entry.colors.length} colors · ${formatDate(entry.timestamp)}</sub>`,
    `>`,
    `> _${randomPhrase()}_`,
  ];
  return lines.join("\n");
}

export function updateReadme(dataPath = "data.json", readmePath = "README.md"): void {
  const store = new Store(dataPath);
  const data = store.read();

  if (data.entries.length === 0) {
    console.log("No entries found, skipping README update");
    return;
  }

  const latest = data.entries[0];
  const haikuBlock = buildHaikuSection(latest);

  const readmePathResolved = join(process.cwd(), readmePath);
  let readme: string;
  try {
    readme = readFileSync(readmePathResolved, "utf-8");
  } catch {
    console.warn("README.md not found, skipping update");
    return;
  }

  const startMarker = "<!-- HAIKU-START -->";
  const endMarker = "<!-- HAIKU-END -->";
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn("HAIKU markers not found in README.md, skipping update");
    return;
  }

  const before = readme.slice(0, startMarker.length + startIdx);
  const after = readme.slice(endIdx);
  readme = `${before}\n${haikuBlock}\n${after}`;

  writeFileSync(readmePathResolved, readme);
  console.log(`✓ README.md updated with latest haiku: "${latest.word}"`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateReadme();
}
