import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../domain/system-prompt";
import { ClaudeAssistant } from "../adapters/ClaudeAssistant";
import type { KnowledgeBase } from "../ports";
import type { KbEntry } from "../support.types";

const FACTS: KbEntry[] = [
  {
    id: "alloggiati-obbligo",
    claim: "Gli host devono comunicare gli ospiti ad Alloggiati Web entro le tempistiche di legge.",
    sourceUrl: "docs/alloggiati.md",
    dateVerified: "2026-06-14",
    tags: ["alloggiati"],
    confidence: "A",
  },
];

class StaticKb implements KnowledgeBase {
  entries(): KbEntry[] {
    return FACTS;
  }
}

describe("system prompt (guardrail di compliance)", () => {
  const prompt = buildSystemPrompt(FACTS);

  it("inietta i fatti della KB", () => {
    expect(prompt).toContain("alloggiati-obbligo");
    expect(prompt).toContain("Alloggiati Web");
  });

  it("impone di non inventare e di citare le fonti", () => {
    expect(prompt).toContain("Non inventare");
    expect(prompt.toLowerCase()).toContain("sources");
  });

  it("impone l'escalation in caso di dubbio", () => {
    expect(prompt).toContain("escalate=true");
  });
});

describe("ClaudeAssistant (dormiente senza chiave)", () => {
  it("senza ANTHROPIC_API_KEY non inventa: escala a un umano", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const reply = await new ClaudeAssistant(new StaticKb()).ask("una domanda");
      expect(reply.escalate).toBe(true);
      expect(reply.sources).toHaveLength(0);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
