import type { TaxRemittanceMode } from "@prisma/client";
import type { AggregatorCheckoutGateway } from "../../ports/AggregatorCheckoutGateway";
import type {
  RemittanceChannel,
  RemittanceContext,
  RemittanceResult,
} from "../../ports/RemittanceChannel";

export class PagoPaAggregatorRemittance implements RemittanceChannel {
  readonly mode: TaxRemittanceMode = "PAGOPA";
  readonly isImplemented = true;

  constructor(private readonly gateway: AggregatorCheckoutGateway) {}

  async prepare(ctx: RemittanceContext): Promise<RemittanceResult> {
    const checkout = await this.gateway.createCheckout({
      declarationId: ctx.declarationId,
      organizationId: ctx.organizationId,
      comuneName: ctx.exportData.comuneName,
      periodLabel: ctx.exportData.periodLabel,
      totalCents: ctx.exportData.totalCents,
    });

    return {
      kind: "REDIRECT",
      url: checkout.checkoutUrl,
      message: `Versamento pagoPA via ${checkout.provider} (${checkout.sandbox ? "sandbox" : "produzione"}).`,
    };
  }
}
