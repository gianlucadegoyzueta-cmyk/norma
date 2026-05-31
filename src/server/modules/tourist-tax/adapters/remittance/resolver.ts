// Risolutore del canale di versamento per una modalità scelta.
// MANUAL_EXPORT è sempre reale; gli altri sono stub finché non vengono integrati.

import type { TaxRemittanceMode } from "@prisma/client";
import type { RemittanceChannel } from "../../ports/RemittanceChannel";
import { ManualExportRemittance } from "./ManualExportRemittance";
import {
  ComunePortalRemittanceStub,
  GecosRemittanceStub,
  PagoPaRemittanceStub,
} from "./StubRemittance";

export function resolveRemittanceChannel(mode: TaxRemittanceMode): RemittanceChannel {
  switch (mode) {
    case "MANUAL_EXPORT":
      return new ManualExportRemittance();
    case "GECOS":
      return new GecosRemittanceStub();
    case "PAGOPA":
      return new PagoPaRemittanceStub();
    case "COMUNE_PORTAL":
      return new ComunePortalRemittanceStub();
  }
}

/** Modalità realmente operative oggi (per la UI). */
export function implementedRemittanceModes(): TaxRemittanceMode[] {
  return (["MANUAL_EXPORT", "GECOS", "PAGOPA", "COMUNE_PORTAL"] as TaxRemittanceMode[]).filter(
    (m) => resolveRemittanceChannel(m).isImplemented,
  );
}
