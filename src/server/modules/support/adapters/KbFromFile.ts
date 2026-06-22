// Adapter: carica la knowledge base verificata dal file del modulo (self-contained).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { KnowledgeBase } from "../ports";
import type { KbEntry } from "../support.types";

interface KbFile {
  entries?: KbEntry[];
}

/** Legge le sole voci a confidenza "A" dal kb.json del modulo. Cache in memoria dopo il primo load. */
export class KbFromFile implements KnowledgeBase {
  private cache: KbEntry[] | null = null;

  entries(): KbEntry[] {
    if (this.cache) return this.cache;
    const path = join(process.cwd(), "src/server/modules/support/knowledge/kb.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as KbFile;
    this.cache = (parsed.entries ?? []).filter((e) => e.confidence === "A");
    return this.cache;
  }
}
