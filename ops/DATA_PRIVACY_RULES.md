# DATA_PRIVACY_RULES

- Minimizzare la raccolta. Loggare solo il necessario.
- Mai dati sensibili (documenti, nominativi ospiti) in debug/log/output di test.
- Mai duplicazioni non necessarie di dati personali (i PDF ricevuta reali e i dump stanno
  in tmp/ e ~/backups, MAI nel repo).
- Segreti e credenziali: solo .env e vault (SecretsVault); mai in chat, mai in chiaro.
- Mai esporre dati ospiti senza necessità; fixture nei test SEMPRE anonimizzate.
- Ogni flusso di dati personali è HIGH-impact di default → review.
- Ogni modifica privacy-impacting → escalation al founder.
- Promemoria aperto: DPA host↔Norma e privacy policy validate da legale (in coda, playbook
  co-founder 2).
