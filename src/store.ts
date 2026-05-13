import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface PaletteEntry {
  timestamp: string;
  word: string;
  definition: string;
  haiku: string[];
  colors: string[];
  font: string;
  fontUrl: string;
  fontColor: string;
  sourceUrl: string;
}

export interface StoreData {
  entries: PaletteEntry[];
}

const DEFAULT: StoreData = { entries: [] };

function isValidStoreData(data: unknown): data is StoreData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.entries);
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
      this.cache = { ...DEFAULT };
      return this.cache;
    }
    try {
      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw);
      if (!isValidStoreData(parsed)) {
        console.warn(`Warning: ${this.path} has invalid structure, using defaults`);
        this.cache = { ...DEFAULT };
        return this.cache;
      }
      this.cache = parsed;
      return this.cache;
    } catch (err) {
      console.warn(`Warning: failed to read ${this.path}: ${err instanceof Error ? err.message : String(err)}`);
      this.cache = { ...DEFAULT };
      return this.cache;
    }
  }

  write(data: StoreData): void {
    this.cache = data;
    writeFileSync(this.path, JSON.stringify(data, null, 2) + "\n");
  }

  addEntry(entry: PaletteEntry): StoreData {
    const data = this.read();
    data.entries.unshift(entry);
    this.write(data);
    return data;
  }
}
