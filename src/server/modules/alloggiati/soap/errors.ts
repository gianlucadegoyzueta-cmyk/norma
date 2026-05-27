/** Esito di servizio (EsitoOperazioneServizio del web service). */
export interface EsitoServizio {
  esito: boolean;
  errorCod?: string;
  errorDes?: string;
  errorDettaglio?: string;
}

export interface SoapFaultInfo {
  faultcode?: string;
  faultstring?: string;
  detail?: string;
}

/** Base di tutti gli errori dell'adapter Alloggiati. */
export class AlloggiatiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlloggiatiError";
  }
}

/**
 * Errore di AUTENTICAZIONE: credenziali o token non validi (es. GenerateToken/Authentication_Test
 * con esito=false). Non ritentabile così com'è: serve rigenerare il token o ri-onboarding.
 */
export class AlloggiatiAuthError extends AlloggiatiError {
  constructor(
    message: string,
    readonly esito?: EsitoServizio,
  ) {
    super(message);
    this.name = "AlloggiatiAuthError";
  }
}

/** Errore TRANSITORIO: rete, timeout, HTTP 5xx senza fault. Ritentabile con backoff. */
export class AlloggiatiTransientError extends AlloggiatiError {
  constructor(
    message: string,
    readonly info?: { httpStatus?: number; cause?: unknown },
  ) {
    super(message);
    this.name = "AlloggiatiTransientError";
  }
}

/**
 * Errore di PROTOCOLLO: SOAP Fault o risposta inattesa/non interpretabile.
 * Di solito è un problema di contratto/configurazione (non si risolve ritentando uguale).
 */
export class AlloggiatiProtocolError extends AlloggiatiError {
  constructor(
    message: string,
    readonly info?: { fault?: SoapFaultInfo; httpStatus?: number; bodyExcerpt?: string },
  ) {
    super(message);
    this.name = "AlloggiatiProtocolError";
  }
}

// NOTA: gli errori di VALIDAZIONE delle schedine NON sono eccezioni: il metodo `Test` li
// restituisce riga-per-riga (è il suo scopo). Vengono gestiti dal chiamante, non lanciati.
