import type {
  AlloggiatiSender,
  SendBatch,
  SendBatchResult,
  SendRowResult,
} from "../ports/AlloggiatiSender";

/** Comportamenti simulabili dall'invio finto. */
export type FakeBehaviour =
  | { mode: "all-acquired" }
  | { mode: "all-rejected"; errorCod?: string; errorDes?: string }
  | { mode: "throw" } // simula timeout / assenza di risposta
  | { mode: "per-row"; map: Record<string, SendRowResult> };

/**
 * Implementazione FINTA dell'invio, per test e sviluppo locale.
 * Permette di simulare acquisizione, rifiuto e timeout SENZA toccare il sistema
 * della Polizia. Registra le chiamate in `calls` per le asserzioni.
 */
export class FakeAlloggiatiSender implements AlloggiatiSender {
  readonly calls: SendBatch[] = [];

  constructor(private behaviour: FakeBehaviour = { mode: "all-acquired" }) {}

  setBehaviour(behaviour: FakeBehaviour): void {
    this.behaviour = behaviour;
  }

  async send(batch: SendBatch): Promise<SendBatchResult> {
    this.calls.push(batch);
    const b = this.behaviour;

    if (b.mode === "throw") {
      throw new Error("Simulazione: nessuna risposta dal portale (timeout)");
    }
    if (b.mode === "per-row") {
      return { results: batch.rows.map((r) => b.map[r.correlationId]) };
    }

    const results: SendRowResult[] = batch.rows.map((r) =>
      b.mode === "all-acquired"
        ? { correlationId: r.correlationId, outcome: "ACQUIRED" }
        : {
            correlationId: r.correlationId,
            outcome: "REJECTED",
            errorCod: b.errorCod,
            errorDes: b.errorDes,
          },
    );
    return { results };
  }
}
