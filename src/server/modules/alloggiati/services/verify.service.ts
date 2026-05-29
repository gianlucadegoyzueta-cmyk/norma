import type { SchedinaRepository } from "../ports/SchedinaRepository";
import type { TokenProvider } from "../adapters/SoapAlloggiatiSender";

/**
 * Minimo per la VALIDAZIONE di un batch via `Test` (lo soddisfa AlloggiatiSoapClient).
 * `Test` valida lato server SENZA acquisire nulla: è sicuro e ripetibile.
 */
export interface BatchTester {
  test(
    utente: string,
    token: string,
    righe: readonly string[],
  ): Promise<{
    overall: { esito: boolean };
    righe: { esito: boolean; errorCod?: string; errorDes?: string }[];
  }>;
}

/** Come l'outbox: costruisce la riga di tracciato di una schedina (SchedinaRecordBuilder.build). */
export type VerifyRecordBuilder = (schedinaId: string) => string | Promise<string>;

export interface VerifyRowResult {
  schedinaId: string;
  valid: boolean;
  errorCod?: string;
  errorDes?: string;
}

export interface VerifyBatchResult {
  total: number;
  valid: number;
  rows: VerifyRowResult[];
}

/**
 * Dry-run di un batch di schedine PENDING tramite `Test` (NESSUN `Send`, nessun cambio di stato).
 * È il passo di sicurezza prima dell'invio irreversibile: mappa l'esito riga-per-riga sugli id,
 * così la UI può mostrare quali schedine passerebbero e quali verrebbero rifiutate.
 */
export class SchedinaVerifyService {
  constructor(
    private readonly repo: Pick<SchedinaRepository, "listPendingByCredential">,
    private readonly tokens: TokenProvider,
    private readonly tester: BatchTester,
    private readonly buildRecord: VerifyRecordBuilder,
  ) {}

  async verifyCredentialBatch(credentialId: string): Promise<VerifyBatchResult> {
    const pending = await this.repo.listPendingByCredential(credentialId);
    if (pending.length === 0) return { total: 0, valid: 0, rows: [] };

    // Costruisci TUTTE le righe (se una non è costruibile, l'errore emerge qui, prima della rete).
    const records: string[] = [];
    for (const s of pending) records.push(await this.buildRecord(s.id));

    const { utente, token } = await this.tokens.getToken(credentialId);
    const outcome = await this.tester.test(utente, token, records);

    // `Test` restituisce gli esiti NELLO STESSO ORDINE dell'input: correliamo per indice.
    const rows: VerifyRowResult[] = pending.map((s, i) => {
      const r = outcome.righe[i];
      return {
        schedinaId: s.id,
        valid: Boolean(r?.esito),
        errorCod: r?.errorCod,
        errorDes: r?.errorDes,
      };
    });
    return { total: pending.length, valid: rows.filter((r) => r.valid).length, rows };
  }
}
