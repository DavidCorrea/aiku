import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store, Entry } from "./store.js";

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

export function updateReadme(dataPath = "data.json", readmePath = "README.md"): void {
  const store = new Store(dataPath);
  const data = store.read();

  if (data.entries.length === 0) {
    console.log("No entries found, skipping README update");
    return;
  }

  const latest = data.entries[0];
  const haikuBlock = [
    `> **${latest.word}** — ${latest.definition}`,
    `>`,
    ...latest.haiku.map((line) => `> ${line}`),
    `>`,
    `> _${latest.signature}_`,
    `>`,
    `<sub>🎨 ${latest.font} · ${latest.colors.length} colors · ${formatDate(latest.timestamp)}</sub>`,
  ].join("\n");

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

  const before = readme.slice(0, startIdx + startMarker.length);
  const after = readme.slice(endIdx);
  readme = `${before}\n${haikuBlock}\n${after}`;

  writeFileSync(readmePathResolved, readme);
  console.log(`✓ README.md updated with latest haiku: "${latest.word}"`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateReadme();
}
