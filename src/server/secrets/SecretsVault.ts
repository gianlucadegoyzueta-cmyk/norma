// I segreti delle credenziali Alloggiati (utente/password/wskey) sono credenziali
// di accesso a un sistema della Polizia di Stato: NON vanno mai salvati in chiaro
// nel database. Passano sempre da questa interfaccia.
//
// Nel modello dati, la tabella AlloggiatiCredential conserva solo un `secretRef`
// (un riferimento opaco); i valori veri stanno nel vault dietro questa interfaccia.

/// I tre segreti necessari per autenticarsi al web service Alloggiati.
export interface AlloggiatiSecret {
  utente: string;
  password: string;
  wskey: string;
}

/// Contratto del caveau dei segreti. L'implementazione cambia per ambiente
/// (locale in sviluppo; AWS Secrets Manager / HashiCorp Vault / GCP in produzione)
/// SENZA che il resto del codice se ne accorga.
export interface SecretsVault {
  /// Salva i segreti e restituisce il riferimento opaco da memorizzare in `secretRef`.
  store(secret: AlloggiatiSecret): Promise<string>;

  /// Recupera i segreti dato il riferimento.
  retrieve(ref: string): Promise<AlloggiatiSecret>;

  /// Aggiorna segreti esistenti (es. re-onboarding dopo il cambio password dell'host).
  update(ref: string, secret: AlloggiatiSecret): Promise<void>;

  /// Elimina i segreti (es. credenziale disabilitata).
  delete(ref: string): Promise<void>;
}
