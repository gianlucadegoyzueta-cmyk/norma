// Canali di versamento PREDISPOSTI ma NON ancora integrati (stub).
// Dimostrano che l'attivazione per-comune non richiede di toccare il dominio: basta sostituire
// lo stub con un adapter operativo. Finché sono stub, l'app ricade sull'export manuale.

import type { TaxRemittanceMode } from "@prisma/client";
import type {
  RemittanceChannel,
  RemittanceContext,
  RemittanceResult,
} from "../../ports/RemittanceChannel";

class StubRemittance implements RemittanceChannel {
  readonly isImplemented = false;
  constructor(
    readonly mode: TaxRemittanceMode,
    private readonly label: string,
  ) {}

  async prepare(_ctx: RemittanceContext): Promise<RemittanceResult> {
    void _ctx;
    return {
      kind: "NOT_IMPLEMENTED",
      message: `Versamento assistito ${this.label} non ancora integrato: usa l'export manuale.`,
    };
  }
}

export class GecosRemittanceStub extends StubRemittance {
  constructor() {
    super("GECOS", "GECOS");
  }
}

export class ComunePortalRemittanceStub extends StubRemittance {
  constructor() {
    super("COMUNE_PORTAL", "portale comunale");
  }
}
