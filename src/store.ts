import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Entry {
  timestamp: string;
  word: string;
  phonetic: string;
  definition: string;
  haiku: string[];
  colors: string[];
  font: string;
  fontUrl: string;
  fontColor: string;
  sourceUrl: string;
  signature: string;
}

export interface StoreData {
  entries: Entry[];
}

export class Store {
  private path: string;
  private cache: StoreData | null = null;

  constructor(filename = "data.json") {
    this.path = join(process.cwd(), filename);
  }

  read(): StoreData {
    if (this.cache) return this.cache;
    if (!existsSync(this.path)) {
      this.cache = { entries: [] };
      return this.cache;
    }
    try {
      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray((parsed as Record<string, unknown>).entries)) {
        console.warn(`Warning: ${this.path} has invalid structure, using defaults`);
        this.cache = { entries: [] };
        return this.cache;
      }
      this.cache = parsed as StoreData;
      return this.cache;
    } catch (err) {
      console.warn(`Warning: failed to read ${this.path}: ${err instanceof Error ? err.message : String(err)}`);
      this.cache = { entries: [] };
      return this.cache;
    }
  }

  addEntry(entry: Entry): StoreData {
    const data = this.read();
    data.entries.unshift(entry);
    this.cache = data;
    writeFileSync(this.path, JSON.stringify(data, null, 2) + "\n");
    return data;
  }
}
