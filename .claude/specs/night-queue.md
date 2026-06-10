# Coda staffetta notturna (Livello 4) — unità in ordine

Quando una corsia completa la sua spec (.lane-done), il watchdog-relay lancia la prossima
unità di questa coda come nuova corsia. Ogni unità: branch + PR + CI, protocollo /ship-unit.

## Q1 — PDF tassa di soggiorno (repo norma, branch feat/tourist-tax-pdf)

NEEDS-HUMAN #7: additivo, zero schema. Export PDF del report trimestrale con pdf-lib
(già dipendenza). Layout carta&inchiostro sobrio: intestazione con sigillo, tabella per
struttura, totale in evidenza, piè di pagina con periodo e data generazione. Bottone
"Scarica PDF" accanto all'export CSV esistente in /tourist-tax. Test su generazione
(byte PDF validi, campi presenti). **PR APERTA, NON mergiare** (review visiva umana).

## Q2 — Onboarding concierge (repo norma, branch design/onboarding-concierge)

Solo se la corsia D non l'ha già fatto (controlla i branch/PR esistenti prima!).
Vedi sezione 2 della spec lane-d: testata in prima persona, progress, transizioni,
copy "mano sulla spalla". Zero cambi ai form interni. Merge se CI verde.

## Q3 — Pass a11y + copy (repo norma, branch chore/a11y-copy-pass-2)

Pagine non ancora passate: /properties, /stays, /credentials, /tourist-tax.
Label, focus visibili, aria, contrasto AA, copy uniformato al tono concierge
(prima persona, sobrio). Merge se CI verde.
