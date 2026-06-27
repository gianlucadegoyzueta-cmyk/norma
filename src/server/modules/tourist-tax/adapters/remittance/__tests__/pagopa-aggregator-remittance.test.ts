import { describe, expect, it } from "vitest";
import { MockAggregatorCheckoutGateway } from "../MockAggregatorCheckoutGateway";
import { PagoPaAggregatorRemittance } from "../PagoPaAggregatorRemittance";

describe("PagoPaAggregatorRemittance", () => {
  it("ritorna REDIRECT con checkout sandbox del provider", async () => {
    const gateway = new MockAggregatorCheckoutGateway({
      provider: "paytourist",
      sandboxBaseUrl: "https://sandbox.example.test/checkout",
    });
    const channel = new PagoPaAggregatorRemittance(gateway);

    const out = await channel.prepare({
      declarationId: "decl_1",
      organizationId: "org_1",
      exportData: {
        comuneName: "Venezia",
        periodLabel: "maggio-2026",
        totalCents: 12345,
        lines: [],
      },
    });

    expect(channel.isImplemented).toBe(true);
    expect(out.kind).toBe("REDIRECT");
    if (out.kind === "REDIRECT") {
      expect(out.url).toContain("provider=paytourist");
      expect(out.url).toContain("declarationId=decl_1");
      expect(out.url).toContain("amountCents=12345");
      expect(out.message).toContain("sandbox");
    }
  });
});
