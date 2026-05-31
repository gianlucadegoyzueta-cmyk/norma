// PORT della RICONCILIAZIONE T+1 (Ricevuta).
//
// Contesto (docs/alloggiati-web-architettura.md §1, §5): le schedine in stato UNVERIFIED sono
// quelle inviate ma con esito IGNOTO (timeout/risposta persa). L'unico modo documentato per
// chiarirle è la `Ricevuta`: un PDF dei giorni PASSATI (mai del giorno corrente). Il job T+1
// scarica la Ricevuta di ieri, ne estrae le schedine effettivamente acquisite e concilia.
//
// ⚠️ STATO: SCAFFOLD. Il formato/contenuto reale della Ricevuta PDF NON è disponibile nel repo
// (serve un esempio reale per scrivere il parser). Perciò qui definiamo SOLO le interfacce e una
// implementazione che FALLISCE in modo esplicito: la logica di riconciliazione (state machine) è
// reale e testabile con fake; il parsing PDF è il pezzo mancante, marcato chiaramente.

/** Esito del parsing di una Ricevuta: l'insieme delle "chiavi identità" delle righe acquisite. */
export interface ParsedReceipt {
  /** Data coperta dalla Ricevuta ("YYYY-MM-DD"). */
  date: string;
  /**
   * Chiavi-identità delle schedine risultate ACQUISITE in questa Ricevuta. La forma della chiave
   * è la stessa prodotta da `SchedinaIdentityKey` (vedi reconciliation.service), così il confronto
   * è un semplice `acquiredKeys.has(key)`.
   */
  acquiredKeys: ReadonlySet<string>;
}

/** Estrae l'insieme delle schedine acquisite da una Ricevuta PDF (byte grezzi). */
export interface ReceiptParser {
  parse(pdf: Uint8Array): Promise<ParsedReceipt>;
}

/** Scarica la Ricevuta (PDF) per una data PASSATA. `null` se non ancora disponibile per quel giorno. */
export interface ReceiptProvider {
  fetchReceipt(credentialId: string, date: string): Promise<Uint8Array | null>;
}

export class NotImplementedReceiptError extends Error {
  constructor(what: string) {
    super(
      `${what} non ancora implementato: serve un esempio REALE della Ricevuta Alloggiati (PDF) per ` +
        "scriverne il parsing in modo fedele. La logica di riconciliazione è pronta; manca solo questo.",
    );
    this.name = "NotImplementedReceiptError";
  }
}

/**
 * Parser segnaposto: FALLISCE in modo esplicito invece di inventare un formato.
 * Sostituiscilo con il parser reale quando avremo un esempio di Ricevuta.
 */
export class NotImplementedReceiptParser implements ReceiptParser {
  parse(): Promise<ParsedReceipt> {
    throw new NotImplementedReceiptError("Parsing della Ricevuta PDF");
  }
}

/** Provider segnaposto: FALLISCE in modo esplicito (il metodo WS/archiviazione non è ancora cablato). */
export class NotImplementedReceiptProvider implements ReceiptProvider {
  fetchReceipt(): Promise<Uint8Array | null> {
    throw new NotImplementedReceiptError("Download della Ricevuta");
  }
}
