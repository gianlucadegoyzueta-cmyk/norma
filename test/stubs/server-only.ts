// Stub di `server-only` per i test (vitest). Il pacchetto reale è fornito da Next a runtime e
// serve solo a impedire l'import di moduli server dentro bundle client: nei test non esiste e non
// ha effetti, quindi lo si rimpiazza con un modulo vuoto via alias in vitest.config.ts.
export {};
