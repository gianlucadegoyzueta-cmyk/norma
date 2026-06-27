export interface AggregatorCheckoutInput {
  declarationId: string;
  organizationId: string;
  comuneName: string;
  periodLabel: string;
  totalCents: number;
}

export interface AggregatorCheckoutResult {
  provider: string;
  sandbox: boolean;
  checkoutUrl: string;
}

/**
 * Port agnostico per provider esterni di versamento tassa (pagoPA style).
 * In Fase 1 usa sandbox/mock; in Fase 6 si sostituisce con adapter prod.
 */
export interface AggregatorCheckoutGateway {
  createCheckout(input: AggregatorCheckoutInput): Promise<AggregatorCheckoutResult>;
}
