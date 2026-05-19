import type { Entry } from "../store.js";

export function isWordUnique(word: string, entries: Entry[]): boolean {
  const wordLower = word.toLowerCase();
  return !entries.some(e => e.word.toLowerCase() === wordLower);
}

export function isWordInHaiku(word: string, haikuLines: string[]): boolean {
  const wordLower = word.toLowerCase();
  return haikuLines.join(" ").toLowerCase().includes(wordLower);
}

export function isFontUnique(font: string, entries: Entry[]): boolean {
  const fontLower = font.toLowerCase();
  return !entries.some(e => e.font.toLowerCase() === fontLower);
}

export function isColorPaletteDuplicate(colors: string[], entries: Entry[]): boolean {
  const candidate = [...colors].map(c => c.toLowerCase()).sort();
  for (const entry of entries) {
    const existing = [...entry.colors].map(c => c.toLowerCase()).sort();
    if (candidate.length === existing.length &&
        candidate.every((c, i) => c === existing[i])) {
      return true;
    }
  }
  return false;
}
