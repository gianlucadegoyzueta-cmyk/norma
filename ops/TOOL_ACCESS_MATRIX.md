# TOOL_ACCESS_MATRIX

## Livelli di accesso

Read → Simulate (sandbox) → Stage → Branch → Merge candidate → Deploy candidate →
Production (sotto policy) → Irreversible (solo autorizzazione esplicita).

## Azioni sicure (senza autorizzazione)

Leggere repo/doc/log · bozze di spec e test · creare branch/worktree · eseguire test ·
preparare report · raccogliere evidenza pubblica · backup (sempre permessi, mai chiesti).

## Azioni medium-impact (richiedono review = CI completa + giudizio onesto nel PR body)

Comportamento prodotto · flussi onboarding · copy con implicazioni esterne · aggiunta/
rimozione integrazioni · schema DB in aree non critiche (con backup+rollback) · workflow
di supporto.

## Azioni high-impact (autorizzazione esplicita del founder)

Deploy che toccano dati ospiti in modo nuovo · QUALSIASI cosa sull'invio live Questura ·
comportamento billing · logica auth/ruoli · retention dati personali · claim pubblici
legali · migrazioni schema con impatto sugli utenti esistenti.

## Azioni ristrette (mai, salvo procedura dedicata col founder presente)

Delete irreversibili · esposizione segreti di produzione · distruzione silenziosa di dati ·
comunicazioni esterne non loggate · toggle di produzione su flussi compliance critici.

## Principio di default

Se un'azione non è chiaramente permessa: fermati ed escalala con il formato richieste
di GOVERNANCE.md §2.
