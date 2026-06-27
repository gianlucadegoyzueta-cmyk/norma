import type {
  AggregatorCheckoutGateway,
  AggregatorCheckoutInput,
  AggregatorCheckoutResult,
} from "../../ports/AggregatorCheckoutGateway";

const DEFAULT_PROVIDER = "mock-aggregator";

/**
 * Gateway finto/sandbox per CI e sviluppo locale.
 * Non apre connessioni esterne: genera una URL di checkout deterministica.
 */
export class MockAggregatorCheckoutGateway implements AggregatorCheckoutGateway {
  constructor(private readonly opts: { provider?: string; sandboxBaseUrl?: string } = {}) {}

  async createCheckout(input: AggregatorCheckoutInput): Promise<AggregatorCheckoutResult> {
    const provider = this.opts.provider ?? process.env.TAX_AGGREGATOR_PROVIDER ?? DEFAULT_PROVIDER;
    const base =
      this.opts.sandboxBaseUrl ??
      process.env.TAX_AGGREGATOR_SANDBOX_URL ??
      "https://sandbox.norma.casa/aggregator-checkout";

    const url = new URL(base);
    url.searchParams.set("provider", provider);
    url.searchParams.set("declarationId", input.declarationId);
    url.searchParams.set("amountCents", String(input.totalCents));
    url.searchParams.set("comune", input.comuneName);
    url.searchParams.set("period", input.periodLabel);

    return {
      provider,
      sandbox: true,
      checkoutUrl: url.toString(),
    };
  }
}
