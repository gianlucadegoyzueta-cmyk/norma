// Harness di test: cabla lo STACK REALE del modulo Alloggiati contro il mock server SOAP.
//
// Tutto ciò che sta qui è codice di PRODUZIONE invariato — l'unica cosa "finta" è il `fetchImpl`
// del client, che punta al mock. Così i test esercitano davvero: TokenManager (cache/refresh) →
// AlloggiatiSoapClient (envelope SOAP + parsing + classificazione errori) → SoapAlloggiatiSender
// (guard idempotenza) → SchedinaOutboxService / SchedinaVerifyService (macchina a stati).

import type { AlloggiatiSecret } from "../../../../secrets";
import { InMemorySchedinaRepository } from "../../adapters/InMemorySchedinaRepository";
import { SoapAlloggiatiSender } from "../../adapters/SoapAlloggiatiSender";
import { AlloggiatiSoapClient } from "../../soap/client";
import { TokenManager, type AlloggiatiCredentialProvider } from "../../soap/token-manager";
import { SchedinaOutboxService } from "../../services/outbox.service";
import { SchedinaVerifyService } from "../../services/verify.service";
import type { AlloggiatiMockServer } from "./AlloggiatiMockServer";

export interface AlloggiatiStack {
  repo: InMemorySchedinaRepository;
  /** Mappa schedinaId → riga di tracciato (la "build" reale è pura: qui la pre-registriamo). */
  records: Map<string, string>;
  client: AlloggiatiSoapClient;
  tokens: TokenManager;
  sender: SoapAlloggiatiSender;
  outbox: SchedinaOutboxService;
  verify: SchedinaVerifyService;
}

export function createAlloggiatiStack(opts: {
  mock: AlloggiatiMockServer;
  secret: AlloggiatiSecret;
  /** Timeout breve nei test del caso "timeout", così la suite resta veloce. Default 20s. */
  timeoutMs?: number;
}): AlloggiatiStack {
  const repo = new InMemorySchedinaRepository();
  const records = new Map<string, string>();

  // Il provider restituisce SEMPRE il segreto fornito (mono-credenziale): per testare le
  // "credenziali non valide" basta passare un segreto sbagliato e/o lo scenario forceAuthFailure.
  const provider: AlloggiatiCredentialProvider = { getSecret: async () => opts.secret };

  const client = new AlloggiatiSoapClient({
    fetchImpl: opts.mock.fetch,
    timeoutMs: opts.timeoutMs ?? 20_000,
  });
  const tokens = new TokenManager(client, provider);
  const sender = new SoapAlloggiatiSender(tokens, client);

  const buildRecord = (schedinaId: string): string => {
    const r = records.get(schedinaId);
    if (r === undefined) throw new Error(`Harness: nessun record registrato per ${schedinaId}`);
    return r;
  };

  const outbox = new SchedinaOutboxService(repo, sender, buildRecord);
  const verify = new SchedinaVerifyService(repo, tokens, client, buildRecord);

  return { repo, records, client, tokens, sender, outbox, verify };
}
