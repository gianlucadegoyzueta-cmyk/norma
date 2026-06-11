# GOVERNANCE — distillato operativo (2026-06-11)

Integrazione selettiva dal "Sovereign System Package" (proposta ChatGPT, vagliata):
prendiamo i 3 meccanismi utili, scartiamo la burocrazia. Il sistema vivo resta:
CLAUDE.md (costituzione) · STATO.md (operativo) · DECISIONS/NIGHT-LOG (episodico) ·
NEEDS-HUMAN (approvazioni) · CI+E2E (governor di fatto).

## 1 · Classi di rischio (ogni unità di corsia se ne assegna una nel PR body)

- **LOW** — reversibile, zero dati, zero prod: docs, copy, a11y, test. → merge se CI verde.
- **MEDIUM** — comportamento prodotto, UI importante, dipendenze nuove. → merge se CI
  verde + giudizio onesto nel PR body; in dubbio, PR aperta.
- **HIGH** — schema DB, auth, billing, dati ospiti, email in uscita. → backup verificato
  prima, rollback descritto, e merge solo se previsto esplicitamente dalla spec.
- **CRITICAL** — invii reali Questura, cancellazioni dati, claim legali pubblici, soldi
  veri. → SEMPRE umano. Nessuna eccezione, nessuna autorizzazione generica vale.

## 2 · Formato richiesta di approvazione (per NEEDS-HUMAN e messaggi al founder)

Ogni richiesta deve avere: **Decisione richiesta** · **Contesto** (2 righe) ·
**Opzioni** (max 3) · **Raccomandazione** (una, motivata) · **Rischio e reversibilità** ·
**Scadenza** · **Cosa succede se ignori**. Mai domande vaghe: sempre una decisione concreta.

## 3 · Disciplina di output per i report (daily-ops, fine corsa, dispatch)

Ogni report sostanziale chiude con 4 righe: **Deciso** (cosa è stato fatto/mergiato) ·
**Rischio** (cosa è cambiato nel profilo di rischio) · **Evidenza** (numeri: test, PR,
health) · **Prossima azione** (UNA, la più importante).

## Anti-pattern (vietati, dal pacchetto — questi erano giusti)

Scope creep silenzioso · assunzioni nascoste · lavoro cosmetico spacciato per progresso ·
status vaghi · certezza finta su evidenza debole · ri-litigare decisioni già prese senza
evidenza nuova.
