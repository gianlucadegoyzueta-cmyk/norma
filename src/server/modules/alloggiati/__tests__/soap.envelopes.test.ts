import { describe, expect, it } from "vitest";
import {
  buildGenerateTokenEnvelope,
  buildSendEnvelope,
  buildTestEnvelope,
  escapeXml,
  soapAction,
} from "../soap/envelopes";

describe("escapeXml", () => {
  it("escapa i caratteri speciali XML", () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });
});

describe("soapAction", () => {
  it("compone AlloggiatiService/<Metodo>", () => {
    expect(soapAction("GenerateToken")).toBe("AlloggiatiService/GenerateToken");
    expect(soapAction("Test")).toBe("AlloggiatiService/Test");
  });
});

describe("buildGenerateTokenEnvelope", () => {
  it("inserisce utente/password/wskey nel namespace del servizio, con escaping", () => {
    const xml = buildGenerateTokenEnvelope("XX002458", "p&w<d", "WSKEY1");
    expect(xml).toContain('<GenerateToken xmlns="AlloggiatiService">');
    expect(xml).toContain("<Utente>XX002458</Utente>");
    expect(xml).toContain("<Password>p&amp;w&lt;d</Password>");
    expect(xml).toContain("<WsKey>WSKEY1</WsKey>");
  });
});

describe("buildTestEnvelope", () => {
  it("serializza ElencoSchedine come lista di <string>", () => {
    const xml = buildTestEnvelope("XX1", "TOK", ["riga1", "riga2"]);
    expect(xml).toContain(
      "<ElencoSchedine><string>riga1</string><string>riga2</string></ElencoSchedine>",
    );
    expect(xml).toContain("<token>TOK</token>");
  });
});

describe("buildSendEnvelope", () => {
  it("usa l'elemento <Send> con la stessa struttura di Test", () => {
    const xml = buildSendEnvelope("XX1", "TOK", ["riga1"]);
    expect(xml).toContain('<Send xmlns="AlloggiatiService">');
    expect(xml).toContain("<ElencoSchedine><string>riga1</string></ElencoSchedine>");
    expect(xml).toContain("</Send>");
  });

  it("escapa i caratteri speciali nelle righe", () => {
    const xml = buildSendEnvelope("XX1", "TOK", ["a&b<c"]);
    expect(xml).toContain("<string>a&amp;b&lt;c</string>");
  });
});
