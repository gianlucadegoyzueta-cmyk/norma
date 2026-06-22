// Canali di trasmissione ISTAT PREDISPOSTI ma NON ancora integrati (stub).
// Specchio di tourist-tax/adapters/remittance/StubRemittance: dimostrano che l'attivazione AUTO
// per-regione non richiede di toccare il dominio — basta sostituire lo stub con un adapter operativo.
// Finché sono stub, l'app ricade sull'export FILE manuale (l'host carica al portale).
//
// GUARDRAIL #1: nessuno stub apre connessioni né trasmette nulla. L'invio reale a un ente resta una
// decisione umana esplicita; questi adapter rendono la pipeline completa ma inerte.

import type {
  IstatSubmissionChannel,
  IstatSubmissionPayload,
  IstatSubmissionResult,
} from "../../ports/IstatSubmissionChannel";
import type { RegionSerializerId } from "../../regional/routing";

/** Etichette leggibili dei canali (per il messaggio NOT_IMPLEMENTED). */
const SERIALIZER_LABEL: Record<RegionSerializerId, string> = {
  "ross1000-xml": "Ross1000",
  "spot-xml": "SPOT (Puglia)",
  "turismatica-c59": "Turismatica C/59 (Umbria)",
};

class StubIstatSubmission implements IstatSubmissionChannel {
  readonly isImplemented = false;

  constructor(readonly serializerId: RegionSerializerId) {}

  async submit(payload: IstatSubmissionPayload): Promise<IstatSubmissionResult> {
    void payload; // nessun I/O: lo stub non tocca la rete.
    const label = SERIALIZER_LABEL[this.serializerId];
    return {
      kind: "NOT_IMPLEMENTED",
      message: `Invio automatico ${label} non ancora attivo: scarica il file e caricalo sul portale regionale.`,
    };
  }
}

export class Ross1000SubmissionStub extends StubIstatSubmission {
  constructor() {
    super("ross1000-xml");
  }
}

export class SpotSubmissionStub extends StubIstatSubmission {
  constructor() {
    super("spot-xml");
  }
}

export class TurismaticaC59SubmissionStub extends StubIstatSubmission {
  constructor() {
    super("turismatica-c59");
  }
}

/**
 * Risolve il canale di trasmissione dal serializer della regione. Oggi ritorna SEMPRE uno stub
 * (nessuna regione è AUTO). Quando una regione diventa operativa, qui si monta il suo adapter reale
 * — il dominio e la UI non cambiano. null se la regione non ha un serializer (canale ASSISTITO).
 */
export function resolveIstatSubmissionChannel(
  serializerId: RegionSerializerId | null,
): IstatSubmissionChannel | null {
  switch (serializerId) {
    case "ross1000-xml":
      return new Ross1000SubmissionStub();
    case "spot-xml":
      return new SpotSubmissionStub();
    case "turismatica-c59":
      return new TurismaticaC59SubmissionStub();
    case null:
    case undefined:
      return null;
  }
}
