import { describe, expect, it } from "vitest";
import {
  canAutoTransmit,
  InMemoryRegionalCredentialProvider,
  type ResolvedRegionalCredential,
} from "../credentials";

const cred = (over: Partial<ResolvedRegionalCredential> = {}): ResolvedRegionalCredential => ({
  secret: { userId: "u", password: "p" },
  config: { hotelCode: "TRS-IT-SIC-00004" },
  autoTransmit: true,
  status: "ACTIVE",
  ...over,
});

describe("InMemoryRegionalCredentialProvider", () => {
  it("get restituisce ciò che è stato set per (struttura, serializer); altrimenti null", async () => {
    const p = new InMemoryRegionalCredentialProvider();
    p.set("prop1", "turismatica-c59", cred());
    expect(await p.get("prop1", "turismatica-c59")).not.toBeNull();
    expect(await p.get("prop1", "spot-xml")).toBeNull(); // serializer diverso
    expect(await p.get("prop2", "turismatica-c59")).toBeNull(); // struttura diversa
  });
});

describe("canAutoTransmit", () => {
  it("vero solo se ACTIVE e opt-in", () => {
    expect(canAutoTransmit(cred())).toBe(true);
    expect(canAutoTransmit(cred({ autoTransmit: false }))).toBe(false);
    expect(canAutoTransmit(cred({ status: "PENDING" }))).toBe(false);
    expect(canAutoTransmit(cred({ status: "DISABLED" }))).toBe(false);
    expect(canAutoTransmit(null)).toBe(false);
  });
});
