import { describe, expect, it } from "vitest";
import type { IstatSubmissionPayload } from "../../../ports/IstatSubmissionChannel";
import {
  Ross1000SubmissionStub,
  resolveIstatSubmissionChannel,
  SpotSubmissionStub,
  TurismaticaC59SubmissionStub,
} from "../StubIstatSubmission";

const payload: IstatSubmissionPayload = {
  serializerId: "ross1000-xml",
  period: "2026-05",
  codiceStruttura: "ABC123",
  files: [{ filename: "movimento_2026-05.xml", mimeType: "application/xml", content: "<x/>" }],
};

describe("StubIstatSubmission", () => {
  it("ogni stub è NON implementato e ritorna NOT_IMPLEMENTED (nessun invio reale)", async () => {
    for (const stub of [
      new Ross1000SubmissionStub(),
      new SpotSubmissionStub(),
      new TurismaticaC59SubmissionStub(),
    ]) {
      expect(stub.isImplemented).toBe(false);
      const res = await stub.submit(payload);
      expect(res.kind).toBe("NOT_IMPLEMENTED");
      if (res.kind === "NOT_IMPLEMENTED") {
        expect(res.message).toMatch(/non ancora attivo/i);
      }
    }
  });

  it("ogni stub espone il proprio serializerId", () => {
    expect(new Ross1000SubmissionStub().serializerId).toBe("ross1000-xml");
    expect(new SpotSubmissionStub().serializerId).toBe("spot-xml");
    expect(new TurismaticaC59SubmissionStub().serializerId).toBe("turismatica-c59");
  });
});

describe("resolveIstatSubmissionChannel", () => {
  it("risolve ogni serializer noto a uno stub (mai un canale operativo, oggi)", () => {
    for (const id of ["ross1000-xml", "spot-xml", "turismatica-c59"] as const) {
      const ch = resolveIstatSubmissionChannel(id);
      expect(ch).not.toBeNull();
      expect(ch?.serializerId).toBe(id);
      expect(ch?.isImplemented).toBe(false);
    }
  });

  it("ritorna null per regione senza serializer (canale ASSISTITO)", () => {
    expect(resolveIstatSubmissionChannel(null)).toBeNull();
  });
});
